import dotenv from 'dotenv';
import supabase from './server/config/supabase.js';
import crypto from 'crypto';

dotenv.config();

async function runTest() {
  console.log('\n======================================================');
  console.log('🧪 INICIANDO PRUEBA: CRÉDITO DE EMPLEADO (NÓMINA)');
  console.log('======================================================\n');
  
  // 1. Obtener un empleado para la prueba
  const { data: empleados } = await supabase.from('Empleado').select('*').limit(1);
  if (!empleados || empleados.length === 0) {
    console.log('❌ No hay empleados registrados para probar.');
    return;
  }
  const empleado = empleados[0];
  console.log(`👤 Empleado seleccionado: ${empleado.nombre} (ID: ${empleado.id})`);
  console.log(`   Salario Base Actual: $${empleado.salario_base || 0}\n`);

  // 2. Simular creación de comanda tipo CREDITO_EMPLEADO
  const numero_comanda = `TEST-${Math.floor(Math.random() * 1000)}`;
  const finalTotal = 12.50; // USD (Costo del consumo)
  
  console.log(`🛒 Simulando consumo en el local (Comanda #${numero_comanda})`);
  console.log(`   Monto del consumo: $${finalTotal}`);
  console.log(`   -> Creando registro de Adelanto interno...\n`);
  
  const adelantoId = crypto.randomUUID();
  const { data: adl, error: adlErr } = await supabase.from('Adelanto').insert({
    id: adelantoId,
    empleadoId: empleado.id,
    empleado: empleado.nombre || 'Desconocido',
    monto: finalTotal,
    descripcion: `Consumo interno (Comanda #${numero_comanda})`,
    estado: 'PENDIENTE',
    fecha: new Date().toISOString()
  }).select().single();
  
  if (adlErr) {
    console.error("❌ Error creando Adelanto:", adlErr);
    return;
  }
  console.log(`✅ ¡Adelanto creado exitosamente en la base de datos!`);
  console.log(`   ID Adelanto: ${adl.id}\n`);
  
  // 3. Simular vista previa de la Nómina (como lo hace el backend)
  console.log(`🧮 Calculando Nómina de ${empleado.nombre}...`);
  
  const { data: adelantosPendientes } = await supabase
    .from('Adelanto')
    .select('*')
    .eq('empleadoId', empleado.id)
    .eq('estado', 'PENDIENTE');
    
  console.log(`   Adelantos pendientes encontrados: ${adelantosPendientes.length}`);
  
  const totalDesc = adelantosPendientes.reduce((sum, a) => sum + (a.monto ?? 0), 0);
  const salarioNeto = (empleado.salario_base || 0) - totalDesc;
  
  console.log(`\n📋 DESGLOSE FINAL DE NÓMINA:`);
  console.log(`   --------------------------------`);
  console.log(`   Salario Base:        $${(empleado.salario_base || 0).toFixed(2)}`);
  console.log(`   Total a descontar:  -$${totalDesc.toFixed(2)} (Incluye el consumo de $${finalTotal})`);
  console.log(`   --------------------------------`);
  console.log(`   Salario Neto a pagar:$${salarioNeto.toFixed(2)}\n`);
  
  console.log('======================================================');
  console.log('✅ PRUEBA FINALIZADA EXITOSAMENTE');
  console.log('======================================================\n');
  
  // Opcional: Limpiar la base de datos eliminando el adelanto de prueba
  await supabase.from('Adelanto').delete().eq('id', adelantoId);
  console.log('🧹 (El registro de prueba fue eliminado para mantener su base de datos limpia)');
}

runTest();
