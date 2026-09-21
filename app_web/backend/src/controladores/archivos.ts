import type { NextFunction, Request, Response } from "express";
import multer, { MulterError } from "multer";
import {
  subirImagen,
  TAMANO_MAXIMO_IMAGEN,
} from "../servicios/archivos.js";
import { exito, error } from "../utilidades/respuestas.js";

/**
 * Controladores de archivos (subida de imágenes).
 * El middleware de multer procesa el archivo multipart y el controlador
 * lo envía a Supabase Storage devolviendo la URL pública.
 */

const procesadorArchivos = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: TAMANO_MAXIMO_IMAGEN, files: 1 },
  fileFilter: (_peticion, archivo, aceptar) => {
    if (archivo.mimetype.startsWith("image/")) {
      aceptar(null, true);
      return;
    }
    aceptar(new Error("Solo se permiten imágenes (JPG, PNG, WebP, etc.)."));
  },
});

/** Middleware: procesa el campo "archivo" y traduce los errores a 400. */
export function procesarImagen(
  peticion: Request,
  respuesta: Response,
  siguiente: NextFunction
): void {
  procesadorArchivos.single("archivo")(peticion, respuesta, (causa) => {
    if (!causa) {
      siguiente();
      return;
    }

    if (causa instanceof MulterError && causa.code === "LIMIT_FILE_SIZE") {
      respuesta
        .status(400)
        .json(error("La imagen supera el tamaño máximo de 5 MB."));
      return;
    }

    respuesta
      .status(400)
      .json(error(causa instanceof Error ? causa.message : "Imagen inválida."));
  });
}

/** Sube la imagen recibida y devuelve la URL pública para guardarla. */
export async function subirImagenControlador(
  peticion: Request,
  respuesta: Response
): Promise<void> {
  try {
    const archivo = (peticion as Request & { file?: Express.Multer.File }).file;
    if (!archivo) {
      respuesta.status(400).json(error("No se envió ninguna imagen."));
      return;
    }

    const url = await subirImagen({
      originalname: archivo.originalname,
      mimetype: archivo.mimetype,
      buffer: archivo.buffer,
    });

    respuesta.status(200).json(exito({ url }, "Imagen subida."));
  } catch (causa) {
    respuesta.status(500).json(error("No se pudo subir la imagen.", causa));
  }
}