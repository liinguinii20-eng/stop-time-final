import express from 'express';
import supabase from '../config/supabase.js';
import { requireAuth, requireAdmin } from '../middlewares/auth.js';

const router = express.Router();

// Helper: extraer valor de campo con múltiples nombres posibles
const pick = (obj, ...keys) => {
  for (const k of keys) {
    if (obj[k] !== undefined && obj[k] !== null) return obj[k];
  }
  return undefined;
};

// Obtener todos los platos con sus recetas
router.get('/', requireAuth, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('Plato')
      .select('*, recetas:Receta(*)');
    if (error) throw error;
    res.json(data);
  } catch (e) {
    console.error('Get platos error', e);
    res.status(500).json({ error: e.message });
  }
});

// Crear plato con receta
router.post('/', requireAdmin, async (req, res) => {
  try {
    const body = req.body;
    
    const nombre = body.nombre;
    const descripcion = body.descripcion;
    const precio = parseFloat(pick(body, 'precio')) || 0;
    const categoria = body.categoria;
    const activo = pick(body, 'activo') !== false;
    const tiene_piezas = pick(body, 'tiene_piezas', 'tienePiezas') || false;
    const precio_6 = parseFloat(pick(body, 'precio_6', 'precio6')) || 0;
    const precio_12 = parseFloat(pick(body, 'precio_12', 'precio12')) || 0;
    const costo_total = parseFloat(pick(body, 'costo_total', 'costoTotal')) || 0;
    const precio_sugerido = parseFloat(pick(body, 'precio_sugerido', 'precioSugerido')) || 0;
    const permitir_merma = pick(body, 'permitir_merma', 'permitirMerma') || false;
    const permitir_credito_empleado = pick(body, 'permitir_credito_empleado', 'permitirCreditoEmpleado') || false;
    const recetas = body.recetas;
    
    const platoId = crypto.randomUUID();
    
    const { data: plato, error: pError } = await supabase
      .from('Plato')
      .insert({
        id: platoId,
        nombre,
        descripcion,
        precio,
        categoria,
        activo,
        tiene_piezas,
        precio_6,
        precio_12,
        costo_total,
        precio_sugerido,
        permitir_merma,
        permitir_credito_empleado
      })
      .select().single();
    if (pError) throw pError;

    // Insertar recetas si vienen
    if (recetas && Array.isArray(recetas) && recetas.length > 0) {
      const recetasData = recetas.map(r => ({
        id: crypto.randomUUID(),
        platoId: platoId,
        ingredienteId: pick(r, 'ingredienteId', 'ingrediente_id', 'id'),
        ingredienteNombre: pick(r, 'ingredienteNombre', 'ingrediente_nombre', 'nombre') || 'Sin nombre',
        tipo: r.tipo || 'ingrediente',
        cantidad_requerida: parseFloat(pick(r, 'cantidad_requerida', 'cantidadRequerida', 'cantidad')) || 0,
        costo_ingrediente: parseFloat(pick(r, 'costo_ingrediente', 'costoIngrediente')) || 0
      }));
      
      const { error: rError } = await supabase.from('Receta').insert(recetasData);
      if (rError) console.error('Error insertando recetas:', rError.message);
    }

    // Devolver plato con recetas incluidas
    const { data: platoCompleto } = await supabase
      .from('Plato')
      .select('*, recetas:Receta(*)')
      .eq('id', platoId)
      .single();

    res.json(platoCompleto || plato);
  } catch (e) {
    console.error('Create plato error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// Actualizar plato
router.put('/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const body = req.body;

    const nombre = body.nombre;
    const descripcion = body.descripcion;
    const precio = parseFloat(pick(body, 'precio')) || 0;
    const categoria = body.categoria;
    const activo = pick(body, 'activo') !== false;
    const tiene_piezas = pick(body, 'tiene_piezas', 'tienePiezas') || false;
    const precio_6 = parseFloat(pick(body, 'precio_6', 'precio6')) || 0;
    const precio_12 = parseFloat(pick(body, 'precio_12', 'precio12')) || 0;
    const costo_total = parseFloat(pick(body, 'costo_total', 'costoTotal')) || 0;
    const precio_sugerido = parseFloat(pick(body, 'precio_sugerido', 'precioSugerido')) || 0;
    const permitir_merma = pick(body, 'permitir_merma', 'permitirMerma') || false;
    const permitir_credito_empleado = pick(body, 'permitir_credito_empleado', 'permitirCreditoEmpleado') || false;
    const recetas = body.recetas;

    console.log("==> PUT /platos/:id", id);
    console.log("==> BODY RECIBIDO:", JSON.stringify(body).slice(0, 500));
    console.log("==> VALORES EXTRAIDOS:", { permitir_merma, permitir_credito_empleado });

    const { data: plato, error: pError } = await supabase
      .from('Plato')
      .update({
        nombre,
        descripcion,
        precio,
        categoria,
        activo,
        tiene_piezas,
        precio_6,
        precio_12,
        costo_total,
        precio_sugerido,
        permitir_merma,
        permitir_credito_empleado
      })
      .eq('id', id)
      .select().single();
    if (pError) throw pError;

    // Reemplazar recetas si vienen
    if (recetas && Array.isArray(recetas)) {
      // Borrar recetas existentes
      await supabase.from('Receta').delete().eq('platoId', id);
      
      // Insertar nuevas
      if (recetas.length > 0) {
        const recetasData = recetas.map(r => ({
          id: crypto.randomUUID(),
          platoId: id,
          ingredienteId: pick(r, 'ingredienteId', 'ingrediente_id', 'id'),
          ingredienteNombre: pick(r, 'ingredienteNombre', 'ingrediente_nombre', 'nombre') || 'Sin nombre',
          tipo: r.tipo || 'ingrediente',
          cantidad_requerida: parseFloat(pick(r, 'cantidad_requerida', 'cantidadRequerida', 'cantidad')) || 0,
          costo_ingrediente: parseFloat(pick(r, 'costo_ingrediente', 'costoIngrediente')) || 0
        }));
        
        const { error: rError } = await supabase.from('Receta').insert(recetasData);
        if (rError) console.error('Error insertando recetas:', rError.message);
      }
    }

    // Devolver plato con recetas incluidas
    const { data: platoCompleto } = await supabase
      .from('Plato')
      .select('*, recetas:Receta(*)')
      .eq('id', id)
      .single();

    res.json(platoCompleto || plato);
  } catch (e) {
    console.error('Update plato error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// ELIMINAR PLATO
router.delete('/:id', requireAdmin, async (req, res) => {
  const platoId = req.params.id;
  try {
    // 1. Limpiar TODAS las dependencias posibles (silenciosamente)
    await Promise.allSettled([
      supabase.from('Receta').delete().eq('platoId', platoId),
      supabase.from('Receta').delete().eq('ingredienteId', platoId),
      supabase.from('DetalleComanda').update({ platoId: null }).eq('platoId', platoId),
      supabase.from('DetalleVenta').update({ platoId: null }).eq('platoId', platoId),
      supabase.from('DetalleRecetaPrimaria').delete().eq('ingredienteId', platoId),
      supabase.from('DetalleRecetaSecundaria').delete().eq('elementoId', platoId)
    ]);

    // 2. Borrar el plato
    const { error } = await supabase
      .from('Plato')
      .delete()
      .eq('id', platoId);

    if (error) throw error;

    res.json({ success: true });
  } catch (e) {
    console.error('Error crítico al eliminar plato:', e.message);
    res.status(500).json({ error: e.message });
  }
});

export default router;
