import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { entorno } from "@/config/entorno";
import { NOMBRE_COOKIE_TOKEN } from "@/servicios/autenticacion";
import type { RespuestaApi, UsuarioSesion } from "@/tipos";

/**
 * Capa de acceso a datos de autenticación (DAL) del lado del servidor.
 * Es la ÚNICA fuente de verdad para saber quién está autenticado en el
 * servidor. Verifica la sesión consultando la API del backend con el token
 * guardado en la cookie.
 */

async function obtenerUsuarioDesdeApi(token: string): Promise<UsuarioSesion | null> {
  const respuesta = await fetch(
    `${entorno.apiUrl}/autenticacion/sesion`,
    { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" }
  );

  const cuerpo = (await respuesta
    .json()
    .catch(() => null)) as RespuestaApi<UsuarioSesion> | null;

  return respuesta.ok && cuerpo?.exito ? (cuerpo.datos ?? null) : null;
}

/** Obtiene el usuario autenticado durante una petición (null si no hay sesión). */
export const obtenerUsuarioActual = cache(
  async (): Promise<UsuarioSesion | null> => {
    const tiendaCookies = await cookies();
    const token = tiendaCookies.get(NOMBRE_COOKIE_TOKEN)?.value;

    if (!token) return null;

    try {
      return await obtenerUsuarioDesdeApi(token);
    } catch {
      return null;
    }
  }
);

/**
 * Verifica que exista una sesión activa.
 * Si no hay sesión redirige a /iniciar-sesion. Si se exige un rol y no
 * coincide, redirige a la página principal.
 */
export async function verificarSesion(requiereRol?: string): Promise<UsuarioSesion> {
  const usuario = await obtenerUsuarioActual();

  if (!usuario) redirect("/iniciar-sesion");
  if (requiereRol && usuario.rol !== requiereRol) redirect("/");

  return usuario;
}
