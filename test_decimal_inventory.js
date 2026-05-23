import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function testDecimalFlow() {
  console.log('=== TEST: Decimal Inventory Flow ===\n');

  // 1. Pick the first ingrediente
  const { data: ingredientes } = await supabase.from('Ingrediente').select('*').limit(5);
  console.log('Ingredientes:', ingredientes?.map(i => ({
    id: i.id,
    nombre: i.nombre,
    cantidad_disponible: i.cantidad_disponible,
    tipo_cantidad: typeof i.cantidad_disponible,
    unidad: i.unidad_medida,
    factor: i.factor_conversion
  })));

  if (!ingredientes?.length) {
    console.log('No ingredientes found, cannot test');
    return;
  }

  // 2. Pick the first plato with recetas
  const { data: platos } = await supabase.from('Plato').select('*, recetas:Receta(*)').limit(5);
  const platoConRecetas = platos?.find(p => p.recetas?.length > 0);
  
  if (platoConRecetas) {
    console.log('\nPlato con recetas:', platoConRecetas.nombre);
    console.log('Recetas:', platoConRecetas.recetas.map(r => ({
      ingredienteId: r.ingredienteId,
      nombre: r.ingredienteNombre,
      cantidad_requerida: r.cantidad_requerida,
      tipo: typeof r.cantidad_requerida
    })));
  }

  // 3. Test: update an ingredient with decimal value
  const testIng = ingredientes[0];
  console.log(`\n--- Test Update: setting ${testIng.nombre} to 0.50 ---`);
  
  const { data: updated, error: updateErr } = await supabase
    .from('Ingrediente')
    .update({ cantidad_disponible: 0.50 })
    .eq('id', testIng.id)
    .select()
    .single();
  
  if (updateErr) {
    console.error('Update ERROR:', updateErr);
  } else {
    console.log('After update to 0.50:', {
      cantidad_disponible: updated.cantidad_disponible,
      type: typeof updated.cantidad_disponible,
      isExact: updated.cantidad_disponible === 0.50
    });
  }

  // 4. Test: subtract 0.25 from 0.50
  console.log('\n--- Test Subtract: 0.50 - 0.25 = should be 0.25 ---');
  const nuevoStock = 0.50 - 0.25;
  console.log('JS calculation: 0.50 - 0.25 =', nuevoStock, '(type:', typeof nuevoStock, ')');
  
  const { data: updated2, error: updateErr2 } = await supabase
    .from('Ingrediente')
    .update({ cantidad_disponible: nuevoStock })
    .eq('id', testIng.id)
    .select()
    .single();
  
  if (updateErr2) {
    console.error('Update ERROR:', updateErr2);
  } else {
    console.log('After subtract 0.25:', {
      cantidad_disponible: updated2.cantidad_disponible,
      type: typeof updated2.cantidad_disponible,
      isExact: updated2.cantidad_disponible === 0.25
    });
  }

  // 5. Test: parseFloat behavior
  console.log('\n--- parseFloat tests ---');
  console.log('parseFloat("0.50"):', parseFloat("0.50"));
  console.log('parseFloat("0.25"):', parseFloat("0.25"));
  console.log('parseFloat("0.02"):', parseFloat("0.02"));
  console.log('parseFloat(0.50):', parseFloat(0.50));
  
  // 6. Test: || 0 gotcha with zero values
  console.log('\n--- || 0 gotcha tests ---');
  const testVals = [0, 0.0, "", null, undefined, 0.5, "0.5"];
  for (const v of testVals) {
    console.log(`  parseFloat(${JSON.stringify(v)} || 0) = ${parseFloat(v || 0)} | parseFloat(${JSON.stringify(v)}) || 0 = ${parseFloat(v) || 0}`);
  }

  // Restore original value
  await supabase.from('Ingrediente').update({ cantidad_disponible: testIng.cantidad_disponible }).eq('id', testIng.id);
  console.log(`\nRestored ${testIng.nombre} to original value: ${testIng.cantidad_disponible}`);
}

testDecimalFlow().catch(console.error);
