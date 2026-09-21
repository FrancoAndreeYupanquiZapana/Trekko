/**
 * Configuración centralizada del frontend.
 * El frontend se comunica EXCLUSIVAMENTE con la API del backend (Trekko).
 * Las variables NEXT_PUBLIC_ son visibles también en el navegador.
 */
const urlApi = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api";

export const entorno = {
  /** URL base de la API del backend, incluye el prefijo /api (ej. http://localhost:4000/api). */
  apiUrl: urlApi,
  /** true cuando hay una URL de API disponible (siempre hay un valor por defecto en local). */
  apiConfigurada: Boolean(urlApi),
} as const;