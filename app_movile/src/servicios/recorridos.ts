import type { SQLiteDatabase } from "expo-sqlite";

/**
 * Capa de persistencia de recorridos (trazabilidad estilo QuickCapture).
 *
 * Basada en los diseños de planificacion.md:
 *  - No se guarda un punto cada segundo: se guarda cuando se avanza más de
 *    15 m o pasan ~25 s, siempre que la precisión del GPS sea aceptable.
 *  - Cada punto puede llevar foto georreferenciada + descripción de lo visto.
 *  - Todo se almacena LOCALMENTE por ahora (offline-first).
 */

export interface RecorridoLocal {
  id: number;
  lugarId: string | null;
  lugarNombre: string | null;
  iniciadoEn: string;
  terminadoEn: string | null;
  estado: string; // "EN_CURSO" | "FINALIZADO" | "ABANDONADO"
}

export interface PuntoRecorrido {
  id: number;
  recorridoId: number;
  lat: number;
  lng: number;
  altitud: number | null;
  precisionGps: number | null;
  velocidad: number | null;
  timestamp: string;
  fotoUri: string | null;
  descripcion: string | null;
}

export interface NuevoPunto {
  lat: number;
  lng: number;
  altitud: number | null;
  precisionGps: number | null;
  velocidad: number | null;
  timestamp: string;
  fotoUri: string | null;
}

export interface RecorridoResumen extends RecorridoLocal {
  puntos: number;
  fotos: number;
  distanciaM: number;
}

/** Crea un recorrido y devuelve su id. */
export async function crearRecorrido(
  db: SQLiteDatabase,
  lugar: { lugarId: string | null; lugarNombre: string | null }
): Promise<number> {
  const r = await db.runAsync(
    `INSERT INTO recorridos (lugar_id, lugar_nombre, iniciado_en, estado)
     VALUES (?, ?, ?, 'EN_CURSO')`,
    lugar.lugarId,
    lugar.lugarNombre,
    new Date().toISOString()
  );
  return Number(r.lastInsertRowId);
}

/** Recorrido en curso (si lo hubo y no se cerró). */
export async function obtenerRecorridoActivo(
  db: SQLiteDatabase
): Promise<RecorridoLocal | null> {
  return db.getFirstAsync<RecorridoLocal>(
    `SELECT id, lugar_id AS lugarId, lugar_nombre AS lugarNombre,
            iniciado_en AS iniciadoEn, terminado_en AS terminadoEn, estado
     FROM recorridos
     WHERE estado = 'EN_CURSO'
     ORDER BY id DESC
     LIMIT 1`
  );
}

/** Marca un recorrido como FINALIZADO (o ABANDONADO si se cierra una sesión vieja). */
export async function finalizarRecorrido(
  db: SQLiteDatabase,
  id: number,
  estado: "FINALIZADO" | "ABANDONADO" = "FINALIZADO"
): Promise<void> {
  await db.runAsync(
    `UPDATE recorridos
     SET terminado_en = COALESCE(terminado_en, ?), estado = ?
     WHERE id = ?`,
    new Date().toISOString(),
    estado,
    id
  );
}

/**
 * Cierra cualquier recorrido que quedó EN_CURSO de una sesión anterior
 * (por ejemplo si la app se cerró mientras se grababa).
 */
export async function cerrarRecorridosAbandonados(
  db: SQLiteDatabase
): Promise<number> {
  const r = await db.runAsync(
    `UPDATE recorridos
     SET terminado_en = iniciado_en, estado = 'ABANDONADO'
     WHERE estado = 'EN_CURSO'`
  );
  return Number(r.changes);
}

/** Guarda un punto del recorrido. */
export async function agregarPunto(
  db: SQLiteDatabase,
  recorridoId: number,
  punto: NuevoPunto
): Promise<number> {
  const r = await db.runAsync(
    `INSERT INTO puntos_recorrido
       (recorrido_id, lat, lng, altitud, precision_gps, velocidad, timestamp, foto_uri, descripcion)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    recorridoId,
    punto.lat,
    punto.lng,
    punto.altitud,
    punto.precisionGps,
    punto.velocidad,
    punto.timestamp,
    punto.fotoUri,
    null
  );
  return Number(r.lastInsertRowId);
}

/** Asocia una descripción ("lo que viste") a un punto. */
export async function actualizarDescripcionPunto(
  db: SQLiteDatabase,
  puntoId: number,
  descripcion: string
): Promise<void> {
  await db.runAsync(
    "UPDATE puntos_recorrido SET descripcion = ? WHERE id = ?",
    descripcion,
    puntoId
  );
}

/** Puntos de un recorrido, en orden cronológico. */
export async function listarPuntos(
  db: SQLiteDatabase,
  recorridoId: number
): Promise<PuntoRecorrido[]> {
  return db.getAllAsync<PuntoRecorrido>(
    `SELECT id, recorrido_id AS recorridoId, lat, lng, altitud,
            precision_gps AS precisionGps, velocidad, timestamp,
            foto_uri AS fotoUri, descripcion
     FROM puntos_recorrido
     WHERE recorrido_id = ?
     ORDER BY timestamp`
  , recorridoId);
}

/** Distancia (metros) aproximada entre dos coordenadas (Haversine). */
export function distanciaHaversineM(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number }
): number {
  const R = 6371000;
  const rad = (g: number) => (g * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

/** Suma la distancia de una lista de puntos (m). */
export function distanciaDePuntosM(puntos: PuntoRecorrido[]): number {
  let total = 0;
  for (let i = 1; i < puntos.length; i++) {
    total += distanciaHaversineM(puntos[i - 1], puntos[i]);
  }
  return Math.round(total);
}

/** Historial de recorridos con estadísticas (puntos, fotos, distancia). */
export async function listarRecorridosResumen(
  db: SQLiteDatabase
): Promise<RecorridoResumen[]> {
  const filas = await db.getAllAsync<RecorridoLocal>(
    `SELECT id, lugar_id AS lugarId, lugar_nombre AS lugarNombre,
            iniciado_en AS iniciadoEn, terminado_en AS terminadoEn, estado
     FROM recorridos
     ORDER BY iniciado_en DESC`
  );
  const resumenes: RecorridoResumen[] = [];
  for (const fila of filas) {
    const puntos = await listarPuntos(db, fila.id);
    resumenes.push({
      ...fila,
      puntos: puntos.length,
      fotos: puntos.filter((p) => p.fotoUri).length,
      distanciaM: distanciaDePuntosM(puntos),
    });
  }
  return resumenes;
}