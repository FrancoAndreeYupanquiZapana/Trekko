import type { Request, Response } from "express";
import { z } from "zod";
import { esquemaPerfilEmpresa } from "../utilidades/validadores.js";
import * as servicioEmpresas from "../servicios/empresas.js";
import { exito, error } from "../utilidades/respuestas.js";

/**
 * Controladores del perfil de empresa.
 * Solo orquestan: validar entrada -> llamar servicio -> responder.
 */

export async function obtenerMiPerfilEmpresa(
  peticion: Request,
  respuesta: Response
): Promise<void> {
  try {
    const usuarioId = peticion.usuario?.id ?? "";
    const perfil = await servicioEmpresas.obtenerMiPerfil(usuarioId);
    respuesta.status(200).json(exito(perfil, "Perfil consultado."));
  } catch (causa) {
    respuesta.status(500).json(error("No se pudo consultar el perfil.", causa));
  }
}

export async function guardarMiPerfilEmpresa(
  peticion: Request,
  respuesta: Response
): Promise<void> {
  try {
    const datos = esquemaPerfilEmpresa.parse(peticion.body);
    const usuarioId = peticion.usuario?.id ?? "";
    const perfil = await servicioEmpresas.guardarMiPerfil(usuarioId, datos);
    respuesta.status(200).json(exito(perfil, "Perfil guardado."));
  } catch (causa) {
    if (causa instanceof z.ZodError) {
      respuesta
        .status(400)
        .json(error(causa.issues[0]?.message ?? "Datos del perfil inválidos.", causa));
      return;
    }
    respuesta.status(500).json(error("No se pudo guardar el perfil.", causa));
  }
}

/** Lista todas las empresas registradas (catálogo público). */
export async function listarEmpresasRegistradas(
  _peticion: Request,
  respuesta: Response
): Promise<void> {
  try {
    const empresas = await servicioEmpresas.listarEmpresas();
    respuesta.status(200).json(exito(empresas, "Empresas listadas."));
  } catch (causa) {
    respuesta.status(500).json(error("No se pudieron listar las empresas.", causa));
  }
}

/** Devuelve una empresa por su id (página pública del lugar). */
export async function obtenerEmpresaPublica(
  peticion: Request,
  respuesta: Response
): Promise<void> {
  try {
    const detalle = await servicioEmpresas.obtenerDetalleLugar(peticion.params.id);
    if (!detalle) {
      respuesta.status(404).json(error("Empresa no encontrada."));
      return;
    }
    respuesta.status(200).json(exito(detalle, "Lugar encontrado."));
  } catch (causa) {
    respuesta.status(500).json(error("No se pudo consultar la empresa.", causa));
  }
}

/** Genera el paquete descargable de una empresa para la app móvil. */
export async function descargarEmpresaPublica(
  peticion: Request,
  respuesta: Response
): Promise<void> {
  try {
    const detalle = await servicioEmpresas.obtenerDetalleLugar(peticion.params.id);
    if (!detalle) {
      respuesta.status(404).json(error("Empresa no encontrada."));
      return;
    }
    const paquete = servicioEmpresas.construirPaqueteDescarga(
      detalle.empresa,
      detalle.especies,
      detalle.relatos,
      detalle.afiches,
      detalle.puntos
    );
    respuesta.status(200).json(exito(paquete, "Paquete generado."));
  } catch (causa) {
    respuesta.status(500).json(error("No se pudo generar el paquete.", causa));
  }
}

/**
 * Genera el paquete completo para la app móvil (v5): texto + imágenes
 * optimizadas incrustadas. Es más pesado que /exportar pero la app solo
 * lo descarga una vez y lo guarda en SQLite para funcionar sin conexión.
 */
export async function paqueteAppEmpresaPublica(
  peticion: Request,
  respuesta: Response
): Promise<void> {
  try {
    const paquete = await servicioEmpresas.construirPaqueteAppLugar(peticion.params.id);
    if (!paquete) {
      respuesta.status(404).json(error("Empresa no encontrada."));
      return;
    }
    respuesta.status(200).json(exito(paquete, "Paquete app generado."));
  } catch (causa) {
    respuesta.status(500).json(error("No se pudo generar el paquete para la app.", causa));
  }
}