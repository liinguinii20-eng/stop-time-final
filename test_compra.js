import 'dotenv/config';
import supabase from './server/config/supabase.js';
async function test() {
  const { data, error } = await supabase.from('Compra').select('*').limit(1);
  console.log({data, error});
}
test();
