import type { SQLiteDatabase } from "expo-sqlite";
import type {
  AfichePaquete,
  EspeciePaquete,
  ImagenPaquete,
  LugarTarjeta,
  PaqueteLugar,
  PuntoPaquete,
  RelatoPaquete,
} from "@/tipos";

/**
 * Capa de persistencia local (SQLite).
 * El paquete v6 de cada lugar se guarda TAL CUAL en una fila (columna json),
 * tal como lo recomienda app_movile/INTEGRACION-PAQUETE.md.
 */

/**
 * Crea la estructura de la base de datos. Lo llama SQLiteProvider una sola
 * vez al arrancar la app.
 */
export async function inicializarBaseDatos(db: SQLiteDatabase): Promise<void> {
  await db.execAsync(`
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS paquetes (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      lugar_id      TEXT    NOT NULL UNIQUE,
      nombre        TEXT    NOT NULL,
      version       INTEGER NOT NULL,
      revision      TEXT    NOT NULL,
      json          TEXT    NOT NULL,
      descargado_en TEXT    NOT NULL
    );
    CREATE TABLE IF NOT EXISTS recorridos (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      lugar_id     TEXT,
      lugar_nombre TEXT,
      iniciado_en  TEXT NOT NULL,
      terminado_en TEXT,
      estado       TEXT NOT NULL DEFAULT 'EN_CURSO'
    );
    CREATE TABLE IF NOT EXISTS puntos_recorrido (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      recorrido_id  INTEGER NOT NULL REFERENCES recorridos(id),
      lat           REAL NOT NULL,
      lng           REAL NOT NULL,
      altitud       REAL,
      precision_gps REAL,
      velocidad     REAL,
      timestamp     TEXT NOT NULL,
      foto_uri      TEXT,
      descripcion   TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_puntos_recorrido
      ON puntos_recorrido(recorrido_id);
    CREATE TABLE IF NOT EXISTS configuracion (
      clave TEXT PRIMARY KEY,
      valor TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS envios_galeria (
      id               INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre           TEXT    NOT NULL,
      dni              TEXT,
      lugar_id         TEXT,
      lugar_nombre     TEXT,
      recorrido_id     INTEGER,
      fecha_experiencia TEXT   NOT NULL,
      track_json       TEXT    NOT NULL,
      fotos_json       TEXT    NOT NULL,
      estado           TEXT    NOT NULL DEFAULT 'PENDIENTE',
      url_publica      TEXT,
      mensaje_error    TEXT,
      creado_en        TEXT    NOT NULL
    );
  `);

  // Migración ligera: agrega columnas nuevas a bases ya creadas en versiones
  // anteriores (CREATE TABLE IF NOT EXISTS no toca tablas existentes).
  const columnas = await db.getAllAsync<{ name: string }>(
    "PRAGMA table_info(envios_galeria)"
  );
  const nombres = new Set(columnas.map((c) => c.name));
  if (!nombres.has("url_publica")) {
    await db.execAsync("ALTER TABLE envios_galeria ADD COLUMN url_publica TEXT");
  }
  if (!nombres.has("mensaje_error")) {
    await db.execAsync("ALTER TABLE envios_galeria ADD COLUMN mensaje_error TEXT");
  }
}

/** Resumen de una descarga (para el home, sin leer el JSON completo). */
export interface DescargaLocal {
  lugarId: string;
  nombre: string;
  version: number;
  revision: string;
  descargadoEn: string;
}

/** Devuelve el resumen de todos los lugares descargados. */
export async function listarDescargas(
  db: SQLiteDatabase
): Promise<DescargaLocal[]> {
  return db.getAllAsync<DescargaLocal>(
    `SELECT lugar_id AS lugarId, nombre, version, revision,
            descargado_en AS descargadoEn
     FROM paquetes
     ORDER BY nombre`
  );
}

/**
 * Lugar ACTIVO (seleccionado): el lugar donde el turista está AHORA.
 * Toda la información que muestra la app (especies, afiches…) se filtra a él.
 */
const CLAVE_LUGAR_ACTIVO = "lugar_activo_id";

/** Id del lugar activo, o null si todavía no eligió uno. */
export async function obtenerLugarActivoId(
  db: SQLiteDatabase
): Promise<string | null> {
  const fila = await db.getFirstAsync<{ valor: string }>(
    "SELECT valor FROM configuracion WHERE clave = ?",
    CLAVE_LUGAR_ACTIVO
  );
  return fila?.valor ?? null;
}

/** Guarda (o limpia, si se pasa null) el lugar activo seleccionado. */
export async function seleccionarLugarActivo(
  db: SQLiteDatabase,
  lugarId: string | null
): Promise<void> {
  if (lugarId == null) {
    await db.runAsync("DELETE FROM configuracion WHERE clave = ?", CLAVE_LUGAR_ACTIVO);
    return;
  }
  await db.runAsync(
    `INSERT OR REPLACE INTO configuracion (clave, valor) VALUES (?, ?)`,
    CLAVE_LUGAR_ACTIVO,
    lugarId
  );
}

/** Lee el paquete completo de un lugar desde SQLite (funciona sin red). */
export async function leerPaquete(
  db: SQLiteDatabase,
  lugarId: string
): Promise<PaqueteLugar | null> {
  const fila = await db.getFirstAsync<{ json: string }>(
    "SELECT json FROM paquetes WHERE lugar_id = ?",
    lugarId
  );
  return fila ? (JSON.parse(fila.json) as PaqueteLugar) : null;
}

/** Revisión local de un lugar (o null si no está descargado). */
export async function leerRevisionLocal(
  db: SQLiteDatabase,
  lugarId: string
): Promise<string | null> {
  const fila = await db.getFirstAsync<{ revision: string }>(
    "SELECT revision FROM paquetes WHERE lugar_id = ?",
    lugarId
  );
  return fila?.revision ?? null;
}

/** Guarda (o reemplaza) el paquete de un lugar en SQLite. */
export async function guardarPaquete(
  db: SQLiteDatabase,
  paquete: PaqueteLugar
): Promise<void> {
  await db.runAsync(
    `INSERT OR REPLACE INTO paquetes
       (lugar_id, nombre, version, revision, json, descargado_en)
     VALUES (?, ?, ?, ?, ?, ?)`,
    paquete.empresa.id,
    paquete.empresa.nombre,
    paquete.version,
    paquete.revision,
    JSON.stringify(paquete),
    new Date().toISOString()
  );
}

/** Elimina la descarga de un lugar. */
export async function eliminarPaquete(
  db: SQLiteDatabase,
  lugarId: string
): Promise<void> {
  await db.runAsync("DELETE FROM paquetes WHERE lugar_id = ?", lugarId);
}

/** Especie con el lugar al que pertenece (para el buscador de especies). */
export interface EspecieConLugar {
  lugarId: string;
  lugarNombre: string;
  especie: EspeciePaquete;
}

/**
 * Junta las especies de TODOS los lugares descargados (offline).
 * Es la base del "área informática de flora y fauna": el turista busca y
 * consulta especies sin conexión.
 */
export async function listarEspeciesLocales(
  db: SQLiteDatabase
): Promise<EspecieConLugar[]> {
  const filas = await db.getAllAsync<{ lugar_id: string; nombre: string; json: string }>(
    "SELECT lugar_id, nombre, json FROM paquetes"
  );
  const resultado: EspecieConLugar[] = [];
  for (const fila of filas) {
    try {
      const paquete = JSON.parse(fila.json) as PaqueteLugar;
      for (const especie of paquete.especies) {
        resultado.push({
          lugarId: fila.lugar_id,
          lugarNombre: fila.nombre,
          especie,
        });
      }
    } catch {
      // Paquete corrupto o de otra versión: se ignora y se sigue.
    }
  }
  return resultado;
}

/** Afiche con el lugar al que pertenece. */
export interface AficheConLugar {
  lugarId: string;
  lugarNombre: string;
  afiche: AfichePaquete;
}

/**
 * Junta los afiches (carteles, precauciones) de TODOS los lugares
 * descargados. Pestaña "Afiches" — funciona sin conexión.
 */
export async function listarAfichesLocales(
  db: SQLiteDatabase
): Promise<AficheConLugar[]> {
  const filas = await db.getAllAsync<{ lugar_id: string; nombre: string; json: string }>(
    "SELECT lugar_id, nombre, json FROM paquetes"
  );
  const resultado: AficheConLugar[] = [];
  for (const fila of filas) {
    try {
      const paquete = JSON.parse(fila.json) as PaqueteLugar;
      for (const afiche of paquete.afiches) {
        resultado.push({
          lugarId: fila.lugar_id,
          lugarNombre: fila.nombre,
          afiche,
        });
      }
    } catch {
      // Paquete corrupto o de otra versión: se ignora y se sigue.
    }
  }
  return resultado;
}

/** Relato local (mito, leyenda…) con el lugar al que pertenece. */
export interface RelatoConLugar {
  lugarId: string;
  lugarNombre: string;
  relato: RelatoPaquete;
}

/**
 * Junta los relatos locales (mitos, leyendas, datos curiosos y simbiosis)
 * de TODOS los lugares descargados. Pestaña "Mitos" — funciona sin conexión.
 */
export async function listarRelatosLocales(
  db: SQLiteDatabase
): Promise<RelatoConLugar[]> {
  const filas = await db.getAllAsync<{ lugar_id: string; nombre: string; json: string }>(
    "SELECT lugar_id, nombre, json FROM paquetes"
  );
  const resultado: RelatoConLugar[] = [];
  for (const fila of filas) {
    try {
      const paquete = JSON.parse(fila.json) as PaqueteLugar;
      for (const relato of paquete.relatos) {
        resultado.push({
          lugarId: fila.lugar_id,
          lugarNombre: fila.nombre,
          relato,
        });
      }
    } catch {
      // Paquete corrupto o de otra versión: se ignora y se sigue.
    }
  }
  return resultado;
}

/**
 * Punto de interés resuelto para mostrar el aviso al acercarse (offline).
 * Resuelve el título, la descripción y la imagen del contenido vinculado
 * (afiche o especie) para que el aviso sea informativo sin conexión.
 */
export interface AvisoPunto {
  id: string;
  lugarId: string;
  lugarNombre: string;
  lat: number;
  lng: number;
  /** Radio de aviso en metros. */
  radioM: number;
  /** AFICHE, ESPECIE o NOTA. */
  tipo: string;
  titulo: string;
  descripcion: string;
  /**
   * Imagen del aviso: gana la «imagen propia» del punto (si la subió la
   * empresa); si no, la del contenido vinculado (afiche o especie).
   */
  imagen: ImagenPaquete | null;
}

/**
 * Resuelve el contenido vinculado (afiche o especie) de un punto.
 * Devuelve null cuando el punto NO trae contenido vinculado (por ejemplo
 * un punto tipo NOTA, o un afiche/especie cuya referencia no existe).
 */
function resolverContenidoDePunto(
  paquete: PaqueteLugar,
  punto: PuntoPaquete
): { titulo?: string; descripcion?: string; imagen?: ImagenPaquete | null } | null {
  if (punto.tipo === "AFICHE") {
    const afiche = (paquete.afiches ?? []).find((a) => a.id === punto.aficheId);
    if (afiche) {
      return {
        titulo: afiche.titulo,
        descripcion: afiche.descripcion,
        imagen: afiche.imagen,
      };
    }
  }
  if (punto.tipo === "ESPECIE") {
    const especie = (paquete.especies ?? []).find(
      (e) => e.id === punto.especieId
    );
    if (especie) {
      return {
        titulo: especie.nombreComun,
        descripcion: especie.descripcion,
        imagen: especie.imagen,
      };
    }
  }
  return null;
}

/**
 * Junta los puntos de interés de TODOS los lugares descargados, ya resueltos
 * para mostrar el aviso automático al acercarse. Funciona sin conexión.
 */
export async function listarPuntosLocales(
  db: SQLiteDatabase
): Promise<AvisoPunto[]> {
  const filas = await db.getAllAsync<{
    lugar_id: string;
    nombre: string;
    json: string;
  }>("SELECT lugar_id, nombre, json FROM paquetes");
  const resultado: AvisoPunto[] = [];
  for (const fila of filas) {
    try {
      const paquete = JSON.parse(fila.json) as PaqueteLugar;
      // Paquetes v5 (sin puntos) se ignoran sin romper la app.
      for (const punto of paquete.puntos ?? []) {
        const vinculado = resolverContenidoDePunto(paquete, punto);
        // Regla del aviso: solo salta el popup si el punto tiene contenido
        // vinculado (afiche informativo o especie/fauna). Un punto sin
        // contenido vinculado (NOTA, o referencia vacía) NO debe avisar.
        if (!vinculado) continue;
        resultado.push({
          id: punto.id,
          lugarId: fila.lugar_id,
          lugarNombre: fila.nombre,
          lat: Number(punto.lat),
          lng: Number(punto.lng),
          radioM: Number(punto.radioM) || 60,
          tipo: punto.tipo,
          titulo: vinculado.titulo || punto.titulo || "Punto de interés",
          descripcion: vinculado.descripcion || punto.descripcion || "",
          // La imagen «propia» del punto (subida por la empresa en el portal)
          // gana sobre la del contenido vinculado.
          imagen: punto.imagen ?? vinculado.imagen ?? null,
        });
      }
    } catch {
      // Paquete corrupto o de otra versión: se ignora y se sigue.
    }
  }
  return resultado;
}

/**
 * Devuelve los lugares descargados como tarjetas del catálogo (offline).
 * Sirve para mostrar la lista cuando no hay internet: solo aparecen los
 * lugares que el turista ya descargó.
 */
export async function listarLugaresLocales(
  db: SQLiteDatabase
): Promise<LugarTarjeta[]> {
  const filas = await db.getAllAsync<{ lugar_id: string; nombre: string; json: string }>(
    "SELECT lugar_id, nombre, json FROM paquetes"
  );
  const resultado: LugarTarjeta[] = [];
  for (const fila of filas) {
    try {
      const paquete = JSON.parse(fila.json) as PaqueteLugar;
      resultado.push({
        id: fila.lugar_id,
        nombre: fila.nombre,
        descripcion: paquete.empresa.descripcion,
        telefono: paquete.empresa.telefono,
        logoUrl: paquete.empresa.logoUrl,
        web: paquete.empresa.web,
        redesSociales: paquete.empresa.redesSociales,
        ubicacion: paquete.empresa.ubicacion,
      });
    } catch {
      // Paquete corrupto: se ignora y se sigue.
    }
  }
  return resultado;
}