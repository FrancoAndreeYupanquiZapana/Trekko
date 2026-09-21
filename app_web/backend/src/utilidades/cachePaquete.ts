import { obtenerClienteSupabase } from "../config/supabase.js";

/**
 * Caché PERSISTENTE de paquetes v5 en Supabase Storage.
 *
 * En memoria la caché muere con el proceso: en hosting serverless (Vercel)
 * cada request puede caer en una instancia nueva y volver a optimizar las
 * 30–40 imágenes (22–30 s). Guardar el paquete ya generado en Storage hace
 * que, una vez construido, se sirva casi instantáneo desde cualquier
 * instancia y sobreviva reinicios y despliegues.
 *
 * La clave incluye la `revision`: si el dueño actualiza el lugar, la nueva
 * revision genera una clave distinta (miss → se regenera). Los paquetes
 * viejos quedan archivados, lo cual es intencional y sencillo.
 */

const BUCKET = "trekko-paquetes";

/** Clave del archivo en Storage para un lugar y una revision determinadas. */
export function clavePaqueteEnAlmacen(id: string, revision: string): string {
  // La revision es una fecha ISO (contiene ":" y "+") → se sanitiza.
  const revisionSegura = revision.replace(/[^0-9A-Za-z-]/g, "-");
  return `${id}-v5-${revisionSegura}.json`;
}

/** Garantiza que el bucket exista (tolerante: si ya existe, no falla). */
async function asegurarBucket(): Promise<void> {
  const cliente = obtenerClienteSupabase();
  const { error } = await cliente.storage.createBucket(BUCKET, {
    public: false,
  });
  if (error && !/already|existe/i.test(error.message)) {
    throw error;
  }
}

/** Lee el JSON del paquete desde Storage, o null si no está archivado. */
export async function leerPaqueteDeAlmacen(
  clave: string
): Promise<string | null> {
  try {
    const { data, error } = await obtenerClienteSupabase()
      .storage.from(BUCKET)
      .download(clave);
    if (error || !data) return null;
    return await data.text();
  } catch {
    // Sin conexión a Storage o bucket ausente: se regenera en memoria.
    return null;
  }
}

/** Guarda el JSON del paquete en Storage (upsert para no fallar si existe). */
export async function guardarPaqueteEnAlmacen(
  clave: string,
  json: string
): Promise<void> {
  const cliente = obtenerClienteSupabase();
  await asegurarBucket();
  const { error } = await cliente.storage.from(BUCKET).upload(clave, json, {
    contentType: "application/json",
    upsert: true,
  });
  if (error) throw error;
}