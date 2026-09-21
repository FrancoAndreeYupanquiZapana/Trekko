import { BotonCerrarSesion } from "@/componentes/autenticacion/BotonCerrarSesion";
import type { UsuarioSesion } from "@/tipos";

interface Props {
  /** Texto de la insignia del rol (ADMIN, EMPRESA, TURISTA). */
  etiquetaRol: string;
  /** Usuario autenticado que se muestra en el encabezado. */
  usuario: Pick<UsuarioSesion, "nombre" | "apellido" | "email">;
}

/** Encabezado común de los portales protegidos (admin, empresa y turista). */
export function EncabezadoPortal({ etiquetaRol, usuario }: Props) {
  return (
    <header className="border-b border-zinc-200 bg-white">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <div className="flex items-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo.png"
            alt="Trekko"
            className="size-10 rounded-full border border-zinc-200 bg-white object-cover shadow-sm"
          />
          <span className="text-lg font-bold text-emerald-700">Trekko</span>
          <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
            {etiquetaRol}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden text-right sm:block">
            <p className="text-sm font-semibold leading-tight">
              {usuario.nombre ? `${usuario.nombre} ${usuario.apellido ?? ""}` : usuario.email}
            </p>
            <p className="text-xs text-zinc-500">{usuario.email}</p>
          </div>
          <BotonCerrarSesion compacto />
        </div>
      </div>
    </header>
  );
}