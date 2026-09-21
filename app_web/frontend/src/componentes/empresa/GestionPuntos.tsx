"use client";

import { useState } from "react";
import { eliminarPunto } from "@/servicios/puntos";
import type { Afiche, Especie, PuntoInteres, TipoPunto } from "@/tipos";
import { FormularioPunto } from "@/componentes/empresa/FormularioPunto";
import { Alerta } from "@/componentes/ui/Alerta";
import { Boton } from "@/componentes/ui/Boton";
import { Icono } from "@/componentes/ui/Icono";

interface Props {
  /** Lista inicial precargada desde el servidor. */
  puntosIniciales: PuntoInteres[];
  /** Afiches del lugar (para vincular y mostrar nombres). */
  afiches: Afiche[];
  /** Especies del lugar (para vincular y mostrar nombres). */
  especies: Especie[];
}

/** Modo actual del panel: crear, editar un punto concreto, o listar. */
type ModoFormulario =
  | { tipo: "crear" }
  | { tipo: "editar"; punto: PuntoInteres }
  | null;

const ETIQUETAS_TIPO: Record<TipoPunto, string> = {
  AFICHE: "Afiche",
  ESPECIE: "Especie",
  NOTA: "Nota",
};

/** Gestión de puntos de interés del lugar desde el portal de la agencia. */
export function GestionPuntos({ puntosIniciales, afiches, especies }: Props) {
  const [puntos, setPuntos] = useState<PuntoInteres[]>(puntosIniciales);
  const [modo, setModo] = useState<ModoFormulario>(null);
  const [error, setError] = useState<string | null>(null);
  const [mensaje, setMensaje] = useState<string | null>(null);

  function notificarProblema(causa: unknown) {
    setError(
      causa instanceof Error ? causa.message : "Ocurrió un error inesperado."
    );
  }

  function alGuardado(punto: PuntoInteres) {
    setPuntos((actual) => {
      const existe = actual.some((item) => item.id === punto.id);
      return existe
        ? actual.map((item) => (item.id === punto.id ? punto : item))
        : [punto, ...actual];
    });
    setModo(null);
    setMensaje(
      modo?.tipo === "editar"
        ? "Punto actualizado correctamente."
        : "Punto agregado correctamente."
    );
  }

  async function alEliminar(punto: PuntoInteres) {
    const confirmado = window.confirm(
      `¿Eliminar el punto "${describir(punto)}"? Esta acción no se puede deshacer.`
    );
    if (!confirmado) return;
    setError(null);
    try {
      await eliminarPunto(punto.id);
      setPuntos((actual) => actual.filter((item) => item.id !== punto.id));
      setMensaje("Punto eliminado correctamente.");
    } catch (causa) {
      notificarProblema(causa);
    }
  }

  /** Texto legible de un punto (título propio o del contenido vinculado). */
  function describir(punto: PuntoInteres): string {
    if (punto.tipo === "AFICHE") {
      return (
        afiches.find((a) => a.id === punto.aficheId)?.titulo ??
        punto.titulo ??
        "Afiche"
      );
    }
    if (punto.tipo === "ESPECIE") {
      return (
        especies.find((e) => e.id === punto.especieId)?.nombreComun ??
        punto.titulo ??
        "Especie"
      );
    }
    return punto.titulo ?? "Nota";
  }

  const marcadores = puntos.map((punto) => ({
    id: punto.id,
    lat: punto.lat,
    lng: punto.lng,
    etiqueta: describir(punto),
  }));

  return (
    <div className="mt-6">
      {error && (
        <div className="mb-4">
          <Alerta tipo="error">{error}</Alerta>
        </div>
      )}
      {mensaje && (
        <div className="mb-4">
          <Alerta tipo="exito">{mensaje}</Alerta>
        </div>
      )}

      {modo ? (
        <FormularioPunto
          afiches={afiches}
          especies={especies}
          marcadores={
            modo.tipo === "editar"
              ? marcadores.filter((m) => m.id !== modo.punto.id)
              : marcadores
          }
          inicial={modo.tipo === "editar" ? modo.punto : undefined}
          onGuardado={alGuardado}
          onCancelar={() => setModo(null)}
        />
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-zinc-500">
            {puntos.length === 0
              ? "Todavía no has marcado puntos en el mapa."
              : `${puntos.length} punto${puntos.length === 1 ? "" : "s"} de interés.`}
          </p>
          <Boton type="button" onClick={() => setModo({ tipo: "crear" })}>
            <Icono tipo="agregar" className="size-5" />
            Agregar punto
          </Boton>
        </div>
      )}

      {!modo && puntos.length > 0 && (
        <ul className="mt-5 grid gap-3">
          {puntos.map((punto) => (
            <li
              key={punto.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm"
            >
              <div className="flex min-w-0 items-start gap-3">
                <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-700">
                  <Icono tipo="ubicacion" className="size-5" />
                </span>
                <div className="min-w-0">
                  <p className="flex flex-wrap items-center gap-2 font-medium text-zinc-900">
                    <span className="truncate">{describir(punto)}</span>
                    <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-600">
                      {ETIQUETAS_TIPO[punto.tipo]}
                    </span>
                  </p>
                  <p className="mt-0.5 text-xs text-zinc-500">
                    {punto.lat.toFixed(5)}, {punto.lng.toFixed(5)} · aviso a{" "}
                    {punto.radioM} m
                  </p>
                  {punto.descripcion && (
                    <p className="mt-1 line-clamp-2 text-sm text-zinc-600">
                      {punto.descripcion}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Boton
                  type="button"
                  variante="secundario"
                  className="h-9 px-3"
                  onClick={() => setModo({ tipo: "editar", punto })}
                >
                  <Icono tipo="editar" className="size-4" />
                  Editar
                </Boton>
                <Boton
                  type="button"
                  variante="peligro"
                  className="h-9 px-3"
                  onClick={() => alEliminar(punto)}
                >
                  <Icono tipo="eliminar" className="size-4" />
                  Eliminar
                </Boton>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
