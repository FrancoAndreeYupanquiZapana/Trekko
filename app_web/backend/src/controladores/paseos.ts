import type { NextFunction, Request, Response } from "express";
import multer, { MulterError } from "multer";
import { z } from "zod";
import {
  esquemaPaseo,
  esquemaPrepararSubida,
  esquemaTextoRecuerdo,
} from "../utilidades/validadores.js";
import * as servicioPaseos from "../servicios/paseos.js";
import * as servicioGemini from "../servicios/gemini.js";
import {
  firmarSubidasPaseo,
  subirImagen,
  urlPublicaDeRuta,
} from "../servicios/archivos.js";
import { optimizarImagenBuffer } from "../utilidades/imagenes.js";
import { exito, error } from "../utilidades/respuestas.js";
import type { FotoPaseo } from "../tipos/index.js";

/**
 * Controladores de paseos (envíos de la galería móvil).
 * Solo orquestan: validar entrada -> subir fotos -> llamar servicio -> responder.
 *
 * El POST acepta DOS flujos:
 *  - Multipart (servidor local): campo `datos` (JSON) + hasta 5 archivos `fotos`.
 *  - JSON (Vercel): las fotos ya se subieron a Storage por URL firmada y cada
 *    `foto.ruta` apunta al objeto; el body es directamente el JSON del paseo.
 * No requiere sesión: los turistas no tienen cuenta en la app.
 */

const MAX_FOTOS = 5;
const TAMANO_MAXIMO_FOTO = 10 * 1024 * 1024;

const procesadorFotos = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: TAMANO_MAXIMO_FOTO, files: MAX_FOTOS },
  fileFilter: (_peticion, archivo, aceptar) => {
    if (archivo.mimetype.startsWith("image/")) {
      aceptar(null, true);
      return;
    }
    aceptar(new Error("Solo se permiten imágenes (JPG, PNG, WebP, etc.)."));
  },
});

/** Middleware: procesa los archivos `fotos` y traduce los errores a 400. */
export function procesarFotosPaseo(
  peticion: Request,
  respuesta: Response,
  siguiente: NextFunction
): void {
  procesadorFotos.array("fotos", MAX_FOTOS)(peticion, respuesta, (causa) => {
    if (!causa) {
      siguiente();
      return;
    }

    if (causa instanceof MulterError && causa.code === "LIMIT_FILE_SIZE") {
      respuesta
        .status(400)
        .json(error("Una foto supera el tamaño máximo de 10 MB."));
      return;
    }

    respuesta
      .status(400)
      .json(error(causa instanceof Error ? causa.message : "Archivos inválidos."));
  });
}

/** Crea un paseo: sube las fotos y guarda el track + las URLs. */
export async function crearPaseoControlador(
  peticion: Request,
  respuesta: Response
): Promise<void> {
  try {
    const esMultipart = peticion.is("multipart/form-data");
    const crudo = esMultipart
      ? JSON.parse(peticion.body?.datos ?? "{}")
      : (peticion.body ?? {});
    const datos = esquemaPaseo.parse(crudo);
    const archivos = esMultipart
      ? ((Array.isArray(peticion.files) ? peticion.files : []) as Express.Multer.File[])
      : [];

    const fotos: FotoPaseo[] = [];

    if (esMultipart) {
      // Flujo clásico (servidor local): las fotos llegan como archivos.
      if (archivos.length === 0) {
        respuesta.status(400).json(error("Envía al menos una foto."));
        return;
      }
      for (let i = 0; i < archivos.length; i++) {
        const archivo = archivos[i];
        // La metadata viene en el mismo orden que los archivos.
        const meta = datos.fotos[i];
        // Recomprime la foto del celular (varios MB) para que la página pública
        // cargue rápido. Si falla, se sube el archivo original sin romper nada.
        const optimizada = await optimizarImagenBuffer(archivo.buffer);
        const url = await subirImagen(
          optimizada ?? {
            originalname: archivo.originalname || `foto_${i + 1}.jpg`,
            mimetype: archivo.mimetype,
            buffer: archivo.buffer,
          },
          "paseos"
        );
        fotos.push({
          url,
          lat: meta?.lat ?? 0,
          lng: meta?.lng ?? 0,
          timestamp: meta?.timestamp,
          descripcion: meta?.descripcion ?? undefined,
        });
      }
    } else {
      // Flujo Vercel: las fotos ya se subieron a Storage por URL firmada
      // (POST /preparar-subida) y cada `foto.ruta` apunta al objeto.
      const fotoSinRuta = datos.fotos.findIndex((foto) => !foto.ruta);
      if (fotoSinRuta >= 0) {
        respuesta
          .status(400)
          .json(error(`Falta la ruta de la foto ${fotoSinRuta + 1}.`));
        return;
      }
      for (const foto of datos.fotos) {
        fotos.push({
          url: urlPublicaDeRuta(foto.ruta as string),
          lat: foto.lat,
          lng: foto.lng,
          timestamp: foto.timestamp,
          descripcion: foto.descripcion ?? undefined,
        });
      }
    }

    const paseo = await servicioPaseos.crearPaseo({
      dni: datos.dni,
      nombre: datos.nombre,
      lugarId: datos.lugarId ?? null,
      lugarNombre: datos.lugarNombre ?? null,
      fechaExperiencia: datos.fechaExperiencia ?? null,
      track: datos.track,
      fotos,
    });

    respuesta.status(201).json(exito(paseo, "Tu viaje se publicó."));
  } catch (causa) {
    if (causa instanceof z.ZodError) {
      respuesta
        .status(400)
        .json(error(causa.issues[0]?.message ?? "Datos del paseo inválidos.", causa));
      return;
    }
    respuesta.status(500).json(error("No se pudo publicar el paseo.", causa));
  }
}

/**
 * POST /api/paseos/preparar-subida
 * JSON `{ cantidad: 1..5 }`. Devuelve una URL firmada por foto para que la
 * app suba los archivos DIRECTAMENTE a Supabase Storage (PUT binario).
 * El runtime serverless de Vercel no acepta archivos en multipart, así que
 * las fotos ya no pasan por la API: solo la firma y el JSON final.
 */
export async function prepararSubidaPaseoControlador(
  peticion: Request,
  respuesta: Response
): Promise<void> {
  try {
    const datos = esquemaPrepararSubida.parse(peticion.body ?? {});
    const subidas = await firmarSubidasPaseo(datos.cantidad);
    respuesta.status(200).json(exito({ subidas }, "URLs firmadas listas."));
  } catch (causa) {
    if (causa instanceof z.ZodError) {
      respuesta
        .status(400)
        .json(error(causa.issues[0]?.message ?? "Solicitud inválida.", causa));
      return;
    }
    respuesta.status(500).json(error("No se pudieron preparar las subidas.", causa));
  }
}

/** Devuelve todos los paseos de un DNI (página pública reutilizable). */
export async function obtenerPaseosPorDniControlador(
  peticion: Request,
  respuesta: Response
): Promise<void> {
  try {
    const dni = String(peticion.params.dni ?? "").trim();
    if (!dni) {
      respuesta.status(400).json(error("Falta el DNI."));
      return;
    }
    const paseos = await servicioPaseos.listarPaseosPorDni(dni);
    respuesta.status(200).json(exito(paseos, "Paseos encontrados."));
  } catch (causa) {
    respuesta.status(500).json(error("No se pudieron consultar los paseos.", causa));
  }
}

/** Muro público con los paseos más recientes. */
export async function listarPaseosControlador(
  _peticion: Request,
  respuesta: Response
): Promise<void> {
  try {
    const paseos = await servicioPaseos.listarPaseosRecientes();
    respuesta.status(200).json(exito(paseos, "Paseos listados."));
  } catch (causa) {
    respuesta.status(500).json(error("No se pudieron listar los paseos.", causa));
  }
}

/**
 * POST /api/paseos/:id/evaluar
 * Puntúa con IA (Gemini, en el servidor) las fotos del paseo: devuelve un
 * JSON con el puntaje 0-10 y justificación por foto, más la validación de
 * zona (distancia GPS al track). El resultado se GUARDA como registro en la
 * columna `evaluacion` (migración 006); si la columna aún no existe, se
 * devuelve igual con `guardado: false`.
 */
export async function evaluarPaseoControlador(
  peticion: Request,
  respuesta: Response
): Promise<void> {
  try {
    const id = String(peticion.params.id ?? "").trim();
    if (!id) {
      respuesta.status(400).json(error("Falta el id del paseo."));
      return;
    }

    const paseo = await servicioPaseos.obtenerPaseoPorId(id);
    if (!paseo) {
      respuesta.status(404).json(error("El paseo no existe."));
      return;
    }

    const evaluacion = await servicioGemini.evaluarPaseo(paseo);

    // Guarda el registro. Si la migración 006 no se ha ejecutado, la columna
    // no existe y falla aquí sin romper lo demás.
    let guardado = true;
    try {
      await servicioPaseos.guardarEvaluacionPaseo(id, evaluacion);
    } catch {
      guardado = false;
    }

    respuesta.status(200).json(
      exito(
        { ...evaluacion, guardado, paseoId: paseo.id },
        guardado
          ? "Paseo evaluado y guardado."
          : "Paseo evaluado, pero no se pudo guardar (falta la migración 006)."
      )
    );
  } catch (causa) {
    if (causa instanceof Error && /GEMINI_API_KEY/i.test(causa.message)) {
      respuesta
        .status(503)
        .json(error("Falta la clave de Gemini en el servidor (.env).", causa));
      return;
    }
    respuesta.status(500).json(error("No se pudo evaluar el paseo.", causa));
  }
}

/**
 * POST /api/paseos/texto-recuerdo
 * Pide a Gemini una frase emotiva para el PDF "recuerdo". Si no hay clave,
 * devuelve `frase: null` y la web usa su plantilla (sin romper nada).
 */
export async function textoRecuerdoControlador(
  peticion: Request,
  respuesta: Response
): Promise<void> {
  try {
    const datos = esquemaTextoRecuerdo.parse(peticion.body ?? {});
    const frase = await servicioGemini.escribirFraseRecuerdo(datos);
    respuesta.status(200).json(
      exito(
        { frase },
        frase ? "Frase del recuerdo generada." : "Sin clave de IA; se usará la plantilla."
      )
    );
  } catch (causa) {
    if (causa instanceof z.ZodError) {
      respuesta.status(400).json(error("Datos del recuerdo inválidos.", causa));
      return;
    }
    respuesta
      .status(500)
      .json(error("No se pudo generar la frase del recuerdo.", causa));
  }
}
