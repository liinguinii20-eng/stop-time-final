import express from 'express';
import supabase from '../config/supabase.js';
import { requireAuth, requireAdmin } from '../middlewares/auth.js';

const router = express.Router();

router.get('/', requireAuth, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('CuentaPorCobrar')
      .select('*')
      .order('fecha_creacion', { ascending: false, nullsFirst: false });
    if (error) throw error;
    
    // Normalize data for frontend
    const normalizedData = data.map(item => ({
      ...item,
      cliente_nombre: item.cliente_nombre || item.clienteNombre,
      empleado_id: item.empleado_id || item.empleadoId,
      fecha_vencimiento: item.fecha_vencimiento || item.vencimiento
    }));
    
    res.json(normalizedData);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/', requireAdmin, async (req, res) => {
  try {
    const body = req.body;
    const insertData = {
      id: body.id || crypto.randomUUID(),
      clienteNombre: body.clienteNombre || body.cliente_nombre || 'Cliente sin nombre',
      empleadoId: body.empleadoId || body.empleado_id || null,
      monto: parseFloat(body.monto || body.monto_total || 0),
      monto_total: parseFloat(body.monto_total || body.monto || 0),
      monto_pendiente: parseFloat(body.monto_pendiente || body.monto_total || body.monto || 0),
      monto_descontado: parseFloat(body.monto_descontado || 0),
      estado: body.estado || 'pendiente',
      comanda_numero: body.comanda_numero || null,
      cliente_telefono: body.cliente_telefono || null,
      vencimiento: body.vencimiento || body.fecha_vencimiento || null,
      fecha_creacion: body.fecha_creacion || new Date().toISOString()
    };

    console.log('[CuentasPorCobrar] Creando cuenta:', JSON.stringify(insertData));

    const { data, error } = await supabase
      .from('CuentaPorCobrar')
      .insert(insertData)
      .select()
      .single();
    if (error) throw error;
    
    // Normalize for frontend
    const normalized = {
      ...data,
      cliente_nombre: data.clienteNombre,
      empleado_id: data.empleadoId,
      fecha_vencimiento: data.vencimiento
    };
    
    res.json(normalized);
  } catch (e) {
    console.error('[CuentasPorCobrar] Error creando:', e.message);
    res.status(500).json({ error: e.message });
  }
});

router.put('/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { data, error } = await supabase
      .from('CuentaPorCobrar')
      .update(req.body)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { error } = await supabase
      .from('CuentaPorCobrar')
      .delete()
      .eq('id', id);
    if (error) throw error;
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
