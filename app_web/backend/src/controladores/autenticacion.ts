import type { Request, Response } from "express";
import { esquemaIngreso, esquemaRegistro } from "../utilidades/validadores.js";
import * as servicioAutenticacion from "../servicios/autenticacion.js";
import { exito, error } from "../utilidades/respuestas.js";

/**
 * Controladores de autenticación.
 * Solo orquestan: validar entrada -> llamar servicio -> responder.
 */

/** Traduce un error de Supabase del registro a un mensaje claro para el usuario. */
function mensajeErrorRegistro(causa: unknown): string {
  const detalle = causa as { code?: string } | undefined;
  switch (detalle?.code) {
    case "over_email_send_rate_limit":
      return "Se excedió temporalmente el límite de correos de confirmación. Intenta en unos minutos.";
    case "email_address_invalid":
      return "El correo no es válido o el dominio no está permitido.";
    case "user_already_exists":
      return "Ya existe una cuenta con ese correo.";
    case "weak_password":
      return "La contraseña es demasiado débil (mínimo 6 caracteres).";
    default:
      return "No se pudo registrar el usuario.";
  }
}

export async function registrarUsuario(
  peticion: Request,
  respuesta: Response
): Promise<void> {
  try {
    const datos = esquemaRegistro.parse(peticion.body);
    const resultado = await servicioAutenticacion.registrar(datos);
    respuesta.status(201).json(exito(resultado, "Usuario registrado."));
  } catch (causa) {
    respuesta.status(400).json(error(mensajeErrorRegistro(causa), causa));
  }
}

export async function iniciarSesionUsuario(
  peticion: Request,
  respuesta: Response
): Promise<void> {
  try {
    const datos = esquemaIngreso.parse(peticion.body);
    const sesion = await servicioAutenticacion.iniciarSesion(datos);
    respuesta.status(200).json(exito(sesion, "Sesión iniciada."));
  } catch (causa) {
    respuesta.status(401).json(error("Credenciales inválidas.", causa));
  }
}

export async function cerrarSesionUsuario(
  peticion: Request,
  respuesta: Response
): Promise<void> {
  try {
    await servicioAutenticacion.cerrarSesion(peticion.tokenAcceso ?? "");
    respuesta.status(200).json(exito(null, "Sesión cerrada."));
  } catch (causa) {
    respuesta.status(500).json(error("No se pudo cerrar la sesión.", causa));
  }
}

export function obtenerSesionActual(
  peticion: Request,
  respuesta: Response
): void {
  try {
    respuesta.status(200).json(exito(peticion.usuario, "Sesión válida."));
  } catch (causa) {
    respuesta.status(500).json(error("No se pudo verificar la sesión.", causa));
  }
}