/**
 * Servicio de relatos locales (mitos, leyendas, datos curiosos y simbiosis)
 * del lado del navegador. El frontend se comunica SOLO con la API del backend.
 */
import { entorno } from "@/config/entorno";
import { obtenerTokenNavegador } from "@/servicios/autenticacion";
import { subirImagen } from "@/servicios/archivos";
import type { DatosRelato, Relato, RespuestaApi } from "@/tipos";

export { subirImagen };

/** Lista los relatos del lugar autenticado. */
export async function listarMisRelatos(): Promise<Relato[]> {
  const token = obtenerTokenNavegador();
  if (!token) throw new Error("No hay una sesión activa.");

  const respuesta = await fetch(`${entorno.apiUrl}/relatos`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });

  const cuerpo = (await respuesta
    .json()
    .catch(() => null)) as RespuestaApi<Relato[]> | null;

  if (!respuesta.ok || !cuerpo?.exito) {
    throw new Error(cuerpo?.mensaje ?? "No se pudieron listar los relatos.");
  }

  return cuerpo.datos ?? [];
}

/** Crea un relato para el lugar autenticado. */
export async function crearRelato(datos: DatosRelato): Promise<Relato> {
  const token = obtenerTokenNavegador();
  if (!token) throw new Error("No hay una sesión activa.");

  const respuesta = await fetch(`${entorno.apiUrl}/relatos`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(datos),
  });

  const cuerpo = (await respuesta
    .json()
    .catch(() => null)) as RespuestaApi<Relato> | null;

  if (!respuesta.ok || !cuerpo?.exito || !cuerpo.datos) {
    throw new Error(cuerpo?.mensaje ?? "No se pudo crear el relato.");
  }

  return cuerpo.datos;
}

/** Actualiza un relato propio del lugar autenticado. */
export async function actualizarRelato(
  id: string,
  datos: DatosRelato
): Promise<Relato> {
  const token = obtenerTokenNavegador();
  if (!token) throw new Error("No hay una sesión activa.");

  const respuesta = await fetch(`${entorno.apiUrl}/relatos/${id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(datos),
  });

  const cuerpo = (await respuesta
    .json()
    .catch(() => null)) as RespuestaApi<Relato> | null;

  if (!respuesta.ok || !cuerpo?.exito || !cuerpo.datos) {
    throw new Error(cuerpo?.mensaje ?? "No se pudo actualizar el relato.");
  }

  return cuerpo.datos;
}

/** Elimina un relato propio del lugar autenticado. */
export async function eliminarRelato(id: string): Promise<void> {
  const token = obtenerTokenNavegador();
  if (!token) throw new Error("No hay una sesión activa.");

  const respuesta = await fetch(`${entorno.apiUrl}/relatos/${id}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });

  const cuerpo = (await respuesta
    .json()
    .catch(() => null)) as RespuestaApi<unknown> | null;

  if (!respuesta.ok || !cuerpo?.exito) {
    throw new Error(cuerpo?.mensaje ?? "No se pudo eliminar el relato.");
  }
}