import type { Metadata } from "next";
import { verificarSesion } from "@/servicios/autenticacionServidor";
import { EncabezadoPortal } from "@/componentes/layout/EncabezadoPortal";
import { Icono } from "@/componentes/ui/Icono";

export const metadata: Metadata = {
  title: "Panel de administración",
  description: "Resumen general del portal de administración de Trekko.",
};

const estadisticas = [
  { etiqueta: "Empresas", valor: "24", icono: "edificio" },
  { etiqueta: "Destinos", valor: "37", icono: "ubicacion" },
  { etiqueta: "Usuarios", valor: "1,842", icono: "personas" },
  { etiqueta: "Recorridos", valor: "4,291", icono: "ruta" },
  { etiqueta: "Fotografías", valor: "12,883", icono: "camara" },
] as const;

const pendientes = [
  { etiqueta: "Fotos pendientes de revisión", valor: "24", icono: "imagen" },
  { etiqueta: "Empresas pendientes", valor: "3", icono: "edificio" },
] as const;

/** Panel de administración. Solo accesible con sesión activa. */
export default async function PaginaPanelAdmin() {
  const usuario = await verificarSesion();

  return (
    <div className="min-h-screen bg-zinc-100">
      <EncabezadoPortal etiquetaRol="ADMIN" usuario={usuario} />

      <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <h1 className="text-2xl font-bold">Panel de administración</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Resumen general de la plataforma Trekko.
        </p>

        <section className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {estadisticas.map((estadistica) => (
            <article
              key={estadistica.etiqueta}
              className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm"
            >
              <span className="flex size-11 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
              <Icono tipo={estadistica.icono} className="size-6" />
            </span>
            <p className="mt-2 text-2xl font-bold">{estadistica.valor}</p>
              <p className="text-sm text-zinc-500">{estadistica.etiqueta}</p>
            </article>
          ))}
        </section>

        <section className="mt-8 grid gap-4 md:grid-cols-2">
          {pendientes.map((elemento) => (
            <article
              key={elemento.etiqueta}
              className="flex items-center gap-4 rounded-xl border border-amber-200 bg-amber-50 p-5"
            >
              <span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-700">
              <Icono tipo={elemento.icono} className="size-6" />
            </span>
              <div>
                <p className="text-xl font-bold text-amber-800">{elemento.valor}</p>
                <p className="text-sm text-amber-700">{elemento.etiqueta}</p>
              </div>
            </article>
          ))}
        </section>

        <section className="mt-8 rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold">Próximos pasos</h2>
          <ul className="mt-3 list-inside list-disc space-y-1.5 text-sm text-zinc-600">
            <li>Gestión de empresas y aprobación de registros.</li>
            <li>Administración de destinos, especies y rutas.</li>
            <li>Revisión de fotografías y reportes de los turistas.</li>
          </ul>
        </section>
      </main>
    </div>
  );
}