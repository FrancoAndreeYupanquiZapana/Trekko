import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { entorno } from "@/config/entorno";
import { NOMBRE_COOKIE_TOKEN } from "@/servicios/autenticacion";
import type { Relato, RespuestaApi } from "@/tipos";

/**
 * Capa de acceso a relatos del lado del servidor.
 * Lee la cookie de sesión y consulta la API del backend para precargar
 * la lista inicial al renderizar la gestión de relatos locales.
 */
export const listarMisRelatosServidor = cache(
  async (): Promise<Relato[]> => {
    const tiendaCookies = await cookies();
    const token = tiendaCookies.get(NOMBRE_COOKIE_TOKEN)?.value;
    if (!token) return [];

    try {
      const respuesta = await fetch(`${entorno.apiUrl}/relatos`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });

      const cuerpo = (await respuesta
        .json()
        .catch(() => null)) as RespuestaApi<Relato[]> | null;

      return respuesta.ok && cuerpo?.exito ? (cuerpo.datos ?? []) : [];
    } catch {
      return [];
    }
  }
);