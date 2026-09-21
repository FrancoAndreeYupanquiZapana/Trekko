"use client";

import Link from "next/link";
import { useAutenticacion } from "@/hooks/useAutenticacion";
import { rutaInicioSegunRol } from "@/utilidades/roles";
import { BotonCerrarSesion } from "@/componentes/autenticacion/BotonCerrarSesion";

/** Barra de navegación superior de la zona pública. */
export function BarraNavegacion() {
  const { usuario, cargando } = useAutenticacion();

  return (
    <header className="sticky top-0 z-20 border-b border-zinc-200 bg-white/90 backdrop-blur">
      <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2 text-lg font-bold text-emerald-700">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo.png"
            alt="Trekko"
            className="size-10 rounded-full border border-zinc-200 bg-white object-cover shadow-sm"
          />
          Trekko
        </Link>

        <div className="flex items-center gap-3">
          <Link
            href="/paseos"
            className="rounded-lg px-3 py-2 text-sm font-medium text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-900"
          >
            Paseos
          </Link>
          {cargando ? (
            <span className="h-8 w-20 animate-pulse rounded-lg bg-zinc-100" />
          ) : usuario ? (
            <>
              <Link
                href={rutaInicioSegunRol(usuario.rol)}
                className="rounded-lg px-3 py-2 text-sm font-medium text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-900"
              >
                Panel
              </Link>
              <BotonCerrarSesion compacto />
            </>
          ) : (
            <>
              <Link
                href="/registro"
                className="rounded-lg px-3 py-2 text-sm font-medium text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-900"
              >
                Regístrate
              </Link>
              <Link
                href="/iniciar-sesion"
                className="inline-flex h-10 items-center justify-center rounded-lg bg-emerald-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-emerald-700"
              >
                Iniciar sesión
              </Link>
            </>
          )}
        </div>
      </nav>
    </header>
  );
}