import type { Metadata } from "next";
import { verificarSesion } from "@/servicios/autenticacionServidor";
import { EncabezadoPortal } from "@/componentes/layout/EncabezadoPortal";
import { Icono } from "@/componentes/ui/Icono";

export const metadata: Metadata = {
  title: "Mi Trekko",
  description: "Resumen del viajero: destinos, recorridos y observaciones.",
};

/**
 * Experiencia del turista prevista en la app móvil (React Native + Expo).
 * En el portal web se muestra el resumen y los próximos módulos del MVP.
 */
const modulos = [
  {
    icono: "lupa",
    titulo: "Explorar destinos",
    descripcion: "Buscar y descubrir destinos publicados por las agencias.",
  },
  {
    icono: "descarga",
    titulo: "Descargar offline",
    descripcion: "Guardar destinos completos para usarlos sin conexión.",
  },
  {
    icono: "ruta",
    titulo: "Recorridos con GPS",
    descripcion: "Iniciar recorridos y registrar tu posición en el camino.",
  },
  {
    icono: "camara",
    titulo: "Fotografías georreferenciadas",
    descripcion: "Tomar fotos de flora y fauna con su ubicación.",
  },
  {
    icono: "sincronizar",
    titulo: "Sincronizar",
    descripcion: "Subir tus recorridos y fotos cuando tengas conexión.",
  },
  {
    icono: "mochila",
    titulo: "Mi Trekko",
    descripcion: "Tu álbum personal: destinos, recorridos y especies vistas.",
  },
] as const;

/** Portal del turista. Solo accesible con sesión de rol TURISTA. */
export default async function PaginaPanelTurista() {
  const usuario = await verificarSesion("TURISTA");

  return (
    <div className="min-h-screen bg-zinc-100">
      <EncabezadoPortal etiquetaRol="TURISTA" usuario={usuario} />

      <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <h1 className="text-2xl font-bold">Mi Trekko</h1>
        <p className="mt-1 text-sm text-zinc-500">
          ¡Gracias por explorar la Amazonía! Aquí vivirás tus recorridos.
        </p>

        <section className="mt-8 rounded-xl border border-sky-200 bg-sky-50 p-5">
          <p className="text-sm leading-relaxed text-sky-800">
            <strong>Nota:</strong> según la planificación, la experiencia del
            turista (GPS, offline, cámara) vive en la <strong>app móvil</strong>.
            Este portal web muestra el resumen y los módulos que llegarán en el
            MVP.
          </p>
        </section>

        <section className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {modulos.map((modulo) => (
            <article
              key={modulo.titulo}
              className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm"
            >
              <Icono tipo={modulo.icono} className="size-7 text-sky-600" />
              <h3 className="mt-2 text-sm font-semibold">{modulo.titulo}</h3>
              <p className="mt-1 text-xs leading-relaxed text-zinc-500">
                {modulo.descripcion}
              </p>
            </article>
          ))}
        </section>
      </main>
    </div>
  );
}