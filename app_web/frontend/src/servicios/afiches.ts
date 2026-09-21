/**
 * Servicio de afiches informativos (reglas, seguridad y especies protegidas)
 * del lado del navegador. El frontend se comunica SOLO con la API del backend.
 */
import { entorno } from "@/config/entorno";
import { obtenerTokenNavegador } from "@/servicios/autenticacion";
import { subirImagen } from "@/servicios/archivos";
import type { Afiche, DatosAfiche, RespuestaApi } from "@/tipos";

export { subirImagen };

/** Lista los afiches del lugar autenticado. */
export async function listarMisAfiches(): Promise<Afiche[]> {
  const token = obtenerTokenNavegador();
  if (!token) throw new Error("No hay una sesión activa.");

  const respuesta = await fetch(`${entorno.apiUrl}/afiches`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });

  const cuerpo = (await respuesta
    .json()
    .catch(() => null)) as RespuestaApi<Afiche[]> | null;

  if (!respuesta.ok || !cuerpo?.exito) {
    throw new Error(cuerpo?.mensaje ?? "No se pudieron listar los afiches.");
  }

  return cuerpo.datos ?? [];
}

/** Crea un afiche para el lugar autenticado. */
export async function crearAfiche(datos: DatosAfiche): Promise<Afiche> {
  const token = obtenerTokenNavegador();
  if (!token) throw new Error("No hay una sesión activa.");

  const respuesta = await fetch(`${entorno.apiUrl}/afiches`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(datos),
  });

  const cuerpo = (await respuesta
    .json()
    .catch(() => null)) as RespuestaApi<Afiche> | null;

  if (!respuesta.ok || !cuerpo?.exito || !cuerpo.datos) {
    throw new Error(cuerpo?.mensaje ?? "No se pudo crear el afiche.");
  }

  return cuerpo.datos;
}

/** Actualiza un afiche propio del lugar autenticado. */
export async function actualizarAfiche(
  id: string,
  datos: DatosAfiche
): Promise<Afiche> {
  const token = obtenerTokenNavegador();
  if (!token) throw new Error("No hay una sesión activa.");

  const respuesta = await fetch(`${entorno.apiUrl}/afiches/${id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(datos),
  });

  const cuerpo = (await respuesta
    .json()
    .catch(() => null)) as RespuestaApi<Afiche> | null;

  if (!respuesta.ok || !cuerpo?.exito || !cuerpo.datos) {
    throw new Error(cuerpo?.mensaje ?? "No se pudo actualizar el afiche.");
  }

  return cuerpo.datos;
}

/** Elimina un afiche propio del lugar autenticado. */
export async function eliminarAfiche(id: string): Promise<void> {
  const token = obtenerTokenNavegador();
  if (!token) throw new Error("No hay una sesión activa.");

  const respuesta = await fetch(`${entorno.apiUrl}/afiches/${id}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });

  const cuerpo = (await respuesta
    .json()
    .catch(() => null)) as RespuestaApi<unknown> | null;

  if (!respuesta.ok || !cuerpo?.exito) {
    throw new Error(cuerpo?.mensaje ?? "No se pudo eliminar el afiche.");
  }
}