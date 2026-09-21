"use client";

import { useState } from "react";
import { entorno } from "@/config/entorno";
import type { RespuestaApi } from "@/tipos";
import { Icono } from "@/componentes/ui/Icono";

interface Props {
  /** ID de la empresa cuyo paquete se descarga. */
  empresaId: string;
  /** Nombre del lugar (no acentuado) para el nombre del archivo. */
  empresaNombre: string;
}

/** Convierte el nombre a un nombre de archivo seguro (sin acentos). */
function slugificar(nombre: string): string {
  return nombre
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

/**
 * Botón "Descargar información para Trekko": obtiene el paquete JSON desde
 * la API pública y lo guarda en el dispositivo del visitante.
 */
export function BotonDescargarTrekko({ empresaId, empresaNombre }: Props) {
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function descargar() {
    setCargando(true);
    setError(null);

    try {
      const respuesta = await fetch(
        `${entorno.apiUrl}/empresas/${encodeURIComponent(empresaId)}/exportar`,
        { cache: "no-store" }
      );

      const cuerpo = (await respuesta
        .json()
        .catch(() => null)) as RespuestaApi<unknown> | null;

      if (!respuesta.ok || !cuerpo?.exito || cuerpo.datos === undefined) {
        throw new Error(cuerpo?.mensaje ?? "No se pudo generar el paquete.");
      }

      const contenido = JSON.stringify(cuerpo.datos, null, 2);
      const blob = new Blob([contenido], { type: "application/json" });
      const urlObjeto = URL.createObjectURL(blob);

      const enlace = document.createElement("a");
      enlace.href = urlObjeto;
      enlace.download = `trekko-${slugificar(empresaNombre)}.json`;
      document.body.appendChild(enlace);
      enlace.click();
      enlace.remove();
      URL.revokeObjectURL(urlObjeto);
    } catch (causa) {
      setError(
        causa instanceof Error ? causa.message : "No se pudo descargar el paquete."
      );
    } finally {
      setCargando(false);
    }
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <button
        type="button"
        onClick={descargar}
        disabled={cargando}
        className="inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-emerald-600 px-6 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {cargando && (
          <span
            aria-hidden="true"
            className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent"
          />
        )}
        <Icono tipo="descarga" className="size-5" />
        {cargando ? "Preparando paquete…" : "Descargar información para Trekko"}
      </button>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}