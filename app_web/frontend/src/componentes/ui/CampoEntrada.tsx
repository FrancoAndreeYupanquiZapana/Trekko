import type { ComponentProps } from "react";

interface Props extends ComponentProps<"input"> {
  etiqueta: string;
  error?: string;
}

/** Campo de entrada de formulario con etiqueta y mensaje de error. */
export function CampoEntrada({ etiqueta, error, required, ...props }: Props) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-sm font-medium text-zinc-700">
        {etiqueta}
        {required && <span className="text-red-500"> *</span>}
      </span>
      <input
        {...props}
        required={required}
        aria-invalid={Boolean(error)}
        className={`h-11 rounded-lg border bg-white px-3.5 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline focus:outline-2 focus:outline-offset-1 ${
          error
            ? "border-red-400 focus:outline-red-500"
            : "border-zinc-300 focus:outline-emerald-600"
        }`}
      />
      {error && <span className="text-xs text-red-600">{error}</span>}
    </label>
  );
}