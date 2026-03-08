// src/api/apiAdapter.js

// UUID compatible con HTTP (sin contexto seguro)
const genUUID = () =>
  (typeof crypto !== 'undefined' && crypto.randomUUID)
    ? crypto.randomUUID()
    : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
        const r = Math.random() * 16 | 0;
        return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
      });

// Utilidad para manejar el almacenamiento local (LocalStorage)
const db = {
  get: (key) => JSON.parse(localStorage.getItem(`st_sushi_${key}`) || '[]'),
  set: (key, data) => localStorage.setItem(`st_sushi_${key}`, JSON.stringify(data)),
};

export const api = {
  entities: {
    // Generador automático de funciones CRUD para cada entidad
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
      acc[entity] = {
        list: async () => {
          console.log(`[LocalDB] Listando ${entity}`);
          return db.get(entity);
        },
        // Filtrar por campos (ej: { id: 'abc' } )
        filter: async (criteria = {}) => {
          const items = db.get(entity);
          if (!criteria || Object.keys(criteria).length === 0) return items;
          return items.filter(item => {
            return Object.keys(criteria).every(key => {
              // soportar búsqueda por id exacta y coincidencia simple
              return String(item[key]) === String(criteria[key]);
            });
          });
        },
        create: async (data) => {
          const items = db.get(entity);
          const newItem = { 
            ...data, 
            id: genUUID(),
            created_date: new Date().toISOString() 
          };
          db.set(entity, [newItem, ...items]);
          return newItem;
        },
        update: async (id, data) => {
          const items = db.get(entity);
          const updated = items.map(item => item.id === id ? { ...item, ...data } : item);
          db.set(entity, updated);
          return data;
        },
        delete: async (id) => {
          const items = db.get(entity);
          db.set(entity, items.filter(item => item.id !== id));
          return { success: true };
        }
      };
      return acc;
    }, {}),
  },
  // Simulación de sistema de usuarios para Acceso.jsx
  users: {
    inviteUser: async (data) => console.log("Usuario invitado localmente", data),
  }
};

// Seed seguro: crear un empleado administrador si no existen empleados en el almacenamiento local
(function seedLocalAdmin() {
  try {
    const empleados = db.get('Empleado');
    if (!Array.isArray(empleados) || empleados.length === 0) {
      const admin = {
        id: genUUID(),
        nombre_completo: 'Administrador',
        email: 'admin@local',
        rol: 'administrador',
        activo: true,
        created_date: new Date().toISOString(),
      };
      db.set('Empleado', [admin]);
      console.info('[LocalDB] Empleado administrador sembrado localmente');
    }
  } catch (e) {
    console.warn('[LocalDB] Seed omitido:', e?.message);
  }
})();

// Seed adicional: asegurar datos mínimos para evitar errores en descuento de stock
(function seedLocalDemoData() {
  try {
    const ingredientes = db.get('Ingrediente');
    const platos = db.get('Plato');
    const recetas = db.get('Receta');

    if ((!Array.isArray(ingredientes) || ingredientes.length === 0) || (!Array.isArray(platos) || platos.length === 0)) {
      const ingrediente = {
        id: genUUID(),
        nombre: 'Ingrediente demo',
        cantidad_disponible: 1000,
        cantidad_minima: 10,
        unidad_medida: 'unidad',
        unidad_receta: 'unidad',
        factor_conversion: 1,
        costo_por_unidad: 0,
        created_date: new Date().toISOString()
      };

      const plato = {
        id: genUUID(),
        nombre: 'hola',
        precio: 1.0,
        activo: true,
        created_date: new Date().toISOString()
      };

      const receta = {
        id: genUUID(),
        plato_id: plato.id,
        plato_nombre: plato.nombre,
        ingrediente_id: ingrediente.id,
        ingrediente_nombre: ingrediente.nombre,
        cantidad_requerida: 1,
        created_date: new Date().toISOString()
      };

      if (!Array.isArray(ingredientes) || ingredientes.length === 0) db.set('Ingrediente', [ingrediente]);
      if (!Array.isArray(platos) || platos.length === 0) db.set('Plato', [plato]);
      const existingRecetas = db.get('Receta');
      if (!Array.isArray(existingRecetas) || existingRecetas.length === 0) db.set('Receta', [receta]);

      console.info('[LocalDB] Seed demo: ingrediente, plato y receta creados para evitar errores de stock');
    }
  } catch (e) {
    console.warn('[LocalDB] Seed demo omitido:', e?.message);
  }
})();