/**
 * Servicio de puntos de interés geolocalizados del lado del navegador.
 * El frontend se comunica SOLO con la API del backend.
 */
import { entorno } from "@/config/entorno";
import { obtenerTokenNavegador } from "@/servicios/autenticacion";
import { subirImagen } from "@/servicios/archivos";
import type { DatosPunto, PuntoInteres, RespuestaApi } from "@/tipos";

export { subirImagen };

/** Lista los puntos del lugar autenticado. */
export async function listarMisPuntos(): Promise<PuntoInteres[]> {
  const token = obtenerTokenNavegador();
  if (!token) throw new Error("No hay una sesión activa.");

  const respuesta = await fetch(`${entorno.apiUrl}/puntos`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });

  const cuerpo = (await respuesta
    .json()
    .catch(() => null)) as RespuestaApi<PuntoInteres[]> | null;

  if (!respuesta.ok || !cuerpo?.exito) {
    throw new Error(cuerpo?.mensaje ?? "No se pudieron listar los puntos.");
  }

  return cuerpo.datos ?? [];
}

/** Crea un punto para el lugar autenticado. */
export async function crearPunto(datos: DatosPunto): Promise<PuntoInteres> {
  const token = obtenerTokenNavegador();
  if (!token) throw new Error("No hay una sesión activa.");

  const respuesta = await fetch(`${entorno.apiUrl}/puntos`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(datos),
  });

  const cuerpo = (await respuesta
    .json()
    .catch(() => null)) as RespuestaApi<PuntoInteres> | null;

  if (!respuesta.ok || !cuerpo?.exito || !cuerpo.datos) {
    throw new Error(cuerpo?.mensaje ?? "No se pudo crear el punto.");
  }

  return cuerpo.datos;
}

/** Actualiza un punto propio del lugar autenticado. */
export async function actualizarPunto(
  id: string,
  datos: DatosPunto
): Promise<PuntoInteres> {
  const token = obtenerTokenNavegador();
  if (!token) throw new Error("No hay una sesión activa.");

  const respuesta = await fetch(`${entorno.apiUrl}/puntos/${id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(datos),
  });

  const cuerpo = (await respuesta
    .json()
    .catch(() => null)) as RespuestaApi<PuntoInteres> | null;

  if (!respuesta.ok || !cuerpo?.exito || !cuerpo.datos) {
    throw new Error(cuerpo?.mensaje ?? "No se pudo actualizar el punto.");
  }

  return cuerpo.datos;
}

/** Elimina un punto propio del lugar autenticado. */
export async function eliminarPunto(id: string): Promise<void> {
  const token = obtenerTokenNavegador();
  if (!token) throw new Error("No hay una sesión activa.");

  const respuesta = await fetch(`${entorno.apiUrl}/puntos/${id}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });

  const cuerpo = (await respuesta
    .json()
    .catch(() => null)) as RespuestaApi<unknown> | null;

  if (!respuesta.ok || !cuerpo?.exito) {
    throw new Error(cuerpo?.mensaje ?? "No se pudo eliminar el punto.");
  }
}
