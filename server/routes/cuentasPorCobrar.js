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

export default router;
