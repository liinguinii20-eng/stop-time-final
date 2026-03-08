// src/api/base44Client.js
// Reexporta el adaptador local `apiAdapter` como `base44` para compatibilidad
// con llamadas al SDK original en el resto del código.
import { api as localApi } from "./apiAdapter";

export const base44 = localApi;

export const auth = {
  login: async () => ({ success: true }),
  logout: () => console.log("Sesión cerrada localmente")
};