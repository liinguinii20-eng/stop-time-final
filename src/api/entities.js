// src/api/entities.js
// Funciones locales independientes para gestionar platos y recetas

export const Plato = {
  list: async () => {
    // Aquí podrías poner un fetch real a tu nueva API
    return []; 
  },
  create: async (data) => {
    console.log("Creando plato local:", data);
    return { id: Date.now().toString(), ...data };
  },
  update: async (id, data) => {
    console.log("Actualizando plato local:", id, data);
    return { id, ...data };
  },
  delete: async (id) => {
    console.log("Eliminando plato local:", id);
    return id;
  }
};

export const Receta = {
  list: async () => [],
  create: async (data) => {
    console.log("Creando receta local:", data);
    return { id: Date.now().toString(), ...data };
  },
  delete: async (id) => {
    console.log("Borrando receta local:", id);
    return id;
  }
};

export const Ingrediente = { list: async () => [] };
export const RecetaPrimaria = { list: async () => [] };
export const RecetaSecundaria = { list: async () => [] };