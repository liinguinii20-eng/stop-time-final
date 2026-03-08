import { base44 } from "@/api/base44Client";

/**
 * DESCUENTO DE INVENTARIO CON EXPLOSIÓN DE MATERIALES (BOM)
 * 
 * Este proceso tiene 3 fases:
 * 1. EXPLOTAR: Recorrer toda la jerarquía del plato (recetas dentro de recetas)
 * 2. CONSOLIDAR: Sumar todas las cantidades del mismo ingrediente
 * 3. DESCONTAR: Restar del inventario solo al final
 * 
 * Ejemplo: Plato X con 1 aceite + Receta Y (dentro del plato) con 4 aceites = 5 aceites totales
 */
export async function descontarStock(platoId, cantidadVendida) {
  try {
    console.log(`🔍 Iniciando descuento de stock para plato ${platoId} x ${cantidadVendida}`);
    
    // Obtener nombre del plato para mensajes de error
    const platos = await base44.entities.Plato.filter({ id: platoId });
    const nombrePlato = platos.length > 0 ? platos[0].nombre : `ID: ${platoId}`;
    
    // FASE 1 y 2: EXPLOTAR y CONSOLIDAR
    const ingredientesConsolidados = {};
    
    try {
      await explodirPlato(platoId, cantidadVendida, ingredientesConsolidados, nombrePlato);
    } catch (error) {
      throw new Error(`Error en receta de ${nombrePlato}: ${error.message}`);
    }
    
    console.log('📊 Ingredientes consolidados:', ingredientesConsolidados);
    
    // Validar que se encontró al menos un ingrediente
    if (Object.keys(ingredientesConsolidados).length === 0) {
      throw new Error(`Error en receta de ${nombrePlato}: No se pudo descontar inventario (sin ingredientes configurados)`);
    }
    
    // FASE 3: DESCONTAR del inventario
    try {
      for (const [ingredienteId, cantidadTotal] of Object.entries(ingredientesConsolidados)) {
        await descontarDelInventario(ingredienteId, cantidadTotal);
      }
    } catch (error) {
      throw new Error(`Error en receta de ${nombrePlato}: ${error.message}`);
    }
    
    console.log(`✅ Stock descontado exitosamente. ${Object.keys(ingredientesConsolidados).length} ingredientes afectados`);
    return { 
      success: true, 
      ingredientesAfectados: Object.keys(ingredientesConsolidados).length,
      detalle: ingredientesConsolidados
    };
  } catch (error) {
    console.error("❌ Error crítico descontando stock:", error);
    throw error;
  }
}

/**
 * EXPLOSIÓN INICIAL: Comienza desde un plato y explota todas sus recetas
 */
async function explodirPlato(platoId, cantidad, consolidado, nombrePlato = '') {
  try {
    const recetas = await base44.entities.Receta.filter({ plato_id: platoId });
    console.log(`📋 Plato ${platoId} tiene ${recetas.length} componentes en la tabla Receta`);
    
    if (recetas.length === 0) {
      console.error(`⚠️ ERROR: El plato ${platoId} NO TIENE recetas asignadas en la tabla Receta`);
      throw new Error(`No se pudo descontar inventario (plato sin recetas configuradas)`);
    }
    
    for (const receta of recetas) {
      if (!receta.ingrediente_id) {
        console.error(`❌ ERROR: Receta sin ingrediente_id en el plato ${nombrePlato}`);
        throw new Error(`No se pudo descontar inventario (receta con ID faltante)`);
      }
      
      if (!receta.cantidad_requerida || receta.cantidad_requerida <= 0) {
        console.error(`❌ ERROR: Cantidad inválida en receta del plato ${nombrePlato}`);
        throw new Error(`No se pudo descontar inventario (cantidad inválida: ${receta.cantidad_requerida})`);
      }
      
      console.log(`  └─ Procesando: ${receta.ingrediente_nombre || 'Elemento ID: ' + receta.ingrediente_id} x ${receta.cantidad_requerida}`);
      
      // Multiplicar cantidad requerida por cantidad del plato
      const cantidadTotal = receta.cantidad_requerida * cantidad;
      
      // Explotar recursivamente este componente
      await explodirElemento(receta.ingrediente_id, cantidadTotal, consolidado, '    ', nombrePlato);
    }
  } catch (error) {
    if (error.message.includes('No se pudo descontar inventario')) {
      throw error;
    }
    throw new Error(`No se pudo descontar inventario (error de configuración: ${error.message})`);
  }
}

/**
 * EXPLOSIÓN RECURSIVA: Determina el tipo de elemento y lo desglose o consolida
 * ORDEN DE VERIFICACIÓN CRÍTICO: Recetas compuestas primero, ingredientes simples al final
 */
async function explodirElemento(elementoId, cantidad, consolidado, indent = '', nombrePlatoOrigen = '') {
  try {
    console.log(`${indent}🔍 Explorando elemento ID: ${elementoId} con cantidad: ${cantidad}`);
    
    if (!elementoId) {
      throw new Error(`Elemento sin ID en el árbol de explosión`);
    }
    
    if (!cantidad || cantidad <= 0) {
      throw new Error(`Cantidad inválida (${cantidad}) para elemento ${elementoId}`);
    }
  
    // CASO 1: ¿Es una receta primaria? → EXPLOTAR (PRIORIDAD ALTA)
    const recetasPrimarias = await base44.entities.RecetaPrimaria.filter({ id: elementoId });
    if (recetasPrimarias.length > 0) {
      try {
        const receta = recetasPrimarias[0];
        console.log(`${indent}🔵 RECETA PRIMARIA DETECTADA: "${receta.nombre}" (ID: ${elementoId}) → DESGLOSANDO...`);
        
        const detalles = await base44.entities.DetalleRecetaPrimaria.filter({ 
          receta_primaria_id: elementoId 
        });
        
        console.log(`${indent}   ├─ Buscando en DetalleRecetaPrimaria con receta_primaria_id=${elementoId}`);
        console.log(`${indent}   ├─ Resultado: ${detalles.length} componentes encontrados`);
        
        if (detalles.length === 0) {
          console.error(`${indent}   └─ ❌ ERROR: La receta primaria "${receta.nombre}" NO TIENE INGREDIENTES ASIGNADOS en DetalleRecetaPrimaria`);
          throw new Error(`Receta primaria "${receta.nombre}" sin ingredientes configurados`);
        }
        
        for (const detalle of detalles) {
          if (!detalle.ingrediente_id) {
            throw new Error(`Receta primaria "${receta.nombre}" tiene un componente sin ID`);
          }
          
          // Multiplicar: cantidad del padre * cantidad requerida del hijo
          const cantidadHijo = cantidad * detalle.cantidad_requerida;
          console.log(`${indent}   ├─ Sub-componente: ${detalle.ingrediente_nombre || 'ID: ' + detalle.ingrediente_id} x ${detalle.cantidad_requerida} → Total: ${cantidadHijo}`);
          await explodirElemento(detalle.ingrediente_id, cantidadHijo, consolidado, indent + '   │  ', nombrePlatoOrigen);
        }
        console.log(`${indent}   └─ ✅ Receta "${receta.nombre}" completamente desglosada`);
        return;
      } catch (error) {
        if (error.message.includes('sin ingredientes') || error.message.includes('sin ID')) {
          throw error;
        }
        throw new Error(`Error procesando receta primaria: ${error.message}`);
      }
    }
    
    // CASO 2: ¿Es una receta secundaria? → EXPLOTAR (PRIORIDAD ALTA)
    const recetasSecundarias = await base44.entities.RecetaSecundaria.filter({ id: elementoId });
    if (recetasSecundarias.length > 0) {
      try {
        const receta = recetasSecundarias[0];
        console.log(`${indent}🟣 RECETA SECUNDARIA DETECTADA: "${receta.nombre}" (ID: ${elementoId}) → DESGLOSANDO...`);
        
        const detalles = await base44.entities.DetalleRecetaSecundaria.filter({ 
          receta_secundaria_id: elementoId 
        });
        
        console.log(`${indent}   ├─ Buscando en DetalleRecetaSecundaria con receta_secundaria_id=${elementoId}`);
        console.log(`${indent}   ├─ Resultado: ${detalles.length} componentes encontrados`);
        
        if (detalles.length === 0) {
          console.error(`${indent}   └─ ❌ ERROR: La receta secundaria "${receta.nombre}" NO TIENE ELEMENTOS ASIGNADOS en DetalleRecetaSecundaria`);
          throw new Error(`Receta secundaria "${receta.nombre}" sin elementos configurados`);
        }
        
        for (const detalle of detalles) {
          if (!detalle.elemento_id) {
            throw new Error(`Receta secundaria "${receta.nombre}" tiene un elemento sin ID`);
          }
          
          // Multiplicar: cantidad del padre * cantidad requerida del hijo
          const cantidadHijo = cantidad * detalle.cantidad_requerida;
          console.log(`${indent}   ├─ Sub-componente tipo [${detalle.tipo_elemento}]: ${detalle.elemento_nombre || 'ID: ' + detalle.elemento_id} x ${detalle.cantidad_requerida} → Total: ${cantidadHijo}`);
          await explodirElemento(detalle.elemento_id, cantidadHijo, consolidado, indent + '   │  ', nombrePlatoOrigen);
        }
        console.log(`${indent}   └─ ✅ Receta "${receta.nombre}" completamente desglosada`);
        return;
      } catch (error) {
        if (error.message.includes('sin elementos') || error.message.includes('sin ID')) {
          throw error;
        }
        throw new Error(`Error procesando receta secundaria: ${error.message}`);
      }
    }
    
    // CASO 3: ¿Es otro plato? → EXPLOTAR como plato (SUB-PLATOS)
    const platos = await base44.entities.Plato.filter({ id: elementoId });
    if (platos.length > 0) {
      console.log(`${indent}🟡 SUB-PLATO DETECTADO: "${platos[0].nombre}" → DESGLOSANDO...`);
      await explodirPlato(elementoId, cantidad, consolidado, platos[0].nombre);
      return;
    }
    
    // CASO 4: ¿Es un ingrediente base? → CONSOLIDAR (PRIORIDAD BAJA - hoja del árbol)
    const ingredientes = await base44.entities.Ingrediente.filter({ id: elementoId });
    if (ingredientes.length > 0) {
      const ing = ingredientes[0];
      console.log(`${indent}🟢 INGREDIENTE BASE ENCONTRADO: "${ing.nombre}" x ${cantidad} ${ing.unidad_receta || 'unidades'}`);
      
      if (!consolidado[elementoId]) {
        consolidado[elementoId] = 0;
      }
      consolidado[elementoId] += cantidad;
      console.log(`${indent}   └─ Acumulado total de "${ing.nombre}": ${consolidado[elementoId]} ${ing.unidad_receta || 'unidades'}`);
      return;
    }
    
    console.error(`${indent}❌ ELEMENTO NO ENCONTRADO: ${elementoId} no existe en ninguna tabla`);
    throw new Error(`Elemento ${elementoId} no encontrado en base de datos (ID inválido o eliminado)`);
  } catch (error) {
    if (error.message.includes('sin ingredientes') || 
        error.message.includes('sin elementos') || 
        error.message.includes('sin ID') ||
        error.message.includes('no encontrado') ||
        error.message.includes('Cantidad inválida') ||
        error.message.includes('Elemento sin ID')) {
      throw error;
    }
    throw new Error(`Error en explosión del elemento ${elementoId}: ${error.message}`);
  }
}

/**
 * DESCUENTO FINAL: Resta la cantidad consolidada del inventario
 * APLICA CONVERSIÓN DE UNIDADES antes de descontar
 */
async function descontarDelInventario(ingredienteId, cantidadTotal) {
  try {
    console.log(`\n💸 PROCESANDO DESCUENTO para ingrediente ID: ${ingredienteId}`);
    
    if (!ingredienteId) {
      throw new Error(`Intento de descuento con ID vacío`);
    }
    
    const ingredientes = await base44.entities.Ingrediente.filter({ id: ingredienteId });
    if (ingredientes.length === 0) {
      console.error(`❌ ERROR: No se encontró ingrediente ${ingredienteId} en la tabla Ingrediente`);
      throw new Error(`Ingrediente ${ingredienteId} no encontrado (posiblemente eliminado)`);
    }
    
    const ing = ingredientes[0];
    console.log(`   📦 Ingrediente: "${ing.nombre}"`);
    console.log(`   📏 Unidad receta: ${ing.unidad_receta || 'unidad'}`);
    console.log(`   📏 Unidad inventario: ${ing.unidad_medida}`);
    
    // APLICAR CONVERSIÓN: cantidad_receta × factor_conversion = cantidad_inventario
    const factorConversion = ing.factor_conversion || 1;
    const cantidadEnUnidadInventario = cantidadTotal * factorConversion;
    
    const stockAnterior = ing.cantidad_disponible;
    const nuevoStock = Math.max(0, stockAnterior - cantidadEnUnidadInventario);
    
    console.log(`   🔢 Cantidad consolidada en receta: ${cantidadTotal} ${ing.unidad_receta || 'unidades'}`);
    console.log(`   🔄 Factor de conversión: ${factorConversion}`);
    console.log(`   ➡️  Cantidad a descontar del inventario: ${cantidadTotal} × ${factorConversion} = ${cantidadEnUnidadInventario} ${ing.unidad_medida}`);
    console.log(`   📊 Stock anterior: ${stockAnterior} ${ing.unidad_medida}`);
    console.log(`   📊 Stock nuevo: ${nuevoStock} ${ing.unidad_medida}`);
    console.log(`   ${nuevoStock < stockAnterior ? '✅ DESCUENTO APLICADO' : '⚠️ NO SE DESCONTÓ NADA'}`);
    
    if (cantidadEnUnidadInventario === 0) {
      console.error(`   ❌ ERROR CRÍTICO: La cantidad a descontar es CERO. Revisar la consolidación.`);
      throw new Error(`Cantidad a descontar es cero para "${ing.nombre}" (error en conversión o configuración)`);
    }
    
    await base44.entities.Ingrediente.update(ingredienteId, {
      cantidad_disponible: nuevoStock
    });
    
    // Crear alerta si quedó bajo stock
    if (nuevoStock <= ing.cantidad_minima) {
      await crearAlertaStock(ing, nuevoStock);
    }
  } catch (error) {
    if (error.message.includes('no encontrado') || 
        error.message.includes('es cero') || 
        error.message.includes('ID vacío')) {
      throw error;
    }
    throw new Error(`Error al descontar inventario: ${error.message}`);
  }
}

/**
 * Crea una alerta de stock bajo si no existe una activa
 */
async function crearAlertaStock(ingrediente, cantidadActual) {
  try {
    const alertasExistentes = await base44.entities.AlertaStock.filter({
      ingrediente_id: ingrediente.id,
      resuelta: false
    });
    
    if (alertasExistentes.length === 0) {
      await base44.entities.AlertaStock.create({
        ingrediente_id: ingrediente.id,
        nombre_ingrediente: ingrediente.nombre,
        cantidad_actual: cantidadActual,
        cantidad_minima: ingrediente.cantidad_minima,
        fecha_alerta: new Date().toISOString(),
        resuelta: false
      });
    }
  } catch (error) {
    console.error("Error creando alerta de stock:", error);
  }
}