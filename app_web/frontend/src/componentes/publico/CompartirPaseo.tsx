"use client";

import { useRef, useState } from "react";

/**
 * Botones para compartir el recuerdo del viajero:
 * - La página pública (Facebook, WhatsApp, X, Telegram y copiar enlace).
 * - La imagen-collage y el PDF (compartir nativo con archivos o descarga).
 * - Instagram usa el compartir nativo del sistema (Web Share API); en
 *   computadora descarga la imagen y avisa que hay que subirla a mano.
 */
export function CompartirPaseo({
  dni,
  nombre,
}: {
  dni: string;
  nombre: string;
}) {
  const [ocupado, setOcupado] = useState<string | null>(null);
  const [mensaje, setMensaje] = useState<string | null>(null);
  const imagenRef = useRef<File | null>(null);

  const textoCompartir = `Mira el viaje de ${nombre} en la Amazonía, en Trekko 🌿`;

  function urlPagina(): string {
    if (typeof window === "undefined") return "";
    return window.location.href;
  }

  function abrir(url: string) {
    window.open(url, "_blank", "noopener,noreferrer,width=680,height=680");
  }

  function compartirEnlace(red: "facebook" | "whatsapp" | "x" | "telegram") {
    const url = encodeURIComponent(urlPagina());
    const texto = encodeURIComponent(textoCompartir);
    const destinos = {
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${url}`,
      whatsapp: `https://wa.me/?text=${texto}%20${url}`,
      x: `https://twitter.com/intent/tweet?text=${texto}&url=${url}`,
      telegram: `https://t.me/share/url?url=${url}&text=${texto}`,
    } as const;
    abrir(destinos[red]);
  }

  async function copiarEnlace() {
    try {
      await navigator.clipboard.writeText(urlPagina());
      setMensaje("🔗 Enlace copiado. Pégalo donde quieras.");
    } catch {
      setMensaje("No se pudo copiar. Copia el enlace desde la barra del navegador.");
    }
  }

  function descargar(blob: Blob, nombreArchivo: string) {
    const url = URL.createObjectURL(blob);
    const enlace = document.createElement("a");
    enlace.href = url;
    enlace.download = nombreArchivo;
    document.body.appendChild(enlace);
    enlace.click();
    enlace.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
  }

  async function obtenerArchivo(
    ruta: string,
    tipo: string,
    nombreArchivo: string
  ): Promise<File> {
    const respuesta = await fetch(ruta);
    if (!respuesta.ok) {
      const texto = await respuesta.text().catch(() => "");
      throw new Error(
        texto || `No se pudo generar el archivo (${respuesta.status}).`
      );
    }
    const blob = await respuesta.blob();
    return new File([blob], nombreArchivo, { type: tipo });
  }

  /** Comparte un archivo con el menú nativo. Devuelve si lo logró o no. */
  async function compartirArchivo(
    archivo: File
  ): Promise<"ok" | "cancelado" | "no-soportado"> {
    const nav = navigator as Navigator & {
      canShare?: (datos?: { files?: File[] }) => boolean;
      share?: (datos?: {
        files?: File[];
        text?: string;
        title?: string;
        url?: string;
      }) => Promise<void>;
    };
    if (!nav.canShare || !nav.share || !nav.canShare({ files: [archivo] })) {
      return "no-soportado";
    }
    try {
      await nav.share({
        files: [archivo],
        text: textoCompartir,
        title: `El viaje de ${nombre} · Trekko`,
      });
      return "ok";
    } catch (causa) {
      if (causa instanceof DOMException && causa.name === "AbortError") {
        return "cancelado";
      }
      return "no-soportado";
    }
  }

  /** Baja la imagen del collage y la guarda en caché (para el share nativo). */
  async function obtenerImagen(): Promise<File> {
    if (imagenRef.current) return imagenRef.current;
    const archivo = await obtenerArchivo(
      `/api/compartir?dni=${encodeURIComponent(dni)}`,
      "image/png",
      `recuerdo-${dni}.png`
    );
    imagenRef.current = archivo;
    return archivo;
  }

  /** Precarga en segundo plano al pasar el mouse por encima. */
  function precargarImagen() {
    if (!imagenRef.current) void obtenerImagen().catch(() => undefined);
  }

  async function compartirImagen() {
    setOcupado("imagen");
    setMensaje(null);
    try {
      const archivo = await obtenerImagen();
      const resultado = await compartirArchivo(archivo);
      if (resultado === "no-soportado") {
        descargar(archivo, `recuerdo-${dni}.png`);
        setMensaje(
          "📷 Tu dispositivo no comparte archivos directo: descargamos la imagen. Súbela a tu red social."
        );
      }
    } catch (causa) {
      setMensaje(
        causa instanceof Error
          ? causa.message
          : "No se pudo compartir la imagen."
      );
    } finally {
      setOcupado(null);
    }
  }

  async function compartirPdf() {
    setOcupado("pdf");
    setMensaje(null);
    try {
      const archivo = await obtenerArchivo(
        `/api/recuerdo?dni=${encodeURIComponent(dni)}`,
        "application/pdf",
        `recuerdo-${dni}.pdf`
      );
      const resultado = await compartirArchivo(archivo);
      if (resultado === "no-soportado") {
        descargar(archivo, `recuerdo-${dni}.pdf`);
        setMensaje("📄 Tu dispositivo no comparte archivos directo: descargamos el PDF.");
      }
    } catch (causa) {
      setMensaje(
        causa instanceof Error ? causa.message : "No se pudo compartir el PDF."
      );
    } finally {
      setOcupado(null);
    }
  }

  async function descargarImagen() {
    setOcupado("descargar-imagen");
    setMensaje(null);
    try {
      const archivo = await obtenerImagen();
      descargar(archivo, `recuerdo-${dni}.png`);
      setMensaje("🖼️ Imagen descargada. Ya puedes publicarla.");
    } catch (causa) {
      setMensaje(
        causa instanceof Error ? causa.message : "No se pudo descargar la imagen."
      );
    } finally {
      setOcupado(null);
    }
  }

  async function descargarPdf() {
    setOcupado("descargar-pdf");
    setMensaje(null);
    try {
      const archivo = await obtenerArchivo(
        `/api/recuerdo?dni=${encodeURIComponent(dni)}`,
        "application/pdf",
        `recuerdo-${dni}.pdf`
      );
      descargar(archivo, `recuerdo-${dni}.pdf`);
      setMensaje("📄 PDF descargado. Ábrelo o imprímelo.");
    } catch (causa) {
      setMensaje(
        causa instanceof Error ? causa.message : "No se pudo descargar el PDF."
      );
    } finally {
      setOcupado(null);
    }
  }

  return (
    <div
      className="mx-auto mt-8 w-full max-w-2xl rounded-3xl border border-white/20 bg-white/10 p-5 text-center backdrop-blur"
      onPointerEnter={precargarImagen}
    >
      <p className="text-sm font-bold uppercase tracking-wide text-emerald-50">
        Comparte este recuerdo
      </p>

      {/* Enlace de la página */}
      <p className="mt-3 text-xs font-semibold text-emerald-100">
        Comparte la página en:
      </p>
      <div className="mt-2 flex flex-wrap items-center justify-center gap-2">
        <BotonRed red="facebook" onClick={() => compartirEnlace("facebook")}>
          Facebook
        </BotonRed>
        <BotonRed red="whatsapp" onClick={() => compartirEnlace("whatsapp")}>
          WhatsApp
        </BotonRed>
        <BotonRed red="x" onClick={() => compartirEnlace("x")}>
          X
        </BotonRed>
        <BotonRed red="telegram" onClick={() => compartirEnlace("telegram")}>
          Telegram
        </BotonRed>
        <BotonRed red="copiar" onClick={() => void copiarEnlace()}>
          Copiar
        </BotonRed>
      </div>

      <div className="my-4 h-px w-full bg-white/20" />

      {/* Recuerdo (imagen / PDF / Instagram) */}
      <p className="text-xs font-semibold text-emerald-100">
        Comparte el recuerdo (imagen o PDF):
      </p>
      <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
        <BotonRecuerdo
          onClick={() => void compartirImagen()}
          ocupado={ocupado === "imagen"}
          textoOcupado="Preparando imagen…"
          icono="imagen"
        >
          Imagen
        </BotonRecuerdo>
        <BotonRecuerdo
          onClick={() => void compartirPdf()}
          ocupado={ocupado === "pdf"}
          textoOcupado="Preparando PDF…"
          icono="documento"
        >
          PDF
        </BotonRecuerdo>
        <BotonRecuerdo
          onClick={() => void compartirImagen()}
          ocupado={ocupado === "imagen"}
          textoOcupado="Preparando…"
          icono="instagram"
          destacado
        >
          Instagram
        </BotonRecuerdo>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs">
        <button
          type="button"
          onClick={() => void descargarImagen()}
          disabled={ocupado === "descargar-imagen"}
          className="font-semibold text-emerald-100 underline underline-offset-2 transition hover:text-white disabled:opacity-60"
        >
          {ocupado === "descargar-imagen" ? "Descargando…" : "Descargar imagen"}
        </button>
        <button
          type="button"
          onClick={() => void descargarPdf()}
          disabled={ocupado === "descargar-pdf"}
          className="font-semibold text-emerald-100 underline underline-offset-2 transition hover:text-white disabled:opacity-60"
        >
          {ocupado === "descargar-pdf" ? "Descargando…" : "Descargar PDF"}
        </button>
      </div>

      {mensaje && (
        <p className="mx-auto mt-3 max-w-md text-center text-xs text-emerald-100">
          {mensaje}
        </p>
      )}
    </div>
  );
}

/** Botón de red social para compartir el enlace de la página. */
function BotonRed({
  red,
  onClick,
  children,
}: {
  red: "facebook" | "whatsapp" | "x" | "telegram" | "copiar";
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex h-10 items-center gap-2 rounded-full bg-white/15 px-4 text-xs font-bold text-white transition hover:bg-white/25 active:scale-95"
    >
      <IconoRed red={red} className="size-4" />
      {children}
    </button>
  );
}

/** Botón claro para compartir/descargar el recuerdo. */
function BotonRecuerdo({
  onClick,
  ocupado,
  textoOcupado,
  icono,
  destacado = false,
  children,
}: {
  onClick: () => void;
  ocupado: boolean;
  textoOcupado: string;
  icono: "imagen" | "documento" | "instagram";
  destacado?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={ocupado}
      className={
        destacado
          ? "inline-flex h-11 items-center justify-center gap-2 rounded-full bg-gradient-to-r from-fuchsia-500 via-rose-500 to-amber-500 px-5 text-sm font-bold text-white shadow-lg transition hover:brightness-110 active:scale-[0.98] disabled:cursor-wait disabled:opacity-70"
          : "inline-flex h-11 items-center justify-center gap-2 rounded-full bg-white px-5 text-sm font-bold text-emerald-800 shadow-lg transition hover:bg-emerald-50 active:scale-[0.98] disabled:cursor-wait disabled:opacity-70"
      }
    >
      {ocupado ? (
        <span className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
      ) : (
        <IconoRed red={icono} className="size-4" />
      )}
      {ocupado ? textoOcupado : children}
    </button>
  );
}

const TRAZADOS: Record<
  "facebook" | "whatsapp" | "x" | "telegram" | "instagram" | "copiar" | "imagen" | "documento",
  React.ReactNode
> = {
  facebook: (
    <path d="M22 12a10 10 0 1 0-11.6 9.9v-7H7.9V12h2.5V9.8c0-2.5 1.5-3.9 3.8-3.9 1.1 0 2.2.2 2.2.2v2.4h-1.2c-1.2 0-1.6.8-1.6 1.6V12h2.7l-.4 2.9h-2.3v7A10 10 0 0 0 22 12Z" />
  ),
  whatsapp: (
    <path d="M12.04 2a9.9 9.9 0 0 0-8.5 15l-1.3 4.7 4.8-1.3A9.9 9.9 0 1 0 12.04 2Zm5.8 14.1c-.2.7-1.4 1.3-2 1.4-.5.1-1.2.1-1.9-.1-.4-.1-1-.3-1.8-.6-3.1-1.3-5.1-4.4-5.3-4.6-.1-.2-1.2-1.6-1.2-3.1 0-1.5.8-2.2 1.1-2.5.3-.3.6-.4.8-.4h.6c.2 0 .4 0 .6.5.2.5.7 1.8.8 1.9.1.1.1.3 0 .5-.1.2-.2.3-.3.5l-.4.5c-.1.1-.3.3-.1.5.1.3.6 1 1.3 1.6.9.8 1.6 1 1.9 1.2.2.1.4.1.5-.1.2-.2.6-.7.7-.9.2-.2.3-.2.5-.1.2.1 1.5.7 1.7.8.3.1.4.2.5.3.1.2.1.7-.1 1.4Z" />
  ),
  x: (
    <path d="M18.9 2H22l-7 8 8.2 12h-6.4l-5-7.3L5.9 22H2.8l7.5-8.6L2.4 2h6.6l4.5 6.6L18.9 2Zm-1.1 18h1.7L7.3 3.8H5.5L17.8 20Z" />
  ),
  telegram: (
    <path d="M21.9 4.3 18.6 20c-.2 1-.9 1.3-1.8.8l-4.9-3.6-2.4 2.3c-.3.3-.5.5-1 .5l.3-5 9.1-8.2c.4-.3-.1-.5-.6-.2L6.4 13.4 1.5 12c-1-.3-1-1 .2-1.5l19-7.3c.9-.3 1.6.2 1.2 1.1Z" />
  ),
  instagram: (
    <path d="M12 2.2c3.2 0 3.6 0 4.9.1 1.2.1 1.8.3 2.2.4.6.2 1 .5 1.4.9.4.4.7.8.9 1.4.2.4.3 1 .4 2.2.1 1.3.1 1.7.1 4.9s0 3.6-.1 4.9c-.1 1.2-.3 1.8-.4 2.2-.2.6-.5 1-.9 1.4-.4.4-.8.7-1.4.9-.4.2-1 .3-2.2.4-1.3.1-1.7.1-4.9.1s-3.6 0-4.9-.1c-1.2-.1-1.8-.3-2.2-.4-.6-.2-1-.5-1.4-.9-.4-.4-.7-.8-.9-1.4-.2-.4-.3-1-.4-2.2C2.2 15.6 2.2 15.2 2.2 12s0-3.6.1-4.9c.1-1.2.3-1.8.4-2.2.2-.6.5-1 .9-1.4.4-.4.8-.7 1.4-.9.4-.2 1-.3 2.2-.4C8.4 2.2 8.8 2.2 12 2.2Zm0 3.2a6.6 6.6 0 1 0 0 13.2 6.6 6.6 0 0 0 0-13.2Zm0 10.9a4.3 4.3 0 1 1 0-8.6 4.3 4.3 0 0 1 0 8.6Zm6.8-11.1a1.5 1.5 0 1 1-3.1 0 1.5 1.5 0 0 1 3.1 0Z" />
  ),
  copiar: (
    <>
      <path d="M9 9h10v11H9z" />
      <path d="M5 15V4h11" />
    </>
  ),
  imagen: (
    <>
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <circle cx="9" cy="9" r="2" />
      <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
    </>
  ),
  documento: (
    <>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" />
      <path d="M14 2v6h6" />
      <path d="M9 13h6M9 17h6" />
    </>
  ),
};

/** Iconos de marca (relleno) para los botones de compartir. */
function IconoRed({
  red,
  className = "size-4",
}: {
  red: keyof typeof TRAZADOS;
  className?: string;
}) {
  const relleno = red !== "copiar" && red !== "imagen" && red !== "documento";
  return (
    <svg
      viewBox="0 0 24 24"
      fill={relleno ? "currentColor" : "none"}
      stroke={relleno ? "none" : "currentColor"}
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {TRAZADOS[red]}
    </svg>
  );
}
