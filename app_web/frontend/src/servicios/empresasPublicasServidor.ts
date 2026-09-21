import "server-only";
import { cache } from "react";
import { entorno } from "@/config/entorno";
import type { DetalleLugarPublico, PerfilEmpresa, RespuestaApi } from "@/tipos";

/**
 * Capa de acceso a datos públicos de empresas (lado servidor).
 * Se usa para renderizar el catálogo del home y las páginas /lugar/:id.
 */

async function pedir<T>(ruta: string): Promise<T | null> {
  try {
    const respuesta = await fetch(`${entorno.apiUrl}${ruta}`, {
      cache: "no-store",
    });

    const cuerpo = (await respuesta
      .json()
      .catch(() => null)) as RespuestaApi<T> | null;

    return respuesta.ok && cuerpo?.exito ? (cuerpo.datos ?? null) : null;
  } catch {
    return null;
  }
}

/** Lista las empresas registradas para el catálogo del home. */
export const listarEmpresasServidor = cache(
  async (): Promise<PerfilEmpresa[]> => {
    const datos = await pedir<PerfilEmpresa[]>("/empresas");
    return datos ?? [];
  }
);

/** Obtiene el lugar completo (perfil + especies) para la página pública. */
export const obtenerEmpresaPublicaServidor = cache(
  async (id: string): Promise<DetalleLugarPublico | null> =>
    pedir<DetalleLugarPublico>(`/empresas/${encodeURIComponent(id)}`)
);