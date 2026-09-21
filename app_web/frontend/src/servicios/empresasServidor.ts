import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { entorno } from "@/config/entorno";
import { NOMBRE_COOKIE_TOKEN } from "@/servicios/autenticacion";
import type { PerfilEmpresa, RespuestaApi } from "@/tipos";

/**
 * Capa de acceso a datos del perfil de empresa del lado del servidor.
 * Lee la cookie de sesión y consulta la API del backend. Se usa para
 * precargar el perfil al renderizar el formulario ("Mi perfil").
 */
export const obtenerPerfilEmpresaServidor = cache(
  async (): Promise<PerfilEmpresa | null> => {
    const tiendaCookies = await cookies();
    const token = tiendaCookies.get(NOMBRE_COOKIE_TOKEN)?.value;
    if (!token) return null;

    try {
      const respuesta = await fetch(`${entorno.apiUrl}/empresas/mi-perfil`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });

      const cuerpo = (await respuesta
        .json()
        .catch(() => null)) as RespuestaApi<PerfilEmpresa | null> | null;

      return respuesta.ok && cuerpo?.exito ? (cuerpo.datos ?? null) : null;
    } catch {
      return null;
    }
  }
);