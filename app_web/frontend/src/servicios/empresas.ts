/**
 * Servicio del perfil de empresa del lado del navegador.
 * El frontend se comunica SOLO con la API del backend (nada de Supabase).
 */
import { entorno } from "@/config/entorno";
import { obtenerTokenNavegador } from "@/servicios/autenticacion";
import type { DatosPerfilEmpresa, PerfilEmpresa, RespuestaApi } from "@/tipos";

/** Obtiene el perfil de la agencia autenticada (null si aún no existe). */
export async function obtenerMiPerfil(): Promise<PerfilEmpresa | null> {
  const token = obtenerTokenNavegador();
  if (!token) return null;

  const respuesta = await fetch(`${entorno.apiUrl}/empresas/mi-perfil`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });

  const cuerpo = (await respuesta
    .json()
    .catch(() => null)) as RespuestaApi<PerfilEmpresa | null> | null;

  if (!respuesta.ok || !cuerpo?.exito) {
    throw new Error(cuerpo?.mensaje ?? "No se pudo consultar el perfil.");
  }

  return cuerpo.datos ?? null;
}

/** Crea o actualiza el perfil de la agencia autenticada. */
export async function guardarMiPerfil(
  datos: DatosPerfilEmpresa
): Promise<PerfilEmpresa> {
  const token = obtenerTokenNavegador();
  if (!token) throw new Error("No hay una sesión activa.");

  const respuesta = await fetch(`${entorno.apiUrl}/empresas/mi-perfil`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(datos),
  });

  const cuerpo = (await respuesta
    .json()
    .catch(() => null)) as RespuestaApi<PerfilEmpresa> | null;

  if (!respuesta.ok || !cuerpo?.exito || !cuerpo.datos) {
    throw new Error(cuerpo?.mensaje ?? "No se pudo guardar el perfil.");
  }

  return cuerpo.datos;
}