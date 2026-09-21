interface Props {
  tipo?: "error" | "exito" | "info";
  children: React.ReactNode;
}

const estilosPorTipo = {
  error: "border-red-200 bg-red-50 text-red-700",
  exito: "border-emerald-200 bg-emerald-50 text-emerald-700",
  info: "border-sky-200 bg-sky-50 text-sky-700",
} as const;

/** Alerta para mostrar mensajes informativos o de error. */
export function Alerta({ tipo = "info", children }: Props) {
  return (
    <div
      role={tipo === "error" ? "alert" : "status"}
      className={`rounded-lg border px-4 py-3 text-sm font-medium ${estilosPorTipo[tipo]}`}
    >
      {children}
    </div>
  );
}