import express from 'express';
import supabase from '../config/supabase.js';
import { requireAuth, requireAdmin } from '../middlewares/auth.js';
import { explodirElemento, descontarDelInventario } from '../services/inventory.js';

const router = express.Router();

router.get('/', requireAuth, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('Venta')
      .select('*, detalles:DetalleVenta(*)')
      .neq('estado', 'ARCHIVADO')
      .order('fecha_hora', { ascending: false })
      .limit(1000);
    if (error) throw error;
    res.json(data);
  } catch (e) {
    console.error('Error fetching ventas', e);
    res.status(500).json({ error: e.message });
  }
});

router.post('/', requireAdmin, async (req, res) => {
  try {
    const { total_venta, metodo_pago, detalles } = req.body;
    const ventaId = crypto.randomUUID();
    
    const { data: venta, error: ventaError } = await supabase
      .from('Venta')
      .insert({ id: ventaId, total_venta, metodo_pago })
      .select()
      .single();
    if (ventaError) throw ventaError;
    
    let detallesCreados = [];
    if (detalles && detalles.length > 0) {
      const detallesData = detalles.map(d => ({
        id: crypto.randomUUID(),
        ventaId,
        platoId: d.plato_id || d.platoId || null,
        platoNombre: d.plato_nombre || d.platoNombre || null,
        cantidad: d.cantidad,
        precioUnitario: d.precio_unitario || d.precioUnitario || 0,
        subtotal: d.subtotal || 0
      }));
      
      const { data: det, error: detError } = await supabase
        .from('DetalleVenta').insert(detallesData).select();
      if (detError) throw detError;
      detallesCreados = det;
    }

    // Descontar stock automáticamente
    const consolidado = {};
    for (const detalle of detallesCreados) {
      if (detalle.platoId) {
        await explodirElemento(detalle.platoId, detalle.cantidad, consolidado);
      }
    }
    for (const [ingredienteId, cantidad] of Object.entries(consolidado)) {
      await descontarDelInventario(ingredienteId, cantidad);
    }

    res.json({ ...venta, detalles: detallesCreados });
  } catch (e) {
    console.error('Error creating venta', e);
    res.status(500).json({ error: e.message });
  }
});

export default router;
