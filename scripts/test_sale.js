// scripts/test_sale.js
// Simula localStorage en Node, siembra datos y ejecuta un descuento de stock para probar el flujo de venta.
import { api as base44 } from '../src/api/apiAdapter.js';

// Polyfill localStorage (simple)
global.localStorage = (function () {
  let store = {};
  return {
    getItem(key) { return store.hasOwnProperty(key) ? store[key] : null; },
    setItem(key, value) { store[key] = String(value); },
    removeItem(key) { delete store[key]; },
    clear() { store = {}; }
  };
})();

// Helper: pretty log stored entity
async function dump(entity) {
  console.log('\n---', entity, '---');
  const items = await base44.entities[entity].list();
  console.log(items);
}

// Copia (adaptada) de la función descontarStock para usar el adaptador local
async function descontarStock(platoId, cantidadVendida) {
  try {
    console.log(`🔍 Iniciando descuento de stock para plato ${platoId} x ${cantidadVendida}`);
    const platos = await base44.entities.Plato.filter({ id: platoId });
    const nombrePlato = platos.length > 0 ? platos[0].nombre : `ID: ${platoId}`;

    const ingredientesConsolidados = {};
    await explodirPlato(platoId, cantidadVendida, ingredientesConsolidados, nombrePlato);

    console.log('📊 Ingredientes consolidados:', ingredientesConsolidados);

    if (Object.keys(ingredientesConsolidados).length === 0) {
      throw new Error(`Error en receta de ${nombrePlato}: No se pudo descontar inventario (sin ingredientes configurados)`);
    }

    for (const [ingredienteId, cantidadTotal] of Object.entries(ingredientesConsolidados)) {
      await descontarDelInventario(ingredienteId, cantidadTotal);
    }

    console.log(`✅ Stock descontado exitosamente. ${Object.keys(ingredientesConsolidados).length} ingredientes afectados`);
    return { success: true, ingredientesAfectados: Object.keys(ingredientesConsolidados).length, detalle: ingredientesConsolidados };
  } catch (error) {
    console.error('❌ Error crítico descontando stock:', error.message || error);
    throw error;
  }
}

async function explodirPlato(platoId, cantidad, consolidado, nombrePlato = '') {
  const recetas = await base44.entities.Receta.filter({ plato_id: platoId });
  console.log(`📋 Plato ${platoId} tiene ${recetas.length} componentes en Receta`);
  if (recetas.length === 0) {
    throw new Error(`No se pudo descontar inventario (plato sin recetas configuradas)`);
  }
  for (const receta of recetas) {
    if (!receta.ingrediente_id) throw new Error(`Receta sin ingrediente_id`);
    if (!receta.cantidad_requerida || receta.cantidad_requerida <= 0) throw new Error(`Cantidad inválida en receta`);
    const cantidadTotal = receta.cantidad_requerida * cantidad;
    await explodirElemento(receta.ingrediente_id, cantidadTotal, consolidado, '    ', nombrePlato);
  }
}

async function explodirElemento(elementoId, cantidad, consolidado, indent = '', nombrePlatoOrigen = '') {
  if (!elementoId) throw new Error('Elemento sin ID');
  if (!cantidad || cantidad <= 0) throw new Error('Cantidad inválida');

  // RecetaPrimaria
  const recetasPrimarias = await base44.entities.RecetaPrimaria.filter({ id: elementoId });
  if (recetasPrimarias.length > 0) {
    const detalles = await base44.entities.DetalleRecetaPrimaria.filter({ receta_primaria_id: elementoId });
    if (detalles.length === 0) throw new Error(`Receta primaria sin ingredientes`);
    for (const detalle of detalles) {
      if (!detalle.ingrediente_id) throw new Error('Componente sin ID');
      const cantidadHijo = cantidad * detalle.cantidad_requerida;
      await explodirElemento(detalle.ingrediente_id, cantidadHijo, consolidado, indent + '   │  ', nombrePlatoOrigen);
    }
    return;
  }

  // RecetaSecundaria
  const recetasSec = await base44.entities.RecetaSecundaria.filter({ id: elementoId });
  if (recetasSec.length > 0) {
    const detalles = await base44.entities.DetalleRecetaSecundaria.filter({ receta_secundaria_id: elementoId });
    if (detalles.length === 0) throw new Error(`Receta secundaria sin elementos`);
    for (const detalle of detalles) {
      if (!detalle.elemento_id) throw new Error('Elemento sin ID');
      const cantidadHijo = cantidad * detalle.cantidad_requerida;
      await explodirElemento(detalle.elemento_id, cantidadHijo, consolidado, indent + '   │  ', nombrePlatoOrigen);
    }
    return;
  }

  // Sub-plato
  const platos = await base44.entities.Plato.filter({ id: elementoId });
  if (platos.length > 0) {
    await explodirPlato(elementoId, cantidad, consolidado, platos[0].nombre);
    return;
  }

  // Ingrediente base
  const ingredientes = await base44.entities.Ingrediente.filter({ id: elementoId });
  if (ingredientes.length > 0) {
    const ing = ingredientes[0];
    if (!consolidado[elementoId]) consolidado[elementoId] = 0;
    consolidado[elementoId] += cantidad;
    return;
  }

  throw new Error(`Elemento ${elementoId} no encontrado`);
}

async function descontarDelInventario(ingredienteId, cantidadTotal) {
  const ingredientes = await base44.entities.Ingrediente.filter({ id: ingredienteId });
  if (ingredientes.length === 0) throw new Error(`Ingrediente ${ingredienteId} no encontrado`);
  const ing = ingredientes[0];
  const factorConversion = ing.factor_conversion || 1;
  const cantidadEnUnidadInventario = cantidadTotal * factorConversion;
  const stockAnterior = ing.cantidad_disponible || 0;
  const nuevoStock = Math.max(0, stockAnterior - cantidadEnUnidadInventario);
  await base44.entities.Ingrediente.update(ingredienteId, { cantidad_disponible: nuevoStock });
  if (nuevoStock <= (ing.cantidad_minima || 0)) {
    await crearAlertaStock(ing, nuevoStock);
  }
}

async function crearAlertaStock(ingrediente, cantidadActual) {
  const existentes = await base44.entities.AlertaStock.filter({ ingrediente_id: ingrediente.id, resuelta: false });
  if (existentes.length === 0) {
    await base44.entities.AlertaStock.create({ ingrediente_id: ingrediente.id, nombre_ingrediente: ingrediente.nombre, cantidad_actual: cantidadActual, cantidad_minima: ingrediente.cantidad_minima || 0, fecha_alerta: new Date().toISOString(), resuelta: false });
  }
}

// Prueba: sembrar datos y ejecutar venta
(async function main() {
  try {
    // Limpiar
    global.localStorage.clear();

    // Crear ingrediente
    const ingrediente = await base44.entities.Ingrediente.create({ nombre: 'Tomate', cantidad_disponible: 50, cantidad_minima: 5, unidad_medida: 'kg', unidad_receta: 'kg', factor_conversion: 1, costo_por_unidad: 1 });
    console.log('Ingrediente creado:', ingrediente.id);

    // Crear plato
    const plato = await base44.entities.Plato.create({ nombre: 'Salsa', precio: 10, activo: true });
    console.log('Plato creado:', plato.id);

    // Crear receta (plato -> ingrediente)
    const receta = await base44.entities.Receta.create({ plato_id: plato.id, ingrediente_id: ingrediente.id, ingrediente_nombre: ingrediente.nombre, cantidad_requerida: 0.5, unidad_medida: 'kg' });
    console.log('Receta creada:', receta.id);

    // Crear venta
    const venta = await base44.entities.Venta.create({ fecha_hora: new Date().toISOString(), total_venta: 10, metodo_pago: 'Efectivo', costo_total: 0, ganancia: 0 });
    console.log('Venta creada:', venta.id);

    // Crear detalle venta
    const detalle = await base44.entities.DetalleVenta.create({ venta_id: venta.id, plato_id: plato.id, plato_nombre: plato.nombre, cantidad: 1, precio_unitario: plato.precio, subtotal: plato.precio, costo_unitario: 0 });
    console.log('DetalleVenta creado:', detalle.id);

    // Ejecutar descontarStock
    const resultado = await descontarStock(plato.id, 1);
    console.log('Resultado descontarStock:', resultado);

    // Dump storage
    await dump('Ingrediente');
    await dump('Plato');
    await dump('Receta');
    await dump('Venta');
    await dump('DetalleVenta');
    await dump('AlertaStock');

    console.log('Prueba finalizada correctamente');
  } catch (error) {
    console.error('Error en test:', error);
    process.exit(1);
  }
})();
