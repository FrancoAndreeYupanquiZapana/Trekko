import Constants from "expo-constants";
import { Platform } from "react-native";

/**
 * URL base de la API de Trekko.
 *
 * 1. PRODUCCIÓN: define `EXPO_PUBLIC_API_URL` en un archivo `.env` (o en las
 *    variables de EAS Build). Ejemplo: EXPO_PUBLIC_API_URL=https://trekko-api.com/api
 * 2. DESARROLLO con celular físico: Expo Go conoce el host de Metro (hostUri),
 *    que es la IP de tu PC en la red local → se usa solo.
 * 3. Emulador de Android / web local: fallbacks fijos.
 */
function obtenerHostApi(): string {
  const hostUri = Constants.expoConfig?.hostUri;
  if (hostUri) {
    return hostUri.split(":")[0];
  }
  // Emulador de Android accede a tu PC mediante 10.0.2.2.
  if (Platform.OS === "android") return "10.0.2.2";
  return "localhost";
}

export const URL_API =
  process.env.EXPO_PUBLIC_API_URL ?? `http://${obtenerHostApi()}:4000/api`;