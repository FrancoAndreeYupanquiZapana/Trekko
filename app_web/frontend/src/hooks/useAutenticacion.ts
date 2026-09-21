"use client";

import { useEffect, useState } from "react";
import { obtenerUsuarioNavegador } from "@/servicios/autenticacion";
import type { UsuarioSesion } from "@/tipos";

interface EstadoAutenticacion {
  cargando: boolean;
  usuario: UsuarioSesion | null;
}

/**
 * Hook que expone el estado de autenticación en el navegador.
 * Consulta el usuario actual contra la API del backend.
 */
export function useAutenticacion(): EstadoAutenticacion {
  const [estado, setEstado] = useState<EstadoAutenticacion>({
    cargando: true,
    usuario: null,
  });

  useEffect(() => {
    let activo = true;

    async function cargarSesion(): Promise<void> {
      try {
        const usuario = await obtenerUsuarioNavegador();
        if (!activo) return;
        setEstado({ cargando: false, usuario });
      } catch {
        if (activo) setEstado({ cargando: false, usuario: null });
      }
    }

    void cargarSesion();

    return () => {
      activo = false;
    };
  }, []);

  return estado;
}
