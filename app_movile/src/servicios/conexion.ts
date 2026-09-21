import { URL_API } from "@/constantes/ambiente";

/**
 * Comprobación REAL de conexión.
 *
 * `expo-network` en Android puede devolver "conectado" aunque no haya
 * internet de verdad (p. ej. una red Wi-Fi sin salida o un portal cautivo).
 * Por eso hacemos peticiones reales con timeout.
 *
 * 1. Primero probamos NUESTRA API (`/salud`): es lo que de verdad importa
 *    para descargar lugares y subir la galería.
 * 2. Si la API no responde, probamos un endpoint liviano y neutro de Google
 *    (por si el servidor está caído pero sí hay red). Basta con que uno de
 *    los dos responda para considerar que hay conexión.
 */
async function responde(url: string, timeoutMs: number): Promise<boolean> {
  const control = new AbortController();
  const temporizador = setTimeout(() => control.abort(), timeoutMs);
  try {
    const respuesta = await fetch(url, {
      signal: control.signal,
      cache: "no-store",
    });
    return respuesta.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(temporizador);
  }
}

export async function hayInternet(timeoutMs = 4000): Promise<boolean> {
  if (await responde(`${URL_API}/salud`, timeoutMs)) return true;
  return responde("https://www.gstatic.com/generate_204", timeoutMs);
}
