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
 *
 * OJO: el backend en producción corre en Vercel y su runtime rechaza archivos
 * en multipart ("unsupported FormDataPart"). La app NO usa esta función para
 * subir fotos a producción: las fotos van por URL firmada a Supabase Storage
 * y solo el JSON viaja por la API (ver paseos.ts).
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

/**
 * Envía un `POST` con cuerpo JSON a la API y devuelve los `datos` ya tipados.
 * Es el transporte para producción (Vercel): nada de multipart, solo JSON.
 */
export async function enviarJson<T>(
  ruta: string,
  cuerpo: unknown,
  timeoutMs = 45000
): Promise<T> {
  const control = new AbortController();
  const temporizador = setTimeout(() => control.abort(), timeoutMs);

  let respuesta: Response;
  try {
    respuesta = await fetch(`${URL_API}${ruta}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(cuerpo),
      signal: control.signal,
    });
  } finally {
    clearTimeout(temporizador);
  }

  const cuerpoRes = (await respuesta.json().catch(() => null)) as {
    exito: boolean;
    mensaje?: string;
    datos: T;
  } | null;

  if (!respuesta.ok || !cuerpoRes?.exito) {
    throw new Error(
      cuerpoRes?.mensaje ?? `La API respondió ${respuesta.status} en ${ruta}`
    );
  }
  return cuerpoRes.datos;
}