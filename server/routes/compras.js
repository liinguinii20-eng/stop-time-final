import express from 'express';
import supabase from '../config/supabase.js';
import { requireAuth, requireAdmin } from '../middlewares/auth.js';

const router = express.Router();

router.get('/', requireAuth, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('Compra').select('*')
      .order('fecha_compra', { ascending: false })
      .limit(1000);
    if (error) throw error;
    res.json(data);
  } catch (e) {
    console.error('Error fetching compras', e);
    res.status(500).json({ error: e.message });
  }
});

router.post('/', requireAuth, async (req, res) => {
  try {
    const { 
      ingrediente_id, ingredienteId, 
      ingrediente_nombre, ingredienteNombre, 
      cantidad, 
      unidad_medida, unidadMedida, 
      costo_unitario, costoUnitario, 
      costo_total, costoTotal, 
      proveedor, numero_factura, numeroFactura,
      fecha_compra, fechaCompra, 
      fecha_entrega_estimada, fechaEntregaEstimada, 
      tipo_compra, tipoCompra, 
      estado, 
      empleado_nombre, empleadoNombre, 
      notas 
    } = req.body;

    const { data, error } = await supabase
      .from('Compra')
      .insert({
        id: crypto.randomUUID(),
        ingrediente_id: ingrediente_id || ingredienteId,
        ingrediente_nombre: ingrediente_nombre || ingredienteNombre,
        cantidad,
        unidad_medida: unidad_medida || unidadMedida,
        costo_unitario: costo_unitario || costoUnitario,
        costo_total: costo_total || costoTotal,
        proveedor,
        numero_factura: numero_factura || numeroFactura,
        fecha_compra: (fecha_compra || fechaCompra) ? new Date(fecha_compra || fechaCompra).toISOString() : new Date().toISOString(),
        fecha_entrega_estimada: (fecha_entrega_estimada || fechaEntregaEstimada) ? new Date(fecha_entrega_estimada || fechaEntregaEstimada).toISOString() : null,
        tipo_compra: tipo_compra || tipoCompra,
        estado,
        empleado_nombre: empleado_nombre || empleadoNombre,
        notas
      })
      .select()
      .single();
      
    if (error) throw error;
    res.json(data);
  } catch (e) {
    console.error('Error creating compra', e);
    res.status(500).json({ error: e.message });
  }
});

router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { error } = await supabase.from('Compra').delete().eq('id', id);
    if (error) throw error;
    res.json({ success: true });
  } catch (e) {
    console.error('Error deleting compra', e);
    res.status(500).json({ error: e.message });
  }
});

export default router;
