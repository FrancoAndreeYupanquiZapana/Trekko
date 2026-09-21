/**
 * Servicio de especies (flora y fauna) del lado del navegador.
 * El frontend se comunica SOLO con la API del backend (nada de Supabase).
 */
import { entorno } from "@/config/entorno";
import { obtenerTokenNavegador } from "@/servicios/autenticacion";
import type { DatosEspecie, Especie, RespuestaApi } from "@/tipos";

export { subirImagen } from "@/servicios/archivos";

/** Lista las especies del lugar autenticado. */
export async function listarMisEspecies(): Promise<Especie[]> {
  const token = obtenerTokenNavegador();
  if (!token) throw new Error("No hay una sesión activa.");

  const respuesta = await fetch(`${entorno.apiUrl}/especies`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });

  const cuerpo = (await respuesta
    .json()
    .catch(() => null)) as RespuestaApi<Especie[]> | null;

  if (!respuesta.ok || !cuerpo?.exito) {
    throw new Error(cuerpo?.mensaje ?? "No se pudieron listar las especies.");
  }

  return cuerpo.datos ?? [];
}

/** Crea una especie para el lugar autenticado. */
export async function crearEspecie(datos: DatosEspecie): Promise<Especie> {
  const token = obtenerTokenNavegador();
  if (!token) throw new Error("No hay una sesión activa.");

  const respuesta = await fetch(`${entorno.apiUrl}/especies`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(datos),
  });

  const cuerpo = (await respuesta
    .json()
    .catch(() => null)) as RespuestaApi<Especie> | null;

  if (!respuesta.ok || !cuerpo?.exito || !cuerpo.datos) {
    throw new Error(cuerpo?.mensaje ?? "No se pudo crear la especie.");
  }

  return cuerpo.datos;
}

/** Actualiza una especie propia del lugar autenticado. */
export async function actualizarEspecie(
  id: string,
  datos: DatosEspecie
): Promise<Especie> {
  const token = obtenerTokenNavegador();
  if (!token) throw new Error("No hay una sesión activa.");

  const respuesta = await fetch(`${entorno.apiUrl}/especies/${id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(datos),
  });

  const cuerpo = (await respuesta
    .json()
    .catch(() => null)) as RespuestaApi<Especie> | null;

  if (!respuesta.ok || !cuerpo?.exito || !cuerpo.datos) {
    throw new Error(cuerpo?.mensaje ?? "No se pudo actualizar la especie.");
  }

  return cuerpo.datos;
}

/** Elimina una especie propia del lugar autenticado. */
export async function eliminarEspecie(id: string): Promise<void> {
  const token = obtenerTokenNavegador();
  if (!token) throw new Error("No hay una sesión activa.");

  const respuesta = await fetch(`${entorno.apiUrl}/especies/${id}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });

  const cuerpo = (await respuesta
    .json()
    .catch(() => null)) as RespuestaApi<unknown> | null;

  if (!respuesta.ok || !cuerpo?.exito) {
    throw new Error(cuerpo?.mensaje ?? "No se pudo eliminar la especie.");
  }
}