import type { NextFunction, Request, Response } from "express";
import { obtenerUsuarioDesdeToken } from "../servicios/autenticacion.js";
import { error } from "../utilidades/respuestas.js";

/**
 * Middleware que valida el token JWT de Supabase.
 * Extrae el token de la cabecera Authorization: Bearer <token>.
 */
export async function validarToken(
  peticion: Request,
  respuesta: Response,
  siguiente: NextFunction
): Promise<void> {
  const cabecera = peticion.headers.authorization ?? "";
  const token = cabecera.startsWith("Bearer ") ? cabecera.slice(7) : null;

  if (!token) {
    respuesta.status(401).json(error("Se requiere un token de acceso."));
    return;
  }

  const usuario = await obtenerUsuarioDesdeToken(token);

  if (!usuario) {
    respuesta.status(401).json(error("Token inválido o expirado."));
    return;
  }

  peticion.tokenAcceso = token;
  peticion.usuario = usuario;
  siguiente();
}