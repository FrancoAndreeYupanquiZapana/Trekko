/**
 * Mapa del recorrido.
 * Metro resuelve automáticamente `MapaRecorrido.native.tsx` en iOS/Android y
 * `MapaRecorrido.web.tsx` en web (el export estático no usa react-native-maps).
 */
export { default } from "./MapaRecorrido.native";
export type { MapaRecorridoProps } from "./mapa-types";