import { URL_API } from "@/constantes/ambiente";

/**
 * Envuelve fetch contra la API de Trekko y devuelve los `datos` ya tipados.
 * La API responde siempre { exito, mensaje, datos }.
 */
export async function pedirApi<T>(ruta: string): Promise<T> {
  const respuesta = await fetch(`${URL_API}${ruta}`);
  if (!respuesta.ok) {
    throw new Error(`La API respondió ${respuesta.status} en ${ruta}`);
  }
  const cuerpo = (await respuesta.json()) as {
    exito: boolean;
    mensaje?: string;
    datos: T;
  };
  if (!cuerpo.exito) {
    throw new Error(cuerpo.mensaje ?? "La API rechazó la petición.");
  }
  return cuerpo.datos;
}

/**
 * Envía un `FormData` (multipart) a la API y devuelve los `datos` ya tipados.
 * Se usa para subir las fotos de la galería junto con su track GPS.
 * No se fija `Content-Type`: fetch agrega el boundary de multipart solo.
 */
export async function enviarFormData<T>(
  ruta: string,
  datos: FormData,
  timeoutMs = 45000
): Promise<T> {
  // Sin timeout, una red que "traga" la petición deja el botón de subir
  // girando para siempre. Si se pasa el tiempo, abortamos y se reintenta.
  const control = new AbortController();
  const temporizador = setTimeout(() => control.abort(), timeoutMs);

  let respuesta: Response;
  try {
    respuesta = await fetch(`${URL_API}${ruta}`, {
      method: "POST",
      body: datos,
      signal: control.signal,
    });
  } finally {
    clearTimeout(temporizador);
  }

  const cuerpo = (await respuesta.json().catch(() => null)) as {
    exito: boolean;
    mensaje?: string;
    datos: T;
  } | null;

  if (!respuesta.ok || !cuerpo?.exito) {
    throw new Error(
      cuerpo?.mensaje ?? `La API respondió ${respuesta.status} en ${ruta}`
    );
  }
  return cuerpo.datos;
}