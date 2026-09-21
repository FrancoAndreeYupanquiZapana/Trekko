import type { SQLiteDatabase } from "expo-sqlite";

import { URL_API } from "@/constantes/ambiente";
import { enviarFormData } from "@/servicios/api";
import { listarEnviosGaleria } from "@/servicios/galeria";

/**
 * Sincronización de la GALERÍA con el backend (offline-first).
 *
 * Los envíos se guardan primero en SQLite (`envios_galeria`). Cuando hay
 * internet real, esta capa sube las fotos + el track al backend y guarda la
 * URL de la página pública "El viaje de {nombre} en {lugar}".
 * Si falla, el envío queda como ERROR y se reintenta la próxima vez.
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
}

/** URL de la página pública del turista (web). */
export function urlPaginaPublica(dni: string): string {
  const base =
    process.env.EXPO_PUBLIC_WEB_URL ??
    URL_API.replace(/\/api\/?$/, "").replace(/:4000\b/, ":3000");
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
  };

  for (const envio of envios) {
    try {
      const formulario = new FormData();

      // El backend recibe un JSON `datos` + las fotos como archivos, en el
      // mismo orden. Solo viajan lat/lng/timestamp/descripcion de cada foto.
      const datos = {
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
        fotos: envio.fotos.map((foto) => ({
          lat: foto.lat,
          lng: foto.lng,
          timestamp: foto.timestamp,
          descripcion: foto.descripcion,
        })),
      };
      formulario.append("datos", JSON.stringify(datos));

      envio.fotos.forEach((foto, indice) => {
        const archivo = {
          uri: foto.uri,
          name: `foto_${indice + 1}.jpg`,
          type: "image/jpeg",
        };
        formulario.append("fotos", archivo as unknown as Blob);
      });

      await enviarFormData<unknown>("/paseos", formulario);

      const url = urlPaginaPublica(envio.dni ?? "");
      await marcarEnvio(db, envio.id, "ENVIADO", url, null);
      resultado.subidos += 1;
      resultado.urlPublica = url;
    } catch (causa) {
      const mensaje =
        causa instanceof Error ? causa.message : "No se pudo subir el envío.";
      await marcarEnvio(db, envio.id, "ERROR", null, mensaje);
      resultado.fallidos += 1;
    }
  }

  return resultado;
}
