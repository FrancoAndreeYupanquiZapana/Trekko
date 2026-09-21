"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { cerrarSesion } from "@/servicios/autenticacion";
import { Boton } from "@/componentes/ui/Boton";

interface Props {
  compacto?: boolean;
}

/** Botón que cierra la sesión y regresa al inicio de sesión. */
export function BotonCerrarSesion({ compacto = false }: Props) {
  const [cargando, setCargando] = useState(false);
  const router = useRouter();

  async function manejarCierre() {
    setCargando(true);
    try {
      await cerrarSesion();
      router.push("/iniciar-sesion");
      router.refresh();
    } catch {
      setCargando(false);
    }
  }

  return (
    <Boton
      type="button"
      variante={compacto ? "secundario" : "peligro"}
      cargando={cargando}
      onClick={manejarCierre}
    >
      Cerrar sesión
    </Boton>
  );
}