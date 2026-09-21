"use client";

import { useState } from "react";
import { eliminarEspecie } from "@/servicios/especies";
import type { Especie } from "@/tipos";
import { FormularioEspecie } from "@/componentes/empresa/FormularioEspecie";
import { Alerta } from "@/componentes/ui/Alerta";
import { Icono } from "@/componentes/ui/Icono";

interface Props {
  /** Lista inicial precargada desde el servidor. */
  especiesIniciales: Especie[];
}

/** Modo actual del panel: crear, editar una especie concreta, o listar. */
type ModoFormulario = { tipo: "crear" } | { tipo: "editar"; especie: Especie } | null;

const etiquetaTipo: Record<Especie["tipo"], string> = {
  FLORA: "Flora",
  FAUNA: "Fauna",
};

/** Gestión de flora y fauna del lugar desde el portal de la agencia. */
export function GestionEspecies({ especiesIniciales }: Props) {
  const [especies, setEspecies] = useState<Especie[]>(especiesIniciales);
  const [modo, setModo] = useState<ModoFormulario>(null);
  const [error, setError] = useState<string | null>(null);
  const [mensaje, setMensaje] = useState<string | null>(null);

  function notificarProblema(causa: unknown) {
    setError(
      causa instanceof Error ? causa.message : "Ocurrió un error inesperado."
    );
  }

  function alGuardado(especie: Especie) {
    setEspecies((actual) => {
      const existe = actual.some((item) => item.id === especie.id);
      return existe
        ? actual.map((item) => (item.id === especie.id ? especie : item))
        : [especie, ...actual];
    });
    setModo(null);
    setMensaje(
      modo?.tipo === "editar"
        ? "Especie actualizada correctamente."
        : "Especie agregada correctamente."
    );
  }

  async function alEliminar(especie: Especie) {
    const confirmado = window.confirm(
      `¿Eliminar "${especie.nombreComun}"? Esta acción no se puede deshacer.`
    );
    if (!confirmado) return;

    setError(null);
    try {
      await eliminarEspecie(especie.id);
      setEspecies((actual) => actual.filter((item) => item.id !== especie.id));
      setMensaje("Especie eliminada.");
      if (modo?.tipo === "editar" && modo.especie.id === especie.id) {
        setModo(null);
      }
    } catch (causa) {
      notificarProblema(causa);
    }
  }

  return (
    <div className="mt-8 flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Flora y fauna de tu lugar</h2>
          <p className="mt-1 text-sm text-zinc-500">
            Registra las especies que tus visitantes pueden observar y se
            incluirán en el paquete descargable.
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
            Agregar especie
          </button>
        )}
      </div>

      {error && <Alerta tipo="error">{error}</Alerta>}
      {mensaje && !error && <Alerta tipo="exito">{mensaje}</Alerta>}

      {modo ? (
        <FormularioEspecie
          inicial={modo.tipo === "editar" ? modo.especie : undefined}
          onGuardado={alGuardado}
          onCancelar={() => setModo(null)}
        />
      ) : especies.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-zinc-300 bg-white p-10 text-center">
          <Icono tipo="hoja" className="mx-auto size-12 text-zinc-300" />
          <h3 className="mt-3 text-lg font-semibold text-zinc-700">
            Aún no has registrado especies
          </h3>
          <p className="mx-auto mt-1 max-w-sm text-sm text-zinc-500">
            Agrega la flora y fauna de tu lugar para que los visitantes las
            conozcan al descargar tu paquete de información.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {especies.map((especie) => (
            <article
              key={especie.id}
              className="flex flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm"
            >
              {especie.imagenUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={especie.imagenUrl}
                  alt={`Foto de ${especie.nombreComun}`}
                  className="h-40 w-full object-cover"
                />
              ) : (
                <div className="flex h-40 items-center justify-center bg-zinc-50 text-zinc-300">
                  <Icono
                    tipo={especie.tipo === "FLORA" ? "hoja" : "pata"}
                    className="size-14"
                  />
                </div>
              )}

              <div className="flex flex-1 flex-col p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
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
                    {especie.familia && (
                      <p className="text-xs text-zinc-400">{especie.familia}</p>
                    )}
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <button
                      type="button"
                      aria-label={`Editar ${especie.nombreComun}`}
                      title="Editar"
                      onClick={() => {
                        setModo({ tipo: "editar", especie });
                        setMensaje(null);
                        setError(null);
                      }}
                      className="flex size-9 items-center justify-center rounded-lg border border-zinc-200 text-zinc-500 transition-colors hover:border-emerald-300 hover:text-emerald-700"
                    >
                      <Icono tipo="editar" className="size-4" />
                    </button>
                    <button
                      type="button"
                      aria-label={`Eliminar ${especie.nombreComun}`}
                      title="Eliminar"
                      onClick={() => void alEliminar(especie)}
                      className="flex size-9 items-center justify-center rounded-lg border border-zinc-200 text-zinc-500 transition-colors hover:border-red-300 hover:text-red-600"
                    >
                      <Icono tipo="eliminar" className="size-4" />
                    </button>
                  </div>
                </div>

                {especie.descripcion && (
                  <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-zinc-600">
                    {especie.descripcion}
                  </p>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}