import express from 'express';
import supabase from '../config/supabase.js';
import { requireAuth, requireAdmin } from '../middlewares/auth.js';

const router = express.Router();

router.get('/', requireAuth, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('Gasto').select('*')
      .neq('estado', 'ARCHIVADO')
      .order('fecha', { ascending: false })
      .limit(1000);
    if (error) throw error;
    res.json(data);
  } catch (e) {
    console.error('Error fetching gastos', e);
    res.status(500).json({ error: e.message });
  }
});

router.post('/', requireAdmin, async (req, res) => {
  try {
    const { descripcion, monto, categoria, categoriaNombre, fecha, metodo_pago, metodoPago, monto_original, moneda_original } = req.body;
    const { data, error } = await supabase
      .from('Gasto')
      .insert({
        id: crypto.randomUUID(),
        descripcion,
        monto: monto || 0,
        monto_original: monto_original || monto || 0,
        moneda_original: moneda_original || 'usd',
        metodo_pago: metodo_pago || metodoPago || 'efectivo_usd',
        categoriaNombre: categoriaNombre || categoria || null,
        fecha: fecha ? new Date(fecha).toISOString() : new Date().toISOString()
      })
      .select()
      .single();
    if (error) throw error;
    res.json(data);
  } catch (e) {
    console.error('Error creating gasto', e);
    res.status(500).json({ error: e.message });
  }
});

router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { error } = await supabase.from('Gasto').delete().eq('id', id);
    if (error) throw error;
    res.json({ success: true });
  } catch (e) {
    console.error('Error deleting gasto', e);
    res.status(500).json({ error: e.message });
  }
});

export default router;
