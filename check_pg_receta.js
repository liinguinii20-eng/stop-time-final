import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);
async function run() {
  let res = await supabase.rpc('get_column_types', { table_name: 'Receta' });
  console.log("Receta:", res.data);
  let res2 = await supabase.rpc('get_column_types', { table_name: 'DetalleRecetaPrimaria' });
  console.log("DetalleRecetaPrimaria:", res2.data);
}
run();
