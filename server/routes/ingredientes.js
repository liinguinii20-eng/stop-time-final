import express from 'express';
import supabase from '../config/supabase.js';
import { requireAuth, requireAdmin } from '../middlewares/auth.js';
import { recalcularCostosEnCascada } from '../services/inventory.js';

const router = express.Router();

router.get('/', requireAuth, async (req, res) => {
  try {
    const { data, error } = await supabase.from('Ingrediente').select('*');
    if (error) throw error;
    res.json(data);
  } catch (e) {
    console.error('Get ingredientes error', e);
    res.status(500).json({ error: e.message });
  }
});

router.post('/', requireAdmin, async (req, res) => {
  try {
    const { nombre, unidad_medida, costo_por_unidad, costoPorUnidad, cantidad_disponible, cantidadDisponible, cantidad_minima, cantidadMinima } = req.body;
    
    const costo = costo_por_unidad ?? costoPorUnidad;
    const cantidadDisp = cantidad_disponible ?? cantidadDisponible;
    const cantidadMin = cantidad_minima ?? cantidadMinima;
    
    const { data, error } = await supabase
      .from('Ingrediente')
      .insert({
        id: crypto.randomUUID(),
        nombre: nombre?.trim().toLowerCase(),
        unidad_medida: unidad_medida || 'kg',
        costo_por_unidad: parseFloat(costo) ?? 0,
        cantidad_disponible: parseFloat(cantidadDisp) ?? 0,
        cantidad_minima: parseFloat(cantidadMin) ?? 0
      })
      .select()
      .single();
    if (error) throw error;
    res.json(data);
  } catch (e) {
    console.error('Error creating ingrediente', e);
    res.status(500).json({ error: e.message });
  }
});

router.put('/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, unidad_medida, unidad_receta, factor_conversion, factorConversion, costo_por_unidad, costoPorUnidad, cantidad_disponible, cantidadDisponible, cantidad_minima, cantidadMinima } = req.body;
    
    // Obtener ingrediente anterior para historial de costos
    const { data: ingredienteAnterior } = await supabase
      .from('Ingrediente').select('*').eq('id', id).single();
    
    if (!ingredienteAnterior) {
      return res.status(404).json({ error: 'Ingrediente no encontrado' });
    }
    
    const nuevoCosto = parseFloat(costo_por_unidad ?? costoPorUnidad) ?? 0;
    
    const { data, error } = await supabase
      .from('Ingrediente')
      .update({
        nombre: nombre?.trim().toLowerCase(),
        unidad_medida: unidad_medida || 'kg',
        unidad_receta,
        factor_conversion: parseFloat(factor_conversion ?? factorConversion) || 1,
        costo_por_unidad: nuevoCosto,
        cantidad_disponible: parseFloat(cantidad_disponible ?? cantidadDisponible) ?? 0,
        cantidad_minima: parseFloat(cantidad_minima ?? cantidadMinima) ?? 0
      })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    
    // Guardar historial de costos si cambió
    if (ingredienteAnterior.costo_por_unidad !== nuevoCosto) {
      await supabase.from('HistorialCostoIngrediente').insert({
        id: crypto.randomUUID(),
        ingredienteId: id,
        costoAnterior: ingredienteAnterior.costo_por_unidad,
        costoNuevo: nuevoCosto
      });
      
      // Lanzar el recálculo en segundo plano
      recalcularCostosEnCascada(id);
    }
    
    res.json(data);
  } catch (e) {
    console.error('Error updating ingrediente', e);
    res.status(500).json({ error: e.message });
  }
});

router.put('/:id/stock', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { cantidad_disponible } = req.body;
    
    const { data, error } = await supabase
      .from('Ingrediente')
      .update({ cantidad_disponible: parseFloat(cantidad_disponible) })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    res.json(data);
  } catch (e) {
    console.error('Error updating ingrediente stock', e);
    res.status(500).json({ error: e.message });
  }
});

router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { error } = await supabase.from('Ingrediente').delete().eq('id', id);
    if (error) throw error;
    res.json({ success: true });
  } catch (e) {
    console.error('Error deleting ingrediente', e);
    res.status(500).json({ error: e.message });
  }
});

export default router;
