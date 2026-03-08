// scripts/test_comanda_flow.js
// Simula el flujo de cierre de una comanda (crear venta, detalles, pagos/cuentas, explosión y descuento de stock).
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

async function dump(entity) {
  console.log(`\n--- ${entity} ---`);
  const items = await base44.entities[entity].list();
  console.log(items);
}

// Copia reducida de la lógica de explosión/descuento (adaptada desde scripts/test_sale.js)
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

    return { success: true, ingredientesAfectados: Object.keys(ingredientesConsolidados).length, detalle: ingredientesConsolidados };
  } catch (error) {
    console.error('❌ Error descontando stock:', error.message || error);
    throw error;
  }
}

async function explodirPlato(platoId, cantidad, consolidado, nombrePlato = '') {
  const recetas = await base44.entities.Receta.filter({ plato_id: platoId });
  if (recetas.length === 0) throw new Error('Plato sin recetas configuradas');
  for (const receta of recetas) {
    const cantidadTotal = receta.cantidad_requerida * cantidad;
    await explodirElemento(receta.ingrediente_id, cantidadTotal, consolidado, '    ', nombrePlato);
  }
}

async function explodirElemento(elementoId, cantidad, consolidado) {
  if (!elementoId) throw new Error('Elemento sin ID');
  if (!cantidad || cantidad <= 0) throw new Error('Cantidad inválida');

  // RecetaPrimaria
  const rp = await base44.entities.RecetaPrimaria.filter({ id: elementoId });
  if (rp.length > 0) {
    const detalles = await base44.entities.DetalleRecetaPrimaria.filter({ receta_primaria_id: elementoId });
    for (const d of detalles) {
      const cantidadHijo = cantidad * d.cantidad_requerida;
      await explodirElemento(d.ingrediente_id, cantidadHijo, consolidado);
    }
    return;
  }

  // RecetaSecundaria
  const rs = await base44.entities.RecetaSecundaria.filter({ id: elementoId });
  if (rs.length > 0) {
    const detalles = await base44.entities.DetalleRecetaSecundaria.filter({ receta_secundaria_id: elementoId });
    for (const d of detalles) {
      const cantidadHijo = cantidad * d.cantidad_requerida;
      await explodirElemento(d.elemento_id, cantidadHijo, consolidado);
    }
    return;
  }

  // Sub-plato
  const platos = await base44.entities.Plato.filter({ id: elementoId });
  if (platos.length > 0) {
    await explodirPlato(elementoId, cantidad, platos[0].nombre);
    return;
  }

  // Ingrediente base
  const ing = await base44.entities.Ingrediente.filter({ id: elementoId });
  if (ing.length > 0) {
    if (!consolidado[elementoId]) consolidado[elementoId] = 0;
    consolidatedAdd(consolidado, elementoId, cantidad);
    return;
  }

  throw new Error(`Elemento ${elementoId} no encontrado`);
}

function consolidatedAdd(consolidado, id, v) {
  if (!consolidado[id]) consolidado[id] = 0;
  consolidado[id] += v;
}

async function descontarDelInventario(ingredienteId, cantidadTotal) {
  const ingredientes = await base44.entities.Ingrediente.filter({ id: ingredienteId });
  if (ingredientes.length === 0) throw new Error(`Ingrediente ${ingredienteId} no encontrado`);
  const ing = ingredientes[0];
  const factorConversion = ing.factor_conversion || 1;
  const cantidadEnInv = cantidadTotal * factorConversion;
  const stockAnterior = ing.cantidad_disponible || 0;
  const nuevoStock = Math.max(0, stockAnterior - cantidadEnInv);
  await base44.entities.Ingrediente.update(ingredienteId, { cantidad_disponible: nuevoStock });
  if (nuevoStock <= (ing.cantidad_minima || 0)) {
    await base44.entities.AlertaStock.create({ ingrediente_id: ing.id, nombre_ingrediente: ing.nombre, cantidad_actual: nuevoStock, cantidad_minima: ing.cantidad_minima || 0, fecha_alerta: new Date().toISOString(), resuelta: false });
  }
}

// Simulación del cierre de comanda
(async function main() {
  try {
    global.localStorage.clear();
    // Tasas de ejemplo
    global.localStorage.setItem('tasa_cop_actual', '4000');
    global.localStorage.setItem('tasa_usd_final', '5');

    // Crear ingrediente y plato y su receta
    const ingrediente = await base44.entities.Ingrediente.create({ nombre: 'Tomate', cantidad_disponible: 20, cantidad_minima: 2, unidad_medida: 'kg', unidad_receta: 'kg', factor_conversion: 1, costo_por_unidad: 1 });
    const plato = await base44.entities.Plato.create({ nombre: 'Sopa', precio: 8, activo: true });
    await base44.entities.Receta.create({ plato_id: plato.id, ingrediente_id: ingrediente.id, ingrediente_nombre: ingrediente.nombre, cantidad_requerida: 1, unidad_medida: 'kg' });

    // Crear comanda y detalle
    const comanda = await base44.entities.Comanda.create({ numero_comanda: 'C-999', mesa_numero: 'M-1', mesero_nombre: 'Test', fecha_apertura: new Date().toISOString(), estado: 'abierta', total_comanda: 8, notas: '' });
    await base44.entities.DetalleComanda.create({ comanda_id: comanda.id, plato_id: plato.id, plato_nombre: plato.nombre, cantidad: 1, precio_unitario: plato.precio, subtotal: plato.precio, estado_plato: 'pendiente' });

    console.log('Comanda creada:', comanda.id);

    // Simular datos de cierre: pago en efectivo
    const metodoPago = 'Efectivo';
    const tasaBs = 5;
    const pagosMixtos = null;
    const datosCuenta = null;
    const descuentoPorcentaje = 0;
    const descuentoMonto = 0;

    // Lógica simplificada de cierre (similar a cerrarComandaMutation)
    const detalles = await base44.entities.DetalleComanda.filter({ comanda_id: comanda.id });
    const subtotalUSD = comanda.total_comanda;
    const totalUSD = subtotalUSD - descuentoMonto;
    const tasaCOPActual = parseFloat(global.localStorage.getItem('tasa_cop_actual') || '4000');
    const tasaUSDFinal = parseFloat(global.localStorage.getItem('tasa_usd_final') || String(tasaBs));
    const totalCOP = totalUSD * tasaCOPActual;
    const totalVES = totalUSD * tasaUSDFinal;
    const esMetodoBolivares = false;
    const montoOriginal = esMetodoBolivares ? totalVES : totalUSD;

    const venta = await base44.entities.Venta.create({ fecha_hora: new Date().toISOString(), total_venta: totalUSD, metodo_pago: metodoPago, costo_total: 0, ganancia: 0, total_cop: totalCOP, total_ves: totalVES, tasa_bs_aplicada: tasaBs, monto_original: montoOriginal, moneda_original: esMetodoBolivares ? 'VES' : 'USD' });
    console.log('Venta creada:', venta.id);

    // Crear detalles de venta
    for (const detalle of detalles) {
      await base44.entities.DetalleVenta.create({ venta_id: venta.id, plato_id: detalle.plato_id, plato_nombre: detalle.plato_nombre, cantidad: detalle.cantidad, precio_unitario: detalle.precio_unitario, subtotal: detalle.subtotal, costo_unitario: 0 });
    }

    // Actualizar inventario
    let totalAfectados = 0;
    for (const detalle of detalles) {
      const resultado = await descontarStock(detalle.plato_id, detalle.cantidad);
      totalAfectados += resultado.ingredientesAfectados;
    }

    // Cerrar comanda
    await base44.entities.Comanda.update(comanda.id, { estado: 'pagada', fecha_cierre: new Date().toISOString(), total_cop: totalCOP, total_ves: totalVES, tasa_bs_aplicada: tasaBs });

    console.log('Cierre completado. Ingredientes afectados:', totalAfectados);

    // Dumps
    await dump('Comanda');
    await dump('DetalleComanda');
    await dump('Venta');
    await dump('DetalleVenta');
    await dump('Ingrediente');
    await dump('AlertaStock');

    console.log('Test de cierre de comanda finalizado correctamente');
  } catch (error) {
    console.error('Error en test de comanda:', error);
    process.exit(1);
  }
})();
