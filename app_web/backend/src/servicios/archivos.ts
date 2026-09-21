import { randomUUID } from "node:crypto";
import path from "node:path";
import { obtenerClienteSupabase } from "../config/supabase.js";
import { entorno } from "../config/entorno.js";

/**
 * Servicio de archivos: sube imágenes al bucket público de Supabase Storage
 * y devuelve su URL pública. La app móvil usa esas URLs (el archivo JSON
 * del paquete descargable queda liviano, sin imágenes incrustadas).
 */

/** Bucket público donde se guardan las imágenes de Trekko. */
export const NOMBRE_BUCKET_IMAGENES = "imagenes";

/** Tamaño máximo aceptado por imagen (5 MB). */
export const TAMANO_MAXIMO_IMAGEN = 5 * 1024 * 1024;

/**
 * Verifica que el bucket exista. La migración 002_crear_especies.sql lo crea
 * con el rol admin; aquí solo se intenta como respaldo, sin fallar si la API
 * no puede crear buckets (RLS de storage.buckets en algunos proyectos).
 */
async function asegurarBucket(): Promise<void> {
  const cliente = obtenerClienteSupabase();

  const { data: buckets } = await cliente.storage.listBuckets();
  const existe = (buckets ?? []).some(
    (bucket) => bucket.name === NOMBRE_BUCKET_IMAGENES
  );
  if (existe) return;

  try {
    await cliente.storage.createBucket(NOMBRE_BUCKET_IMAGENES, { public: true });
  } catch {
    // La migración ya creó el bucket; si no, la subida devolverá un error claro.
  }
}

/** Archivo recibido por multer (en memoria, sin guardar en disco). */
export interface ArchivoRecibido {
  originalname: string;
  mimetype: string;
  buffer: Buffer;
}

/**
 * Sube una imagen al bucket público y devuelve su URL.
 * Ruta interna: <carpeta>/<uuid><extensión> (por defecto "especies").
 *
 * Se usa el endpoint REST de Storage con el cuerpo binario crudo (no
 * multipart): el cliente oficial de Supabase envía multipart/form-data y
 * existe un bug conocido que rechaza esas peticiones con "row-level
 * security policy" aunque la clave service_role debería bypassear RLS.
 * Con service_role y cuerpo binario la subida es directa y confiable.
 */
export async function subirImagen(
  archivo: ArchivoRecibido,
  carpeta = "especies"
): Promise<string> {
  await asegurarBucket();

  const extension = path
    .extname(archivo.originalname)
    .toLowerCase()
    .replace(/[^a-z0-9.]/g, "")
    .slice(0, 10);
  const carpetaSegura = carpeta.replace(/[^a-z0-9-]/gi, "") || "especies";
  const ruta = `${carpetaSegura}/${randomUUID()}${extension || ".jpg"}`;

  const urlObjeto =
    `${entorno.supabaseUrl}/storage/v1/object/` +
    `${NOMBRE_BUCKET_IMAGENES}/${ruta}`;

  const respuesta = await fetch(urlObjeto, {
    method: "POST",
    headers: {
      apikey: entorno.supabaseServiceRoleKey,
      Authorization: `Bearer ${entorno.supabaseServiceRoleKey}`,
      "Content-Type": archivo.mimetype,
    },
    body: new Uint8Array(archivo.buffer),
  });

  if (!respuesta.ok) {
    const detalle = await respuesta.text().catch(() => "");
    throw new Error(`No se pudo subir la imagen (${respuesta.status}). ${detalle}`.trim());
  }

  return (
    `${entorno.supabaseUrl}/storage/v1/object/public/` +
    `${NOMBRE_BUCKET_IMAGENES}/${ruta}`
  );
}

/**
 * Firma N rutas nuevas para subir las fotos DIRECTAMENTE a Supabase Storage
 * desde la app (sin multipart por la API). La app hace un PUT binario a
 * `urlFirma` y luego avisa al backend con las rutas ya subidas.
 *
 * Es necesario porque el backend corre en Vercel: su runtime rechaza los
 * archivos en multipart con "unsupported FormDataPart".
 */
export async function firmarSubidasPaseo(
  cantidad: number
): Promise<{ indice: number; ruta: string; urlFirma: string }[]> {
  const cliente = obtenerClienteSupabase();
  await asegurarBucket();

  const subidas: { indice: number; ruta: string; urlFirma: string }[] = [];
  for (let indice = 0; indice < cantidad; indice++) {
    const ruta = `paseos/${randomUUID()}.jpg`;
    const { data, error } = await cliente.storage
      .from(NOMBRE_BUCKET_IMAGENES)
      .createSignedUploadUrl(ruta);
    if (error || !data) {
      throw new Error(
        `No se pudo firmar la subida de la foto ${indice + 1}: ${
          error?.message ?? "error desconocido"
        }`
      );
    }
    subidas.push({ indice, ruta, urlFirma: data.signedUrl });
  }
  return subidas;
}

/** URL pública de un objeto del bucket (para guardarla en el paseo). */
export function urlPublicaDeRuta(ruta: string): string {
  return (
    `${entorno.supabaseUrl}/storage/v1/object/public/` +
    `${NOMBRE_BUCKET_IMAGENES}/${ruta}`
  );
}