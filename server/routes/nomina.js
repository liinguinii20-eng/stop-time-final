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

    // 2. Obtener adelantos PENDIENTES de este empleado
    const { data: adelantos, error: adelError } = await supabase
      .from('Adelanto')
      .select('*')
      .eq('empleadoId', empleadoId)
      .eq('estado', 'PENDIENTE')
      .order('fecha', { ascending: true });
    if (adelError) throw adelError;

    const totalAdelantos = (adelantos ?? []).reduce((sum, a) => sum + (a.monto ?? 0), 0);
    const salarioBase = empleado.salario_base ?? 0;
    const salarioNeto = salarioBase - totalAdelantos;

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
      adelanto_ids = [],       // IDs de adelantos a descontar
      total_adelantos,
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

    // 2. Marcar adelantos como DESCONTADO
    if (adelanto_ids.length > 0) {
      const { error: adelError } = await supabase
        .from('Adelanto')
        .update({
          estado: 'DESCONTADO',
          fecha_descuento: now,
          nomina_id: nominaId,
        })
        .in('id', adelanto_ids);
      if (adelError) {
        console.error('Error actualizando adelantos:', adelError);
        // No bloquear el pago por esto
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
      adelantos_descontados: adelanto_ids.length,
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
      // Revertir adelantos asociados a estado PENDIENTE
      const { error: revertError } = await supabase
        .from('Adelanto')
        .update({ estado: 'PENDIENTE', fecha_descuento: null, nomina_id: null })
        .eq('nomina_id', id);
      if (revertError) console.error('Error revirtiendo adelantos:', revertError);
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
