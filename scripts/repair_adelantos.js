import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  console.log('--- REPARANDO ADELANTOS CON EMPLEADO_ID NULL ---');
  
  const { data: employees } = await supabase.from('Empleado').select('id, nombre');
  const { data: adelantos } = await supabase.from('Adelanto').select('*').is('empleadoId', null);

  console.log(`Encontrados ${adelantos.length} adelantos huérfanos.`);

  for (const a of adelantos) {
    const matchingEmployee = employees.find(e => e.nombre.toLowerCase().trim() === a.empleado.toLowerCase().trim());
    if (matchingEmployee) {
      console.log(`Asociando adelanto de $${a.monto} de "${a.empleado}" al Empleado ID: ${matchingEmployee.id}`);
      const { error } = await supabase
        .from('Adelanto')
        .update({ empleadoId: matchingEmployee.id })
        .eq('id', a.id);
      if (error) {
        console.error(`Error actualizando adelanto ${a.id}:`, error);
      } else {
        console.log('✅ Actualizado con éxito.');
      }
    } else {
      console.log(`⚠️ No se encontró empleado para "${a.empleado}"`);
    }
  }

  console.log('--- REPARACIÓN FINALIZADA ---');
}

run().catch(console.error);
