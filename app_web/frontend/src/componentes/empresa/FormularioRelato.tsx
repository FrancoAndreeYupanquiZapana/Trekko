"use client";

import { useRef, useState, type FormEvent } from "react";
import { crearRelato, actualizarRelato } from "@/servicios/relatos";
import { subirImagen } from "@/servicios/archivos";
import type { DatosRelato, Especie, Relato, TipoRelato } from "@/tipos";
import { opcionesTipoRelato } from "@/utilidades/relatos";
import { CampoEntrada } from "@/componentes/ui/CampoEntrada";
import { Boton } from "@/componentes/ui/Boton";
import { Alerta } from "@/componentes/ui/Alerta";
import { Icono } from "@/componentes/ui/Icono";

interface Props {
  /** Especies del mismo lugar para vincularlas al relato (opcional). */
  especies: Especie[];
  /** Relato existente si se está editando; null para crear uno nuevo. */
  inicial?: Relato;
  /** Se llama tras guardar en la API, con el relato creado/actualizado. */
  onGuardado: (relato: Relato) => void;
  onCancelar: () => void;
}

/** Formulario para crear o editar un relato local (mito, leyenda, etc.). */
export function FormularioRelato({ especies, inicial, onGuardado, onCancelar }: Props) {
  const [formulario, setFormulario] = useState<DatosRelato>({
    titulo: inicial?.titulo ?? "",
    tipo: inicial?.tipo ?? "MITO",
    contenido: inicial?.contenido ?? "",
    especieId: inicial?.especieId ?? "",
    imagenUrl: inicial?.imagenUrl,
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
    setFormulario((actual) => ({ ...actual, imagenUrl: undefined }));
  }

  async function manejarEnvio(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setError(null);
    setCargando(true);

    try {
      // Si el usuario eligió una imagen nueva, primero la subimos a la API.
      let imagenUrl = formulario.imagenUrl;
      if (archivo) imagenUrl = await subirImagen(archivo);

      const datos: DatosRelato = {
        titulo: formulario.titulo.trim(),
        tipo: formulario.tipo,
        contenido: formulario.contenido.trim(),
        especieId: formulario.especieId?.trim() || undefined,
        imagenUrl,
      };

      const relato = inicial
        ? await actualizarRelato(inicial.id, datos)
        : await crearRelato(datos);

      onGuardado(relato);
    } catch (causa) {
      setError(
        causa instanceof Error
          ? causa.message
          : "No se pudo guardar el relato."
      );
      setCargando(false);
    }
  }

  const estiloSelect =
    "h-11 rounded-lg border border-zinc-300 bg-white px-3.5 text-sm text-zinc-900 focus:outline focus:outline-2 focus:outline-offset-1 focus:outline-emerald-600";

  return (
    <form
      onSubmit={manejarEnvio}
      className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm"
      noValidate
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold">
          {inicial ? "Editar relato" : "Agregar relato"}
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

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <CampoEntrada
          etiqueta="Título"
          name="titulo"
          placeholder="Ej. La leyenda del bufeo colorado"
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
          <span className="text-sm font-medium text-zinc-700">Tipo de relato</span>
          <select
            name="tipo"
            className={estiloSelect}
            value={formulario.tipo}
            onChange={(evento) =>
              setFormulario((actual) => ({
                ...actual,
                tipo: evento.target.value as TipoRelato,
              }))
            }
          >
            {opcionesTipoRelato.map((opcion) => (
              <option key={opcion.valor} value={opcion.valor}>
                {opcion.descripcion}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1.5 sm:col-span-2">
          <span className="text-sm font-medium text-zinc-700">
            Especie relacionada (opcional)
          </span>
          <select
            name="especieId"
            className={estiloSelect}
            value={formulario.especieId ?? ""}
            onChange={(evento) =>
              setFormulario((actual) => ({
                ...actual,
                especieId: evento.target.value || undefined,
              }))
            }
          >
            <option value="">Sin especie específica</option>
            {especies.map((especie) => (
              <option key={especie.id} value={especie.id}>
                {especie.nombreComun}
                {especie.nombreCientifico
                  ? ` (${especie.nombreCientifico})`
                  : ""}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label className="mt-4 flex flex-col gap-1.5">
        <span className="text-sm font-medium text-zinc-700">Contenido</span>
        <textarea
          name="contenido"
          rows={5}
          minLength={10}
          maxLength={8000}
          required
          placeholder="Cuenta la historia tal como la conoces tú y tu comunidad. Se descarga con el paquete del lugar y aparece como 'historias del guía' en la app."
          className="rounded-lg border border-zinc-300 bg-white px-3.5 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline focus:outline-2 focus:outline-offset-1 focus:outline-emerald-600"
          value={formulario.contenido}
          onChange={(evento) =>
            setFormulario((actual) => ({
              ...actual,
              contenido: evento.target.value,
            }))
          }
        />
      </label>

      {/* Imagen ilustrativa del relato */}
      <div className="mt-4">
        <span className="text-sm font-medium text-zinc-700">
          Imagen ilustrativa (opcional)
        </span>
        <div className="mt-2 flex items-center gap-4">
          {(vistaPrevia || (formulario.imagenUrl && !archivo)) && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={vistaPrevia ?? formulario.imagenUrl!}
              alt="Vista previa del relato"
              className="size-24 rounded-xl border border-zinc-200 bg-zinc-50 object-cover"
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
          Hasta 5 MB. Se guarda en la nube y se descarga con el paquete del lugar.
        </p>
      </div>

      <div className="mt-6 flex items-center gap-3">
        <Boton type="submit" cargando={cargando}>
          {inicial ? "Guardar cambios" : "Agregar relato"}
        </Boton>
        <Boton type="button" variante="secundario" onClick={onCancelar}>
          Cancelar
        </Boton>
      </div>
    </form>
  );
}