"use client";

import { useState } from "react";
import { eliminarAfiche } from "@/servicios/afiches";
import type { Afiche } from "@/tipos";
import { FormularioAfiche } from "@/componentes/empresa/FormularioAfiche";
import { Alerta } from "@/componentes/ui/Alerta";
import { Icono } from "@/componentes/ui/Icono";

interface Props {
  /** Lista inicial precargada desde el servidor. */
  afichesIniciales: Afiche[];
}

/** Modo actual del panel: crear, editar un afiche concreto, o listar. */
type ModoFormulario = { tipo: "crear" } | { tipo: "editar"; afiche: Afiche } | null;

/** Gestión de afiches informativos del lugar desde el portal de la agencia. */
export function GestionAfiches({ afichesIniciales }: Props) {
  const [afiches, setAfiches] = useState<Afiche[]>(afichesIniciales);
  const [modo, setModo] = useState<ModoFormulario>(null);
  const [error, setError] = useState<string | null>(null);
  const [mensaje, setMensaje] = useState<string | null>(null);

  function notificarProblema(causa: unknown) {
    setError(
      causa instanceof Error ? causa.message : "Ocurrió un error inesperado."
    );
  }

  function alGuardado(afiche: Afiche) {
    setAfiches((actual) => {
      const existe = actual.some((item) => item.id === afiche.id);
      return existe
        ? actual.map((item) => (item.id === afiche.id ? afiche : item))
        : [afiche, ...actual];
    });
    setModo(null);
    setMensaje(
      modo?.tipo === "editar"
        ? "Afiche actualizado correctamente."
        : "Afiche agregado correctamente."
    );
  }

  async function alEliminar(afiche: Afiche) {
    const confirmado = window.confirm(
      `¿Eliminar "${afiche.titulo}"? Esta acción no se puede deshacer.`
    );
    if (!confirmado) return;

    setError(null);
    try {
      await eliminarAfiche(afiche.id);
      setAfiches((actual) => actual.filter((item) => item.id !== afiche.id));
      setMensaje("Afiche eliminado.");
      if (modo?.tipo === "editar" && modo.afiche.id === afiche.id) {
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
          <h2 className="text-lg font-semibold">Afiches informativos</h2>
          <p className="mt-1 text-sm text-zinc-500">
            Reglas, seguridad y especies protegidas de tus senderos. Los
            visitantes los ven en tu página y dentro de la app al descargar tu
            paquete.
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
            Subir afiche
          </button>
        )}
      </div>

      {error && <Alerta tipo="error">{error}</Alerta>}
      {mensaje && !error && <Alerta tipo="exito">{mensaje}</Alerta>}

      {modo ? (
        <FormularioAfiche
          inicial={modo.tipo === "editar" ? modo.afiche : undefined}
          onGuardado={alGuardado}
          onCancelar={() => setModo(null)}
        />
      ) : afiches.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-zinc-300 bg-white p-10 text-center">
          <Icono tipo="documento" className="mx-auto size-12 text-zinc-300" />
          <h3 className="mt-3 text-lg font-semibold text-zinc-700">
            Aún no has subido afiches
          </h3>
          <p className="mx-auto mt-1 max-w-md text-sm text-zinc-500">
            Súbelos como imágenes (JPG, PNG o WebP): reglas de tus senderos,
            recomendaciones de seguridad y especies protegidas. Aparecerán en tu
            página pública y en el paquete descargable.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {afiches.map((afiche) => (
            <article
              key={afiche.id}
              className="flex flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={afiche.imagenUrl}
                alt={`Afiche: ${afiche.titulo}`}
                className="h-56 w-full object-contain bg-zinc-50"
              />

              <div className="flex flex-1 flex-col p-4">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-semibold text-zinc-900">{afiche.titulo}</h3>
                  <div className="flex shrink-0 gap-1">
                    <button
                      type="button"
                      aria-label={`Editar ${afiche.titulo}`}
                      title="Editar"
                      onClick={() => {
                        setModo({ tipo: "editar", afiche });
                        setMensaje(null);
                        setError(null);
                      }}
                      className="flex size-9 items-center justify-center rounded-lg border border-zinc-200 text-zinc-500 transition-colors hover:border-emerald-300 hover:text-emerald-700"
                    >
                      <Icono tipo="editar" className="size-4" />
                    </button>
                    <button
                      type="button"
                      aria-label={`Eliminar ${afiche.titulo}`}
                      title="Eliminar"
                      onClick={() => void alEliminar(afiche)}
                      className="flex size-9 items-center justify-center rounded-lg border border-zinc-200 text-zinc-500 transition-colors hover:border-red-300 hover:text-red-600"
                    >
                      <Icono tipo="eliminar" className="size-4" />
                    </button>
                  </div>
                </div>

                {afiche.descripcion && (
                  <p className="mt-2 text-sm leading-relaxed text-zinc-600">
                    {afiche.descripcion}
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