import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CalificacionConIA } from "@/componentes/publico/CalificacionConIA";
import { DescargarRecuerdo } from "@/componentes/publico/DescargarRecuerdo";
import { MapaPaseo } from "@/componentes/publico/MapaPaseo";
import { obtenerPaseosPorDniServidor } from "@/servicios/paseosServidor";
import type { Paseo } from "@/tipos";

interface Props {
  params: Promise<{ dni: string }>;
}

/** Formatea una fecha ISO como "12 sep 2026". */
function formatearFecha(iso?: string): string {
  if (!iso) return "Fecha no registrada";
  const fecha = new Date(iso);
  if (Number.isNaN(fecha.getTime())) return "Fecha no registrada";
  return fecha.toLocaleDateString("es", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

/** Distancia aproximada del track (Haversine), en metros. */
function distancia(track: Paseo["track"]): number {
  let total = 0;
  for (let i = 1; i < track.length; i++) {
    const a = track[i - 1];
    const b = track[i];
    const R = 6371000;
    const rad = (g: number) => (g * Math.PI) / 180;
    const dLat = rad(b.lat - a.lat);
    const dLng = rad(b.lng - a.lng);
    const s =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
    total += 2 * R * Math.asin(Math.sqrt(s));
  }
  return Math.round(total);
}

/** Metadatos dinámicos con el nombre del turista. */
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { dni } = await params;
  const paseos = await obtenerPaseosPorDniServidor(dni);
  const nombre = paseos[0]?.nombre;

  return {
    title: nombre
      ? `El viaje de ${nombre} en la Amazonía`
      : `Paseo del DNI ${dni}`,
    description:
      "Fotos, recorrido y puntos GPS de un viajero en Trekko — turismo amazónico.",
  };
}

/** Tarjeta de un paseo: lugar, mapa del recorrido y mejores fotos. */
function TarjetaPaseo({ paseo, indice }: { paseo: Paseo; indice: number }) {
  const metros = distancia(paseo.track);
  const listo = paseo.creadoEn;
  const puntajesPorUrl = new Map(
    (paseo.evaluacion?.fotos ?? []).map((ev) => [ev.url, ev])
  );

  return (
    <article className="overflow-hidden rounded-3xl border border-zinc-200 bg-white shadow-sm">
      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-100 px-6 py-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-600">
            Recorrido {indice + 1}
          </p>
          <h2 className="text-xl font-bold text-zinc-900">
            📍 {paseo.lugarNombre ?? "Un lugar de la Amazonía"}
          </h2>
        </div>
        <div className="flex items-center gap-3 text-right">
          {paseo.puntajePromedio != null && (
            <span
              title="Puntaje promedio con IA"
              className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-700"
            >
              🏆 {paseo.puntajePromedio.toFixed(1)}
            </span>
          )}
          <div className="text-xs text-zinc-500">
            <p>{formatearFecha(paseo.fechaExperiencia)}</p>
            <p>
              {paseo.track.length} puntos · {metros.toLocaleString("es")} m
            </p>
          </div>
        </div>
      </header>

      <div className="px-6 py-5">
        <MapaPaseo track={paseo.track} fotos={paseo.fotos} className="h-72 w-full" />
        <p className="mt-2 text-center text-xs text-zinc-400">
          Línea = caminata · 📍 rojo = foto tomada
        </p>
      </div>

      {paseo.fotos.length > 0 && (
        <div className="grid grid-cols-2 gap-3 px-6 pb-6 sm:grid-cols-3 lg:grid-cols-5">
          {paseo.fotos.map((foto, i) => (
            <a
              key={`${paseo.id}-${i}`}
              href={foto.url}
              target="_blank"
              rel="noreferrer"
              className="group relative overflow-hidden rounded-xl border border-zinc-200 bg-zinc-50"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={foto.url}
                alt={foto.descripcion ?? `Foto ${i + 1} de ${paseo.lugarNombre ?? "el recorrido"}`}
                className="aspect-square w-full object-cover transition-transform group-hover:scale-105"
              />
              <span className="absolute left-2 top-2 flex size-6 items-center justify-center rounded-full bg-red-600 text-xs font-bold text-white shadow">
                {i + 1}
              </span>
              {puntajesPorUrl.get(foto.url)?.puntaje != null && (
                <span
                  title="Puntaje con IA (0-10)"
                  className="absolute bottom-2 right-2 rounded-full bg-amber-500 px-2 py-0.5 text-xs font-bold text-white shadow"
                >
                  ★ {puntajesPorUrl.get(foto.url)!.puntaje!.toFixed(1)}
                </span>
              )}
              {puntajesPorUrl.get(foto.url)?.enZona === false && (
                <span
                  title="Se tomó fuera del recorrido registrado"
                  className="absolute bottom-2 left-2 rounded-full bg-orange-600 px-2 py-0.5 text-xs font-bold text-white shadow"
                >
                  ⚠ fuera de zona
                </span>
              )}
            </a>
          ))}
        </div>
      )}

      {listo && (
        <p className="border-t border-zinc-100 px-6 py-3 text-right text-xs text-zinc-400">
          Publicado en Trekko
        </p>
      )}
    </article>
  );
}

/** Página pública reutilizable por DNI: acumula lugares y fechas. */
export default async function PaginaPaseo({ params }: Props) {
  const { dni } = await params;
  const paseos = await obtenerPaseosPorDniServidor(dni);

  if (paseos.length === 0) {
    notFound();
  }

  const nombre = paseos[0]?.nombre ?? "Viajero Trekko";
  const lugares = [...new Set(paseos.map((p) => p.lugarNombre).filter(Boolean))];
  const fotos = paseos.reduce((total, p) => total + p.fotos.length, 0);

  return (
    <>
      <section className="bg-gradient-to-b from-emerald-600 to-emerald-800 text-white">
        <div className="mx-auto max-w-5xl px-4 py-16 text-center sm:px-6">
          <p className="text-sm font-medium text-emerald-100">
            Página pública del viajero
          </p>
          <h1 className="mt-2 text-4xl font-bold leading-tight sm:text-5xl">
            El viaje de {nombre}
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-emerald-100">
            {lugares.length > 0
              ? `Explorando ${lugares.join(", ")} con Trekko.`
              : "Explorando la Amazonía con Trekko."}
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3 text-sm">
            <span className="rounded-full bg-white/15 px-4 py-1.5">
              {paseos.length} recorrido{paseos.length === 1 ? "" : "s"}
            </span>
            <span className="rounded-full bg-white/15 px-4 py-1.5">
              {fotos} foto{fotos === 1 ? "" : "s"}
            </span>
            {lugares.length > 0 && (
              <span className="rounded-full bg-white/15 px-4 py-1.5">
                {lugares.length} lugar{lugares.length === 1 ? "" : "es"}
              </span>
            )}
          </div>
          <DescargarRecuerdo dni={dni} />
          <CalificacionConIA paseos={paseos} />
        </div>
      </section>

      <section className="mx-auto max-w-5xl space-y-8 px-4 py-12 sm:px-6">
        {paseos.map((paseo, indice) => (
          <TarjetaPaseo key={paseo.id} paseo={paseo} indice={indice} />
        ))}

        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6 text-center">
          <p className="text-sm text-emerald-800">
            Si este viajero vuelve a otro lugar con su mismo DNI, sus nuevos
            recorridos se agregan aquí, sin borrar los anteriores.
          </p>
          <Link
            href="/paseos"
            className="mt-4 inline-flex h-11 items-center justify-center rounded-lg bg-emerald-600 px-5 text-sm font-semibold text-white transition-colors hover:bg-emerald-700"
          >
            Ver más paseos
          </Link>
        </div>
      </section>
    </>
  );
}
