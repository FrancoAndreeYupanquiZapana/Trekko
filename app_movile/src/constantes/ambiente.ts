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
  // En desarrollo, Metro conoce la IP de tu PC: `hostUri` (Expo CLI) o
  // `expoGoConfig.hostUri` (Expo Go). `adb reverse` puede devolver
  // "localhost", que en el celular no sirve; en ese caso usamos 10.0.2.2
  // (emulador de Android) o la IP de la red local configurada en `.env`.
  const hostUri =
    Constants.expoConfig?.hostUri ??
    Constants.expoGoConfig?.hostUri ??
    null;
  const host = hostUri?.split(":")[0]?.trim();
  const esLocal = !host || host === "localhost" || host === "127.0.0.1";

  if (esLocal && Platform.OS === "android") return "10.0.2.2";
  if (host && !esLocal) return host;
  return "localhost";
}

/**
 * Deja una URL base lista para `fetch`: agrega el esquema si falta y quita la
 * barra final. Sin esto, un valor como `mi-api.vercel.app/api` (sin `https://`)
 * hace que TODAS las peticiones fallen con "Network request failed".
 */
function normalizarUrl(valor: string): string {
  let url = valor.trim();
  if (url && !/^https?:\/\//i.test(url)) {
    url = `https://${url}`;
  }
  return url.replace(/\/+$/, "");
}

const urlConfigurada = process.env.EXPO_PUBLIC_API_URL?.trim();

export const URL_API = normalizarUrl(
  urlConfigurada && urlConfigurada.length > 0
    ? urlConfigurada
    : `http://${obtenerHostApi()}:4000/api`
);