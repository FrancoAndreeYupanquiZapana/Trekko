import { PDFDocument, PDFFont, rgb, StandardFonts } from "pdf-lib";
import { entorno } from "@/config/entorno";
import type { Paseo } from "@/tipos";

/**
 * GET /api/recuerdo?dni=...
 * -------------------------------------------------------------
 * Genera y descarga el "recuerdo" del viajero: un PDF A4 horizontal
 * (collage) con su título, lugar, fecha, una frase con IA (si el backend
 * tiene GEMINI_API_KEY configurada) y la cuadrícula de sus mejores fotos.
 *
 * Es 100 % serverless (Vercel): usa pdf-lib (JS puro, sin binarios)
 * y las imágenes se bajan de Supabase Storage desde el servidor, por
 * lo que no hay problemas de CORS ni API key en el navegador.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

const CELDAS_POR_FILA = 4;
const MAX_FOTOS = 12;

const EMERALDE = rgb(0.106, 0.263, 0.196); // #1B4332
const EMERALDE_CLARO = rgb(0.102, 0.431, 0.302); // #1B6E4D
const GRIS = rgb(0.42, 0.45, 0.45);
const BLANCO = rgb(1, 1, 1);
const FONDO_CELDA = rgb(0.93, 0.95, 0.93);

interface PaseoResumen {
  nombre: string;
  lugares: string[];
  fechas: string[];
  paseos: number;
  puntos: number;
  metros: number;
  fotos: string[];
}

/** Formatea un ISO como "21 de septiembre de 2026". */
function formatearFecha(iso?: string): string | null {
  if (!iso) return null;
  const fecha = new Date(iso);
  if (Number.isNaN(fecha.getTime())) return null;
  const meses = [
    "enero",
    "febrero",
    "marzo",
    "abril",
    "mayo",
    "junio",
    "julio",
    "agosto",
    "septiembre",
    "octubre",
    "noviembre",
    "diciembre",
  ];
  return `${fecha.getDate()} de ${meses[fecha.getMonth()]} de ${fecha.getFullYear()}`;
}

/** Distancia aproximada en metros (Haversine). */
function distanciaMetros(puntos: { lat: number; lng: number }[]): number {
  let total = 0;
  const rad = (g: number) => (g * Math.PI) / 180;
  for (let i = 1; i < puntos.length; i++) {
    const a = puntos[i - 1];
    const b = puntos[i];
    const dLat = rad(b.lat - a.lat);
    const dLng = rad(b.lng - a.lng);
    const s =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
    total += 2 * 6371000 * Math.asin(Math.sqrt(s));
  }
  return Math.round(total);
}

function resumir(paseos: Paseo[]): PaseoResumen {
  const resumen: PaseoResumen = {
    nombre: paseos[0]?.nombre ?? "Viajero",
    lugares: [],
    fechas: [],
    paseos: paseos.length,
    puntos: 0,
    metros: 0,
    fotos: [],
  };
  for (const paseo of paseos) {
    if (paseo.lugarNombre && !resumen.lugares.includes(paseo.lugarNombre)) {
      resumen.lugares.push(paseo.lugarNombre);
    }
    resumen.fechas.push(
      formatearFecha(paseo.fechaExperiencia) ?? paseo.creadoEn?.slice(0, 10)
    );
    resumen.puntos += paseo.track?.length ?? 0;
    resumen.metros += distanciaMetros(paseo.track ?? []);
    for (const foto of paseo.fotos ?? []) {
      if (foto.url) resumen.fotos.push(foto.url);
      if (resumen.fotos.length >= MAX_FOTOS) break;
    }
  }
  resumen.fechas = [...new Set(resumen.fechas.filter(Boolean))] as string[];
  return resumen;
}

/**
 * Frase del recuerdo: la pide al BACKEND (POST /api/paseos/texto-recuerdo),
 * que es quien tiene la clave de Gemini en el servidor. Si no hay clave o
 * falla la llamada, devuelve null y el PDF usa una frase por plantilla.
 */
async function obtenerFraseDelServidor(
  resumen: PaseoResumen
): Promise<string | null> {
  try {
    const respuesta = await fetch(
      `${entorno.apiUrl}/paseos/texto-recuerdo`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre: resumen.nombre,
          lugar: resumen.lugares.join(", ") || "la Amazonía",
          fecha: resumen.fechas[0] ?? undefined,
          paseos: resumen.paseos,
          puntos: resumen.puntos,
          fotos: resumen.fotos.length,
        }),
        cache: "no-store",
      }
    );
    if (!respuesta.ok) return null;
    const cuerpo = (await respuesta.json()) as {
      exito?: boolean;
      datos?: { frase?: string | null };
    };
    const frase = cuerpo?.exito ? cuerpo.datos?.frase : null;
    return frase || null;
  } catch {
    return null;
  }
}

/** Parte el texto en líneas que caben en el ancho indicado. */
function envolverTexto(
  fuente: PDFFont,
  texto: string,
  anchoMax: number,
  tamaño: number
): string[] {
  const palabras = texto.split(/\s+/);
  const lineas: string[] = [];
  let linea = "";
  for (const palabra of palabras) {
    const prueba = linea ? `${linea} ${palabra}` : palabra;
    if (fuente.widthOfTextAtSize(prueba, tamaño) <= anchoMax) {
      linea = prueba;
    } else {
      if (linea) lineas.push(linea);
      linea = palabra;
    }
  }
  if (linea) lineas.push(linea);
  return lineas;
}

/** Baja la imagen y la devuelve lista para incrustar (JPEG o PNG). */
async function bajarImagenPdf(
  pdf: PDFDocument,
  url: string
): Promise<{ image: import("pdf-lib").PDFImage; ancho: number; alto: number } | null> {
  try {
    const respuesta = await fetch(url, { cache: "no-store" });
    if (!respuesta.ok) return null;
    const bytes = new Uint8Array(await respuesta.arrayBuffer());
    const esPng =
      bytes.length > 8 &&
      bytes[0] === 0x89 &&
      bytes[1] === 0x50 &&
      bytes[2] === 0x4e &&
      bytes[3] === 0x47;
    const image = esPng ? await pdf.embedPng(bytes) : await pdf.embedJpg(bytes);
    return { image, ancho: image.width, alto: image.height };
  } catch {
    return null;
  }
}

async function construirPdf(
  resumen: PaseoResumen,
  frase: string | null,
  dni: string
): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([841.89, 595.28]); // A4 horizontal
  const W = page.getWidth();
  const H = page.getHeight();

  const fuenteTitulo = await pdf.embedFont(StandardFonts.HelveticaBold);
  const fuenteTexto = await pdf.embedFont(StandardFonts.Helvetica);

  // Fondo blanco liso.
  page.drawRectangle({ x: 0, y: 0, width: W, height: H, color: BLANCO });

  // --- Encabezado verde ---
  const ALTO_ENCABEZADO = 118;
  page.drawRectangle({
    x: 0,
    y: H - ALTO_ENCABEZADO,
    width: W,
    height: ALTO_ENCABEZADO,
    color: EMERALDE,
  });

  const titulo = `El viaje de ${resumen.nombre}`;
  const subtitulo =
    `${resumen.lugares.length > 0 ? resumen.lugares.join(" · ") : "la Amazonía"}` +
    `${resumen.fechas[0] ? ` · ${resumen.fechas[0]}` : ""}`;

  page.drawText(titulo, {
    x: 40,
    y: H - 52,
    size: 32,
    font: fuenteTitulo,
    color: BLANCO,
  });
  page.drawText(subtitulo, {
    x: 40,
    y: H - 84,
    size: 15,
    font: fuenteTexto,
    color: rgb(0.85, 0.93, 0.88),
  });

  if (resumen.puntos > 0) {
    const detalle =
      `${resumen.paseos} recorrido${resumen.paseos === 1 ? "" : "s"}` +
      ` · ${resumen.puntos} puntos GPS` +
      (resumen.metros > 0 ? ` · ${resumen.metros.toLocaleString("es")} m` : "");
    page.drawText(detalle, {
      x: 40,
      y: H - 106,
      size: 11,
      font: fuenteTexto,
      color: rgb(0.85, 0.93, 0.88),
    });
  }

  // --- Collage de fotos ---
  const MARGEN = 40;
  const ANCHO_COLLAGE = W - MARGEN * 2;
  const SEPARACION = 10;
  const anchoCelda =
    (ANCHO_COLLAGE - SEPARACION * (CELDAS_POR_FILA - 1)) / CELDAS_POR_FILA;
  const altoCelda = 96;
  const TOPE_COLLAGE = H - ALTO_ENCABEZADO - 16;

  const imagenes = [];
  for (const url of resumen.fotos) {
    const img = await bajarImagenPdf(pdf, url);
    if (img) imagenes.push(img);
    if (imagenes.length >= MAX_FOTOS) break;
  }

  const filas = Math.max(1, Math.ceil(imagenes.length / CELDAS_POR_FILA));

  imagenes.forEach((img, i) => {
    const fila = Math.floor(i / CELDAS_POR_FILA);
    const columna = i % CELDAS_POR_FILA;
    const celdaX = MARGEN + columna * (anchoCelda + SEPARACION);
    const celdaYTop = TOPE_COLLAGE - fila * (altoCelda + SEPARACION);

    page.drawRectangle({
      x: celdaX,
      y: celdaYTop - altoCelda,
      width: anchoCelda,
      height: altoCelda,
      color: FONDO_CELDA,
    });

    // Ajusta "cover": la foto llena la celda y se centra.
    const escala = Math.max(anchoCelda / img.ancho, altoCelda / img.alto);
    const anchoDibujo = img.ancho * escala;
    const altoDibujo = img.alto * escala;
    page.drawImage(img.image, {
      x: celdaX + (anchoCelda - anchoDibujo) / 2,
      y: celdaYTop - altoCelda + (altoCelda - altoDibujo) / 2,
      width: anchoDibujo,
      height: altoDibujo,
    });
  });

  if (imagenes.length === 0) {
    page.drawText("(No se pudieron cargar las fotos)", {
      x: MARGEN,
      y: TOPE_COLLAGE - 60,
      size: 12,
      font: fuenteTexto,
      color: GRIS,
    });
  }

  // --- Frase del recuerdo ---
  const hayMasFotos = resumen.fotos.length > MAX_FOTOS;
  const textoFrase =
    hayMasFotos && resumen.fotos.length > MAX_FOTOS
      ? `${frase ?? ""} En el recuerdo van ${MAX_FOTOS} de sus ${resumen.fotos.length} fotos.`.trim()
      : (frase ?? "Cada paso contó una historia. Este recuerdo quedará para siempre.");
  const alturaFrase = filas * altoCelda + (filas - 1) * SEPARACION;
  const baseFraseY = TOPE_COLLAGE - alturaFrase - 18;

  const lineasFrase = envolverTexto(fuenteTexto, textoFrase, ANCHO_COLLAGE, 12);
  lineasFrase.slice(0, 2).forEach((linea, i) => {
    page.drawText(linea, {
      x: MARGEN,
      y: baseFraseY - i * 16,
      size: 12,
      font: fuenteTexto,
      color: EMERALDE_CLARO,
    });
  });

  // --- Pie ---
  page.drawText(
    `Generado con Trekko · DNI ${dni} · ${new Date().toLocaleDateString("es")}`,
    { x: MARGEN, y: 26, size: 10, font: fuenteTexto, color: GRIS }
  );

  return pdf.save();
}

export async function GET(peticion: Request): Promise<Response> {
  try {
    const url = new URL(peticion.url);
    const dni = url.searchParams.get("dni")?.trim() ?? "";
    if (!dni) {
      return new Response("Falta el parámetro dni.", { status: 400 });
    }

    const respuesta = await fetch(
      `${entorno.apiUrl}/paseos/dni/${encodeURIComponent(dni)}`,
      { cache: "no-store" }
    );
    const cuerpo = (await respuesta.json().catch(() => null)) as {
      exito: boolean;
      datos?: Paseo[];
    } | null;

    const paseos = cuerpo?.exito ? (cuerpo.datos ?? []) : [];
    if (paseos.length === 0) {
      return new Response("Este DNI todavía no tiene paseos publicados.", {
        status: 404,
      });
    }

    const resumen = resumir(paseos);
    const frase = await obtenerFraseDelServidor(resumen);
    const bytes = await construirPdf(resumen, frase, dni);

    const bufferPdf = new ArrayBuffer(bytes.byteLength);
    new Uint8Array(bufferPdf).set(bytes);

    return new Response(new Blob([bufferPdf], { type: "application/pdf" }), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="recuerdo-${dni}.pdf"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (causa) {
    console.error("Error generando recuerdo:", causa);
    return new Response("No se pudo generar el recuerdo. Inténtalo otra vez.", {
      status: 500,
    });
  }
}