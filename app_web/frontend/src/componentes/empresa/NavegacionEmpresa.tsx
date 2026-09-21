import Link from "next/link";

interface Props {
  /** Página activa del portal de la agencia. */
  paginaActiva: "panel" | "perfil" | "especies" | "relatos" | "afiches";
}

const enlaces = [
  { clave: "panel", href: "/empresa", etiqueta: "Mi destino" },
  { clave: "perfil", href: "/empresa/perfil", etiqueta: "Mi perfil" },
  { clave: "especies", href: "/empresa/especies", etiqueta: "Flora y fauna" },
  { clave: "relatos", href: "/empresa/relatos", etiqueta: "Relatos locales" },
  { clave: "afiches", href: "/empresa/afiches", etiqueta: "Afiches" },
] as const;

/** Subnavegación del portal de la agencia (panel y perfil). */
export function NavegacionEmpresa({ paginaActiva }: Props) {
  return (
    <nav className="mt-6 flex gap-2 border-b border-zinc-200">
      {enlaces.map((enlace) => {
        const activo = enlace.clave === paginaActiva;
        return (
          <Link
            key={enlace.clave}
            href={enlace.href}
            aria-current={activo ? "page" : undefined}
            className={`-mb-px border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
              activo
                ? "border-emerald-600 text-emerald-700"
                : "border-transparent text-zinc-500 hover:text-zinc-800"
            }`}
          >
            {enlace.etiqueta}
          </Link>
        );
      })}
    </nav>
  );
}