import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function descontarDelInventario(ingredienteId, cantidadTotal) {
  const { data: ingrediente } = await supabase
    .from('Ingrediente').select('*').eq('id', ingredienteId).single();

  if (!ingrediente) return;

  const factorConversion = ingrediente.factor_conversion || 1;
  const cantidadEnUnidadInventario = cantidadTotal * factorConversion;
  const stockAnterior = ingrediente.cantidad_disponible || 0;
  const nuevoStock = Math.max(0, stockAnterior - cantidadEnUnidadInventario);
  
  const res = await supabase.from('Ingrediente')
    .update({ cantidad_disponible: nuevoStock })
    .eq('id', ingredienteId)
    .select()
    .single();
    
  console.log("Nuevo stock:", res.data.cantidad_disponible);
}

descontarDelInventario('f2a0b75c-cad2-433b-8d89-ca40db7b73b0', 0.5);
