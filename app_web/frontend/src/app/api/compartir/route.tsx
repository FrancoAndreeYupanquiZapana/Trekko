import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { entorno } from "@/config/entorno";
import type { Paseo } from "@/tipos";

/**
 * GET /api/compartir?dni=...
 * -------------------------------------------------------------
 * Genera el collage (imagen PNG cuadrada 1080×1080) que el viajero comparte
 * en sus redes: sus mejores fotos + título del viaje + el logo de Trekko en
 * la esquina y, si el lugar tiene logo, el de la agencia.
 *
 * 100 % serverless (Vercel): usa `ImageResponse` de `next/og` (Satori + resvg),
 * sin binarios ni claves. Las fotos se bajan de Supabase Storage desde el
 * servidor, así que no hay problemas de CORS ni de canvas "tainted".
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

const ANCHO = 1080;
const ALTO = 1080;
const MAX_FOTOS = 6;
const MARGEN = 44;
const SEPARACION = 16;
const ANCHO_UTIL = ANCHO - MARGEN * 2;
const ALTO_FOTOS = 540;

const VERDE_OSCURO = "#064e3b";
const VERDE = "#065f46";
const VERDE_CLARO = "#a7f3d0";
const BLANCO = "#ffffff";

interface Resumen {
  nombre: string;
  lugar: string;
  fecha: string;
  pagina: string;
  logo: string | null;
  empresaLogo: string | null;
  fotos: string[];
}

/** Formatea un ISO como "12 de septiembre de 2026". */
function formatearFecha(iso?: string): string {
  if (!iso) return "";
  const fecha = new Date(iso);
  if (Number.isNaN(fecha.getTime())) return "";
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

/**
 * Baja una imagen y la devuelve como data URL (para incrustarla en el SVG que
 * genera Satori). Solo acepta JPEG/PNG, que son los formatos soportados.
 */
async function aDataUrl(url: string): Promise<string | null> {
  try {
    const respuesta = await fetch(url, { cache: "no-store" });
    if (!respuesta.ok) return null;
    const tipo = (respuesta.headers.get("content-type") ?? "image/jpeg")
      .split(";")[0]
      .trim()
      .toLowerCase();
    if (!["image/jpeg", "image/jpg", "image/png"].includes(tipo)) return null;
    const bytes = Buffer.from(await respuesta.arrayBuffer());
    return `data:${tipo};base64,${bytes.toString("base64")}`;
  } catch {
    return null;
  }
}

/** Logo de Trekko (mismo archivo que usa la app móvil), como data URL. */
let logoCache: string | null | undefined;
async function leerLogoTrekko(): Promise<string | null> {
  if (logoCache !== undefined) return logoCache;
  try {
    const bytes = await readFile(
      join(process.cwd(), "public", "trekko-logo.png")
    );
    logoCache = `data:image/png;base64,${bytes.toString("base64")}`;
  } catch {
    logoCache = null;
  }
  return logoCache;
}

/** Logo de la agencia/lugar (si tiene), como data URL. */
async function logoPorId(id: string | undefined): Promise<string | null> {
  if (!id) return null;
  try {
    const respuesta = await fetch(
      `${entorno.apiUrl}/empresas/${encodeURIComponent(id)}`,
      { cache: "no-store" }
    );
    if (!respuesta.ok) return null;
    const cuerpo = (await respuesta.json().catch(() => null)) as {
      exito?: boolean;
      datos?: { empresa?: { logoUrl?: string } };
    } | null;
    const logoUrl = cuerpo?.exito ? cuerpo.datos?.empresa?.logoUrl : null;
    return logoUrl ? await aDataUrl(logoUrl) : null;
  } catch {
    return null;
  }
}

/** Normaliza un nombre para comparar ("Lago Sandoval" ~ "lago sandoval"). */
function normalizar(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

/**
 * Logo de la agencia/lugar. Los paseos antiguos guardan un slug en `lugarId`
 * (p. ej. "lago-sandoval"), así que si el id no resuelve se busca por nombre
 * en el catálogo público.
 */
async function obtenerLogoEmpresa(
  lugarId: string | undefined,
  lugarNombre: string
): Promise<string | null> {
  const porId = await logoPorId(lugarId);
  if (porId || !lugarNombre) return porId;
  try {
    const respuesta = await fetch(`${entorno.apiUrl}/empresas`, {
      cache: "no-store",
    });
    if (!respuesta.ok) return null;
    const cuerpo = (await respuesta.json().catch(() => null)) as {
      exito?: boolean;
      datos?: { nombre?: string; logoUrl?: string }[];
    } | null;
    const lista = cuerpo?.exito ? (cuerpo.datos ?? []) : [];
    const objetivo = normalizar(lugarNombre);
    const empresa =
      lista.find((e) => e.nombre && normalizar(e.nombre) === objetivo) ??
      lista.find((e) => e.nombre && normalizar(e.nombre).includes(objetivo));
    return empresa?.logoUrl ? await aDataUrl(empresa.logoUrl) : null;
  } catch {
    return null;
  }
}

/** Collage de 1080×1080 (solo flexbox: es lo que entiende Satori). */
function Collage({ resumen }: { resumen: Resumen }) {
  const n = resumen.fotos.length;
  const columnas = n === 1 ? 1 : n === 2 ? 2 : n === 3 ? 3 : n === 4 ? 2 : 3;
  const filas = Math.max(1, Math.ceil(n / columnas));
  const anchoCelda = (ANCHO_UTIL - SEPARACION * (columnas - 1)) / columnas;
  const altoCelda = (ALTO_FOTOS - SEPARACION * (filas - 1)) / filas;
  const subtitulo = [resumen.lugar, resumen.fecha].filter(Boolean).join(" · ");

  return (
    <div
      style={{
        width: ANCHO,
        height: ALTO,
        display: "flex",
        flexDirection: "column",
        background: `linear-gradient(150deg, ${VERDE_OSCURO} 0%, ${VERDE} 55%, #047857 100%)`,
        padding: MARGEN,
        fontFamily: "sans-serif",
        color: BLANCO,
      }}
    >
      {/* Encabezado: Trekko a la izquierda, lugar a la derecha */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          width: ANCHO_UTIL,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          {resumen.logo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={resumen.logo}
              width={70}
              height={70}
              alt="Trekko"
              style={{ borderRadius: 18 }}
            />
          ) : null}
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span style={{ fontSize: 32, fontWeight: 800 }}>Trekko</span>
            <span style={{ fontSize: 15, color: VERDE_CLARO }}>
              turismo amazónico
            </span>
          </div>
        </div>
        {resumen.empresaLogo ? (
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "flex-end",
              }}
            >
              <span style={{ fontSize: 14, color: VERDE_CLARO }}>Lugar</span>
              <span style={{ fontSize: 20, fontWeight: 700 }}>
                {resumen.lugar || "Amazonía"}
              </span>
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={resumen.empresaLogo}
              width={70}
              height={70}
              alt={resumen.lugar || "Lugar"}
              style={{ borderRadius: 35, background: BLANCO }}
            />
          </div>
        ) : null}
      </div>

      {/* Título del viaje */}
      <div style={{ display: "flex", flexDirection: "column", marginTop: 34 }}>
        <span style={{ fontSize: 58, fontWeight: 800, lineHeight: 1.05 }}>
          El viaje de {resumen.nombre}
        </span>
        {subtitulo ? (
          <span style={{ fontSize: 24, color: VERDE_CLARO, marginTop: 10 }}>
            {subtitulo}
          </span>
        ) : null}
      </div>

      {/* Fotos */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: SEPARACION,
          marginTop: 28,
          width: ANCHO_UTIL,
          height: ALTO_FOTOS,
        }}
      >
        {resumen.fotos.map((src, i) => (
          <div
            key={i}
            style={{
              display: "flex",
              width: anchoCelda,
              height: altoCelda,
              borderRadius: 22,
              overflow: "hidden",
              border: "5px solid rgba(255,255,255,0.9)",
              boxSizing: "border-box",
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={src}
              alt={`Foto ${i + 1}`}
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          </div>
        ))}
      </div>

      {/* Relleno para empujar el pie al fondo */}
      <div style={{ display: "flex", flex: 1 }} />

      {/* Pie con la marca y el enlace */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          width: ANCHO_UTIL,
        }}
      >
        <span style={{ fontSize: 20, fontWeight: 700, color: VERDE_CLARO }}>
          Hecho con Trekko
        </span>
        <span style={{ fontSize: 16, color: "#6ee7b7" }}>{resumen.pagina}</span>
      </div>
    </div>
  );
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

    const nombre = paseos[0]?.nombre ?? "Viajero Trekko";
    const lugar = paseos.find((p) => p.lugarNombre)?.lugarNombre ?? "";
    const lugarId = paseos.find((p) => p.lugarId)?.lugarId;
    const fecha = formatearFecha(paseos[0]?.fechaExperiencia);
    const urlsFotos = paseos
      .flatMap((p) => p.fotos ?? [])
      .map((f) => f.url)
      .filter(Boolean)
      .slice(0, MAX_FOTOS);

    const [logo, empresaLogo, fotos] = await Promise.all([
      leerLogoTrekko(),
      obtenerLogoEmpresa(lugarId, lugar),
      Promise.all(urlsFotos.map(aDataUrl)).then((lista) =>
        lista.filter((x): x is string => Boolean(x))
      ),
    ]);

    const resumen: Resumen = {
      nombre,
      lugar,
      fecha,
      pagina: `${url.origin}/paseo/${encodeURIComponent(dni)}`,
      logo,
      empresaLogo,
      fotos,
    };

    return new ImageResponse(<Collage resumen={resumen} />, {
      width: ANCHO,
      height: ALTO,
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "no-store",
        "Content-Disposition": `inline; filename="recuerdo-${dni}.png"`,
      },
    });
  } catch (causa) {
    console.error("Error generando el collage:", causa);
    return new Response("No se pudo generar la imagen. Inténtalo otra vez.", {
      status: 500,
    });
  }
}
