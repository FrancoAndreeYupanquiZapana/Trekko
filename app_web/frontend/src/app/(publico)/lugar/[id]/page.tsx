import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { obtenerEmpresaPublicaServidor } from "@/servicios/empresasPublicasServidor";
import { BotonDescargarTrekko } from "@/componentes/publico/BotonDescargarTrekko";
import { Icono } from "@/componentes/ui/Icono";
import type { Especie, Relato } from "@/tipos";
import {
  coloresTipoRelato,
  etiquetasTipoRelato,
  iconosTipoRelato,
} from "@/utilidades/relatos";

interface Props {
  params: Promise<{ id: string }>;
}

/** Metadatos dinámicos: título con el nombre del lugar. */
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const detalle = await obtenerEmpresaPublicaServidor(id);

  return {
    title: detalle?.empresa.nombre ?? "Lugar turístico",
    description:
      detalle?.empresa.descripcion?.slice(0, 160) ??
      "Información descargable de un lugar turístico.",
  };
}

const etiquetaTipo: Record<Especie["tipo"], string> = {
  FLORA: "Flora",
  FAUNA: "Fauna",
};

/** Tarjeta de una especie para la sección de flora y fauna. */
function TarjetaEspecie({
  especie,
  relatos,
}: {
  especie: Especie;
  /** Historias locales vinculadas a esta especie. */
  relatos: Relato[];
}) {
  return (
    <article className="flex flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
      {especie.imagenUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={especie.imagenUrl}
          alt={`Foto de ${especie.nombreComun}`}
          className="h-56 w-full object-cover"
        />
      ) : (
        <div className="flex h-56 items-center justify-center bg-zinc-50 text-zinc-300">
          <Icono
            tipo={especie.tipo === "FAUNA" ? "pata" : "hoja"}
            className="size-14"
          />
        </div>
      )}

      <div className="flex flex-1 flex-col p-5">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${
              especie.tipo === "FAUNA"
                ? "bg-amber-100 text-amber-700"
                : "bg-emerald-100 text-emerald-700"
            }`}
          >
            <Icono
              tipo={especie.tipo === "FAUNA" ? "pata" : "hoja"}
              className="size-3.5"
            />
            {etiquetaTipo[especie.tipo]}
          </span>
          {especie.estadoConservacion && (
            <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-600">
              {especie.estadoConservacion}
            </span>
          )}
        </div>
        <h3 className="mt-2 font-semibold text-zinc-900">
          {especie.nombreComun}
        </h3>
        {especie.nombreCientifico && (
          <p className="text-sm italic text-zinc-500">
            {especie.nombreCientifico}
          </p>
        )}
        {especie.descripcion && (
          <div className="mt-2 h-40 overflow-y-auto rounded-lg bg-zinc-50 p-3">
            <p className="text-sm leading-relaxed text-zinc-600">
              {especie.descripcion}
            </p>
          </div>
        )}

        {relatos.length > 0 && (
          <div className="mt-3 space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
              Historias de esta especie
            </p>
            {relatos.map((relato) => (
              <div
                key={relato.id}
                className="rounded-lg border border-zinc-200 bg-zinc-50 p-3"
              >
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${coloresTipoRelato[relato.tipo]}`}
                >
                  <Icono
                    tipo={iconosTipoRelato[relato.tipo]}
                    className="size-3.5"
                  />
                  {etiquetasTipoRelato[relato.tipo]}
                </span>
                <h4 className="mt-1.5 text-sm font-semibold text-zinc-900">
                  {relato.titulo}
                </h4>
                <p className="mt-1 whitespace-pre-line text-xs leading-relaxed text-zinc-600">
                  {relato.contenido}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </article>
  );
}

/** Tarjeta de un relato local para la sección "Historias del guía". */
function TarjetaRelato({
  relato,
  especies,
}: {
  relato: Relato;
  especies: Especie[];
}) {
  return (
    <article className="flex flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
      {relato.imagenUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={relato.imagenUrl}
          alt={`Imagen de ${relato.titulo}`}
          className="h-36 w-full object-cover"
        />
      ) : (
        <div className="flex h-36 items-center justify-center bg-zinc-50 text-zinc-300">
          <Icono tipo={iconosTipoRelato[relato.tipo]} className="size-12" />
        </div>
      )}

      <div className="flex flex-1 flex-col p-4">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${coloresTipoRelato[relato.tipo]}`}
          >
            <Icono tipo={iconosTipoRelato[relato.tipo]} className="size-3.5" />
            {etiquetasTipoRelato[relato.tipo]}
          </span>
          {relato.especieId && (
            <span className="inline-flex items-center gap-1 rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-600">
              <Icono tipo="hoja" className="size-3.5 text-emerald-600" />
              {especies.find((especie) => especie.id === relato.especieId)
                ?.nombreComun ?? "Especie"}
            </span>
          )}
        </div>
        <h3 className="mt-2 font-semibold text-zinc-900">{relato.titulo}</h3>
        <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-zinc-600">
          {relato.contenido}
        </p>
      </div>
    </article>
  );
}

/**
 * Página pública de una empresa / lugar turístico.
 * Muestra el perfil, la flora y fauna registrada, y el botón para
 * descargar el paquete de datos para la app Trekko.
 */
export default async function PaginaLugar({ params }: Props) {
  const { id } = await params;
  const detalle = await obtenerEmpresaPublicaServidor(id);

  if (!detalle) notFound();
  const { empresa, especies, relatos } = detalle;

  // Relatos "libres" (sin especie vinculada o con especie inexistente):
  // los vinculados a una especie se muestran dentro de su propia tarjeta.
  const relatosLibres = relatos.filter(
    (relato) =>
      !relato.especieId ||
      !especies.some((especie) => especie.id === relato.especieId)
  );

  return (
    <div className="py-12">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
      <Link
        href="/"
        className="text-sm font-medium text-emerald-700 hover:underline"
      >
        ← Volver a lugares
      </Link>

      {/* Encabezado del lugar: logo circular centrado y nombre debajo */}
      <header className="mt-6 flex flex-col items-center text-center">
        {empresa.logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={empresa.logoUrl}
            alt={`Logo de ${empresa.nombre}`}
            className="size-40 rounded-full bg-zinc-50 object-cover shadow-md ring-4 ring-emerald-200"
          />
        ) : (
          <span
            aria-hidden="true"
            className="flex size-40 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 shadow-md ring-4 ring-emerald-200"
          >
            <Icono tipo="edificio" className="size-16" />
          </span>
        )}
        <h1 className="mt-4 text-3xl font-bold text-zinc-900">{empresa.nombre}</h1>
        {empresa.ubicacion && (
          <p className="mt-1 flex items-center gap-1.5 text-zinc-500">
            <Icono tipo="ubicacion" className="size-4" />
            {empresa.ubicacion}
          </p>
        )}
      </header>

      {empresa.descripcion && (
        <section className="mt-8 max-w-3xl">
          <h2 className="text-xl font-semibold text-zinc-900">Sobre el lugar</h2>
          <p className="mt-3 whitespace-pre-line text-base leading-relaxed text-zinc-600">
            {empresa.descripcion}
          </p>
        </section>
      )}

      {/* Contacto */}
      {(empresa.telefono || empresa.web || empresa.redesSociales) && (
        <section className="mt-8">
          <h2 className="text-lg font-semibold text-zinc-900">Contacto</h2>
          <ul className="mt-3 space-y-2 text-sm text-zinc-600">
            {empresa.telefono && (
              <li className="flex items-center gap-2">
                <Icono tipo="telefono" className="size-4 text-zinc-400" />
                {empresa.telefono}
              </li>
            )}
            {empresa.web && (
              <li className="flex items-center gap-2">
                <Icono tipo="globo" className="size-4 text-zinc-400" />
                <a
                  href={empresa.web}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-emerald-700 hover:underline"
                >
                  {empresa.web.replace(/^https?:\/\//, "")}
                </a>
              </li>
            )}
            {empresa.redesSociales && (
              <li className="flex items-start gap-2 whitespace-pre-line">
                <Icono tipo="redes" className="mt-0.5 size-4 text-zinc-400" />
                {empresa.redesSociales}
              </li>
            )}
          </ul>
        </section>
      )}
      </div>

      {/* Flora y fauna — sección a todo el ancho, tarjetas en columnas */}
      <section className="mt-10">
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 sm:px-6">
          <Icono tipo="hoja" className="size-7 text-emerald-600" />
          <h2 className="text-xl font-bold text-zinc-900">Flora y fauna</h2>
          <span className="rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-semibold text-zinc-600">
            {especies.length}
          </span>
        </div>
        {especies.length > 0 ? (
          <div className="mx-auto mt-5 grid max-w-7xl grid-cols-1 gap-6 px-4 sm:grid-cols-2 sm:px-6 lg:grid-cols-3 lg:px-10">
            {especies.map((especie) => (
              <TarjetaEspecie
                key={especie.id}
                especie={especie}
                relatos={relatos.filter(
                  (relato) => relato.especieId === especie.id
                )}
              />
            ))}
          </div>
        ) : (
          <p className="mx-auto mt-4 max-w-7xl rounded-2xl border border-dashed border-zinc-300 bg-white p-6 text-sm text-zinc-500">
            Este lugar aún no ha registrado especies. Vuelve más adelante.
          </p>
        )}
      </section>

      {/* Afiches informativos */}
      {detalle.afiches.length > 0 && (
        <section className="mt-10">
          <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 sm:px-6">
            <Icono tipo="documento" className="size-7 text-emerald-600" />
            <h2 className="text-xl font-bold text-zinc-900">
              Afiches informativos
            </h2>
            <span className="rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-semibold text-zinc-600">
              {detalle.afiches.length}
            </span>
          </div>
          <div className="mt-5 grid gap-6 px-4 sm:px-6 lg:px-10 sm:grid-cols-2 lg:grid-cols-4">
            {detalle.afiches.map((afiche) => (
              <a
                key={afiche.id}
                href={afiche.imagenUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="group overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm transition-shadow hover:shadow-md"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={afiche.imagenUrl}
                  alt={`Afiche: ${afiche.titulo}`}
                  className="aspect-[3/4] w-full bg-zinc-50 object-contain transition-transform duration-300 group-hover:scale-[1.02]"
                />
                <div className="p-4">
                  <h3 className="font-semibold text-zinc-900">{afiche.titulo}</h3>
                  {afiche.descripcion && (
                    <p className="mt-1 line-clamp-2 text-sm text-zinc-500">
                      {afiche.descripcion}
                    </p>
                  )}
                </div>
              </a>
            ))}
          </div>
        </section>
      )}

      <div className="mx-auto max-w-6xl px-4 sm:px-6">
      {/* Historias del guía: solo las que van fuera de una tarjeta de especie */}
      {relatosLibres.length > 0 && (
        <section className="mt-10">
          <div className="flex items-center gap-3">
            <Icono tipo="libro" className="size-7 text-emerald-600" />
            <h2 className="text-xl font-bold text-zinc-900">Historias del guía</h2>
            <span className="rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-semibold text-zinc-600">
              {relatosLibres.length}
            </span>
          </div>
          <p className="mt-1 text-sm text-zinc-500">
            Mitos, leyendas, datos curiosos y simbiosis contados por la gente
            del lugar.
          </p>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            {relatosLibres.map((relato) => (
              <TarjetaRelato
                key={relato.id}
                relato={relato}
                especies={especies}
              />
            ))}
          </div>
        </section>
      )}

      {/* Descarga para la app */}
      <section className="mt-10 rounded-2xl border border-emerald-200 bg-emerald-50 p-8 text-center">
        <Icono
          tipo="descarga"
          className="mx-auto size-10 text-emerald-600"
        />
        <h2 className="mt-3 text-xl font-bold text-zinc-900">
          Lleva {empresa.nombre} a tu teléfono
        </h2>
        <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-zinc-600">
          Descarga la información de este lugar y úsala sin conexión con la
          app Trekko (recorridos, GPS y observaciones de flora y fauna).
        </p>
        <div className="mt-5">
          <BotonDescargarTrekko
            empresaId={empresa.id}
            empresaNombre={empresa.nombre}
          />
        </div>
        <p className="mt-4 text-xs text-zinc-400">
          El paquete incluye el perfil del lugar, su flora y fauna, sus
          historias locales y sus afiches en un solo archivo JSON, listo para
          la app móvil.
        </p>
      </section>
      </div>
    </div>
  );
}