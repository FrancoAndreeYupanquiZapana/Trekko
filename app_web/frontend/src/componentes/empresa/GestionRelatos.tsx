"use client";

import { useState } from "react";
import { eliminarRelato } from "@/servicios/relatos";
import type { Especie, Relato, TipoRelato } from "@/tipos";
import {
  coloresTipoRelato,
  etiquetasTipoRelato,
  iconosTipoRelato,
} from "@/utilidades/relatos";
import { FormularioRelato } from "@/componentes/empresa/FormularioRelato";
import { Alerta } from "@/componentes/ui/Alerta";
import { Icono } from "@/componentes/ui/Icono";

interface Props {
  /** Lista inicial precargada desde el servidor. */
  relatosIniciales: Relato[];
  /** Especies del mismo lugar para mostrarlas y vincularlas. */
  especiesIniciales: Especie[];
}

/** Modo actual del panel: crear, editar un relato concreto, o listar. */
type ModoFormulario = { tipo: "crear" } | { tipo: "editar"; relato: Relato } | null;

const filtros: Array<"TODOS" | TipoRelato> = [
  "TODOS",
  "MITO",
  "LEYENDA",
  "DATO_CURIOSO",
  "SIMBIOSIS",
];

/** Gestión de relatos locales del lugar desde el portal de la agencia. */
export function GestionRelatos({ relatosIniciales, especiesIniciales }: Props) {
  const [relatos, setRelatos] = useState<Relato[]>(relatosIniciales);
  const [filtro, setFiltro] = useState<"TODOS" | TipoRelato>("TODOS");
  const [modo, setModo] = useState<ModoFormulario>(null);
  const [error, setError] = useState<string | null>(null);
  const [mensaje, setMensaje] = useState<string | null>(null);

  function notificarProblema(causa: unknown) {
    setError(
      causa instanceof Error ? causa.message : "Ocurrió un error inesperado."
    );
  }

  function alGuardado(relato: Relato) {
    setRelatos((actual) => {
      const existe = actual.some((item) => item.id === relato.id);
      return existe
        ? actual.map((item) => (item.id === relato.id ? relato : item))
        : [relato, ...actual];
    });
    setModo(null);
    setMensaje(
      modo?.tipo === "editar"
        ? "Relato actualizado correctamente."
        : "Relato agregado correctamente."
    );
  }

  async function alEliminar(relato: Relato) {
    const confirmado = window.confirm(
      `¿Eliminar "${relato.titulo}"? Esta acción no se puede deshacer.`
    );
    if (!confirmado) return;

    setError(null);
    try {
      await eliminarRelato(relato.id);
      setRelatos((actual) => actual.filter((item) => item.id !== relato.id));
      setMensaje("Relato eliminado.");
      if (modo?.tipo === "editar" && modo.relato.id === relato.id) {
        setModo(null);
      }
    } catch (causa) {
      notificarProblema(causa);
    }
  }

  const relatosVisibles =
    filtro === "TODOS"
      ? relatos
      : relatos.filter((relato) => relato.tipo === filtro);

  return (
    <div className="mt-8 flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Historias del lugar</h2>
          <p className="mt-1 text-sm text-zinc-500">
            Mitos, leyendas, datos curiosos y simbiosis que solo conocen ustedes.
            Se incluyen en el paquete descargable como &ldquo;historias del guía&rdquo;.
          </p>
        </div>
        {!modo && (
          <button
            type="button"
            onClick={() => {
              setModo({ tipo: "crear" });
              setMensaje(null);
            }}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-emerald-600 px-5 text-sm font-semibold text-white transition-colors hover:bg-emerald-700"
          >
            <Icono tipo="agregar" className="size-5" />
            Agregar relato
          </button>
        )}
      </div>

      {/* Filtros por tipo */}
      {!modo && relatos.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {filtros.map((opcion) => {
            const activo = filtro === opcion;
            return (
              <button
                key={opcion}
                type="button"
                onClick={() => setFiltro(opcion)}
                aria-pressed={activo}
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                  activo
                    ? "bg-emerald-600 text-white"
                    : "border border-zinc-300 bg-white text-zinc-600 hover:border-emerald-400 hover:text-emerald-700"
                }`}
              >
                {opcion !== "TODOS" && (
                  <Icono tipo={iconosTipoRelato[opcion]} className="size-3.5" />
                )}
                {opcion === "TODOS"
                  ? `Todos (${relatos.length})`
                  : etiquetasTipoRelato[opcion]}
              </button>
            );
          })}
        </div>
      )}

      {error && <Alerta tipo="error">{error}</Alerta>}
      {mensaje && !error && <Alerta tipo="exito">{mensaje}</Alerta>}

      {modo ? (
        <FormularioRelato
          especies={especiesIniciales}
          inicial={modo.tipo === "editar" ? modo.relato : undefined}
          onGuardado={alGuardado}
          onCancelar={() => setModo(null)}
        />
      ) : relatos.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-zinc-300 bg-white p-10 text-center">
          <Icono tipo="libro" className="mx-auto size-12 text-zinc-300" />
          <h3 className="mt-3 text-lg font-semibold text-zinc-700">
            Aún no has registrado relatos
          </h3>
          <p className="mx-auto mt-1 max-w-sm text-sm text-zinc-500">
            Cuenta los mitos y leyendas de tu lugar, los datos curiosos de tus
            especies y las simbiosis que ocurren en la naturaleza. Los visitantes
            los descubrirán al descargar tu paquete.
          </p>
        </div>
      ) : relatosVisibles.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-zinc-300 bg-white p-6 text-sm text-zinc-500">
          No hay relatos de este tipo todavía.
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {relatosVisibles.map((relato) => (
            <article
              key={relato.id}
              className="flex flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm"
            >
              {relato.imagenUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={relato.imagenUrl}
                  alt={`Imagen de ${relato.titulo}`}
                  className="h-40 w-full object-cover"
                />
              ) : (
                <div className="flex h-40 items-center justify-center bg-zinc-50 text-zinc-300">
                  <Icono tipo={iconosTipoRelato[relato.tipo]} className="size-14" />
                </div>
              )}

              <div className="flex flex-1 flex-col p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${coloresTipoRelato[relato.tipo]}`}
                    >
                      <Icono
                        tipo={iconosTipoRelato[relato.tipo]}
                        className="size-3.5"
                      />
                      {etiquetasTipoRelato[relato.tipo]}
                    </span>

                    {relato.especieId && (
                      <span className="mt-2 flex items-center gap-1 text-xs text-zinc-500">
                        <Icono tipo="hoja" className="size-3.5 text-emerald-600" />
                        {especiesIniciales.find((especie) => especie.id === relato.especieId)
                          ?.nombreComun ?? "Especie vinculada"}
                      </span>
                    )}

                    <h3 className="mt-2 font-semibold text-zinc-900">
                      {relato.titulo}
                    </h3>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <button
                      type="button"
                      aria-label={`Editar ${relato.titulo}`}
                      title="Editar"
                      onClick={() => {
                        setModo({ tipo: "editar", relato });
                        setMensaje(null);
                        setError(null);
                      }}
                      className="flex size-9 items-center justify-center rounded-lg border border-zinc-200 text-zinc-500 transition-colors hover:border-emerald-300 hover:text-emerald-700"
                    >
                      <Icono tipo="editar" className="size-4" />
                    </button>
                    <button
                      type="button"
                      aria-label={`Eliminar ${relato.titulo}`}
                      title="Eliminar"
                      onClick={() => void alEliminar(relato)}
                      className="flex size-9 items-center justify-center rounded-lg border border-zinc-200 text-zinc-500 transition-colors hover:border-red-300 hover:text-red-600"
                    >
                      <Icono tipo="eliminar" className="size-4" />
                    </button>
                  </div>
                </div>

                <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-zinc-600">
                  {relato.contenido}
                </p>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}