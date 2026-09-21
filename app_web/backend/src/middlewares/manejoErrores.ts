import type { NextFunction, Request, Response } from "express";
import { error } from "../utilidades/respuestas.js";

/** Middleware para rutas inexistentes. */
export function rutaNoEncontrada(_peticion: Request, respuesta: Response): void {
  respuesta.status(404).json(error("Ruta no encontrada."));
}

/** Manejador global de errores. Evita que cualquier error tire el servidor. */
export function manejarErrores(
  causa: unknown,
  _peticion: Request,
  respuesta: Response,
  _siguiente: NextFunction
): void {
  console.error("[Error no controlado]", causa);
  respuesta.status(500).json(error("Ocurrió un error interno del servidor.", causa));
}