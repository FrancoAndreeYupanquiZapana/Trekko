import type { Request, Response } from "express";
import { z } from "zod";
import { esquemaEspecie } from "../utilidades/validadores.js";
import * as servicioEspecies from "../servicios/especies.js";
import { exito, error } from "../utilidades/respuestas.js";

/**
 * Controladores de especies (flora y fauna).
 * Solo orquestan: validar entrada -> llamar servicio -> responder.
 * Todas las rutas requieren sesión de empresa (middleware validarToken).
 */

/** Lista las especies del lugar autenticado. */
export async function listarMisEspecies(
  peticion: Request,
  respuesta: Response
): Promise<void> {
  try {
    const empresaId = peticion.usuario?.id ?? "";
    const especies = await servicioEspecies.listarEspeciesDeEmpresa(empresaId);
    respuesta.status(200).json(exito(especies, "Especies listadas."));
  } catch (causa) {
    respuesta.status(500).json(error("No se pudieron listar las especies.", causa));
  }
}

/** Crea una especie para el lugar autenticado. */
export async function crearMiEspecie(
  peticion: Request,
  respuesta: Response
): Promise<void> {
  try {
    const datos = esquemaEspecie.parse(peticion.body);
    const empresaId = peticion.usuario?.id ?? "";
    const especie = await servicioEspecies.crearEspecie(empresaId, datos);
    respuesta.status(201).json(exito(especie, "Especie creada."));
  } catch (causa) {
    if (causa instanceof z.ZodError) {
      respuesta
        .status(400)
        .json(error(causa.issues[0]?.message ?? "Datos de la especie inválidos.", causa));
      return;
    }
    respuesta.status(500).json(error("No se pudo crear la especie.", causa));
  }
}

/** Actualiza una especie propia del lugar autenticado. */
export async function actualizarMiEspecie(
  peticion: Request,
  respuesta: Response
): Promise<void> {
  try {
    const datos = esquemaEspecie.parse(peticion.body);
    const empresaId = peticion.usuario?.id ?? "";
    const especie = await servicioEspecies.actualizarEspecie(
      empresaId,
      peticion.params.id,
      datos
    );

    if (!especie) {
      respuesta.status(404).json(error("Especie no encontrada."));
      return;
    }

    respuesta.status(200).json(exito(especie, "Especie actualizada."));
  } catch (causa) {
    if (causa instanceof z.ZodError) {
      respuesta
        .status(400)
        .json(error(causa.issues[0]?.message ?? "Datos de la especie inválidos.", causa));
      return;
    }
    respuesta.status(500).json(error("No se pudo actualizar la especie.", causa));
  }
}

/** Elimina una especie propia del lugar autenticado. */
export async function eliminarMiEspecie(
  peticion: Request,
  respuesta: Response
): Promise<void> {
  try {
    const empresaId = peticion.usuario?.id ?? "";
    const eliminada = await servicioEspecies.eliminarEspecie(
      empresaId,
      peticion.params.id
    );

    if (!eliminada) {
      respuesta.status(404).json(error("Especie no encontrada."));
      return;
    }

    respuesta.status(200).json(exito(null, "Especie eliminada."));
  } catch (causa) {
    respuesta.status(500).json(error("No se pudo eliminar la especie.", causa));
  }
}