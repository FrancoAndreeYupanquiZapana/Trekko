import { z } from "zod";

/**
 * Validadores (Zod) de las peticiones de autenticación.
 * Centralizados para reutilizarlos en cualquier ruta.
 */

export const esquemaIngreso = z.object({
  email: z.string().email("Ingresa un correo válido."),
  contrasena: z.string().min(6, "La contraseña debe tener al menos 6 caracteres."),
});

export const esquemaRegistro = z.object({
  email: z.string().email("Ingresa un correo válido."),
  contrasena: z.string().min(6, "La contraseña debe tener al menos 6 caracteres."),
  /** Nombre del lugar o establecimiento que se registra en el portal. */
  nombre: z.string().min(2, "El nombre del lugar debe tener al menos 2 caracteres."),
});

/** Texto opcional: campo vacío, null o hasta el máximo indicado. */
function textoOpcional(max: number, mensajeMax: string) {
  return z.preprocess(
    (valor) =>
      valor === null ||
      (typeof valor === "string" && valor.trim() === "")
        ? undefined
        : valor,
    z.string().trim().max(max, mensajeMax).optional()
  );
}

/** URL opcional: campo vacío o URL válida. */
const urlOpcional = z.preprocess(
  (valor) => (typeof valor === "string" && valor.trim() === "" ? undefined : valor),
  z.string().trim().url("Debe ser una URL válida.").max(500, "La URL es demasiado larga.").optional()
);

/** Datos del perfil de empresa editables desde el portal. */
export const esquemaPerfilEmpresa = z.object({
  /** Nombre del lugar o establecimiento. */
  nombre: z
    .string()
    .trim()
    .min(2, "El nombre del lugar debe tener al menos 2 caracteres.")
    .max(120, "El nombre es demasiado largo."),
  /** Teléfono de contacto de la agencia. */
  telefono: textoOpcional(40, "El teléfono es demasiado largo."),
  /** Descripción breve del lugar. */
  descripcion: textoOpcional(2000, "La descripción no puede superar los 2000 caracteres."),
  /** URL del logo de la agencia. */
  logoUrl: urlOpcional,
  /** Sitio web de la agencia. */
  web: urlOpcional,
  /** Redes sociales (una por línea). */
  redesSociales: textoOpcional(1000, "El campo de redes sociales es demasiado largo."),
  /** Ubicación (ciudad / zona turística). */
  ubicacion: textoOpcional(200, "La ubicación es demasiado larga."),
});

/** Datos de una especie (flora o fauna) enviados desde el portal. */
export const esquemaEspecie = z.object({
  /** Nombre común de la especie. */
  nombreComun: z
    .string()
    .trim()
    .min(2, "El nombre común debe tener al menos 2 caracteres.")
    .max(120, "El nombre común es demasiado largo."),
  /** Nombre científico (opcional). */
  nombreCientifico: textoOpcional(200, "El nombre científico es demasiado largo."),
  /** Familia o grupo (opcional). */
  familia: textoOpcional(120, "La familia es demasiado larga."),
  /** FLORA para plantas, FAUNA para animales. */
  tipo: z.enum(["FLORA", "FAUNA"], {
    errorMap: () => ({ message: "Elige si es flora o fauna." }),
  }),
  /** Descripción breve en lenguaje para visitantes. */
  descripcion: textoOpcional(2000, "La descripción no puede superar los 2000 caracteres."),
  /** Estado de conservación (opcional). */
  estadoConservacion: textoOpcional(120, "El estado de conservación es demasiado largo."),
  /** URL de la imagen subida a Supabase Storage. */
  imagenUrl: urlOpcional,
});

/** Datos de un relato local (mito, leyenda, dato curioso o simbiosis). */
export const esquemaRelato = z.object({
  /** Título del relato. */
  titulo: z
    .string()
    .trim()
    .min(2, "El título debe tener al menos 2 caracteres.")
    .max(200, "El título es demasiado largo."),
  /** MITO, LEYENDA, DATO_CURIOSO o SIMBIOSIS. */
  tipo: z.enum(["MITO", "LEYENDA", "DATO_CURIOSO", "SIMBIOSIS"], {
    errorMap: () => ({ message: "Elige un tipo de relato." }),
  }),
  /** Historia o dato completo. */
  contenido: z
    .string()
    .trim()
    .min(10, "El contenido debe tener al menos 10 caracteres.")
    .max(8000, "El contenido no puede superar los 8000 caracteres."),
  /** Especie del mismo lugar a la que hace referencia el relato (opcional). */
  especieId: z.preprocess(
    (valor) => (typeof valor === "string" && valor.trim() === "" ? undefined : valor),
    z.string().uuid("Especie inválida.").optional()
  ),
  /** URL de la imagen ilustrativa (opcional). */
  imagenUrl: urlOpcional,
});

/** Datos de un afiche informativo (reglas, seguridad, especies protegidas). */
export const esquemaAfiche = z.object({
  /** Título del afiche. */
  titulo: z
    .string()
    .trim()
    .min(2, "El título debe tener al menos 2 caracteres.")
    .max(200, "El título es demasiado largo."),
  /** Descripción o detalle del afiche (opcional). */
  descripcion: textoOpcional(2000, "La descripción no puede superar los 2000 caracteres."),
  /** URL de la imagen del afiche subida a Supabase Storage. */
  imagenUrl: z
    .string()
    .trim()
    .url("Debe ser una URL válida.")
    .max(500, "La URL es demasiado larga."),
});

/** Datos mínimos que el PDF "recuerdo" envía al backend para la frase IA. */
export const esquemaTextoRecuerdo = z.object({
  /** Nombre del viajero. */
  nombre: z.string().trim().min(2).max(120),
  /** Nombre del lugar visitado. */
  lugar: z.string().trim().min(1).max(400).optional().default("la Amazonía"),
  /** Fecha bonita ya formateada (ej. "21 de septiembre de 2026"). */
  fecha: z.string().trim().max(80).optional(),
  /** Cantidad de paseos acumulados del viajero. */
  paseos: z.number().int().min(0).max(200).optional().default(1),
  /** Puntos GPS totales. */
  puntos: z.number().int().min(0).max(200000).optional().default(0),
  /** Cantidad de fotos del recuerdo. */
  fotos: z.number().int().min(0).max(50).optional().default(0),
});

/** Un punto del track GPS que adjunta la app móvil. */
const esquemaPuntoPaseo = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  timestamp: z.string().optional(),
});

/** Metadata de una foto (el archivo viaja aparte, en el multipart). */
const esquemaFotoPaseo = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  timestamp: z.string().optional(),
  descripcion: z.string().max(2000).nullable().optional(),
});

/**
 * Datos de un paseo enviado desde la galería móvil (campo `datos` del
 * multipart). Las fotos llegan como archivos aparte, en el mismo orden.
 */
export const esquemaPaseo = z.object({
  /** Nombre completo del turista. */
  nombre: z
    .string()
    .trim()
    .min(2, "El nombre debe tener al menos 2 caracteres.")
    .max(120, "El nombre es demasiado largo."),
  /** Documento de identidad: agrupa los viajes en una misma página. */
  dni: z
    .string()
    .trim()
    .min(6, "El DNI debe tener al menos 6 dígitos.")
    .max(20, "El DNI es demasiado largo."),
  /** Id del lugar visitado (opcional). */
  lugarId: textoOpcional(120, "El id del lugar es demasiado largo."),
  /** Nombre legible del lugar visitado (opcional). */
  lugarNombre: textoOpcional(200, "El nombre del lugar es demasiado largo."),
  /** Fecha de la experiencia en ISO (opcional). */
  fechaExperiencia: textoOpcional(40, "La fecha es demasiado larga."),
  /** Track GPS completo de la caminata. */
  track: z.array(esquemaPuntoPaseo).max(5000, "El track es demasiado largo.").default([]),
  /** Metadata de las fotos (debe haber entre 1 y 5). */
  fotos: z
    .array(esquemaFotoPaseo)
    .min(1, "Envía al menos una foto.")
    .max(5, "Puedes enviar como máximo 5 fotos."),
});