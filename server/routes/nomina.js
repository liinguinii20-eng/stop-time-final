import express from 'express';
import supabase from '../config/supabase.js';
import { requireAuth, requireAdmin } from '../middlewares/auth.js';

const router = express.Router();

// ─── GET /api/nomina ── Listar todas las nóminas ─────────────────────────
router.get('/', requireAuth, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('Nomina')
      .select('*')
      .neq('estado', 'ARCHIVADO')
      .order('fecha_pago', { ascending: false })
      .limit(500);
    if (error) throw error;
    res.json(data ?? []);
  } catch (e) {
    console.error('Error fetching nominas', e);
    res.status(500).json({ error: e.message });
  }
});

// ─── GET /api/nomina/preview/:empleadoId ── Preview de nómina ────────────
// Calcula el neto sin persistir: salario_base − adelantos PENDIENTES
router.get('/preview/:empleadoId', requireAuth, async (req, res) => {
  try {
    const { empleadoId } = req.params;

    // 1. Obtener empleado
    const { data: empleado, error: empError } = await supabase
      .from('Empleado')
      .select('*')
      .eq('id', empleadoId)
      .single();
    if (empError) throw empError;
    if (!empleado) return res.status(404).json({ error: 'Empleado no encontrado' });

    // 2. Obtener adelantos PENDIENTES, PARCIALES o POSPUESTOS de este empleado
    const { data: adelantos, error: adelError } = await supabase
      .from('Adelanto')
      .select('*')
      .eq('empleadoId', empleadoId)
      .in('estado', ['PENDIENTE', 'PARCIAL', 'POSPUESTO'])
      .order('fecha', { ascending: true });
    if (adelError) throw adelError;

    const totalAdelantos = (adelantos ?? []).reduce((sum, a) => sum + (a.monto_pendiente ?? a.monto ?? 0), 0);
    const salarioBase = empleado.salario_base ?? 0;
    
    // 2.5 Obtener cuentas por cobrar (créditos) PENDIENTES, PARCIALES o POSPUESTOS de este empleado
    const { data: cuentas, error: cuentasError } = await supabase
      .from('CuentaPorCobrar')
      .select('*')
      .eq('empleadoId', empleadoId)
      .in('estado', ['pendiente', 'PARCIAL', 'POSPUESTO'])
      .order('fecha_creacion', { ascending: true });
    if (cuentasError) throw cuentasError;

    const totalCuentas = (cuentas ?? []).reduce((sum, c) => sum + (c.monto_pendiente ?? c.monto ?? 0), 0);
    const salarioNeto = salarioBase - totalAdelantos - totalCuentas;

    // 3. Obtener tasa de cambio activa más reciente
    const { data: tasas } = await supabase
      .from('TasaCambio')
      .select('*')
      .eq('activa', true)
      .order('created_date', { ascending: false })
      .limit(1);
    const tasaActual = tasas?.[0] ?? null;

    res.json({
      empleado: {
        id: empleado.id,
        nombre: empleado.nombre,
        cargo: empleado.cargo,
        salario_base: salarioBase,
        cedula: empleado.cedula,
        telefono: empleado.telefono,
      },
      adelantos: adelantos ?? [],
      totalAdelantos,
      cuentas: cuentas ?? [],
      totalCuentas,
      salarioNeto,
      tasa: tasaActual ? {
        tasa_bs_usd: tasaActual.tasa_bs_usd,
        tasa_cop_usd: tasaActual.tasa_cop_usd,
        fecha: tasaActual.fecha,
      } : null,
    });
  } catch (e) {
    console.error('Error preview nómina', e);
    res.status(500).json({ error: e.message });
  }
});

// ─── POST /api/nomina/pagar ── Ejecutar pago de nómina ───────────────────
router.post('/pagar', requireAdmin, async (req, res) => {
  try {
    const {
      empleado_id,
      empleado_nombre,
      salario_base,
      adelantos_a_descontar = [], // Array de objetos { id, monto_a_descontar, monto_pendiente_original }
      total_adelantos,
      cuentas_a_descontar = [], // Array de objetos { id, monto_a_descontar, monto_pendiente_original }
      total_cuentas,
      salario_neto,
      metodo_pago,             // efectivo_usd, zelle, binance, nequi, pago_movil, etc.
      moneda_pago = 'USD',     // USD, BS, COP
      tasa_cambio = 1,
      monto_convertido,
      periodo_inicio,
      periodo_fin,
      notas,
    } = req.body;

    // Validaciones
    if (!empleado_id) return res.status(400).json({ error: 'empleado_id es requerido' });
    if (salario_neto === undefined) return res.status(400).json({ error: 'salario_neto es requerido' });
    if (!metodo_pago) return res.status(400).json({ error: 'metodo_pago es requerido' });

    const nominaId = crypto.randomUUID();
    const now = new Date().toISOString();

    // 1. Crear registro de Nómina
    const { data: nomina, error: nomError } = await supabase
      .from('Nomina')
      .insert({
        id: nominaId,
        empleado_id,
        empleado_nombre: empleado_nombre ?? 'Sin nombre',
        periodo_inicio: periodo_inicio ?? null,
        periodo_fin: periodo_fin ?? null,
        salario_base: salario_base ?? 0,
        total_adelantos: total_adelantos ?? 0,
        total_cuentas: total_cuentas ?? 0,
        salario_neto: salario_neto ?? 0,
        metodo_pago,
        moneda_pago,
        tasa_cambio: tasa_cambio ?? 1,
        monto_convertido: monto_convertido ?? salario_neto ?? 0,
        estado: 'PAGADO',
        notas: notas ?? null,
        fecha_pago: now,
      })
      .select()
      .single();
    if (nomError) throw nomError;

    // 2. Actualizar adelantos según el pago parcial o total
    if (adelantos_a_descontar.length > 0) {
      for (const ad of adelantos_a_descontar) {
        const monto_descontado_ahora = ad.monto_a_descontar || 0;
        const monto_pendiente_anterior = ad.monto_pendiente_original || 0;
        
        let nuevo_estado;
        let nuevo_monto_pendiente = monto_pendiente_anterior - monto_descontado_ahora;
        
        // Obtener el adelanto actual para saber cuánto se había descontado antes (si es necesario)
        const { data: currentAd } = await supabase.from('Adelanto').select('monto_descontado').eq('id', ad.id).single();
        const monto_descontado_previo = currentAd?.monto_descontado || 0;
        const nuevo_monto_descontado_total = monto_descontado_previo + monto_descontado_ahora;

        if (monto_descontado_ahora === 0) {
          nuevo_estado = 'POSPUESTO';
          nuevo_monto_pendiente = monto_pendiente_anterior;
        } else if (nuevo_monto_pendiente <= 0) {
          nuevo_estado = 'DESCONTADO';
          nuevo_monto_pendiente = 0;
        } else {
          nuevo_estado = 'PARCIAL';
        }

        const { error: adelError } = await supabase
          .from('Adelanto')
          .update({
            estado: nuevo_estado,
            monto_pendiente: nuevo_monto_pendiente,
            monto_descontado: nuevo_monto_descontado_total,
            fecha_descuento: now,
            nomina_id: nominaId,
          })
          .eq('id', ad.id);
          
        if (adelError) {
          console.error(`Error actualizando adelanto ${ad.id}:`, adelError);
        }
      }
    }

    // 2.5 Marcar cuentas por cobrar según pago parcial o total
    if (cuentas_a_descontar.length > 0) {
      for (const cta of cuentas_a_descontar) {
        const monto_descontado_ahora = cta.monto_a_descontar || 0;
        const monto_pendiente_anterior = cta.monto_pendiente_original || 0;
        
        let nuevo_estado;
        let nuevo_monto_pendiente = monto_pendiente_anterior - monto_descontado_ahora;
        
        const { data: currentCta } = await supabase.from('CuentaPorCobrar').select('monto_descontado').eq('id', cta.id).single();
        const monto_descontado_previo = currentCta?.monto_descontado || 0;
        const nuevo_monto_descontado_total = monto_descontado_previo + monto_descontado_ahora;

        if (monto_descontado_ahora === 0) {
          nuevo_estado = 'POSPUESTO'; // O 'pendiente' si POSPUESTO no existe en frontend para cuentas, pero usaremos POSPUESTO
          nuevo_monto_pendiente = monto_pendiente_anterior;
        } else if (nuevo_monto_pendiente <= 0) {
          nuevo_estado = 'pagada';
          nuevo_monto_pendiente = 0;
        } else {
          nuevo_estado = 'PARCIAL';
        }

        const { error: cuentaError } = await supabase
          .from('CuentaPorCobrar')
          .update({
            estado: nuevo_estado,
            monto_pendiente: nuevo_monto_pendiente,
            monto_descontado: nuevo_monto_descontado_total
          })
          .eq('id', cta.id);
          
        if (cuentaError) {
          console.error(`Error actualizando cuenta por cobrar ${cta.id}:`, cuentaError);
        } else if (monto_descontado_ahora > 0) {
          // Log payment
          await supabase.from('PagoCuentaPorCobrar').insert({
            id: crypto.randomUUID(),
            cuenta_id: cta.id,
            cuentaId: cta.id,
            monto: monto_descontado_ahora,
            monto_pagado: monto_descontado_ahora,
            metodo: 'descuento_nomina',
            metodo_pago: 'descuento_nomina',
            fecha: now,
            fecha_pago: now,
            notas: `Descuento por nómina (Nomina ID: ${nominaId})`,
            empleado_nombre: empleado_nombre ?? 'Sistema'
          });
        }
      }
    }

    // 3. Integración con Arqueo de Caja: Registrar pago como EGRESO (para todos los métodos de pago)
    const montoEgresoUSD = salario_neto ?? 0;

    const { error: gastoError } = await supabase
      .from('Gasto')
      .insert({
        id: crypto.randomUUID(),
        descripcion: `Nómina: ${empleado_nombre ?? 'Empleado'} (${periodo_inicio ?? 'N/A'} - ${periodo_fin ?? 'N/A'})`,
        monto: montoEgresoUSD,
        monto_original: monto_convertido ?? montoEgresoUSD,
        moneda_original: moneda_pago ?? 'USD',
        metodo_pago: metodo_pago,
        categoriaNombre: 'Nómina',
        fecha: now,
      });
      
    if (gastoError) {
      console.error('Error registrando egreso en caja:', gastoError);
      // No bloquear el pago por esto, pero logueamos
    } else {
      console.log(`✅ Egreso de nómina registrado en caja: $${montoEgresoUSD} USD via ${metodo_pago}`);
    }

    res.json({
      success: true,
      nomina,
      adelantos_descontados: adelantos_a_descontar.length,
      egreso_registrado: true,
    });
  } catch (e) {
    console.error('Error procesando pago de nómina', e);
    res.status(500).json({ error: e.message });
  }
});

// ─── DELETE /api/nomina/:id ── Anular nómina ─────────────────────────────
router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    // Obtener la nómina para revertir adelantos
    const { data: nomina } = await supabase
      .from('Nomina')
      .select('*')
      .eq('id', id)
      .single();

    if (nomina) {
      // Revertir adelantos asociados a esta nómina a estado PENDIENTE/PARCIAL
      // Not perfect for partials because we don't track history of partial payments, but sets them back to pending
      // Ideal way: we should revert monto_pendiente and monto_descontado. 
      // For now, reset to PENDIENTE and assume the whole amount is pending again (simple fallback).
      const { data: adelantosRevert } = await supabase.from('Adelanto').select('*').eq('nomina_id', id);
      if (adelantosRevert && adelantosRevert.length > 0) {
        for (const ad of adelantosRevert) {
          await supabase.from('Adelanto').update({
            estado: 'PENDIENTE',
            monto_pendiente: ad.monto_pendiente + ad.monto_descontado, // simplistic revert
            monto_descontado: 0,
            fecha_descuento: null,
            nomina_id: null
          }).eq('id', ad.id);
        }
      }
    }

    // Marcar como anulada (no eliminar para auditoría)
    const { error } = await supabase
      .from('Nomina')
      .update({ estado: 'ANULADO' })
      .eq('id', id);
    if (error) throw error;

    res.json({ success: true });
  } catch (e) {
    console.error('Error anulando nómina', e);
    res.status(500).json({ error: e.message });
  }
});

export default router;
