/**
 * Servicio de archivos del lado del navegador.
 * El frontend se comunica SOLO con la API del backend (nada de Supabase).
 */
import { entorno } from "@/config/entorno";
import { obtenerTokenNavegador } from "@/servicios/autenticacion";
import type { RespuestaApi } from "@/tipos";

/**
 * Sube una imagen a la API (multipart, campo "archivo") y devuelve su URL.
 * La URL se guarda en especies, relatos u otros contenidos para que el
 * paquete descargable la referencie sin incrustar el archivo.
 */
export async function subirImagen(archivo: File): Promise<string> {
  const token = obtenerTokenNavegador();
  if (!token) throw new Error("No hay una sesión activa.");

  const datosFormulario = new FormData();
  datosFormulario.append("archivo", archivo);

  const respuesta = await fetch(`${entorno.apiUrl}/archivos/imagen`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: datosFormulario,
  });

  const cuerpo = (await respuesta
    .json()
    .catch(() => null)) as RespuestaApi<{ url: string }> | null;

  if (!respuesta.ok || !cuerpo?.exito || !cuerpo.datos) {
    throw new Error(cuerpo?.mensaje ?? "No se pudo subir la imagen.");
  }

  return cuerpo.datos.url;
}