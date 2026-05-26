import express from 'express';
import bcrypt from 'bcryptjs';
import supabase from '../config/supabase.js';
import { requireAuth, requireAdmin } from '../middlewares/auth.js';
import { explodirElemento, descontarDelInventario } from '../services/inventory.js';
import { broadcastCocina } from '../services/cocinaEvents.js';

const router = express.Router();

// Obtener todas las comandas
router.get('/', requireAuth, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('Comanda')
      .select('*, detalles:DetalleComanda(*)')
      .order('fecha_apertura', { ascending: false })
      .limit(1000);
    if (error) throw error;
    res.json(data);
  } catch (e) {
    console.error('Error fetching comandas', e);
    res.status(500).json({ error: e.message });
  }
});

// Crear comanda con detalles en una sola transacción lógica
router.post('/', requireAdmin, async (req, res) => {
  try {
    const { 
      numero_comanda, mesa_numero, mesero_nombre, fecha_apertura, 
      estado, total_comanda, detalles, tipo_movimiento, 
      empleado_id, empleado_nombre, motivo_merma, admin_password 
    } = req.body;
    console.log('Body recibido en backend:', req.body);
    
    const movType = tipo_movimiento || 'VENTA';
    
    // 0. Validar contraseña si es MERMA o CREDITO_EMPLEADO
    if (movType === 'MERMA' || movType === 'CREDITO_EMPLEADO') {
      if (!admin_password) {
        return res.status(401).json({ error: 'Contraseña de administrador requerida para esta operación' });
      }
      const storedPassword = req.user.password || req.user.contrasena;
      const valid = await bcrypt.compare(admin_password, storedPassword);
      if (!valid) {
        return res.status(401).json({ error: 'Contraseña de administrador incorrecta' });
      }
    }

    const comandaId = crypto.randomUUID();
    const finalTotal = movType === 'MERMA' ? 0 : (total_comanda || 0);
    const finalEstado = (movType === 'MERMA' || movType === 'CREDITO_EMPLEADO') ? 'pagada' : (estado || 'abierta');
    const finalFechaCierre = (movType === 'MERMA' || movType === 'CREDITO_EMPLEADO') ? new Date().toISOString() : null;
    
    // 1. Insertar Comanda
    const { data: comanda, error: cmdError } = await supabase
      .from('Comanda')
      .insert({
        id: comandaId,
        numero_comanda,
        mesa_numero: mesa_numero !== undefined ? String(mesa_numero) : null,
        mesero_nombre,
        fecha_apertura: fecha_apertura ? new Date(fecha_apertura).toISOString() : new Date().toISOString(),
        fecha_cierre: finalFechaCierre,
        estado: finalEstado,
        tipo_movimiento: movType,
        empleado_id: empleado_id || null,
        motivo_merma: motivo_merma || null,
        total_comanda: finalTotal
      })
      .select()
      .single();
    if (cmdError) throw cmdError;
    
    // 2. Insertar Detalles (Bulk)
    let detallesCreados = [];
    if (detalles && detalles.length > 0) {
      const detallesData = detalles.map(d => ({
        id: crypto.randomUUID(),
        comandaId,
        platoId: d.plato_id || d.platoId || null,
        platoNombre: d.plato_nombre || d.platoNombre || null,
        cantidad: d.cantidad,
        precio: movType === 'MERMA' ? 0 : (d.precio_unitario || d.precio || 0),
        estado_plato: finalEstado === 'pagada' ? 'completado' : (d.estado_plato || 'pendiente'),
        notas_plato: d.notas_plato || d.notas || null,
        variante: d.variante || null
      }));
      
      const { data: det, error: detError } = await supabase
        .from('DetalleComanda').insert(detallesData).select();
      if (detError) throw detError;
      detallesCreados = det;
    }
    
    // 3. Lógica Especial: Descuento Inmediato y Crédito
    if (movType === 'MERMA' || movType === 'CREDITO_EMPLEADO') {
      const consolidado = {};
      for (const detalle of detallesCreados) {
        if (detalle.platoId) {
          await explodirElemento(detalle.platoId, detalle.cantidad, consolidado);
        }
      }
      for (const [ingredienteId, cantidad] of Object.entries(consolidado)) {
        await descontarDelInventario(ingredienteId, cantidad);
      }

      if (movType === 'CREDITO_EMPLEADO') {
        // Crear Adelanto en lugar de Cuenta por Cobrar
        const adelantoId = crypto.randomUUID();
        const { error: adlErr } = await supabase.from('Adelanto').insert({
          id: adelantoId,
          empleadoId: empleado_id,
          empleado: empleado_nombre || 'Desconocido',
          monto: finalTotal,
          descripcion: `Consumo interno (Comanda #${numero_comanda})`,
          estado: 'PENDIENTE',
          fecha: new Date().toISOString()
        });
        if (adlErr) console.error("Error creando Adelanto para empleado:", adlErr);
      }
      
      return res.json({ ...comanda, detalles: detallesCreados, isSpecialMode: true });
    }

    res.json({ ...comanda, detalles: detallesCreados });

    // 🔔 Notificar a la cocina en tiempo real SOLO si es VENTA
    if (movType === 'VENTA') {
      broadcastCocina('nueva_comanda', {
        id: comandaId,
        numero_comanda,
        mesa_numero: mesa_numero !== undefined ? String(mesa_numero) : null,
        mesero_nombre,
        platos: detallesCreados
      });
    }
  } catch (e) {
    console.error('Error creating comanda', e);
    res.status(500).json({ error: e.message });
  }
});

// Endpoint unificado para pagar y cerrar comanda
router.post('/:id/pagar', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      metodoPago, 
      tasaBs, 
      pagosMixtos, 
      descuentoMonto = 0,
      totalUSD,
      totalVES,
      totalCOP
    } = req.body;

    // 1. Obtener la comanda y sus detalles
    const { data: comanda, error: cErr } = await supabase
      .from('Comanda').select('*, detalles:DetalleComanda(*)').eq('id', id).single();
    if (cErr || !comanda) throw new Error('Comanda no encontrada');

    if (comanda.estado === 'pagada') throw new Error('La comanda ya ha sido pagada');

    // 2. Crear la Venta
    const ventaId = crypto.randomUUID();
    const esMetodoBolivares = metodoPago && metodoPago.endsWith('_bs');
    
    const { data: venta, error: vErr } = await supabase
      .from('Venta')
      .insert({
        id: ventaId,
        fecha_hora: new Date().toISOString(),
        total_venta: totalUSD,
        metodo_pago: metodoPago,
        total_cop: totalCOP,
        total_ves: totalVES,
        monto_original: esMetodoBolivares ? totalVES : totalUSD,
        moneda_original: esMetodoBolivares ? 'VES' : 'USD'
      })
      .select()
      .single();
    if (vErr) throw vErr;

    // 3. Crear detalles de venta a partir de los de la comanda
    const detallesVenta = comanda.detalles.map(d => ({
      id: crypto.randomUUID(),
      ventaId,
      platoId: d.platoId,
      platoNombre: d.platoNombre,
      cantidad: d.cantidad,
      precioUnitario: d.precio,
      subtotal: d.cantidad * d.precio
    }));

    const { error: dvErr } = await supabase.from('DetalleVenta').insert(detallesVenta);
    if (dvErr) throw dvErr;

    // 4. Manejar Pagos Mixtos si existen
    if (metodoPago === 'mixto' && pagosMixtos && pagosMixtos.length > 0) {
      const pagosData = pagosMixtos.map(p => ({
        id: crypto.randomUUID(),
        ventaId,
        monto: p.monto !== undefined ? p.monto : (p.monto_original || 0),
        monto_usd: p.monto_usd,
        monto_original: p.monto_original,
        metodo_pago: p.metodo_pago,
        metodo: p.metodo_pago,
        moneda: p.moneda,
        fecha: new Date().toISOString()
      }));
      const { error: pError } = await supabase.from('PagoMixto').insert(pagosData);
      if (pError) console.error("Error insertando pago mixto:", pError);
    }

    // 5. 🔥 DESCONTAR INVENTARIO (EN EL SERVIDOR)
    const consolidado = {};
    for (const detalle of comanda.detalles) {
      if (detalle.platoId) {
        await explodirElemento(detalle.platoId, detalle.cantidad, consolidado);
      }
    }
    for (const [ingredienteId, cantidad] of Object.entries(consolidado)) {
      await descontarDelInventario(ingredienteId, cantidad);
    }

    // 6. Cerrar Comanda
    const { error: upError } = await supabase
      .from('Comanda')
      .update({
        estado: 'pagada',
        fecha_cierre: new Date().toISOString(),
        total_comanda: totalUSD // Asegurar que el total final sea el cobrado
      })
      .eq('id', id);
    if (upError) throw upError;

    res.json({ ok: true, ventaId });

    // 🔔 Notificar a la cocina que la comanda fue pagada
    broadcastCocina('comanda_pagada', { id, ventaId });
  } catch (e) {
    console.error('Error procesando pago comanda', e);
    res.status(500).json({ error: e.message });
  }
});

// Actualizar comanda
router.put('/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { numero_comanda, mesa_numero, mesero_nombre, fecha_apertura, fecha_cierre, estado, total_comanda, detalles } = req.body;
    
    const updateData = {};
    if (numero_comanda !== undefined) updateData.numero_comanda = numero_comanda;
    if (mesa_numero !== undefined) updateData.mesa_numero = String(mesa_numero);
    if (mesero_nombre !== undefined) updateData.mesero_nombre = mesero_nombre;
    if (fecha_apertura) updateData.fecha_apertura = new Date(fecha_apertura).toISOString();
    if (fecha_cierre) updateData.fecha_cierre = new Date(fecha_cierre).toISOString();
    if (estado !== undefined) updateData.estado = estado;
    if (total_comanda !== undefined) updateData.total_comanda = total_comanda;
    
    const { data: comanda, error } = await supabase
      .from('Comanda')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;

    // Si se envían detalles, sincronizarlos (borrar antiguos e insertar nuevos o lógica de patch)
    // Para simplificar esta versión: si vienen detalles, reemplazamos los existentes
    if (detalles && Array.isArray(detalles)) {
      await supabase.from('DetalleComanda').delete().eq('comandaId', id);
      const detallesData = detalles.map(d => ({
        id: crypto.randomUUID(),
        comandaId: id,
        platoId: d.platoId || d.plato_id,
        platoNombre: d.platoNombre || d.plato_nombre,
        cantidad: d.cantidad,
        precio: d.precio || d.precio_unitario || 0,
        estado_plato: d.estado_plato || 'pendiente',
        notas_plato: d.notas_plato || d.notas || null,
        variante: d.variante || null
      }));
      await supabase.from('DetalleComanda').insert(detallesData);
    }
    
    res.json(comanda);

    // 🔔 Notificar a la cocina de la actualización
    broadcastCocina('comanda_actualizada', { id: req.params.id, ...comanda });
  } catch (e) {
    console.error('Error updating comanda', e);
    res.status(500).json({ error: e.message });
  }
});

// Agregar platos a comanda existente (con notificación a cocina)
router.post('/:id/detalles', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { platos } = req.body; // array de platos

    if (!platos || !platos.length) {
      return res.status(400).json({ error: 'No se enviaron platos' });
    }

    const detallesData = platos.map(d => ({
      id: crypto.randomUUID(),
      comandaId: id,
      platoId: d.plato_id || d.platoId || null,
      platoNombre: d.plato_nombre || d.platoNombre || null,
      cantidad: d.cantidad,
      precio: d.precio_unitario || d.precio || 0,
      estado_plato: 'pendiente',
      notas_plato: d.notas_plato || d.notas || '',
      variante: d.variante || null
    }));

    const { data: creados, error } = await supabase
      .from('DetalleComanda').insert(detallesData).select();
    if (error) throw error;

    res.json(creados);

    // 🔔 Notificar a la cocina: nuevos platos
    broadcastCocina('plato_agregado', { comanda_id: id, platos: creados });
  } catch (e) {
    console.error('Error adding detalles to comanda', e);
    res.status(500).json({ error: e.message });
  }
});

// Actualizar estado de un plato (DetalleComanda)
router.put('/detalles/:detalleId', requireAdmin, async (req, res) => {
  try {
    const { detalleId } = req.params;
    const updateData = {};
    if (req.body.estado_plato) updateData.estado_plato = req.body.estado_plato;
    if (req.body.notas_plato !== undefined) updateData.notas_plato = req.body.notas_plato;
    if (req.body.cantidad !== undefined) updateData.cantidad = req.body.cantidad;

    const { data, error } = await supabase
      .from('DetalleComanda')
      .update(updateData)
      .eq('id', detalleId)
      .select()
      .single();
    if (error) throw error;

    res.json(data);

    // 🔔 Notificar a la cocina del cambio de estado
    broadcastCocina('comanda_actualizada', { detalle: data });
  } catch (e) {
    console.error('Error updating detalle comanda', e);
    res.status(500).json({ error: e.message });
  }
});

// Eliminar comanda
router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    await supabase.from('DetalleComanda').delete().eq('comandaId', id);
    const { error } = await supabase.from('Comanda').delete().eq('id', id);
    if (error) throw error;
    res.json({ success: true });
  } catch (e) {
    console.error('Error deleting comanda', e);
    res.status(500).json({ error: e.message });
  }
});

export default router;
