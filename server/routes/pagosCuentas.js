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
    const { createdAt, metodoPago, ...bodyData } = req.body;
    
    if (metodoPago) {
      bodyData.metodo_pago = metodoPago;
    }

    const { data, error } = await supabase
      .from('PagoCuentaPorCobrar')
      .insert({
        ...bodyData,
        id: bodyData.id || crypto.randomUUID()
      })
      .select()
      .single();
    if (error) throw error;
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
