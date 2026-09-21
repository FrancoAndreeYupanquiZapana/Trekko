import {
  FileSystemUploadType,
  uploadAsync,
} from "expo-file-system/legacy";
import type { SQLiteDatabase } from "expo-sqlite";

import { URL_API } from "@/constantes/ambiente";
import { enviarJson } from "@/servicios/api";
import { listarEnviosGaleria, type EnvioGaleria } from "@/servicios/galeria";

/**
 * Sincronización de la GALERÍA con el backend (offline-first).
 *
 * Los envíos se guardan primero en SQLite (`envios_galeria`). Cuando hay
 * internet real, esta capa sube las fotos + el track al backend y guarda la
 * URL de la página pública "El viaje de {nombre} en {lugar}".
 * Si falla, el envío queda como ERROR y se reintenta la próxima vez.
 *
 * TRANSPORTE: el backend corre en Vercel, cuyo runtime rechaza archivos en
 * multipart ("unsupported FormDataPart"). Por eso las fotos NO pasan por la
 * API: se suben con PUT binario a URLs firmadas de Supabase Storage, y solo
 * el JSON (track + metadata + rutas) viaja por la API.
 */

export interface ResultadoSincronizacion {
  /** Envíos que se intentaron subir. */
  intentados: number;
  /** Envíos subidos con éxito. */
  subidos: number;
  /** Envíos que fallaron (quedan para reintentar). */
  fallidos: number;
  /** URL pública del último envío subido, si hubo. */
  urlPublica: string | null;
  /** Primer error concreto, para mostrárselo al turista (o null). */
  primerError: string | null;
}

/** URL de la página pública del turista (web). */
export function urlPaginaPublica(dni: string): string {
  const configurada = process.env.EXPO_PUBLIC_WEB_URL?.trim();
  const base =
    configurada && configurada.length > 0
      ? configurada.replace(/\/+$/, "")
      : URL_API.replace(/\/api\/?$/, "").replace(/:4000\b/, ":3000");
  return `${base}/paseo/${encodeURIComponent(dni)}`;
}

/** Actualiza el estado de un envío tras intentar subirlo. */
async function marcarEnvio(
  db: SQLiteDatabase,
  id: number,
  estado: "PENDIENTE" | "ENVIADO" | "ERROR",
  urlPublica: string | null,
  mensajeError: string | null
): Promise<void> {
  await db.runAsync(
    `UPDATE envios_galeria
     SET estado = ?, url_publica = ?, mensaje_error = ?
     WHERE id = ?`,
    estado,
    urlPublica,
    mensajeError,
    id
  );
}

/** Cuántos envíos todavía no se subieron. */
export async function contarEnviosPendientes(db: SQLiteDatabase): Promise<number> {
  const fila = await db.getFirstAsync<{ total: number }>(
    "SELECT COUNT(*) AS total FROM envios_galeria WHERE estado <> 'ENVIADO'"
  );
  return fila?.total ?? 0;
}

/** Traduce un error de subida a un mensaje claro para el turista. */
function describirError(causa: unknown): string {
  const bruto =
    causa instanceof Error ? causa.message : "No se pudo subir el envío.";
  // Errores típicos de red (sin conexión, host inalcanzable, timeout).
  if (
    /network request failed|failed to fetch|aborted|timeout|socket|econnrefused|enetunreach|network is unreachable/i.test(
      bruto
    )
  ) {
    return `No se pudo conectar con el servidor (${URL_API}). Revisa tu conexión a internet e inténtalo de nuevo.`;
  }
  return bruto;
}

/** Subida firmada: ruta y URL que devuelve el backend por foto. */
interface SubidaFirmada {
  indice: number;
  ruta: string;
  urlFirma: string;
}

/**
 * Sube UN envío en tres pasos (flujo compatible con Vercel):
 *  1. Pide al backend URLs FIRMADAS de Supabase Storage (una por foto).
 *  2. Sube cada foto con PUT binario directo a Storage (sin multipart).
 *  3. Registra el paseo como JSON; el backend arma las URLs públicas.
 * Si algo falla a medio camino, se lanza y el envío queda para reintentar.
 */
async function subirEnvioGaleria(envio: EnvioGaleria): Promise<void> {
  const fotos = envio.fotos;
  if (fotos.length === 0) throw new Error("El envío no tiene fotos.");

  // 1) Firmar N rutas en Supabase (el backend valida 1..5 fotos).
  const { subidas } = await enviarJson<{ subidas: SubidaFirmada[] }>(
    "/paseos/preparar-subida",
    { cantidad: fotos.length }
  );
  if (!Array.isArray(subidas) || subidas.length !== fotos.length) {
    throw new Error("El servidor preparó las subidas de otra manera. Reintenta.");
  }

  // 2) PUT binario de cada foto a su URL firmada (Supabase Storage).
  for (let i = 0; i < fotos.length; i++) {
    const firma = subidas[i];
    const uri = fotos[i]?.uri;
    if (!firma?.urlFirma || !uri) {
      throw new Error(`La foto ${i + 1} ya no existe en el teléfono.`);
    }
    const respuesta = await uploadAsync(firma.urlFirma, uri, {
      httpMethod: "PUT",
      uploadType: FileSystemUploadType.BINARY_CONTENT,
      headers: { "Content-Type": "image/jpeg", "x-upsert": "false" },
    });
    if (respuesta.status < 200 || respuesta.status >= 300) {
      throw new Error(
        `La nube rechazó la foto ${i + 1} (HTTP ${respuesta.status}).`
      );
    }
  }

  // 3) Registrar el paseo (JSON, sin archivos) — funciona en Vercel.
  await enviarJson("/paseos", {
    nombre: envio.nombre,
    dni: envio.dni ?? "",
    lugarId: envio.lugarId ?? undefined,
    lugarNombre: envio.lugarNombre ?? undefined,
    fechaExperiencia: envio.fechaExperiencia,
    track: envio.track.map((punto) => ({
      lat: punto.lat,
      lng: punto.lng,
      timestamp: punto.timestamp,
    })),
    fotos: fotos.map((foto, i) => ({
      lat: foto.lat,
      lng: foto.lng,
      timestamp: foto.timestamp,
      descripcion: foto.descripcion,
      ruta: subidas[i]?.ruta,
    })),
  });
}

/**
 * Sube todos los envíos pendientes o fallidos.
 * Devuelve un resumen; nunca lanza por un envío que falle.
 */
export async function sincronizarEnviosGaleria(
  db: SQLiteDatabase
): Promise<ResultadoSincronizacion> {
  const envios = (await listarEnviosGaleria(db)).filter(
    (envio) => envio.estado !== "ENVIADO"
  );

  const resultado: ResultadoSincronizacion = {
    intentados: envios.length,
    subidos: 0,
    fallidos: 0,
    urlPublica: null,
    primerError: null,
  };

  for (const envio of envios) {
    try {
      await subirEnvioGaleria(envio);

      const url = urlPaginaPublica(envio.dni ?? "");
      await marcarEnvio(db, envio.id, "ENVIADO", url, null);
      resultado.subidos += 1;
      resultado.urlPublica = url;
    } catch (causa) {
      const mensaje = describirError(causa);
      await marcarEnvio(db, envio.id, "ERROR", null, mensaje);
      if (!resultado.primerError) resultado.primerError = mensaje;
      resultado.fallidos += 1;
    }
  }

  return resultado;
}
