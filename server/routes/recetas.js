import express from 'express';
import supabase from '../config/supabase.js';
import { requireAuth, requireAdmin } from '../middlewares/auth.js';

const router = express.Router();

router.get('/', requireAuth, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('Receta')
      .select('*, plato:Plato(*)');
    if (error) throw error;
    res.json(data);
  } catch (e) {
    console.error('Get recetas error', e);
    res.status(500).json({ error: e.message });
  }
});

router.post('/', requireAdmin, async (req, res) => {
  try {
    const { platoId, ingredienteId, ingredienteNombre, cantidad_requerida, cantidadRequerida, costo_ingrediente, costoIngrediente, tipo, plato_nombre } = req.body;
    console.log('Body recibido en backend:', req.body);
    
    // Accept both camelCase (from apiAdapter) and snake_case
    const finalCantidad = parseFloat(cantidad_requerida || cantidadRequerida) || 0;
    const finalCosto = parseFloat(costo_ingrediente || costoIngrediente) || 0;

    const { data, error } = await supabase
      .from('Receta')
      .insert({
        id: crypto.randomUUID(),
        platoId: platoId || req.body.plato_id,
        ingredienteId: ingredienteId || req.body.ingrediente_id,
        ingredienteNombre: ingredienteNombre || req.body.ingrediente_nombre,
        tipo: tipo || 'ingrediente',
        cantidad_requerida: finalCantidad,
        costo_ingrediente: finalCosto,
        plato_nombre: plato_nombre
      })
      .select()
      .single();
    if (error) throw error;
    res.json(data);
  } catch (e) {
    console.error('Create receta error', e);
    res.status(500).json({ error: e.message });
  }
});

router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { error } = await supabase.from('Receta').delete().eq('id', id);
    if (error) throw error;
    res.json({ success: true });
  } catch (e) {
    console.error('Delete receta error', e);
    res.status(500).json({ error: e.message });
  }
});

export default router;
