import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  const { data, error } = await supabase
    .from('Ingrediente')
    .update({ cantidad_disponible: 95.5 })
    .eq('nombre', '1')
    .select()
    .single();
  console.log(error || data);
}
main();
