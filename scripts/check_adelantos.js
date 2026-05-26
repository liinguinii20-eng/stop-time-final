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
  const { data: employees } = await supabase.from('Empleado').select('*');
  console.log('--- EMPLEADOS ---');
  employees.forEach(e => {
    console.log(`ID: ${e.id} | Nombre: ${e.nombre} | Rol: ${e.rol} | Cargo: ${e.cargo}`);
  });

  const { data: adelantos } = await supabase.from('Adelanto').select('*');
  console.log('\n--- ADELANTOS ---');
  adelantos.forEach(a => {
    console.log(`ID: ${a.id} | empleadoId: ${a.empleadoId} | empleado: ${a.empleado} | monto: ${a.monto} | estado: ${a.estado}`);
  });
}

run().catch(console.error);
