// src/api/apiAdapter.js
// Adaptador que usa los endpoints del servidor Express (SQLite/Prisma)
// en lugar de localStorage para persistencia real de datos

const API_BASE = ''; // Mismo dominio, usa proxy o ruta relativa

// UUID compatible con HTTP (sin contexto seguro)
const genUUID = () =>
  (typeof crypto !== 'undefined' && crypto.randomUUID)
    ? crypto.randomUUID()
    : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
        const r = Math.random() * 16 | 0;
        return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
      });

// Función helper para hacer fetch al servidor
const serverFetch = async (endpoint, options = {}) => {
  try {
    // ✅ IMPORTANTE: NO HACER NINGUNA PETICIÓN SI EL USUARIO NO ESTÁ AUTENTICADO
    // Evita errores 401 masivos cuando se está en la página de login
    const token = localStorage.getItem('jwt_token');
    const rutaLogin = window.location.pathname === '/' || window.location.pathname === '/acceso';
    
    if (!token && !endpoint.includes('/auth/') && rutaLogin) {
      console.log(`[API] Ignorando petición a ${endpoint}: usuario no autenticado`);
      return [];
    }
    
    const url = `/api${endpoint}`;
    
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` }),
        ...options.headers,
      },
    });
    
    // Verificar si la respuesta es exitosa
    if (!response.ok) {
      // Intentar obtener el mensaje de error del cuerpo
      let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
      try {
        const errorData = await response.json();
        errorMessage = errorData.error || errorMessage;
      } catch {
        // Si no se puede parsear como JSON, usar el texto
        try {
          const errorText = await response.text();
          if (errorText) errorMessage = errorText;
        } catch {
          // Ignorar errores al leer el texto
        }
      }
      
      // Si token expiró o es inválido: limpiar sesión y recargar página
      if (response.status === 401 && (
        errorMessage.includes('token expirado') ||
        errorMessage.includes('token inválido') ||
        errorMessage.includes('No autorizado')
      )) {
        console.warn('[API] Token inválido/expirado. Cerrando sesión...');
        localStorage.removeItem('jwt_token');
        localStorage.removeItem('empleado_sesion');
        window.location.reload();
      }
      
      // Lanzar error con información útil
      const error = new Error(errorMessage);
      error.status = response.status;
      throw error;
    }
    
    // Verificar si hay contenido
    const text = await response.text();
    if (!text) {
      return null;
    }
    
    return JSON.parse(text);
  } catch (error) {
    // Si ya es nuestro error, relanzar
    if (error.status) {
      // Si estamos en login y es error 401: no mostrar error, solo devolver array vacío
      const rutaLogin = window.location.pathname === '/' || window.location.pathname === '/acceso';
      if (error.status === 401 && rutaLogin) {
        console.log(`[API] Petición a ${endpoint} rechazada: usuario no autenticado`);
        return [];
      }
      throw error;
    }
    // Error de red u otro error
    console.error(`[API] Error en ${endpoint}:`, error.message);
    throw error;
  }
};

// Mapeo de entidades a endpoints del servidor
const endpointMap = {
  'Venta': '/ventas',
  'DetalleVenta': '/ventas', // Usa el mismo endpoint de ventas
  'Comanda': '/comandas',
  'DetalleComanda': '/comandas',
  'Plato': '/platos',
  'Ingrediente': '/ingredientes',
  'Gasto': '/gastos',
  'Adelanto': '/adelantos',
  'Receta': '/recetas',
  'RecetaPrimaria': '/recetaprimarias',
  'RecetaSecundaria': '/recetasecundarias',
  'DetalleRecetaPrimaria': '/detallerecetaprimarias',
  'DetalleRecetaSecundaria': '/detallerecetasecundarias',
  'Empleado': '/personal',
  'TasaCambio': '/tasas-cambio',
};

// Convertir datos del formato localStorage al formato servidor
const normalizeForServer = (entity, data) => {
  const normalized = { ...data };
  
  // Campos comunes
  if (normalized.created_date) {
    normalized.createdAt = normalized.created_date;
    delete normalized.created_date;
  }
  
  // Mapeos de IDs
  if (normalized.comanda_id) {
    normalized.comandaId = normalized.comanda_id;
    delete normalized.comanda_id;
  }
  if (normalized.plato_id) {
    normalized.platoId = normalized.plato_id;
    delete normalized.plato_id;
  }
  if (normalized.venta_id) {
    normalized.ventaId = normalized.venta_id;
    delete normalized.venta_id;
  }
  if (normalized.ingrediente_id) {
    normalized.ingredienteId = normalized.ingrediente_id;
    delete normalized.ingrediente_id;
  }
  if (normalized.empleado_id) {
    normalized.empleadoId = normalized.empleado_id;
    delete normalized.empleado_id;
  }
  
  // Normalizar nombres de campos para Prisma
  if (normalized.plato_nombre) {
    normalized.platoNombre = normalized.plato_nombre;
    delete normalized.plato_nombre;
  }
  if (normalized.precio_unitario) {
    normalized.precioUnitario = normalized.precio_unitario;
    delete normalized.precio_unitario;
  }
  if (normalized.cantidad_requerida !== undefined) {
    normalized.cantidadRequerida = normalized.cantidad_requerida;
    normalized.cantidad = normalized.cantidad_requerida; // Para detalles que usan 'cantidad'
    delete normalized.cantidad_requerida;
  }
  if (normalized.cantidad_disponible !== undefined) {
    normalized.cantidadDisponible = normalized.cantidad_disponible;
    delete normalized.cantidad_disponible;
  }
  if (normalized.cantidad_minima !== undefined) {
    normalized.cantidadMinima = normalized.cantidad_minima;
    delete normalized.cantidad_minima;
  }
  if (normalized.costo_por_unidad !== undefined) {
    normalized.costoPorUnidad = normalized.costo_por_unidad;
    delete normalized.costo_por_unidad;
  }
  if (normalized.factor_conversion) {
    normalized.factorConversion = normalized.factor_conversion;
    delete normalized.factor_conversion;
  }
  if (normalized.unidad_medida) {
    normalized.unidadMedida = normalized.unidad_medida;
    delete normalized.unidad_medida;
  }
  if (normalized.unidad_receta) {
    normalized.unidadReceta = normalized.unidad_receta;
    delete normalized.unidad_receta;
  }
  if (normalized.nombre_completo) {
    normalized.nombreCompleto = normalized.nombre_completo;
    delete normalized.nombre_completo;
  }
  if (normalized.total_comanda) {
    normalized.totalComanda = normalized.total_comanda;
    delete normalized.total_comanda;
  }
  if (normalized.mesa_numero) {
    normalized.mesaNumero = normalized.mesa_numero;
    delete normalized.mesa_numero;
  }
  if (normalized.mesero_nombre) {
    normalized.meseroNombre = normalized.mesero_nombre;
    delete normalized.mesero_nombre;
  }
  if (normalized.fecha_apertura) {
    normalized.fechaApertura = normalized.fecha_apertura;
    delete normalized.fecha_apertura;
  }
  if (normalized.fecha_cierre) {
    normalized.fechaCierre = normalized.fecha_cierre;
    delete normalized.fecha_cierre;
  }
  if (normalized.total_venta) {
    normalized.totalVenta = normalized.total_venta;
    delete normalized.total_venta;
  }
  if (normalized.metodo_pago) {
    normalized.metodoPago = normalized.metodo_pago;
    delete normalized.metodo_pago;
  }
  if (normalized.total_cop) {
    normalized.totalCop = normalized.total_cop;
    delete normalized.total_cop;
  }
  if (normalized.total_ves) {
    normalized.totalVes = normalized.total_ves;
    delete normalized.total_ves;
  }
  if (normalized.monto_original) {
    normalized.montoOriginal = normalized.monto_original;
    delete normalized.monto_original;
  }
  if (normalized.moneda_original) {
    normalized.monedaOriginal = normalized.moneda_original;
    delete normalized.moneda_original;
  }
  // costo_total, tiene_piezas, precio_6, precio_12, precio_sugerido:
  // Keep as snake_case — the Plato backend accepts both formats.
  // Only convert for non-Plato entities that need camelCase.
  if (normalized.fecha_hora) {
    normalized.fechaHora = normalized.fecha_hora;
    delete normalized.fecha_hora;
  }
  if (normalized.ingrediente_nombre) {
    normalized.ingredienteNombre = normalized.ingrediente_nombre;
    delete normalized.ingrediente_nombre;
  }
  if (normalized.elemento_nombre) {
    normalized.elementoNombre = normalized.elemento_nombre;
    delete normalized.elemento_nombre;
  }
  if (normalized.receta_primaria_id) {
    normalized.recetaPrimariaId = normalized.receta_primaria_id;
    delete normalized.receta_primaria_id;
  }
  if (normalized.receta_secundaria_id) {
    normalized.recetaSecundariaId = normalized.receta_secundaria_id;
    delete normalized.receta_secundaria_id;
  }
  if (normalized.tipo_elemento) {
    normalized.tipoElemento = normalized.tipo_elemento;
    delete normalized.tipo_elemento;
  }
  if (normalized.elemento_id) {
    normalized.elementoId = normalized.elemento_id;
    delete normalized.elemento_id;
  }
  
  // === CAMPOS PARA ADELANTOS ===
  if (normalized.empleado_nombre) {
    normalized.empleado = normalized.empleado_nombre;
    delete normalized.empleado_nombre;
  }
  if (normalized.notas) {
    normalized.descripcion = normalized.notas;
    delete normalized.notas;
  }
  if (normalized.fecha_adelanto) {
    normalized.fecha = normalized.fecha_adelanto;
    delete normalized.fecha_adelanto;
  }

  // === CAMPOS PARA GASTOS ===
  if (normalized.fecha_gasto) {
    normalized.fecha = normalized.fecha_gasto;
    delete normalized.fecha_gasto;
  }
  if (normalized.categoria && !normalized.categoriaNombre) {
    normalized.categoriaNombre = normalized.categoria;
  }
  
  // === NORMALIZACIÓN PROFUNDA (RECURSIVA PARA ENVÍO) ===
  // Normalizar recetas: preservar todos los campos que el backend acepta
  if (normalized.recetas && Array.isArray(normalized.recetas)) {
    normalized.recetas = normalized.recetas.map(r => ({
      ingrediente_id: r.ingrediente_id || r.ingredienteId,
      ingrediente_nombre: r.ingrediente_nombre || r.ingredienteNombre || r.nombre,
      tipo: r.tipo || 'ingrediente',
      cantidad_requerida: parseFloat(r.cantidad_requerida || r.cantidadRequerida) || 0,
      costo_ingrediente: parseFloat(r.costo_ingrediente || r.costoIngrediente) || 0
    }));
  }

  if (normalized.detalles && Array.isArray(normalized.detalles)) {
    normalized.detalles = normalized.detalles.map(d => {
      const item = { ...d };
      if (entity === 'RecetaPrimaria') {
        return {
          id: item.id,
          recetaPrimariaId: normalized.id,
          ingredienteId: item.ingrediente_id || item.id,
          ingredienteNombre: item.ingrediente_nombre || item.nombre,
          cantidad: parseFloat(item.cantidad_requerida || item.cantidad) || 0,
          unidadMedida: item.unidad_medida,
          costoIngrediente: parseFloat(item.costo_ingrediente) || 0
        };
      }
      if (entity === 'RecetaSecundaria') {
        return {
          id: item.id,
          recetaSecundariaId: normalized.id,
          elementoId: item.elemento_id || item.id,
          elementoNombre: item.elemento_nombre || item.nombre,
          tipoElemento: item.tipo_elemento || 'ingrediente',
          cantidad: parseFloat(item.cantidad_requerida || item.cantidad) || 0,
          costoElemento: parseFloat(item.costo_elemento) || 0
        };
      }
      return item;
    });
  }

  return normalized;
};

// Convertir datos del servidor al formato localStorage
const normalizeFromServer = (entity, data) => {
  if (!data) return data;
  
  // Si es un array, normalizar cada elemento
  if (Array.isArray(data)) {
    return data.map(item => normalizeFromServer(entity, item));
  }
  
  const normalized = { ...data };
  
  // Fix timezone for Postgres timestamp without timezone
  const dateFields = ['fecha_apertura', 'fecha_cierre', 'fecha_venta', 'created_date', 'createdAt', 'fecha_inicio', 'fecha_fin'];
  dateFields.forEach(field => {
    if (normalized[field] && typeof normalized[field] === 'string' && !normalized[field].endsWith('Z')) {
      normalized[field] += 'Z';
    }
  });

  // Revertir mapeos de IDs
  if (normalized.comandaId) {
    normalized.comanda_id = normalized.comandaId;
    delete normalized.comandaId;
  }
  if (normalized.platoId) {
    normalized.plato_id = normalized.platoId;
    delete normalized.platoId;
  }
  if (normalized.ventaId) {
    normalized.venta_id = normalized.ventaId;
    delete normalized.ventaId;
  }
  if (normalized.ingredienteId) {
    normalized.ingrediente_id = normalized.ingredienteId;
    delete normalized.ingredienteId;
  }
  if (normalized.empleadoId) {
    normalized.empleado_id = normalized.empleadoId;
    delete normalized.empleadoId;
  }
  
  // Revertir nombres de campos
  if (normalized.platoNombre) {
    normalized.plato_nombre = normalized.platoNombre;
    delete normalized.platoNombre;
  }
  if (normalized.precioUnitario) {
    normalized.precio_unitario = normalized.precioUnitario;
    delete normalized.precioUnitario;
  }
  if (normalized.cantidadRequerida) {
    normalized.cantidad_requerida = normalized.cantidadRequerida;
    delete normalized.cantidadRequerida;
  }
  if (normalized.cantidadDisponible !== undefined) {
    normalized.cantidad_disponible = normalized.cantidadDisponible;
    delete normalized.cantidadDisponible;
  }
  if (normalized.cantidad !== undefined && !normalized.cantidad_requerida) {
    normalized.cantidad_requerida = normalized.cantidad;
  }
  if (normalized.cantidadMinima) {
    normalized.cantidad_minima = normalized.cantidadMinima;
    delete normalized.cantidadMinima;
  }
  if (normalized.createdAt && !normalized.created_date) {
    normalized.created_date = normalized.createdAt;
    delete normalized.createdAt;
  }
  
  // === CAMPOS PARA RECETAS PRIMARIAS ===
  if (normalized.cantidadResultante) {
    normalized.cantidad_resultante = normalized.cantidadResultante;
    delete normalized.cantidadResultante;
  }
  if (normalized.unidadMedida) {
    normalized.unidad_medida = normalized.unidadMedida;
    delete normalized.unidadMedida;
  }
  if (normalized.costoTotal) {
    normalized.costo_total = normalized.costoTotal;
    delete normalized.costoTotal;
  }
  if (normalized.costoPorUnidad) {
    normalized.costo_por_unidad = normalized.costoPorUnidad;
    delete normalized.costoPorUnidad;
  }
  if (normalized.tiempoPreparacion) {
    normalized.tiempo_preparacion = normalized.tiempoPreparacion;
    delete normalized.tiempoPreparacion;
  }
  
  // === CAMPOS PARA DETALLES RECETAS ===
  if (normalized.recetaPrimariaId) {
    normalized.receta_primaria_id = normalized.recetaPrimariaId;
    delete normalized.recetaPrimariaId;
  }
  if (normalized.recetaSecundariaId) {
    normalized.receta_secundaria_id = normalized.recetaSecundariaId;
    delete normalized.recetaSecundariaId;
  }
  if (normalized.elementoId) {
    normalized.elemento_id = normalized.elementoId;
    delete normalized.elementoId;
  }
  if (normalized.elementoNombre) {
    normalized.elemento_nombre = normalized.elementoNombre;
    delete normalized.elementoNombre;
  }
  if (normalized.ingredienteNombre) {
    normalized.ingrediente_nombre = normalized.ingredienteNombre;
    delete normalized.ingredienteNombre;
  }
  if (normalized.tipoElemento) {
    normalized.tipo_elemento = normalized.tipoElemento;
    delete normalized.tipoElemento;
  }
  if (normalized.costoIngrediente) {
    normalized.costo_ingrediente = normalized.costoIngrediente;
    delete normalized.costoIngrediente;
  }
  if (normalized.costoElemento) {
    normalized.costo_elemento = normalized.costoElemento;
    delete normalized.costoElemento;
  }
  
  // === CAMPOS PARA PLATO ===
  if (normalized.tienePiezas && !normalized.tiene_piezas) {
    normalized.tiene_piezas = normalized.tienePiezas;
  }
  if (normalized.precio6 && !normalized.precio_6) {
    normalized.precio_6 = normalized.precio6;
  }
  if (normalized.precio12 && !normalized.precio_12) {
    normalized.precio_12 = normalized.precio12;
  }
  if (normalized.precioSugerido && !normalized.precio_sugerido) {
    normalized.precio_sugerido = normalized.precioSugerido;
  }
  
  // === CAMPOS PARA ADELANTOS ===
  if (normalized.empleado && !normalized.empleado_nombre) {
    normalized.empleado_nombre = normalized.empleado;
  }
  if (normalized.descripcion && !normalized.notas) {
    normalized.notas = normalized.descripcion;
  }
  if (normalized.fecha && !normalized.fecha_adelanto) {
    normalized.fecha_adelanto = normalized.fecha;
  }

  // === CAMPOS PARA GASTOS ===
  if (entity === 'Gasto') {
    if (normalized.fecha && !normalized.fecha_gasto) {
      normalized.fecha_gasto = normalized.fecha;
    }
    if (normalized.categoriaNombre && !normalized.categoria) {
      normalized.categoria = normalized.categoriaNombre;
    }
  }

  // === CAMPOS PARA PAGOS MIXTOS ===
  if (entity === 'PagoMixto') {
    if (normalized.monto_usd !== undefined) {
      normalized.monto_usd = normalized.monto_usd;
    } else if (normalized.monto !== undefined) {
      normalized.monto_usd = normalized.monto;
    }
    if (normalized.metodo && !normalized.metodo_pago) {
      normalized.metodo_pago = normalized.metodo;
    }
  }

  // === CAMPOS PARA ALERTA STOCK ===
  if (entity === 'AlertaStock') {
    if (normalized.creadoEn && !normalized.fecha_alerta) {
      normalized.fecha_alerta = normalized.creadoEn;
    }
    if (normalized.ingrediente_nombre && !normalized.nombre_ingrediente) {
      normalized.nombre_ingrediente = normalized.ingrediente_nombre;
    }
  }

  // === RECURSIVIDAD PARA CAMPOS ANIDADOS ===
  Object.keys(normalized).forEach(key => {
    if (Array.isArray(normalized[key]) && normalized[key].length > 0 && typeof normalized[key][0] === 'object') {
      let nestedEntity = null;
      if (key === 'recetas') nestedEntity = 'Receta';
      if (key === 'detalles' && (entity === 'Venta' || entity === 'Comanda')) {
        nestedEntity = entity === 'Venta' ? 'DetalleVenta' : 'DetalleComanda';
      }
      if (key === 'detalles' && entity === 'RecetaPrimaria') nestedEntity = 'DetalleRecetaPrimaria';
      if (key === 'detalles' && entity === 'RecetaSecundaria') nestedEntity = 'DetalleRecetaSecundaria';

      if (nestedEntity) {
        normalized[key] = normalized[key].map(item => normalizeFromServer(nestedEntity, item));
      }
    }
  });
  
  return normalized;
};

export const api = {
  entities: {
    // Generador automático de funciones CRUD que usan el servidor
    ...[
      "Adelanto",
      "AlertaStock",
      "CategoriaGasto",
      "DetalleRecetaPrimaria",
      "DetalleRecetaSecundaria",
      "DetalleComanda",
      "DetalleVenta",
      "Empleado",
      "Gasto",
      "HistorialCostoIngrediente",
      "Ingrediente",
      "LogLimpieza",
      "PagoCuentaPorCobrar",
      "PagoMixto",
      "Plato",
      "Receta",
      "RecetaPrimaria",
      "RecetaSecundaria",
      "SesionUsuario",
      "TasaCambio",
      "Venta",
      "CuentaPorCobrar",
      "Compra",
      "Comanda",
      "MetodoPago",
      "CompraIngrediente",
    ].reduce((acc, entity) => {
      const endpoint = endpointMap[entity] || `/${entity.toLowerCase()}s`;
      
      acc[entity] = {
        list: async () => {
          console.log(`[API] Listando ${entity} desde servidor`);
          try {
            // Usar endpoint genérico de sync si no hay endpoint específico
            if (entity === 'DetalleVenta') {
              // Los detalles de venta se incluyen con la venta
              const ventas = await serverFetch('/ventas');
              const detalles = [];
              ventas.forEach(v => {
                if (v.detalles) {
                  v.detalles.forEach(d => {
                    detalles.push({ ...d, venta_id: v.id });
                  });
                }
              });
              return normalizeFromServer(entity, detalles);
            }
            if (entity === 'DetalleComanda') {
              // Los detalles de comanda se incluyen con la comanda
              const comandas = await serverFetch('/comandas');
              const detalles = [];
              comandas.forEach(c => {
                if (c.detalles) {
                  c.detalles.forEach(d => {
                    detalles.push({ ...d, comanda_id: c.id });
                  });
                }
              });
              return normalizeFromServer(entity, detalles);
            }
            const data = await serverFetch(endpoint);
            return normalizeFromServer(entity, data);
          } catch (e) {
            console.error(`[API] Error listando ${entity}:`, e.message);
            return [];
          }
        },
        // Filtrar por campos
        filter: async (criteria = {}) => {
          console.log(`[API] Filtrando ${entity} con:`, criteria);
          try {
            const data = await serverFetch(endpoint);
            const normalized = normalizeFromServer(entity, data);
            
            if (!criteria || Object.keys(criteria).length === 0) return normalized;
            
            return normalized.filter(item => {
              return Object.keys(criteria).every(key => {
                return String(item[key]) === String(criteria[key]);
              });
            });
          } catch (e) {
            console.error(`[API] Error filtrando ${entity}:`, e.message);
            return [];
          }
        },
        create: async (data) => {
          console.log(`[API] Creando ${entity}:`, data);
          try {
            const normalized = normalizeForServer(entity, data);
            normalized.id = normalized.id || genUUID();
            normalized.createdAt = normalized.createdAt || new Date().toISOString();
            
            // Manejo especial para algunas entidades
            if (entity === 'Venta') {
              const result = await serverFetch('/ventas', {
                method: 'POST',
                body: JSON.stringify({
                  total_venta: normalized.totalVenta || normalized.total_venta,
                  metodo_pago: normalized.metodoPago || normalized.metodo_pago,
                  total_cop: normalized.totalCop || normalized.total_cop,
                  total_ves: normalized.totalVes || normalized.total_ves,
                  monto_original: normalized.montoOriginal || normalized.monto_original,
                  moneda_original: normalized.monedaOriginal || normalized.moneda_original,
                  detalles: normalized.detalles || []
                })
              });
              return normalizeFromServer(entity, result);
            }
            
            if (entity === 'Comanda') {
              const result = await serverFetch('/comandas', {
                method: 'POST',
                body: JSON.stringify({
                  numero_comanda: normalized.numeroComanda || normalized.numero_comanda,
                  mesa_numero: normalized.mesaNumero || normalized.mesa_numero,
                  mesero_nombre: normalized.meseroNombre || normalized.mesero_nombre,
                  fecha_apertura: normalized.fechaApertura || normalized.fecha_apertura,
                  estado: normalized.estado || 'abierta',
                  total_comanda: normalized.totalComanda || normalized.total_comanda || 0,
                  notas: normalized.notas || '',
                  detalles: normalized.detalles || []
                })
              });
              return normalizeFromServer(entity, result);
            }
            
            // Manejo especial para RecetaPrimaria
            if (entity === 'RecetaPrimaria') {
              const result = await serverFetch('/recetaprimarias', {
                method: 'POST',
                body: JSON.stringify({
                  nombre: normalized.nombre,
                  descripcion: normalized.descripcion,
                  unidadMedida: normalized.unidadMedida || normalized.unidad_medida,
                  cantidadResultante: normalized.cantidadResultante || normalized.cantidad_resultante || 1,
                  costoTotal: normalized.costoTotal || normalized.costo_total || 0,
                  costoPorUnidad: normalized.costoPorUnidad || normalized.costo_por_unidad || 0,
                  tiempoPreparacion: normalized.tiempoPreparacion || normalized.tiempo_preparacion,
                  instrucciones: normalized.instrucciones,
                  activa: normalized.activa !== false
                })
              });
              return normalizeFromServer(entity, result);
            }
            
            // Manejo especial para RecetaSecundaria
            if (entity === 'RecetaSecundaria') {
              const result = await serverFetch('/recetasecundarias', {
                method: 'POST',
                body: JSON.stringify({
                  nombre: normalized.nombre,
                  descripcion: normalized.descripcion,
                  unidadMedida: normalized.unidadMedida || normalized.unidad_medida,
                  cantidadResultante: normalized.cantidadResultante || normalized.cantidad_resultante || 1,
                  costoTotal: normalized.costoTotal || normalized.costo_total || 0,
                  costoPorUnidad: normalized.costoPorUnidad || normalized.costo_por_unidad || 0,
                  tiempoPreparacion: normalized.tiempoPreparacion || normalized.tiempo_preparacion,
                  instrucciones: normalized.instrucciones,
                  activa: normalized.activa !== false
                })
              });
              return normalizeFromServer(entity, result);
            }
            
            // Manejo especial para DetalleRecetaPrimaria
            if (entity === 'DetalleRecetaPrimaria') {
              const result = await serverFetch('/detallerecetaprimarias', {
                method: 'POST',
                body: JSON.stringify({
                  recetaPrimariaId: normalized.recetaPrimariaId || normalized.receta_primaria_id,
                  ingredienteId: normalized.ingredienteId || normalized.ingrediente_id,
                  ingredienteNombre: normalized.ingredienteNombre || normalized.ingrediente_nombre,
                  tipoElemento: normalized.tipoElemento || normalized.tipo_elemento,
                  cantidad: normalized.cantidad || normalized.cantidadRequerida,
                  unidadMedida: normalized.unidadMedida || normalized.unidad_medida,
                  costoIngrediente: normalized.costoIngrediente || normalized.costo_ingrediente || 0
                })
              });
              return normalizeFromServer(entity, result);
            }
            
            // Manejo especial para DetalleRecetaSecundaria
            if (entity === 'DetalleRecetaSecundaria') {
              const result = await serverFetch('/detallerecetasecundarias', {
                method: 'POST',
                body: JSON.stringify({
                  recetaSecundariaId: normalized.recetaSecundariaId || normalized.receta_secundaria_id,
                  elementoId: normalized.elementoId || normalized.elemento_id,
                  elementoNombre: normalized.elementoNombre || normalized.elemento_nombre,
                  tipoElemento: normalized.tipoElemento || normalized.tipo_elemento,
                  cantidad: normalized.cantidad || normalized.cantidadRequerida,
                  unidadMedida: normalized.unidadMedida || normalized.unidad_medida,
                  costoElemento: normalized.costoElemento || normalized.costo_elemento || 0
                })
              });
              return normalizeFromServer(entity, result);
            }
            
            // Manejo especial para Gasto
            if (entity === 'Gasto') {
              const result = await serverFetch('/gastos', {
                method: 'POST',
                body: JSON.stringify({
                  descripcion: normalized.descripcion,
                  monto: normalized.monto || 0,
                  monto_original: normalized.montoOriginal || normalized.monto_original || normalized.monto || 0,
                  moneda_original: normalized.monedaOriginal || normalized.moneda_original || 'USD',
                  metodo_pago: normalized.metodoPago || normalized.metodo_pago || 'efectivo_usd',
                  categoriaNombre: normalized.categoriaNombre || normalized.categoria || null,
                  fecha: normalized.fecha || new Date().toISOString()
                })
              });
              return normalizeFromServer(entity, result);
            }

            // Usar endpoint directo para otras entidades
            const result = await serverFetch(endpointMap[entity] || `/${entity.toLowerCase()}s`, {
              method: 'POST',
              body: JSON.stringify(normalized)
            });
            
            return normalizeFromServer(entity, result || normalized);
          } catch (e) {
            console.error(`[API] Error creando ${entity}:`, e.message);
            // En caso de error, devolver datos localmente generados
            return { ...data, id: genUUID(), created_date: new Date().toISOString() };
          }
        },
        update: async (id, data) => {
          console.log(`[API] Actualizando ${entity} ${id}:`, data);
          try {
            const normalized = normalizeForServer(entity, data);
            
            // Manejo especial para Comanda
            if (entity === 'Comanda') {
              const result = await serverFetch(`/comandas/${id}`, {
                method: 'PUT',
                body: JSON.stringify({
                  numero_comanda: normalized.numeroComanda,
                  mesa_numero: normalized.mesaNumero,
                  mesero_nombre: normalized.meseroNombre,
                  fecha_apertura: normalized.fechaApertura,
                  fecha_cierre: normalized.fechaCierre,
                  estado: normalized.estado,
                  total_comanda: normalized.totalComanda,
                  notas: normalized.notas
                })
              });
              return normalizeFromServer(entity, result);
            }
            
            // Manejo especial para Ingrediente (SOLO si es actualización de stock aislada)
            const keys = Object.keys(data);
            if (entity === 'Ingrediente' && keys.length === 1 && keys[0] === 'cantidad_disponible') {
              const result = await serverFetch(`/ingredientes/${id}/stock`, {
                method: 'PUT',
                body: JSON.stringify({
                  cantidad_disponible: data.cantidad_disponible
                })
              });
              return normalizeFromServer(entity, result);
            }
            
            // Manejo especial para RecetaPrimaria
            if (entity === 'RecetaPrimaria') {
              const result = await serverFetch(`/recetaprimarias/${id}`, {
                method: 'PUT',
                body: JSON.stringify({
                  nombre: normalized.nombre,
                  descripcion: normalized.descripcion,
                  unidadMedida: normalized.unidadMedida || normalized.unidad_medida,
                  cantidadResultante: normalized.cantidadResultante || normalized.cantidad_resultante,
                  costoTotal: normalized.costoTotal || normalized.costo_total,
                  costoPorUnidad: normalized.costoPorUnidad || normalized.costo_por_unidad,
                  tiempoPreparacion: normalized.tiempoPreparacion || normalized.tiempo_preparacion,
                  instrucciones: normalized.instrucciones,
                  activa: normalized.activa
                })
              });
              return normalizeFromServer(entity, result);
            }
            
            // Manejo especial para RecetaSecundaria
            if (entity === 'RecetaSecundaria') {
              const result = await serverFetch(`/recetasecundarias/${id}`, {
                method: 'PUT',
                body: JSON.stringify({
                  nombre: normalized.nombre,
                  descripcion: normalized.descripcion,
                  unidadMedida: normalized.unidadMedida || normalized.unidad_medida,
                  cantidadResultante: normalized.cantidadResultante || normalized.cantidad_resultante,
                  costoTotal: normalized.costoTotal || normalized.costo_total,
                  costoPorUnidad: normalized.costoPorUnidad || normalized.costo_por_unidad,
                  tiempoPreparacion: normalized.tiempoPreparacion || normalized.tiempo_preparacion,
                  instrucciones: normalized.instrucciones,
                  activa: normalized.activa
                })
              });
              return normalizeFromServer(entity, result);
            }
            
            // Manejo especial para Receta (plato)
            if (entity === 'Receta') {
              const result = await serverFetch(`/recetas/${id}`, {
                method: 'PUT',
                body: JSON.stringify({
                  platoId: normalized.platoId || normalized.plato_id,
                  ingredienteId: normalized.ingredienteId || normalized.ingrediente_id,
                  ingredienteNombre: normalized.ingredienteNombre || normalized.ingrediente_nombre,
                  cantidadRequerida: normalized.cantidadRequerida || normalized.cantidad_requerida,
                  costoIngrediente: normalized.costoIngrediente || normalized.costo_ingrediente
                })
              });
              return normalizeFromServer(entity, result);
            }
            
            // Manejo especial para DetalleComanda
            if (entity === 'DetalleComanda') {
              const result = await serverFetch(`/comandas/detalles/${id}`, {
                method: 'PUT',
                body: JSON.stringify({
                  estado_plato: normalized.estado_plato,
                  notas_plato: normalized.notas_plato,
                  cantidad: normalized.cantidad
                })
              });
              return normalizeFromServer(entity, result);
            }
            
            // Usar endpoint directo para otras entidades
            const result = await serverFetch(`${endpointMap[entity] || `/${entity.toLowerCase()}s`}/${id}`, {
              method: 'PUT',
              body: JSON.stringify(normalized)
            });
            
            return normalizeFromServer(entity, result || normalized);
          } catch (e) {
            console.error(`[API] Error actualizando ${entity}:`, e.message);
            return data;
          }
        },
        delete: async (id) => {
          console.log(`[API] Eliminando ${entity} ${id}`);
          try {
            // Manejo especial para Comanda
            if (entity === 'Comanda') {
              await serverFetch(`/comandas/${id}`, {
                method: 'DELETE'
              });
              return { success: true };
            }
            
            // Manejo especial para Gasto
            if (entity === 'Gasto') {
              await serverFetch(`/gastos/${id}`, {
                method: 'DELETE'
              });
              return { success: true };
            }
            
            // Manejo especial para Adelanto
            if (entity === 'Adelanto') {
              await serverFetch(`/adelantos/${id}`, {
                method: 'DELETE'
              });
              return { success: true };
            }
            
            // Manejo especial para Empleado
            if (entity === 'Empleado') {
              await serverFetch(`/personal/${id}`, {
                method: 'DELETE'
              });
              return { success: true };
            }
            
            // Manejo especial para Ingrediente
            if (entity === 'Ingrediente') {
              await serverFetch(`/ingredientes/${id}`, {
                method: 'DELETE'
              });
              return { success: true };
            }
            
            // Manejo especial para RecetaPrimaria
            if (entity === 'RecetaPrimaria') {
              await serverFetch(`/recetaprimarias/${id}`, {
                method: 'DELETE'
              });
              return { success: true };
            }
            
            // Manejo especial para RecetaSecundaria
            if (entity === 'RecetaSecundaria') {
              await serverFetch(`/recetasecundarias/${id}`, {
                method: 'DELETE'
              });
              return { success: true };
            }
            
            // Manejo especial para Receta (plato)
            if (entity === 'Receta') {
              await serverFetch(`/recetas/${id}`, {
                method: 'DELETE'
              });
              return { success: true };
            }
            
            // Manejo especial para DetalleRecetaPrimaria
            if (entity === 'DetalleRecetaPrimaria') {
              await serverFetch(`/detallerecetaprimarias/${id}`, {
                method: 'DELETE'
              });
              return { success: true };
            }
            
            // Manejo especial para DetalleRecetaSecundaria
            if (entity === 'DetalleRecetaSecundaria') {
              await serverFetch(`/detallerecetasecundarias/${id}`, {
                method: 'DELETE'
              });
              return { success: true };
            }
            
            // Manejo especial para Plato
            if (entity === 'Plato') {
              await serverFetch(`/platos/${id}`, {
                method: 'DELETE'
              });
              return { success: true };
            }
            
            return { success: true };
          } catch (e) {
            console.error(`[API] Error eliminando ${entity}:`, e.message);
            return { success: false, error: e.message };
          }
        }
      };
      return acc;
    }, {}),
  },
  // Extender entidades con métodos personalizados
  custom: {
    pagarComanda: (id, payload) => serverFetch(`/comandas/${id}/pagar`, {
      method: 'POST',
      body: JSON.stringify(payload)
    })
  },
  // Simulación de sistema de usuarios para Acceso.jsx
  users: {
    inviteUser: async (data) => console.log("Usuario invitado", data),
  },
  mantenimiento: {
    getResumen: () => serverFetch('/mantenimiento/resumen-depuracion'),
    ejecutarDepuracion: (fechaLimite) => serverFetch('/mantenimiento/ejecutar-depuracion', {
      method: 'POST',
      body: JSON.stringify({ fechaLimite })
    })
  }
};

// Seed seguro: crear un empleado administrador si no existen empleados en el servidor
// (Esto es solo para desarrollo local, en producción los empleados vienen del servidor)
console.info('[API] Usando endpoints del servidor Express para persistencia de datos');
