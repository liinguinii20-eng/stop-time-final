import { randomUUID } from 'crypto';
import supabase from './config/supabase.js';
import { explodirElemento, descontarDelInventario } from './services/inventory.js';

async function runTest() {
  console.log('--- INICIANDO PRUEBA DEL DECIMAL ---');
  
  // 1. Limpiar datos de prueba anteriores
  await supabase.from('DetalleRecetaSecundaria').delete().like('elementoNombre', '%(Prueba)%');
  await supabase.from('Receta').delete().like('ingredienteNombre', '%(Prueba)%');
  await supabase.from('RecetaSecundaria').delete().like('nombre', '%(Prueba)%');
  await supabase.from('Plato').delete().like('nombre', '%(Prueba)%');
  await supabase.from('Ingrediente').delete().like('nombre', '%(Prueba)%');

  // Fase 1: Inyección de Inventario Base
  const arrozId = randomUUID();
  const salmonId = randomUUID();
  const vinagreId = randomUUID();

  await supabase.from('Ingrediente').insert([
    { id: arrozId, nombre: 'Arroz Crudo (Prueba)', cantidad_disponible: 5.000, factor_conversion: 1 },
    { id: salmonId, nombre: 'Salmón Fresco (Prueba)', cantidad_disponible: 2.000, factor_conversion: 1 },
    { id: vinagreId, nombre: 'Vinagre de Arroz (Prueba)', cantidad_disponible: 1.000, factor_conversion: 1 }
  ]);
  console.log('✅ Fase 1: Inventario Base Inyectado');

  // Fase 2: Configuración de la Receta Secundaria
  const arrozPreparadoId = randomUUID();
  await supabase.from('RecetaSecundaria').insert([
    { id: arrozPreparadoId, nombre: 'Arroz Preparado (Prueba)', cantidadResultante: 1.0 }
  ]);

  await supabase.from('DetalleRecetaSecundaria').insert([
    {
      id: randomUUID(),
      recetaSecundariaId: arrozPreparadoId,
      elementoId: arrozId,
      elementoNombre: 'Arroz Crudo (Prueba)',
      tipoElemento: 'ingrediente',
      cantidad: 0.500
    },
    {
      id: randomUUID(),
      recetaSecundariaId: arrozPreparadoId,
      elementoId: vinagreId,
      elementoNombre: 'Vinagre de Arroz (Prueba)',
      tipoElemento: 'ingrediente',
      cantidad: 0.100
    }
  ]);
  console.log('✅ Fase 2: Receta Secundaria Configurada');

  // Fase 3: Configuración del Plato
  const rollId = randomUUID();
  await supabase.from('Plato').insert([
    { id: rollId, nombre: 'Stop Time Special Roll (Prueba)' }
  ]);

  await supabase.from('Receta').insert([
    {
      id: randomUUID(),
      platoId: rollId,
      ingredienteId: salmonId,
      ingredienteNombre: 'Salmón Fresco (Prueba)',
      tipo: 'ingrediente',
      cantidad_requerida: 0.080
    },
    {
      id: randomUUID(),
      platoId: rollId,
      ingredienteId: arrozPreparadoId,
      ingredienteNombre: 'Arroz Preparado (Prueba)',
      tipo: 'receta_secundaria',
      cantidad_requerida: 0.150
    }
  ]);
  console.log('✅ Fase 3: Plato Configurado');

  // Fase 4: La Ejecución en Frío
  console.log('🔥 Fase 4: Simulando Venta de 3 Rolls y Explosionando...');
  const cantidadRolls = 3;
  const consolidado = {};
  
  await explodirElemento(rollId, cantidadRolls, consolidado, 'plato');
  
  console.log('📦 Consolidado a Descontar:', consolidado);
  
  for (const [ingId, cant] of Object.entries(consolidado)) {
    await descontarDelInventario(ingId, cant);
  }

  // Fase 5: La Auditoría
  console.log('📊 Fase 5: Auditoría de Stock Final');
  
  const { data: stockArroz } = await supabase.from('Ingrediente').select('cantidad_disponible').eq('id', arrozId).single();
  const { data: stockSalmon } = await supabase.from('Ingrediente').select('cantidad_disponible').eq('id', salmonId).single();
  const { data: stockVinagre } = await supabase.from('Ingrediente').select('cantidad_disponible').eq('id', vinagreId).single();

  console.log(`\n=== RESULTADOS FINALES ===`);
  console.log(`Salmón Fresco: ${stockSalmon.cantidad_disponible} kg (Esperado: 1.76)`);
  console.log(`Arroz Crudo: ${stockArroz.cantidad_disponible} kg (Esperado: 4.775)`);
  console.log(`Vinagre de Arroz: ${stockVinagre.cantidad_disponible} L (Esperado: 0.955)`);
  
  const success = 
    stockSalmon.cantidad_disponible === 1.76 && 
    stockArroz.cantidad_disponible === 4.775 && 
    stockVinagre.cantidad_disponible === 0.955;
    
  if (success) {
    console.log('🎉 PRUEBA SUPERADA: Sin pérdida de decimales.');
  } else {
    console.log('❌ PRUEBA FALLIDA: Hay diferencias en el cálculo.');
  }
}

runTest().catch(console.error).finally(() => process.exit(0));
