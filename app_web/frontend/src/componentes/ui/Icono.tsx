import type { ReactNode } from "react";

/**
 * Iconos SVG vectoriales de Trekko (sustituyen a los emojis).
 * Trazos finos, estilo Lucide. El color se hereda del texto (currentColor).
 */

export type TipoIcono =
  | "sendero"
  | "descarga"
  | "ruta"
  | "camara"
  | "campamento"
  | "montana"
  | "edificio"
  | "ubicacion"
  | "telefono"
  | "globo"
  | "redes"
  | "personas"
  | "hoja"
  | "brujula"
  | "pata"
  | "lupa"
  | "sincronizar"
  | "mochila"
  | "imagen"
  | "agregar"
  | "editar"
  | "eliminar"
  | "check"
  | "libro"
  | "documento"
  | "ayuda"
  | "luna"
  | "bombilla"
  | "intercambio";

const trazados: Record<TipoIcono, ReactNode> = {
  sendero: (
    <>
      <path d="m2 20 6.5-11L14 17l2.5-4.5L22 20H2Z" />
      <path d="m11 5 2.5-2 2.5 2-2.5 2L11 5Z" />
    </>
  ),
  descarga: (
    <>
      <path d="M12 3v12" />
      <path d="m8 11 4 4 4-4" />
      <path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
    </>
  ),
  ruta: (
    <>
      <circle cx="6" cy="19" r="3" />
      <path d="M9 19h8.5a3.5 3.5 0 0 0 0-7h-11a3.5 3.5 0 0 1 0-7H15" />
      <circle cx="18" cy="5" r="3" />
    </>
  ),
  camara: (
    <>
      <path d="M4 8h3l2-3h6l2 3h3v11H4V8Z" />
      <circle cx="12" cy="13" r="3.5" />
    </>
  ),
  campamento: (
    <>
      <path d="M3 20h18" />
      <path d="m4 20 8-15 8 15" />
      <path d="m9 20 3-11 3 11" />
    </>
  ),
  montana: (
    <path d="m2 20 6-10 3.5 5 2.5-3.5L22 20H2Z" />
  ),
  edificio: (
    <>
      <path d="M4 21V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v16" />
      <path d="M16 9h2a2 2 0 0 1 2 2v10" />
      <path d="M3 21h18" />
      <path d="M8 7h4M8 11h4M8 15h4" />
    </>
  ),
  ubicacion: (
    <>
      <path d="M12 21s-7-5.5-7-11a7 7 0 0 1 14 0c0 5.5-7 11-7 11Z" />
      <circle cx="12" cy="10" r="2.5" />
    </>
  ),
  telefono: (
    <path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.8 2Z" />
  ),
  globo: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18" />
      <path d="M12 3a15 15 0 0 1 0 18 15 15 0 0 1 0-18Z" />
    </>
  ),
  redes: (
    <>
      <path d="M4 9h16M4 15h16M10 3 8 21M16 3l-2 18" />
    </>
  ),
  personas: (
    <>
      <circle cx="9" cy="8" r="3.5" />
      <path d="M2.5 20a6.5 6.5 0 0 1 13 0" />
      <path d="M16 4.5a3.5 3.5 0 0 1 0 7m1 8.5a6.5 6.5 0 0 0-2.5-5" />
    </>
  ),
  hoja: (
    <>
      <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.5 19 2c1 2 2 4.2 2 8 0 5.5-4.8 10-10 10Z" />
      <path d="M2 21c0-3 1.9-5.4 5.1-6" />
    </>
  ),
  brujula: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="m15.5 8.5-2 5-5 2 2-5 5-2Z" />
    </>
  ),
  pata: (
    <>
      <ellipse cx="5.5" cy="13.5" rx="2" ry="3" />
      <ellipse cx="10.5" cy="8.5" rx="2" ry="3" />
      <ellipse cx="15.5" cy="8.5" rx="2" ry="3" />
      <ellipse cx="20.5" cy="13.5" rx="2" ry="3" />
      <rect x="8" y="12.5" width="8" height="7" rx="4" />
    </>
  ),
  lupa: (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="m21 21-4.3-4.3" />
    </>
  ),
  sincronizar: (
    <>
      <path d="M3 12a9 9 0 0 1 15-6.7L21 8" />
      <path d="M21 3v5h-5" />
      <path d="M21 12a9 9 0 0 1-15 6.7L3 16" />
      <path d="M3 21v-5h5" />
    </>
  ),
  mochila: (
    <>
      <path d="M12 4a4 4 0 0 1 4 4v1h1a3 3 0 0 1 3 3v8a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-8a3 3 0 0 1 3-3h1V8a4 4 0 0 1 4-4Z" />
      <path d="M9 8V6a3 3 0 0 1 6 0v2" />
      <path d="M8 13h8M4 18h16" />
    </>
  ),
  imagen: (
    <>
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <circle cx="9" cy="9" r="2" />
      <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
    </>
  ),
  agregar: (
    <>
      <path d="M12 5v14M5 12h14" />
    </>
  ),
  editar: (
    <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3Z" />
  ),
  eliminar: (
    <>
      <path d="M3 6h18" />
      <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
    </>
  ),
  check: (
    <path d="m4 12.5 5 5L20 6.5" />
  ),
  libro: (
    <>
      <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20" />
      <path d="M9 7h6" />
    </>
  ),
  documento: (
    <>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" />
      <path d="M14 2v6h6" />
      <path d="M9 13h6M9 17h6" />
    </>
  ),
  ayuda: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M9.5 9.5a2.5 2.5 0 1 1 4 2.1c-.9.7-1.5 1.1-1.5 2.4" />
      <path d="M12 17h.01" />
    </>
  ),
  luna: (
    <path d="M12 3a9 9 0 1 0 9 9c-4.5 1-8-2.5-9-9Z" />
  ),
  bombilla: (
    <>
      <path d="M9 18h6M10 21h4" />
      <path d="M12 3a6 6 0 0 1 4 10.5c-.7.8-.8 1.6-.8 2.5h-6.4c0-.9-.1-1.7-.8-2.5A6 6 0 0 1 12 3Z" />
    </>
  ),
  intercambio: (
    <path d="M12 12c-2-2.67-4-4-6-4a4 4 0 1 0 0 8c2 0 4-1.33 6-4Zm0 0c2 2.67 4 4 6 4a4 4 0 1 0 0-8c-2 0-4 1.33-6 4Z" />
  ),
};

interface Props {
  tipo: TipoIcono;
  /** Clases de tamaño/color (p. ej. "size-5"). */
  className?: string;
}

/** Icono SVG del sistema de Trekko. */
export function Icono({ tipo, className = "size-5" }: Props) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {trazados[tipo]}
    </svg>
  );
}