import type { SQLiteDatabase } from "expo-sqlite";

/**
 * Cola de envíos de la GALERÍA (las 5 mejores fotos del día) — offline-first.
 *
 * El turista arma su envío en la app: nombre + DNI + zona (lugar) + las 5
 * fotos + el TRACK completo de su recorrido. Todo se guarda LOCALMENTE con
 * estado `PENDIENTE`. Cuando haya internet, esta cola se sincroniza con el
 * backend y se genera la página pública: "El viaje de {nombre} en {lugar}".
 */

/** Una foto elegida para el envío, con su marca geográfica. */
export interface FotoEnvio {
  puntoId: number;
  uri: string;
  lat: number;
  lng: number;
  timestamp: string;
  descripcion: string | null;
}

/** Un punto del track que se adjunta al envío. */
export interface PuntoTrackEnvio {
  lat: number;
  lng: number;
  timestamp: string;
  fotoUri: string | null;
}

/** Lo que genera la pantalla de Galería al tocar "Enviar". */
export interface EnvioGaleriaNuevo {
  nombre: string;
  dni: string | null;
  lugarId: string | null;
  lugarNombre: string | null;
  recorridoId: number;
  fechaExperiencia: string;
  track: PuntoTrackEnvio[];
  fotos: FotoEnvio[];
}

export interface EnvioGaleria extends EnvioGaleriaNuevo {
  id: number;
  estado: string; // "PENDIENTE" | "ENVIADO" | "ERROR"
  /** URL de la página pública una vez subido. */
  urlPublica: string | null;
  /** Último mensaje de error de subida (si falló). */
  mensajeError: string | null;
  creadoEn: string;
}

/** Guarda el envío en la cola local (PENDIENTE). Devuelve su id. */
export async function guardarEnvioGaleria(
  db: SQLiteDatabase,
  envio: EnvioGaleriaNuevo
): Promise<number> {
  const r = await db.runAsync(
    `INSERT INTO envios_galeria
       (nombre, dni, lugar_id, lugar_nombre, recorrido_id, fecha_experiencia,
        track_json, fotos_json, estado, creado_en)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'PENDIENTE', ?)`,
    envio.nombre,
    envio.dni ?? null,
    envio.lugarId ?? null,
    envio.lugarNombre ?? null,
    envio.recorridoId,
    envio.fechaExperiencia,
    JSON.stringify(envio.track),
    JSON.stringify(envio.fotos),
    new Date().toISOString()
  );
  return Number(r.lastInsertRowId);
}

/** Lista los envíos guardados (para una futura pantalla de sincronización). */
export async function listarEnviosGaleria(
  db: SQLiteDatabase
): Promise<EnvioGaleria[]> {
  const filas = await db.getAllAsync<{
    id: number;
    nombre: string;
    dni: string | null;
    lugarId: string | null;
    lugarNombre: string | null;
    recorridoId: number;
    fechaExperiencia: string;
    trackJson: string;
    fotosJson: string;
    estado: string;
    urlPublica: string | null;
    mensajeError: string | null;
    creadoEn: string;
  }>(
    `SELECT id, nombre, dni, lugar_id AS lugarId, lugar_nombre AS lugarNombre,
            recorrido_id AS recorridoId, fecha_experiencia AS fechaExperiencia,
            track_json AS trackJson, fotos_json AS fotosJson,
            estado, url_publica AS urlPublica, mensaje_error AS mensajeError,
            creado_en AS creadoEn
     FROM envios_galeria
     ORDER BY creado_en DESC`
  );
  return filas.map((f) => ({
    id: f.id,
    nombre: f.nombre,
    dni: f.dni,
    lugarId: f.lugarId,
    lugarNombre: f.lugarNombre,
    recorridoId: f.recorridoId,
    fechaExperiencia: f.fechaExperiencia,
    track: JSON.parse(f.trackJson) as PuntoTrackEnvio[],
    fotos: JSON.parse(f.fotosJson) as FotoEnvio[],
    estado: f.estado,
    urlPublica: f.urlPublica,
    mensajeError: f.mensajeError,
    creadoEn: f.creadoEn,
  }));
}