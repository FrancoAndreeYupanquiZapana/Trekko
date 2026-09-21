import type { TipoRelato } from "@/tipos";
import type { TipoIcono } from "@/componentes/ui/Icono";

/**
 * Etiquetas, iconos y colores por tipo de relato local.
 * Centralizados para usarlos en el portal de la agencia, el formulario
 * y la página pública del lugar sin repetir el mapeo.
 */
export const etiquetasTipoRelato: Record<TipoRelato, string> = {
  MITO: "Mito",
  LEYENDA: "Leyenda",
  DATO_CURIOSO: "Dato curioso",
  SIMBIOSIS: "Simbiosis",
};

export const iconosTipoRelato: Record<TipoRelato, TipoIcono> = {
  MITO: "luna",
  LEYENDA: "libro",
  DATO_CURIOSO: "bombilla",
  SIMBIOSIS: "intercambio",
};

export const coloresTipoRelato: Record<TipoRelato, string> = {
  MITO: "bg-purple-100 text-purple-700",
  LEYENDA: "bg-sky-100 text-sky-700",
  DATO_CURIOSO: "bg-amber-100 text-amber-700",
  SIMBIOSIS: "bg-teal-100 text-teal-700",
};

/** Orden y descripción breve de cada tipo para el selector del formulario. */
export const opcionesTipoRelato: Array<{
  valor: TipoRelato;
  descripcion: string;
}> = [
  { valor: "MITO", descripcion: "Creencia o historia tradicional del lugar" },
  { valor: "LEYENDA", descripcion: "Relato popular que se cuenta de generación en generación" },
  { valor: "DATO_CURIOSO", descripcion: "Información sorprendente de una especie o del lugar" },
  { valor: "SIMBIOSIS", descripcion: "Relación entre especies o del lugar que se apoyan entre sí" },
];