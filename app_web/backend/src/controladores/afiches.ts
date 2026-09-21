import type { Request, Response } from "express";
import { z } from "zod";
import { esquemaAfiche } from "../utilidades/validadores.js";
import * as servicioAfiches from "../servicios/afiches.js";
import { exito, error } from "../utilidades/respuestas.js";

/**
 * Controladores de afiches informativos (reglas, seguridad y especies protegidas).
 * Solo orquestan: validar entrada -> llamar servicio -> responder.
 * Todas las rutas requieren sesión de empresa (middleware validarToken).
 */

/** Lista los afiches del lugar autenticado. */
export async function listarMisAfiches(
  peticion: Request,
  respuesta: Response
): Promise<void> {
  try {
    const empresaId = peticion.usuario?.id ?? "";
    const afiches = await servicioAfiches.listarAfichesDeEmpresa(empresaId);
    respuesta.status(200).json(exito(afiches, "Afiches listados."));
  } catch (causa) {
    respuesta.status(500).json(error("No se pudieron listar los afiches.", causa));
  }
}

/** Crea un afiche para el lugar autenticado. */
export async function crearMiAfiche(
  peticion: Request,
  respuesta: Response
): Promise<void> {
  try {
    const datos = esquemaAfiche.parse(peticion.body);
    const empresaId = peticion.usuario?.id ?? "";
    const afiche = await servicioAfiches.crearAfiche(empresaId, datos);
    respuesta.status(201).json(exito(afiche, "Afiche creado."));
  } catch (causa) {
    if (causa instanceof z.ZodError) {
      respuesta
        .status(400)
        .json(error(causa.issues[0]?.message ?? "Datos del afiche inválidos.", causa));
      return;
    }
    respuesta.status(500).json(error("No se pudo crear el afiche.", causa));
  }
}

/** Actualiza un afiche propio del lugar autenticado. */
export async function actualizarMiAfiche(
  peticion: Request,
  respuesta: Response
): Promise<void> {
  try {
    const datos = esquemaAfiche.parse(peticion.body);
    const empresaId = peticion.usuario?.id ?? "";
    const afiche = await servicioAfiches.actualizarAfiche(
      empresaId,
      peticion.params.id,
      datos
    );

    if (!afiche) {
      respuesta.status(404).json(error("Afiche no encontrado."));
      return;
    }

    respuesta.status(200).json(exito(afiche, "Afiche actualizado."));
  } catch (causa) {
    if (causa instanceof z.ZodError) {
      respuesta
        .status(400)
        .json(error(causa.issues[0]?.message ?? "Datos del afiche inválidos.", causa));
      return;
    }
    respuesta.status(500).json(error("No se pudo actualizar el afiche.", causa));
  }
}

/** Elimina un afiche propio del lugar autenticado. */
export async function eliminarMiAfiche(
  peticion: Request,
  respuesta: Response
): Promise<void> {
  try {
    const empresaId = peticion.usuario?.id ?? "";
    const eliminado = await servicioAfiches.eliminarAfiche(
      empresaId,
      peticion.params.id
    );

    if (!eliminado) {
      respuesta.status(404).json(error("Afiche no encontrado."));
      return;
    }

    respuesta.status(200).json(exito(null, "Afiche eliminado."));
  } catch (causa) {
    respuesta.status(500).json(error("No se pudo eliminar el afiche.", causa));
  }
}