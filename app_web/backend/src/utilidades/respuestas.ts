import type { RespuestaApi } from "../tipos/index.js";

/**
 * Respuestas API estandarizadas.
 * Un solo formato para todo el backend: { exito, mensaje, datos, errores }.
 */

export function exito<T>(datos: T, mensaje = "Operación completada."): RespuestaApi<T> {
  return { exito: true, mensaje, datos };
}

export function error(mensaje: string, detalle?: unknown): RespuestaApi<never> {
  return { exito: false, mensaje, errores: detalle ? [detalle] : undefined };
}