import Link from "next/link";
import { listarEmpresasServidor } from "@/servicios/empresasPublicasServidor";
import type { PerfilEmpresa } from "@/tipos";
import { Icono } from "@/componentes/ui/Icono";

/**
 * Tarjeta del catálogo público: logo, nombre y datos de la agencia.
 * Cada empresa enlaza a su página pública /lugar/:id.
 */
function TarjetaLugar({ empresa }: { empresa: PerfilEmpresa }) {
  return (
    <Link
      href={`/lugar/${empresa.id}`}
      className="group flex flex-col rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
    >
      <div className="flex items-start gap-4">
        {empresa.logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={empresa.logoUrl}
            alt={`Logo de ${empresa.nombre}`}
            className="size-16 shrink-0 rounded-xl border border-zinc-200 bg-zinc-50 object-cover"
          />
        ) : (
          <span
            aria-hidden="true"
            className="flex size-16 shrink-0 items-center justify-center rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-600"
          >
            <Icono tipo="edificio" className="size-8" />
          </span>
        )}
        <div className="min-w-0">
          <h3 className="font-semibold leading-tight text-zinc-900 group-hover:text-emerald-700">
            {empresa.nombre}
          </h3>
          {empresa.ubicacion && (
            <p className="mt-0.5 flex items-center gap-1 text-xs text-zinc-500">
              <Icono tipo="ubicacion" className="size-3.5" />
              {empresa.ubicacion}
            </p>
          )}
        </div>
      </div>

      {empresa.descripcion && (
        <p className="mt-4 line-clamp-2 text-sm leading-relaxed text-zinc-600">
          {empresa.descripcion}
        </p>
      )}

      <div className="mt-4 flex w-full items-center justify-between border-t border-zinc-100 pt-3 text-sm">
        <span className="font-medium text-emerald-700">
          Ver lugar →
        </span>
        <span className="flex items-center gap-1 text-xs text-zinc-400">
          <Icono tipo="descarga" className="size-3.5" />
          descargable
        </span>
      </div>
    </Link>
  );
}

const caracteristicas = [
  {
    icono: "descarga",
    titulo: "Contenido descargable",
    descripcion:
      "Descarga destinos completos y úsalos sin conexión, incluso en lo más profundo de la selva.",
  },
  {
    icono: "ruta",
    titulo: "Rutas georreferenciadas",
    descripcion:
      "Sigue rutas con GPS, marca puntos de interés y registra cada paso de tu recorrido.",
  },
  {
    icono: "camara",
    titulo: "Flora y fauna",
    descripcion:
      "Toma fotografías georreferenciadas y contribuye a un mapa de observaciones.",
  },
  {
    icono: "campamento",
    titulo: "Para agencias",
    descripcion:
      "Publica tus destinos, especies y rutas, y recibe a más exploradores.",
  },
] as const;

/** Página de inicio (acceso público). */
export default async function PaginaInicio() {
  const empresas = await listarEmpresasServidor();

  return (
    <>
      <section className="bg-gradient-to-b from-emerald-600 to-emerald-800 text-white">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-6 px-4 py-24 text-center sm:px-6">
          <span className="rounded-full bg-white/15 px-4 py-1.5 text-sm font-medium">
            Explora la Amazonía, incluso sin conexión
          </span>
          <h1 className="max-w-3xl text-4xl font-bold leading-tight sm:text-5xl">
            Vive la naturaleza con{" "}
            <span className="text-emerald-200">Trekko</span>
          </h1>
          <p className="max-w-2xl text-lg text-emerald-100">
            Destinos turísticos, rutas georreferenciadas y observaciones de
            flora y fauna — todo al alcance de tu mano.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/registro"
              className="inline-flex h-12 items-center justify-center rounded-lg bg-white px-6 text-sm font-semibold text-emerald-800 transition-colors hover:bg-emerald-50"
            >
              Crear cuenta
            </Link>
            <Link
              href="/iniciar-sesion"
              className="inline-flex h-12 items-center justify-center rounded-lg border border-white/40 px-6 text-sm font-semibold text-white transition-colors hover:bg-white/10"
            >
              Iniciar sesión
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <h2 className="text-center text-3xl font-bold">Lugares y agencias</h2>
        <p className="mt-2 text-center text-zinc-500">
          Cada lugar publica su información y puede descargarse para viajar
          sin conexión.
        </p>

        {empresas.length > 0 ? (
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {empresas.map((empresa) => (
              <TarjetaLugar key={empresa.id} empresa={empresa} />
            ))}
          </div>
        ) : (
          <div className="mt-10 rounded-2xl border border-dashed border-zinc-300 bg-white p-10 text-center">
            <Icono tipo="montana" className="mx-auto size-12 text-zinc-300" />
            <h3 className="mt-3 text-lg font-semibold text-zinc-700">
              Aún no hay lugares registrados
            </h3>
            <p className="mx-auto mt-1 max-w-md text-sm text-zinc-500">
              ¿Eres una agencia o lugar turístico? Crea tu cuenta y publica tu
              destino para que los visitantes puedan descargarlo.
            </p>
            <Link
              href="/registro"
              className="mt-5 inline-flex h-11 items-center justify-center rounded-lg bg-emerald-600 px-5 text-sm font-semibold text-white transition-colors hover:bg-emerald-700"
            >
              Registrar mi lugar
            </Link>
          </div>
        )}
      </section>

      <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <h2 className="mb-10 text-center text-3xl font-bold">
          ¿Por qué Trekko?
        </h2>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {caracteristicas.map((caracteristica) => (
            <article
              key={caracteristica.titulo}
              className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm"
            >
              <Icono
                tipo={caracteristica.icono}
                className="size-8 text-emerald-600"
              />
              <h3 className="mt-3 text-lg font-semibold">
                {caracteristica.titulo}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-zinc-600">
                {caracteristica.descripcion}
              </p>
            </article>
          ))}
        </div>
      </section>
    </>
  );
}