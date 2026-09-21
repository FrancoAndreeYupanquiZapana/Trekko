import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { entorno } from "@/config/entorno";
import { NOMBRE_COOKIE_TOKEN } from "@/servicios/autenticacion";
import type { Afiche, RespuestaApi } from "@/tipos";

/**
 * Capa de acceso a afiches del lado del servidor.
 * Lee la cookie de sesión y consulta la API del backend para precargar
 * la lista inicial al renderizar la gestión de afiches informativos.
 */
export const listarMisAfichesServidor = cache(
  async (): Promise<Afiche[]> => {
    const tiendaCookies = await cookies();
    const token = tiendaCookies.get(NOMBRE_COOKIE_TOKEN)?.value;
    if (!token) return [];

    try {
      const respuesta = await fetch(`${entorno.apiUrl}/afiches`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });

      const cuerpo = (await respuesta
        .json()
        .catch(() => null)) as RespuestaApi<Afiche[]> | null;

      return respuesta.ok && cuerpo?.exito ? (cuerpo.datos ?? []) : [];
    } catch {
      return [];
    }
  }
);