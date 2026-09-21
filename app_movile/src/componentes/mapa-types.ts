import type { PuntoRecorrido } from "@/servicios/recorridos";

/** Props compartidas del mapa de recorrido (nativo y fallback web). */
export interface MapaRecorridoProps {
  puntos: PuntoRecorrido[];
  /** Alto en px. Por defecto 220. */
  altura?: number;
  /** Modo en vivo: sigue la posición actual del usuario. */
  seguimiento?: boolean;
}