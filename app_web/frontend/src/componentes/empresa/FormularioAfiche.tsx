"use client";

import { useRef, useState, type FormEvent } from "react";
import { crearAfiche, actualizarAfiche } from "@/servicios/afiches";
import { subirImagen } from "@/servicios/archivos";
import type { Afiche, DatosAfiche } from "@/tipos";
import { CampoEntrada } from "@/componentes/ui/CampoEntrada";
import { Boton } from "@/componentes/ui/Boton";
import { Alerta } from "@/componentes/ui/Alerta";
import { Icono } from "@/componentes/ui/Icono";

interface Props {
  /** Afiche existente si se está editando; null para crear uno nuevo. */
  inicial?: Afiche;
  /** Se llama tras guardar en la API, con el afiche creado/actualizado. */
  onGuardado: (afiche: Afiche) => void;
  onCancelar: () => void;
}

/** Formulario para crear o editar un afiche informativo (reglas, seguridad…). */
export function FormularioAfiche({ inicial, onGuardado, onCancelar }: Props) {
  const [formulario, setFormulario] = useState<DatosAfiche>({
    titulo: inicial?.titulo ?? "",
    descripcion: inicial?.descripcion ?? "",
    imagenUrl: inicial?.imagenUrl ?? "",
  });
  const [archivo, setArchivo] = useState<File | null>(null);
  const [vistaPrevia, setVistaPrevia] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const entradaArchivo = useRef<HTMLInputElement>(null);

  /** Al elegir archivo, mostramos vista previa y preparamos la subida. */
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
    setFormulario((actual) => ({ ...actual, imagenUrl: "" }));
  }

  async function manejarEnvio(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setError(null);

    // El afiche es una imagen: sin archivo nuevo ni imagen existente no hay nada que subir.
    if (!archivo && !formulario.imagenUrl) {
      setError("Sube una imagen para el afiche.");
      return;
    }

    setCargando(true);

    try {
      // Si el usuario eligió una imagen nueva, primero la subimos a la API.
      let imagenUrl = formulario.imagenUrl;
      if (archivo) imagenUrl = await subirImagen(archivo);

      const datos: DatosAfiche = {
        titulo: formulario.titulo.trim(),
        descripcion: formulario.descripcion?.trim() || undefined,
        imagenUrl,
      };

      const afiche = inicial
        ? await actualizarAfiche(inicial.id, datos)
        : await crearAfiche(datos);

      onGuardado(afiche);
    } catch (causa) {
      setError(
        causa instanceof Error
          ? causa.message
          : "No se pudo guardar el afiche."
      );
      setCargando(false);
    }
  }

  return (
    <form
      onSubmit={manejarEnvio}
      className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm"
      noValidate
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold">
          {inicial ? "Editar afiche" : "Agregar afiche"}
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

      <div className="mt-5 grid gap-4">
        <CampoEntrada
          etiqueta="Título"
          name="titulo"
          placeholder="Ej. Reglas del sendero"
          minLength={2}
          maxLength={200}
          required
          value={formulario.titulo}
          onChange={(evento) =>
            setFormulario((actual) => ({
              ...actual,
              titulo: evento.target.value,
            }))
          }
        />

        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-zinc-700">
            Descripción (opcional)
          </span>
          <textarea
            name="descripcion"
            rows={3}
            maxLength={2000}
            placeholder="Qué deben saber los visitantes al ver este afiche (reglas, seguridad, especies protegidas…)."
            className="rounded-lg border border-zinc-300 bg-white px-3.5 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline focus:outline-2 focus:outline-offset-1 focus:outline-emerald-600"
            value={formulario.descripcion ?? ""}
            onChange={(evento) =>
              setFormulario((actual) => ({
                ...actual,
                descripcion: evento.target.value,
              }))
            }
          />
        </label>
      </div>

      {/* Imagen del afiche (obligatoria) */}
      <div className="mt-4">
        <span className="text-sm font-medium text-zinc-700">
          Imagen del afiche
        </span>
        <div className="mt-2 flex items-center gap-4">
          {(vistaPrevia || formulario.imagenUrl) && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={vistaPrevia ?? formulario.imagenUrl}
              alt="Vista previa del afiche"
              className="h-40 rounded-xl border border-zinc-200 bg-zinc-50 object-contain"
            />
          )}
          <input
            ref={entradaArchivo}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(evento) => elegirArchivo(evento.target.files?.[0] ?? null)}
          />
          <div className="flex flex-col gap-2">
            <Boton
              type="button"
              variante="secundario"
              onClick={() => entradaArchivo.current?.click()}
            >
              <Icono tipo="imagen" className="size-5" />
              {vistaPrevia || formulario.imagenUrl
                ? "Cambiar imagen"
                : "Subir imagen"}
            </Boton>
            {(vistaPrevia || formulario.imagenUrl) && (
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
        <p className="mt-2 text-xs text-zinc-400">
          Hasta 5 MB. El afiche se muestra en tu página pública y se descarga
          con el paquete del lugar para la app.
        </p>
      </div>

      <div className="mt-6 flex items-center gap-3">
        <Boton type="submit" cargando={cargando}>
          {inicial ? "Guardar cambios" : "Agregar afiche"}
        </Boton>
        <Boton type="button" variante="secundario" onClick={onCancelar}>
          Cancelar
        </Boton>
      </div>
    </form>
  );
}