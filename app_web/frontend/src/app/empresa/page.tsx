import type { Metadata } from "next";
import Link from "next/link";
import { verificarSesion } from "@/servicios/autenticacionServidor";
import { EncabezadoPortal } from "@/componentes/layout/EncabezadoPortal";
import { NavegacionEmpresa } from "@/componentes/empresa/NavegacionEmpresa";
import { Icono, type TipoIcono } from "@/componentes/ui/Icono";

export const metadata: Metadata = {
  title: "Panel de empresa",
  description: "Portal de la agencia: publica destinos, rutas y especies.",
};

/**
 * Métricas de ejemplo del dashboard de la empresa (MVP).
 * Según la planificación, la agencia verá el rendimiento de "Mi destino".
 */
const metricas = [
  { etiqueta: "Visitantes", valor: "1,243", icono: "personas" },
  { etiqueta: "Recorridos", valor: "832", icono: "ruta" },
  { etiqueta: "Fotografías", valor: "564", icono: "camara" },
  { etiqueta: "Especies observadas", valor: "23", icono: "hoja" },
] as const;

/** Tarjeta de un módulo del portal de la agencia. */
interface Modulo {
  icono: TipoIcono;
  titulo: string;
  descripcion: string;
  /** Ruta del módulo si ya está implementado. */
  href?: string;
  /** Módulo previsto para una fase posterior del MVP. */
  proximamente?: boolean;
}

/** Módulos del portal de empresa previstos para el MVP (planificación Fase 1). */
const modulos: Modulo[] = [
  {
    icono: "ubicacion",
    titulo: "Puntos de interés",
    descripcion:
      "Marca puntos en el mapa y muéstrales un afiche, una especie o una advertencia cuando pasen cerca.",
    href: "/empresa/puntos",
  },
  {
    icono: "hoja",
    titulo: "Agregar especies",
    descripcion: "Registra la flora y fauna disponibles en tu destino.",
    href: "/empresa/especies",
  },
  {
    icono: "ruta",
    titulo: "Crear ruta",
    descripcion: "Diseña los recorridos con sus puntos de inicio y fin.",
    proximamente: true,
  },
  {
    icono: "documento",
    titulo: "Subir afiches",
    descripcion:
      "Sube los afiches informativos de tus senderos: reglas, seguridad y especies protegidas.",
    href: "/empresa/afiches",
  },
  {
    icono: "ayuda",
    titulo: "Preguntas frecuentes",
    descripcion: "Resuelve las dudas más comunes de tus visitantes.",
    proximamente: true,
  },
  {
    icono: "libro",
    titulo: "Relatos locales",
    descripcion:
      "Publica mitos, leyendas, datos curiosos y simbiosis que solo conocen ustedes.",
    href: "/empresa/relatos",
  },
];

/** Portal de la agencia. Solo accesible con sesión de rol EMPRESA. */
export default async function PaginaPanelEmpresa() {
  const usuario = await verificarSesion("EMPRESA");

  return (
    <div className="min-h-screen bg-zinc-100">
      <EncabezadoPortal etiquetaRol="EMPRESA" usuario={usuario} />

      <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <h1 className="text-2xl font-bold">Mi destino</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Resumen del rendimiento de tu destino turístico.
        </p>

        <NavegacionEmpresa paginaActiva="panel" />

        <section className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {metricas.map((metrica) => (
            <article
              key={metrica.etiqueta}
              className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm"
            >
              <Icono tipo={metrica.icono} className="size-7 text-emerald-600" />
              <p className="mt-2 text-2xl font-bold">{metrica.valor}</p>
              <p className="text-sm text-zinc-500">{metrica.etiqueta}</p>
            </article>
          ))}
        </section>

        <section className="mt-8 rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold">Empieza a publicar</h2>
          <p className="mt-1 text-sm text-zinc-500">
            Módulos del portal de la agencia (MVP según el plan).
          </p>
          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {modulos.map((modulo) => {
              const contenido = (
                <>
                  <div className="flex items-center justify-between">
                    <Icono tipo={modulo.icono} className="size-6 text-emerald-600" />
                    {modulo.proximamente && (
                      <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
                        Próximo
                      </span>
                    )}
                  </div>
                  <h3 className="mt-2 text-sm font-semibold">{modulo.titulo}</h3>
                  <p className="mt-1 text-xs leading-relaxed text-zinc-500">
                    {modulo.descripcion}
                  </p>
                </>
              );

              const estilos =
                "rounded-xl border border-zinc-200 bg-zinc-50 p-4 transition-colors";

              return modulo.href ? (
                <Link
                  key={modulo.titulo}
                  href={modulo.href}
                  className={`${estilos} hover:border-emerald-300 hover:bg-emerald-50`}
                >
                  {contenido}
                </Link>
              ) : (
                <article key={modulo.titulo} className={estilos}>
                  {contenido}
                </article>
              );
            })}
          </div>
        </section>
      </main>
    </div>
  );
}