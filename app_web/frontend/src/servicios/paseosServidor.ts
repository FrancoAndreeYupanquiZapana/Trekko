import "server-only";
import { cache } from "react";
import { entorno } from "@/config/entorno";
import type { Paseo, RespuestaApi } from "@/tipos";

/**
 * Capa de acceso a datos públicos de paseos (lado servidor).
 * Renderiza el muro /paseos y la página reutilizable /paseo/:dni.
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

/** Paseos recientes publicados por los turistas (muro público). */
export const listarPaseosServidor = cache(async (): Promise<Paseo[]> => {
  const datos = await pedir<Paseo[]>("/paseos");
  return datos ?? [];
});

/** Todos los paseos de un DNI (página "El viaje de X en Y"). */
export const obtenerPaseosPorDniServidor = cache(
  async (dni: string): Promise<Paseo[]> => {
    const datos = await pedir<Paseo[]>(`/paseos/dni/${encodeURIComponent(dni)}`);
    return datos ?? [];
  }
);
