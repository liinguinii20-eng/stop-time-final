import supabase from '../config/supabase.js';

/**
 * Explode an element recursively to find all base ingredients.
 * @param {string} elementoId - UUID of the element
 * @param {number} cantidad - Quantity to explode
 * @param {object} consolidado - Accumulated ingredient quantities
 * @param {string|null} tipoHint - Optional type hint ('ingrediente', 'receta_primaria', 'receta_secundaria', 'plato')
 *                                  When provided, searches in the hinted table FIRST for efficiency and correctness.
 */
export async function explodirElemento(elementoId, cantidad, consolidado = {}, tipoHint = null) {
  if (!elementoId) return consolidado;
  
  const qty = parseFloat(cantidad);
  if (isNaN(qty) || qty <= 0) {
    console.log(`[INVENTARIO] ⚠️ Cantidad inválida para elemento ${elementoId}: ${cantidad} → parseFloat=${qty}`);
    return consolidado;
  }
  console.log(`[INVENTARIO] 🔍 Explorando elemento ${elementoId} con cantidad=${qty}${tipoHint ? ` (tipo: ${tipoHint})` : ''}`);

  // --- Helper functions for each entity type ---
  const buscarIngrediente = async () => {
    const { data: ingrediente } = await supabase
      .from('Ingrediente').select('*').eq('id', elementoId).maybeSingle();
    if (ingrediente) {
      if (!consolidado[elementoId]) consolidado[elementoId] = 0;
      consolidado[elementoId] += qty;
      console.log(`[INVENTARIO] 🟢 Ingrediente "${ingrediente.nombre}" += ${qty} → total acumulado: ${consolidado[elementoId]}`);
      return true;
    }
    return false;
  };

  const buscarRecetaPrimaria = async () => {
    const { data: recetaPrimaria } = await supabase
      .from('RecetaPrimaria')
      .select('*, detalles:DetalleRecetaPrimaria(*)')
      .eq('id', elementoId).maybeSingle();
    if (recetaPrimaria) {
      const factor = parseFloat(recetaPrimaria.cantidadResultante) || 1;
      console.log(`[INVENTARIO] 🔵 RecetaPrimaria "${recetaPrimaria.nombre}" (factor=${factor})`);
      for (const detalle of recetaPrimaria.detalles) {
        const cantHijo = (qty * parseFloat(detalle.cantidad)) / factor;
        const subTipo = detalle.tipoElemento || null;
        console.log(`[INVENTARIO]   └─ Detalle: ${detalle.ingredienteId} (${subTipo || 'auto'}) × ${detalle.cantidad} / ${factor} = ${cantHijo}`);
        await explodirElemento(detalle.ingredienteId, cantHijo, consolidado, subTipo);
      }
      return true;
    }
    return false;
  };

  const buscarRecetaSecundaria = async () => {
    const { data: recetaSecundaria } = await supabase
      .from('RecetaSecundaria')
      .select('*, detalles:DetalleRecetaSecundaria(*)')
      .eq('id', elementoId).maybeSingle();
    if (recetaSecundaria) {
      const factor = parseFloat(recetaSecundaria.cantidadResultante) || 1;
      console.log(`[INVENTARIO] 🟣 RecetaSecundaria "${recetaSecundaria.nombre}" (factor=${factor})`);
      for (const detalle of recetaSecundaria.detalles) {
        const cantHijo = (qty * parseFloat(detalle.cantidad)) / factor;
        const subTipo = detalle.tipoElemento || null;
        console.log(`[INVENTARIO]   └─ Detalle: ${detalle.elementoId} (${subTipo || 'auto'}) × ${detalle.cantidad} / ${factor} = ${cantHijo}`);
        await explodirElemento(detalle.elementoId, cantHijo, consolidado, subTipo);
      }
      return true;
    }
    return false;
  };

  const buscarPlato = async () => {
    const { data: plato } = await supabase
      .from('Plato')
      .select('*, recetas:Receta(*)')
      .eq('id', elementoId).maybeSingle();
    if (plato) {
      console.log(`[INVENTARIO] 🟡 Plato "${plato.nombre}" con ${plato.recetas.length} componentes`);
      for (const receta of plato.recetas) {
        const subId = receta.ingredienteId || receta.ingrediente_id;
        const subQty = qty * parseFloat(receta.cantidad_requerida);
        const subTipo = receta.tipo || null;
        console.log(`[INVENTARIO]   └─ Receta: ${receta.ingredienteNombre || subId} (${subTipo || 'auto'}) × ${receta.cantidad_requerida} = ${subQty}`);
        // Pass the tipo from Receta so the recursive call searches in the correct table first
        await explodirElemento(subId, subQty, consolidado, subTipo);
      }
      return true;
    }
    return false;
  };

  // --- Search order based on tipoHint ---
  // When tipoHint is provided, search in that table FIRST.
  // This prevents an ID from being matched in the wrong table.
  const searchOrder = {
    'ingrediente':        [buscarIngrediente, buscarRecetaPrimaria, buscarRecetaSecundaria, buscarPlato],
    'receta_primaria':    [buscarRecetaPrimaria, buscarIngrediente, buscarRecetaSecundaria, buscarPlato],
    'receta_secundaria':  [buscarRecetaSecundaria, buscarIngrediente, buscarRecetaPrimaria, buscarPlato],
    'plato':              [buscarPlato, buscarIngrediente, buscarRecetaPrimaria, buscarRecetaSecundaria],
  };

  // Default order: ingrediente → recetaPrimaria → recetaSecundaria → plato
  const searches = searchOrder[tipoHint] || [buscarIngrediente, buscarRecetaPrimaria, buscarRecetaSecundaria, buscarPlato];

  for (const searchFn of searches) {
    if (await searchFn()) return consolidado;
  }

  console.log(`[INVENTARIO] ⚠️ Elemento ${elementoId} no encontrado en ninguna tabla`);
  return consolidado;
}

export async function descontarDelInventario(ingredienteId, cantidadTotal) {
  if (!ingredienteId || isNaN(cantidadTotal) || cantidadTotal <= 0) {
    console.log(`[INVENTARIO] ⚠️ descontarDelInventario: saltando (id=${ingredienteId}, cantidadTotal=${cantidadTotal})`);
    return;
  }

  const { data: ingrediente } = await supabase
    .from('Ingrediente').select('*').eq('id', ingredienteId).maybeSingle();

  if (!ingrediente) {
    console.log(`[INVENTARIO] ⚠️ Ingrediente ${ingredienteId} no encontrado`);
    return;
  }

  const factorConversion = parseFloat(ingrediente.factor_conversion) || 1;
  const cantidadEnUnidadInventario = parseFloat(cantidadTotal) * factorConversion;
  const stockAnterior = parseFloat(ingrediente.cantidad_disponible) || 0;
  const nuevoStock = stockAnterior - cantidadEnUnidadInventario;
  
  console.log(`[INVENTARIO] 💸 Descontando "${ingrediente.nombre}": stock=${stockAnterior} - (${cantidadTotal} × factor ${factorConversion}) = ${nuevoStock}`);
  
  await supabase.from('Ingrediente')
    .update({ cantidad_disponible: nuevoStock })
    .eq('id', ingredienteId);

  // Crear alerta de stock mínimo si corresponde
  if (nuevoStock <= (ingrediente.cantidad_minima || 0)) {
    const { data: existente } = await supabase
      .from('AlertaStock').select('id')
      .eq('ingredienteId', ingredienteId).limit(1).maybeSingle();
    
    if (!existente) {
      await supabase.from('AlertaStock').insert({
        id: crypto.randomUUID(),
        ingredienteId,
        ingredienteNombre: ingrediente.nombre,
        cantidad_actual: nuevoStock,
        cantidad_minima: ingrediente.cantidad_minima || 0
      });
    }
  }
}

/**
 * Recalcula recursivamente los costos de platos y recetas que dependen de un ingrediente
 */
export async function recalcularCostosEnCascada(ingredienteId) {
  try {
    // 1. Obtener el ingrediente actualizado
    const { data: ing } = await supabase.from('Ingrediente').select('*').eq('id', ingredienteId).maybeSingle();
    if (!ing) return;

    // 2. Actualizar DetalleRecetaPrimaria
    const { data: detPrim } = await supabase.from('DetalleRecetaPrimaria').select('*').eq('ingredienteId', ingredienteId);
    if (detPrim) {
      for (const d of detPrim) {
        await supabase.from('DetalleRecetaPrimaria').update({
          costo_ingrediente: d.cantidad * ing.costo_por_unidad
        }).eq('id', d.id);
        
        // Recalcular el costo de la receta primaria padre
        await actualizarCostoRecetaPrimaria(d.receta_primaria_id);
      }
    }

    // 3. Actualizar DetalleRecetaSecundaria (donde es ingrediente)
    const { data: detSec } = await supabase.from('DetalleRecetaSecundaria').select('*').eq('elementoId', ingredienteId);
    if (detSec) {
      for (const d of detSec) {
        await supabase.from('DetalleRecetaSecundaria').update({
          costo_elemento: d.cantidad * ing.costo_por_unidad
        }).eq('id', d.id);
        
        // Recalcular el costo de la receta secundaria padre
        await actualizarCostoRecetaSecundaria(d.receta_secundaria_id);
      }
    }

    // 4. Actualizar Receta (Platos)
    const { data: recetas } = await supabase.from('Receta').select('*').eq('ingredienteId', ingredienteId);
    if (recetas) {
      for (const r of recetas) {
        await supabase.from('Receta').update({
          costo_ingrediente: r.cantidad_requerida * ing.costo_por_unidad
        }).eq('id', r.id);
        
        // Recalcular el costo del plato padre
        await actualizarCostoPlato(r.platoId || r.plato_id);
      }
    }
  } catch (err) {
    console.error('Error en recálculo en cascada:', err);
  }
}

async function actualizarCostoRecetaPrimaria(id) {
  const { data: rp } = await supabase.from('RecetaPrimaria').select('*, detalles:DetalleRecetaPrimaria(*)').eq('id', id).maybeSingle();
  if (!rp) return;
  const costoTotal = rp.detalles.reduce((acc, d) => acc + (d.costo_ingrediente || 0), 0);
  const costoPorUnidad = rp.cantidadResultante > 0 ? costoTotal / rp.cantidadResultante : 0;
  
  await supabase.from('RecetaPrimaria').update({ costoTotal, costoPorUnidad }).eq('id', id);
  
  // Si esta receta primaria se usa en otros platos o recetas secundarias, seguir la cadena...
  // (Añadir lógica similar si es necesario)
}

async function actualizarCostoRecetaSecundaria(id) {
  const { data: rs } = await supabase.from('RecetaSecundaria').select('*, detalles:DetalleRecetaSecundaria(*)').eq('id', id).maybeSingle();
  if (!rs) return;
  const costoTotal = rs.detalles.reduce((acc, d) => acc + (d.costo_elemento || 0), 0);
  const costoPorUnidad = rs.cantidadResultante > 0 ? costoTotal / rs.cantidadResultante : 0;
  
  await supabase.from('RecetaSecundaria').update({ costoTotal, costoPorUnidad }).eq('id', id);
  
  // Seguir la cadena...
  await actualizarPlatosQueUsanElemento(id, costoPorUnidad);
}

async function actualizarCostoPlato(id) {
  const { data: plato } = await supabase.from('Plato').select('*, recetas:Receta(*)').eq('id', id).maybeSingle();
  if (!plato) return;
  const costoTotal = plato.recetas.reduce((acc, r) => acc + (r.costo_ingrediente || 0), 0);
  await supabase.from('Plato').update({ costo_total: costoTotal, precio_sugerido: costoTotal * 1.7 }).eq('id', id);
}

async function actualizarPlatosQueUsanElemento(elementoId, nuevoCostoUnidad) {
  const { data: recetas } = await supabase.from('Receta').select('*').eq('ingredienteId', elementoId);
  if (recetas) {
    for (const r of recetas) {
      await supabase.from('Receta').update({ costo_ingrediente: r.cantidad_requerida * nuevoCostoUnidad }).eq('id', r.id);
      await actualizarCostoPlato(r.platoId || r.plato_id);
    }
  }
}
