import type { Request, Response } from "express";
import { z } from "zod";
import { esquemaPunto } from "../utilidades/validadores.js";
import * as servicioPuntos from "../servicios/puntos.js";
import { exito, error } from "../utilidades/respuestas.js";

/**
 * Controladores de puntos de interés geolocalizados.
 * Solo orquestan: validar entrada -> llamar servicio -> responder.
 * Todas las rutas requieren sesión de empresa (middleware validarToken).
 */

/** Lista los puntos del lugar autenticado. */
export async function listarMisPuntos(
  peticion: Request,
  respuesta: Response
): Promise<void> {
  try {
    const empresaId = peticion.usuario?.id ?? "";
    const puntos = await servicioPuntos.listarPuntosDeEmpresa(empresaId);
    respuesta.status(200).json(exito(puntos, "Puntos listados."));
  } catch (causa) {
    respuesta.status(500).json(error("No se pudieron listar los puntos.", causa));
  }
}

/** Crea un punto para el lugar autenticado. */
export async function crearMiPunto(
  peticion: Request,
  respuesta: Response
): Promise<void> {
  try {
    const datos = esquemaPunto.parse(peticion.body);
    const empresaId = peticion.usuario?.id ?? "";
    const punto = await servicioPuntos.crearPunto(empresaId, datos);
    respuesta.status(201).json(exito(punto, "Punto creado."));
  } catch (causa) {
    if (causa instanceof z.ZodError) {
      respuesta
        .status(400)
        .json(error(causa.issues[0]?.message ?? "Datos del punto inválidos.", causa));
      return;
    }
    respuesta.status(500).json(error("No se pudo crear el punto.", causa));
  }
}

/** Actualiza un punto propio del lugar autenticado. */
export async function actualizarMiPunto(
  peticion: Request,
  respuesta: Response
): Promise<void> {
  try {
    const datos = esquemaPunto.parse(peticion.body);
    const empresaId = peticion.usuario?.id ?? "";
    const punto = await servicioPuntos.actualizarPunto(
      empresaId,
      peticion.params.id,
      datos
    );

    if (!punto) {
      respuesta.status(404).json(error("Punto no encontrado."));
      return;
    }

    respuesta.status(200).json(exito(punto, "Punto actualizado."));
  } catch (causa) {
    if (causa instanceof z.ZodError) {
      respuesta
        .status(400)
        .json(error(causa.issues[0]?.message ?? "Datos del punto inválidos.", causa));
      return;
    }
    respuesta.status(500).json(error("No se pudo actualizar el punto.", causa));
  }
}

/** Elimina un punto propio del lugar autenticado. */
export async function eliminarMiPunto(
  peticion: Request,
  respuesta: Response
): Promise<void> {
  try {
    const empresaId = peticion.usuario?.id ?? "";
    const eliminado = await servicioPuntos.eliminarPunto(
      empresaId,
      peticion.params.id
    );

    if (!eliminado) {
      respuesta.status(404).json(error("Punto no encontrado."));
      return;
    }

    respuesta.status(200).json(exito(null, "Punto eliminado."));
  } catch (causa) {
    respuesta.status(500).json(error("No se pudo eliminar el punto.", causa));
  }
}
