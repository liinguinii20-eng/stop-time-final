import supabase from './server/config/supabase.js';

async function test() {
  const { data: platos } = await supabase.from('Plato').select('id, nombre, permitir_merma').limit(1);
  if(!platos || platos.length === 0) return console.log("No platos");
  const p = platos[0];
  console.log("Before:", p);
  
  const { data: updated } = await supabase.from('Plato').update({ permitir_merma: true }).eq('id', p.id).select().single();
  console.log("After update:", updated.permitir_merma);
  
  const { data: fresh } = await supabase.from('Plato').select('id, nombre, permitir_merma').eq('id', p.id).single();
  console.log("Fresh fetch:", fresh.permitir_merma);
  
  await supabase.from('Plato').update({ permitir_merma: false }).eq('id', p.id);
}
test();
