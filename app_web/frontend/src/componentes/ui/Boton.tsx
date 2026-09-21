import type { ComponentProps, ReactNode } from "react";

/** Variantes visuales del botón. */
type Variante = "primario" | "secundario" | "peligro";

interface Props extends Omit<ComponentProps<"button">, "className"> {
  variante?: Variante;
  cargando?: boolean;
  className?: string;
  children: ReactNode;
}

const estilosPorVariante: Record<Variante, string> = {
  primario:
    "bg-emerald-600 text-white hover:bg-emerald-700 focus-visible:outline-emerald-600",
  secundario:
    "border border-emerald-600 text-emerald-700 hover:bg-emerald-50 focus-visible:outline-emerald-600",
  peligro:
    "bg-red-600 text-white hover:bg-red-700 focus-visible:outline-red-600",
};

/** Botón reutilizable de la aplicación con variantes de estilo. */
export function Boton({
  variante = "primario",
  cargando = false,
  disabled,
  className = "",
  children,
  ...props
}: Props) {
  return (
    <button
      {...props}
      disabled={disabled || cargando}
      className={`inline-flex h-11 items-center justify-center gap-2 rounded-lg px-5 text-sm font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-60 ${estilosPorVariante[variante]} ${className}`}
    >
      {cargando && (
        <span
          aria-hidden="true"
          className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent"
        />
      )}
      {children}
    </button>
  );
}