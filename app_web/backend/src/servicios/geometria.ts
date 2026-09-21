/**
 * Utilidades geométricas GPS, sin dependencias.
 * Se usan para VALIDAR que una foto (lat/lng) pertenece al recorrido del
 * turista (zona): la geometría se verifica con matemática pura, no con IA.
 */

const RADIO_TIERRA_M = 6371000;

function aRadianes(grados: number): number {
  return (grados * Math.PI) / 180;
}

/** Distancia en metros entre dos puntos (Haversine). */
export function distanciaMetros(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number }
): number {
  const dLat = aRadianes(b.lat - a.lat);
  const dLng = aRadianes(b.lng - a.lng);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(aRadianes(a.lat)) * Math.cos(aRadianes(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * RADIO_TIERRA_M * Math.asin(Math.sqrt(s));
}

/**
 * Distancia mínima en metros de un punto a la línea del recorrido.
 * Devuelve null si el track está vacío (no se puede validar).
 */
export function distanciaMinimaATrack(
  punto: { lat: number; lng: number },
  track: { lat: number; lng: number }[]
): number | null {
  if (track.length === 0) return null;
  let minima = Infinity;
  for (const t of track) {
    minima = Math.min(minima, distanciaMetros(punto, t));
    if (minima === 0) break;
  }
  return minima;
}

/**
 * Radio (en metros) dentro del cual la foto se considera "dentro del
 * recorrido/zona". 250 m cubre desvíos cortos del sendero y la mayoría de
 * zonas turísticas sin ser demasiado permisivo.
 */
export const RADIO_ZONA_M = 250;