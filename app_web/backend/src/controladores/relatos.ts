import type { Request, Response } from "express";
import { z } from "zod";
import { esquemaRelato } from "../utilidades/validadores.js";
import * as servicioRelatos from "../servicios/relatos.js";
import { EspecieInvalidaError } from "../servicios/relatos.js";
import { exito, error } from "../utilidades/respuestas.js";

/**
 * Controladores de relatos locales (mitos, leyendas, datos curiosos y simbiosis).
 * Solo orquestan: validar entrada -> llamar servicio -> responder.
 * Todas las rutas requieren sesión de empresa (middleware validarToken).
 */

/** Lista los relatos del lugar autenticado. */
export async function listarMisRelatos(
  peticion: Request,
  respuesta: Response
): Promise<void> {
  try {
    const empresaId = peticion.usuario?.id ?? "";
    const relatos = await servicioRelatos.listarRelatosDeEmpresa(empresaId);
    respuesta.status(200).json(exito(relatos, "Relatos listados."));
  } catch (causa) {
    respuesta.status(500).json(error("No se pudieron listar los relatos.", causa));
  }
}

/** Crea un relato para el lugar autenticado. */
export async function crearMiRelato(
  peticion: Request,
  respuesta: Response
): Promise<void> {
  try {
    const datos = esquemaRelato.parse(peticion.body);
    const empresaId = peticion.usuario?.id ?? "";
    const relato = await servicioRelatos.crearRelato(empresaId, datos);
    respuesta.status(201).json(exito(relato, "Relato creado."));
  } catch (causa) {
    if (causa instanceof z.ZodError) {
      respuesta
        .status(400)
        .json(error(causa.issues[0]?.message ?? "Datos del relato inválidos.", causa));
      return;
    }
    if (causa instanceof EspecieInvalidaError) {
      respuesta.status(400).json(error(causa.message, causa));
      return;
    }
    respuesta.status(500).json(error("No se pudo crear el relato.", causa));
  }
}

/** Actualiza un relato propio del lugar autenticado. */
export async function actualizarMiRelato(
  peticion: Request,
  respuesta: Response
): Promise<void> {
  try {
    const datos = esquemaRelato.parse(peticion.body);
    const empresaId = peticion.usuario?.id ?? "";
    const relato = await servicioRelatos.actualizarRelato(
      empresaId,
      peticion.params.id,
      datos
    );

    if (!relato) {
      respuesta.status(404).json(error("Relato no encontrado."));
      return;
    }

    respuesta.status(200).json(exito(relato, "Relato actualizado."));
  } catch (causa) {
    if (causa instanceof z.ZodError) {
      respuesta
        .status(400)
        .json(error(causa.issues[0]?.message ?? "Datos del relato inválidos.", causa));
      return;
    }
    if (causa instanceof EspecieInvalidaError) {
      respuesta.status(400).json(error(causa.message, causa));
      return;
    }
    respuesta.status(500).json(error("No se pudo actualizar el relato.", causa));
  }
}

/** Elimina un relato propio del lugar autenticado. */
export async function eliminarMiRelato(
  peticion: Request,
  respuesta: Response
): Promise<void> {
  try {
    const empresaId = peticion.usuario?.id ?? "";
    const eliminado = await servicioRelatos.eliminarRelato(
      empresaId,
      peticion.params.id
    );

    if (!eliminado) {
      respuesta.status(404).json(error("Relato no encontrado."));
      return;
    }

    respuesta.status(200).json(exito(null, "Relato eliminado."));
  } catch (causa) {
    respuesta.status(500).json(error("No se pudo eliminar el relato.", causa));
  }
}