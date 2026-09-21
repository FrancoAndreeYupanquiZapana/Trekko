import { pedirApi } from "./api";
import type { DetalleRemoto, LugarTarjeta, PaqueteLugar } from "@/tipos";

/**
 * Consumo de la API pública de Trekko desde la app.
 * Estas llamadas necesitan red; el contenido ya descargado se lee de SQLite
 * (ver servicios/descargas.ts).
 */

/** Catálogo de lugares para el home. */
export function listarLugares(): Promise<LugarTarjeta[]> {
  return pedirApi("/empresas");
}

/** Detalle remoto de un lugar: vista previa online + revisión actual. */
export function obtenerDetalle(id: string): Promise<DetalleRemoto> {
  return pedirApi(`/empresas/${id}`);
}

/** Descarga el paquete v5 completo (texto + imágenes optimizadas). */
export async function descargarPaquete(id: string): Promise<PaqueteLugar> {
  return pedirApi(`/empresas/${id}/paquete-app`);
}