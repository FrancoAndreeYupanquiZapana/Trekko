"use client";

import { useRef, useState, type FormEvent } from "react";
import {
  crearPunto,
  actualizarPunto,
  subirImagen,
} from "@/servicios/puntos";
import type {
  Afiche,
  DatosPunto,
  Especie,
  PuntoInteres,
  TipoPunto,
} from "@/tipos";
import { MapaSelector } from "@/componentes/empresa/MapaSelector";
import { CampoEntrada } from "@/componentes/ui/CampoEntrada";
import { Boton } from "@/componentes/ui/Boton";
import { Alerta } from "@/componentes/ui/Alerta";
import { Icono } from "@/componentes/ui/Icono";

interface Props {
  /** Afiches del lugar para vincular. */
  afiches: Afiche[];
  /** Especies del lugar para vincular. */
  especies: Especie[];
  /** Otros puntos del lugar, para ubicarse en el mapa. */
  marcadores: Array<{ id: string; lat: number; lng: number; etiqueta?: string }>;
  /** Punto existente si se está editando; null para crear uno nuevo. */
  inicial?: PuntoInteres;
  /** Se llama tras guardar en la API, con el punto creado/actualizado. */
  onGuardado: (punto: PuntoInteres) => void;
  onCancelar: () => void;
}

const ETIQUETAS_TIPO: Record<TipoPunto, string> = {
  AFICHE: "Afiche",
  ESPECIE: "Especie",
  NOTA: "Nota / advertencia",
};

/** Formulario para crear o editar un punto de interés geolocalizado. */
export function FormularioPunto({
  afiches,
  especies,
  marcadores,
  inicial,
  onGuardado,
  onCancelar,
}: Props) {
  const [tipo, setTipo] = useState<TipoPunto>(inicial?.tipo ?? "NOTA");
  const [lat, setLat] = useState(inicial?.lat ?? -3.496);
  const [lng, setLng] = useState(inicial?.lng ?? -73.0);
  const [radioM, setRadioM] = useState(inicial?.radioM ?? 60);
  const [aficheId, setAficheId] = useState(inicial?.aficheId ?? "");
  const [especieId, setEspecieId] = useState(inicial?.especieId ?? "");
  const [titulo, setTitulo] = useState(inicial?.titulo ?? "");
  const [descripcion, setDescripcion] = useState(inicial?.descripcion ?? "");
  const [imagenUrl, setImagenUrl] = useState(inicial?.imagenUrl ?? "");
  const [archivo, setArchivo] = useState<File | null>(null);
  const [vistaPrevia, setVistaPrevia] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);
  const [ubicando, setUbicando] = useState(false);
  const [claveMapa, setClaveMapa] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const entradaArchivo = useRef<HTMLInputElement>(null);

  /** Pide al navegador la ubicación actual y la usa como punto. */
  function usarMiUbicacion() {
    if (!("geolocation" in navigator)) {
      setError("Tu navegador no permite obtener la ubicación.");
      return;
    }
    setUbicando(true);
    navigator.geolocation.getCurrentPosition(
      (posicion) => {
        setLat(Number(posicion.coords.latitude.toFixed(6)));
        setLng(Number(posicion.coords.longitude.toFixed(6)));
        // Recentra el mapa en la ubicación obtenida (remonta con la nueva key).
        setClaveMapa((valor) => valor + 1);
        setUbicando(false);
        setError(null);
      },
      () => {
        setError("No pudimos obtener tu ubicación. Marca el punto en el mapa.");
        setUbicando(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  function elegirArchivo(archivoElegido: File | null) {
    if (!archivoElegido) return;
    if (!archivoElegido.type.startsWith("image/")) {
      setError("El archivo debe ser una imagen (JPG, PNG, WebP).");
      return;
    }
    setArchivo(archivoElegido);
    setVistaPrevia(URL.createObjectURL(archivoElegido));
    setError(null);
  }

  function quitarImagen() {
    setArchivo(null);
    setVistaPrevia(null);
    setImagenUrl("");
  }

  async function manejarEnvio(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setError(null);

    if (tipo === "AFICHE" && !aficheId) {
      setError("Elige el afiche que mostrará el punto.");
      return;
    }
    if (tipo === "ESPECIE" && !especieId) {
      setError("Elige la especie que mostrará el punto.");
      return;
    }
    if (tipo === "NOTA" && titulo.trim().length < 2) {
      setError("Escribe un título para la nota.");
      return;
    }

    setCargando(true);

    try {
      let imagenFinal = imagenUrl;
      if (archivo) imagenFinal = await subirImagen(archivo);

      const esNota = tipo === "NOTA";
      const datos: DatosPunto = {
        lat,
        lng,
        radioM,
        tipo,
        aficheId: tipo === "AFICHE" ? aficheId : undefined,
        especieId: tipo === "ESPECIE" ? especieId : undefined,
        titulo: esNota ? titulo.trim() : undefined,
        descripcion: esNota ? descripcion.trim() || undefined : undefined,
        imagenUrl: esNota ? imagenFinal || undefined : undefined,
      };

      const punto = inicial
        ? await actualizarPunto(inicial.id, datos)
        : await crearPunto(datos);

      onGuardado(punto);
    } catch (causa) {
      setError(
        causa instanceof Error ? causa.message : "No se pudo guardar el punto."
      );
      setCargando(false);
    }
  }

  const estiloSelect =
    "h-11 rounded-lg border border-zinc-300 bg-white px-3 text-sm text-zinc-900 focus:outline focus:outline-2 focus:outline-offset-1 focus:outline-emerald-600";

  return (
    <form
      onSubmit={manejarEnvio}
      className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm"
      noValidate
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold">
          {inicial ? "Editar punto" : "Agregar punto de interés"}
        </h2>
        <button
          type="button"
          onClick={onCancelar}
          className="text-sm font-medium text-zinc-500 hover:text-zinc-800"
        >
          Cancelar
        </button>
      </div>

      {error && (
        <div className="mt-4">
          <Alerta tipo="error">{error}</Alerta>
        </div>
      )}

      {/* Ubicación en el mapa */}
      <div className="mt-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-sm font-medium text-zinc-700">
            Ubicación del punto
          </span>
          <Boton
            type="button"
            variante="secundario"
            cargando={ubicando}
            onClick={usarMiUbicacion}
            className="h-9 px-3"
          >
            <Icono tipo="ubicacion" className="size-4" />
            Usar mi ubicación
          </Boton>
        </div>
        <div className="mt-2">
          <MapaSelector
            key={claveMapa}
            lat={lat}
            lng={lng}
            radioM={radioM}
            marcadores={marcadores}
            onChange={(nuevaLat, nuevaLng) => {
              setLat(Number(nuevaLat.toFixed(6)));
              setLng(Number(nuevaLng.toFixed(6)));
            }}
          />
        </div>
        <p className="mt-1 text-xs text-zinc-400">
          Coordenadas: {lat.toFixed(6)}, {lng.toFixed(6)}
        </p>
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-zinc-700">
            ¿Qué muestra al acercarse?
          </span>
          <select
            className={estiloSelect}
            value={tipo}
            onChange={(evento) => setTipo(evento.target.value as TipoPunto)}
          >
            {(Object.keys(ETIQUETAS_TIPO) as TipoPunto[]).map((clave) => (
              <option key={clave} value={clave}>
                {ETIQUETAS_TIPO[clave]}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-zinc-700">
            Radio de aviso: {radioM} m
          </span>
          <input
            type="range"
            min={10}
            max={500}
            step={10}
            value={radioM}
            onChange={(evento) => setRadioM(Number(evento.target.value))}
            className="mt-3 accent-emerald-600"
          />
        </label>
      </div>

      {tipo === "AFICHE" && (
        <label className="mt-4 flex flex-col gap-1.5">
          <span className="text-sm font-medium text-zinc-700">Afiche</span>
          {afiches.length === 0 ? (
            <p className="text-sm text-amber-600">
              Todavía no tienes afiches. Crea uno en la sección Afiches.
            </p>
          ) : (
            <select
              className={estiloSelect}
              value={aficheId}
              onChange={(evento) => setAficheId(evento.target.value)}
            >
              <option value="">Elige un afiche…</option>
              {afiches.map((afiche) => (
                <option key={afiche.id} value={afiche.id}>
                  {afiche.titulo}
                </option>
              ))}
            </select>
          )}
        </label>
      )}

      {tipo === "ESPECIE" && (
        <label className="mt-4 flex flex-col gap-1.5">
          <span className="text-sm font-medium text-zinc-700">Especie</span>
          {especies.length === 0 ? (
            <p className="text-sm text-amber-600">
              Todavía no tienes especies. Créalas en la sección Flora y fauna.
            </p>
          ) : (
            <select
              className={estiloSelect}
              value={especieId}
              onChange={(evento) => setEspecieId(evento.target.value)}
            >
              <option value="">Elige una especie…</option>
              {especies.map((especie) => (
                <option key={especie.id} value={especie.id}>
                  {especie.nombreComun}
                </option>
              ))}
            </select>
          )}
        </label>
      )}

      {tipo === "NOTA" && (
        <div className="mt-4 grid gap-4">
          <CampoEntrada
            etiqueta="Título"
            name="titulo"
            placeholder="Ej. Zona de nidos: no hacer ruido"
            minLength={2}
            maxLength={200}
            required
            value={titulo}
            onChange={(evento) => setTitulo(evento.target.value)}
          />

          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-zinc-700">
              Advertencia o detalle (opcional)
            </span>
            <textarea
              name="descripcion"
              rows={3}
              maxLength={2000}
              placeholder="Qué debe saber el turista al llegar a este punto."
              className="rounded-lg border border-zinc-300 bg-white px-3.5 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline focus:outline-2 focus:outline-offset-1 focus:outline-emerald-600"
              value={descripcion}
              onChange={(evento) => setDescripcion(evento.target.value)}
            />
          </label>

          <div>
            <span className="text-sm font-medium text-zinc-700">
              Imagen (opcional)
            </span>
            <div className="mt-2 flex items-center gap-4">
              {(vistaPrevia || imagenUrl) && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={vistaPrevia ?? imagenUrl}
                  alt="Vista previa del punto"
                  className="h-28 rounded-xl border border-zinc-200 bg-zinc-50 object-cover"
                />
              )}
              <input
                ref={entradaArchivo}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(evento) =>
                  elegirArchivo(evento.target.files?.[0] ?? null)
                }
              />
              <div className="flex flex-col gap-2">
                <Boton
                  type="button"
                  variante="secundario"
                  onClick={() => entradaArchivo.current?.click()}
                >
                  <Icono tipo="imagen" className="size-5" />
                  {vistaPrevia || imagenUrl ? "Cambiar imagen" : "Subir imagen"}
                </Boton>
                {(vistaPrevia || imagenUrl) && (
                  <button
                    type="button"
                    onClick={quitarImagen}
                    className="text-sm font-medium text-red-600 hover:underline"
                  >
                    Quitar imagen
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="mt-6 flex items-center gap-3">
        <Boton type="submit" cargando={cargando}>
          {inicial ? "Guardar cambios" : "Agregar punto"}
        </Boton>
        <Boton type="button" variante="secundario" onClick={onCancelar}>
          Cancelar
        </Boton>
      </div>
    </form>
  );
}
