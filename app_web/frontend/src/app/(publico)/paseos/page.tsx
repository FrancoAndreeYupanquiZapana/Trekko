import type { Metadata } from "next";
import Link from "next/link";
import { listarPaseosServidor } from "@/servicios/paseosServidor";
import type { Paseo } from "@/tipos";

export const metadata: Metadata = {
  title: "Paseos — El viaje de los exploradores",
  description:
    "Fotos, recorridos y puntos GPS de los viajeros que exploran la Amazonía con Trekko.",
};

/** Formatea una fecha ISO como "12 sep 2026". */
function formatearFecha(iso?: string): string {
  if (!iso) return "";
  const fecha = new Date(iso);
  if (Number.isNaN(fecha.getTime())) return "";
  return fecha.toLocaleDateString("es", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

/** Un viajero (agrupado por DNI) con su paseo más reciente como portada. */
interface Viajero {
  dni: string;
  nombre: string;
  lugares: string[];
  recorridos: number;
  fotos: number;
  portada?: string;
  ultimaFecha?: string;
}

/** Agrupa la lista plana de paseos por DNI. */
function agruparPorDni(paseos: Paseo[]): Viajero[] {
  const mapa = new Map<string, Viajero>();
  for (const paseo of paseos) {
    const existente = mapa.get(paseo.dni);
    if (!existente) {
      mapa.set(paseo.dni, {
        dni: paseo.dni,
        nombre: paseo.nombre,
        lugares: paseo.lugarNombre ? [paseo.lugarNombre] : [],
        recorridos: 1,
        fotos: paseo.fotos.length,
        portada: paseo.fotos[0]?.url,
        ultimaFecha: paseo.fechaExperiencia ?? paseo.creadoEn,
      });
      continue;
    }
    existente.recorridos += 1;
    existente.fotos += paseo.fotos.length;
    if (paseo.lugarNombre && !existente.lugares.includes(paseo.lugarNombre)) {
      existente.lugares.push(paseo.lugarNombre);
    }
    if (!existente.portada) existente.portada = paseo.fotos[0]?.url;
  }
  return [...mapa.values()];
}

/** Tarjeta de un viajero en el muro público. */
function TarjetaViajero({ viajero }: { viajero: Viajero }) {
  return (
    <Link
      href={`/paseo/${encodeURIComponent(viajero.dni)}`}
      className="group flex flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm transition-shadow hover:shadow-md"
    >
      {viajero.portada ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={viajero.portada}
          alt={`Recuerdo de ${viajero.nombre}`}
          className="h-44 w-full object-cover transition-transform group-hover:scale-105"
        />
      ) : (
        <div className="flex h-44 w-full items-center justify-center bg-emerald-50 text-emerald-600">
          Sin fotos
        </div>
      )}
      <div className="flex flex-1 flex-col p-5">
        <h3 className="font-semibold leading-tight text-zinc-900 group-hover:text-emerald-700">
          El viaje de {viajero.nombre}
        </h3>
        <p className="mt-0.5 text-xs text-zinc-500">
          {viajero.lugares.length > 0
            ? viajero.lugares.join(" · ")
            : "Amazonía"}
        </p>
        <div className="mt-4 flex items-center justify-between border-t border-zinc-100 pt-3 text-xs text-zinc-500">
          <span>
            {viajero.recorridos} recorrido{viajero.recorridos === 1 ? "" : "s"} ·{" "}
            {viajero.fotos} foto{viajero.fotos === 1 ? "" : "s"}
          </span>
          <span className="font-medium text-emerald-700">
            {formatearFecha(viajero.ultimaFecha)}
          </span>
        </div>
      </div>
    </Link>
  );
}

/** Muro público: las mejores fotos y recorridos de los viajeros. */
export default async function PaginaPaseos() {
  const paseos = await listarPaseosServidor();
  const viajeros = agruparPorDni(paseos);

  return (
    <>
      <section className="bg-gradient-to-b from-emerald-600 to-emerald-800 text-white">
        <div className="mx-auto max-w-6xl px-4 py-20 text-center sm:px-6">
          <h1 className="text-4xl font-bold leading-tight sm:text-5xl">
            Paseos de los exploradores
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-emerald-100">
            Las mejores fotos, el recorrido y los puntos GPS que nuestros
            viajeros compartieron desde la selva.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        {viajeros.length > 0 ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {viajeros.map((viajero) => (
              <TarjetaViajero key={viajero.dni} viajero={viajero} />
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-zinc-300 bg-white p-12 text-center">
            <h2 className="text-lg font-semibold text-zinc-700">
              Todavía no hay paseos publicados
            </h2>
            <p className="mx-auto mt-1 max-w-md text-sm text-zinc-500">
              Descarga Trekko, camina un destino y comparte tus mejores fotos:
              aparecerán aquí para que todos las vean.
            </p>
          </div>
        )}
      </section>
    </>
  );
}
