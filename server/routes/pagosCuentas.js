import express from 'express';
import supabase from '../config/supabase.js';
import { requireAuth, requireAdmin } from '../middlewares/auth.js';

const router = express.Router();

router.get('/', requireAuth, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('PagoCuentaPorCobrar')
      .select('*')
      .order('fecha_pago', { ascending: false, nullsFirst: false });
    if (error) throw error;
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/', requireAdmin, async (req, res) => {
  try {
    const body = req.body;

    // Robustly extract metodo_pago accepting both camelCase and snake_case
    const metodo_pago = body.metodo_pago || body.metodoPago || 'efectivo_usd';

    const insertData = {
      id: body.id || crypto.randomUUID(),
      cuenta_id: body.cuenta_id || body.cuentaId || null,
      monto_pagado: parseFloat(body.monto_pagado ?? body.montoPagado ?? 0),
      metodo_pago,
      fecha_pago: body.fecha_pago || body.fechaPago || new Date().toISOString(),
      tasa_bs_aplicada: parseFloat(body.tasa_bs_aplicada ?? body.tasaBsAplicada ?? 0),
      notas: body.notas ?? body.descripcion ?? '',
      empleado_nombre: body.empleado_nombre || body.empleadoNombre || 'Sistema'
    };

    console.log('[PagosCuentas] Insertando pago de crédito:', JSON.stringify(insertData));

    const { data, error } = await supabase
      .from('PagoCuentaPorCobrar')
      .insert(insertData)
      .select()
      .single();
    if (error) throw error;
    res.json(data);
  } catch (e) {
    console.error('[PagosCuentas] Error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

export default router;
