import sharp from "sharp";

/**
 * Optimización de imágenes para el paquete offline de la app.
 * Convierte cualquier imagen (por URL) a JPEG reducido y comprimido,
 * incrustado como data URI base64 para viajar dentro del JSON.
 * Así el paquete queda liviano y la app lo guarda tal cual en SQLite.
 */

/** Imagen optimizada lista para incrustar en el paquete. */
export interface ImagenPaquete {
  /** JPEG en formato data URI (data:image/jpeg;base64,...). */
  datos: string;
  ancho: number;
  alto: number;
}

/** Perfil de compresión según el uso de la imagen. */
export type PerfilImagenes = "foto" | "afiche";

const PERFILES: Record<PerfilImagenes, { maxAncho: number; calidad: number }> = {
  /** Fotos de especies, relatos y logos: livianas. */
  foto: { maxAncho: 720, calidad: 68 },
  /** Afiches: conservan más resolución para texto legible offline. */
  afiche: { maxAncho: 1080, calidad: 78 },
};

const TIEMPO_MAXIMO_MS = 10_000;

/**
 * Descarga una imagen desde su URL y la devuelve optimizada (JPEG base64).
 * Devuelve null si la imagen no existe, es inválida o tarda demasiado,
 * para que el paquete nunca falle por una foto rota.
 */
export async function optimizarImagenDesdeUrl(
  url: string,
  perfil: PerfilImagenes = "foto"
): Promise<ImagenPaquete | null> {
  try {
    const control = new AbortController();
    const temporizador = setTimeout(() => control.abort(), TIEMPO_MAXIMO_MS);

    let bytes: Uint8Array;
    try {
      const respuesta = await fetch(url, { signal: control.signal });
      if (!respuesta.ok) return null;
      bytes = new Uint8Array(await respuesta.arrayBuffer());
    } finally {
      clearTimeout(temporizador);
    }

    const { maxAncho, calidad } = PERFILES[perfil];
    const buffer = await sharp(bytes)
      .flatten({ background: "#ffffff" })
      .resize({ width: maxAncho, withoutEnlargement: true })
      .jpeg({ quality: calidad, mozjpeg: true })
      .toBuffer();

    const metadatos = await sharp(buffer).metadata();
    return {
      datos: `data:image/jpeg;base64,${buffer.toString("base64")}`,
      ancho: metadatos.width ?? 0,
      alto: metadatos.height ?? 0,
    };
  } catch {
    return null;
  }
}

/** Imagen recomprimida lista para subir a Storage. */
export interface ImagenOptimizada {
  buffer: Buffer;
  mimetype: string;
  originalname: string;
}

/**
 * Recomprime en memoria una imagen subida desde la app (multipart) antes de
 * guardarla en Storage. Las fotos de celular pesan varios MB; así la página
 * pública carga rápido y el almacenamiento no se llena. Devuelve null si la
 * imagen no se pudo procesar (en ese caso se sube el archivo original).
 */
export async function optimizarImagenBuffer(
  buffer: Buffer,
  maxAncho = 1600,
  calidad = 80
): Promise<ImagenOptimizada | null> {
  try {
    const salida = await sharp(buffer)
      .rotate()
      .resize({ width: maxAncho, withoutEnlargement: true })
      .jpeg({ quality: calidad, mozjpeg: true })
      .toBuffer();
    return { buffer: salida, mimetype: "image/jpeg", originalname: "foto.jpg" };
  } catch {
    return null;
  }
}