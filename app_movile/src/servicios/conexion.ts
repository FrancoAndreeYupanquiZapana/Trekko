/**
 * Comprobación REAL de internet.
 *
 * `expo-network` en Android puede devolver "conectado" aunque no haya
 * internet de verdad (p. ej. una red Wi-Fi sin salida). Por eso probamos un
 * endpoint liviano de Google con timeout: si responde, hay conexión real.
 */
export function hayInternet(timeoutMs = 4000): Promise<boolean> {
  return new Promise((resolve) => {
    const control = new AbortController();
    const temporizador = setTimeout(() => control.abort(), timeoutMs);
    fetch("https://www.gstatic.com/generate_204", { signal: control.signal })
      .then((respuesta) => resolve(respuesta.ok))
      .catch(() => resolve(false))
      .finally(() => clearTimeout(temporizador));
  });
}
