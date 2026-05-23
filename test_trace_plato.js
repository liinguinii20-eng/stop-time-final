import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function trace() {
  const platoId = '5657c46a-88ea-4f54-849f-f6ffd2a95e96';
  
  // 1. Get the plato with recetas
  const { data: plato } = await supabase
    .from('Plato').select('*, recetas:Receta(*)').eq('id', platoId).single();
  
  console.log('=== PLATO ===');
  console.log('Nombre:', plato?.nombre);
  console.log('Recetas:', JSON.stringify(plato?.recetas, null, 2));
  
  if (!plato?.recetas?.length) {
    console.log('NO RECETAS - This is the problem!');
    return;
  }
  
  // 2. For each receta, trace what would happen
  for (const receta of plato.recetas) {
    const elemId = receta.ingredienteId;
    console.log(`\n=== Receta component: ${receta.ingredienteNombre || elemId} ===`);
    console.log('  cantidad_requerida:', receta.cantidad_requerida, '(type:', typeof receta.cantidad_requerida, ')');
    console.log('  tipo:', receta.tipo);
    
    // Check if it's an ingredient
    const { data: ing } = await supabase.from('Ingrediente').select('*').eq('id', elemId).maybeSingle();
    if (ing) {
      console.log('  → Es INGREDIENTE:', ing.nombre);
      console.log('    cantidad_disponible:', ing.cantidad_disponible, '(type:', typeof ing.cantidad_disponible, ')');
      console.log('    factor_conversion:', ing.factor_conversion);
      
      // Simulate deduction for cantidad=1
      const cantidadTotal = receta.cantidad_requerida * 1; // 1 plato
      const factorConversion = parseFloat(ing.factor_conversion) || 1;
      const cantidadEnUnidadInventario = parseFloat(cantidadTotal) * factorConversion;
      const stockAnterior = parseFloat(ing.cantidad_disponible) || 0;
      const nuevoStock = stockAnterior - cantidadEnUnidadInventario;
      
      console.log('    Simulación descuento:');
      console.log('      cantidadTotal (receta * 1):', cantidadTotal);
      console.log('      cantidadEnUnidadInventario:', cantidadEnUnidadInventario);
      console.log('      stockAnterior:', stockAnterior);
      console.log('      nuevoStock:', nuevoStock);
      continue;
    }
    
    // Check RecetaPrimaria
    const { data: rp } = await supabase.from('RecetaPrimaria')
      .select('*, detalles:DetalleRecetaPrimaria(*)').eq('id', elemId).maybeSingle();
    if (rp) {
      console.log('  → Es RECETA PRIMARIA:', rp.nombre);
      console.log('    cantidadResultante:', rp.cantidadResultante);
      console.log('    detalles:', JSON.stringify(rp.detalles, null, 2));
      continue;
    }
    
    // Check RecetaSecundaria
    const { data: rs } = await supabase.from('RecetaSecundaria')
      .select('*, detalles:DetalleRecetaSecundaria(*)').eq('id', elemId).maybeSingle();
    if (rs) {
      console.log('  → Es RECETA SECUNDARIA:', rs.nombre);
      console.log('    cantidadResultante:', rs.cantidadResultante);
      console.log('    detalles:', JSON.stringify(rs.detalles, null, 2));
      continue;
    }
    
    console.log('  → NO ENCONTRADO en ninguna tabla!');
  }
}

trace().catch(console.error);
