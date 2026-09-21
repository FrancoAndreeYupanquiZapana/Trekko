"use client";

import { useRef, useState, type FormEvent } from "react";
import { crearEspecie, actualizarEspecie, subirImagen } from "@/servicios/especies";
import type { DatosEspecie, Especie, TipoEspecie } from "@/tipos";
import { CampoEntrada } from "@/componentes/ui/CampoEntrada";
import { Boton } from "@/componentes/ui/Boton";
import { Alerta } from "@/componentes/ui/Alerta";
import { Icono } from "@/componentes/ui/Icono";

interface Props {
  /** Especie existente si se está editando; null para crear una nueva. */
  inicial?: Especie;
  /** Se llama tras guardar en la API, con la especie creada/actualizada. */
  onGuardado: (especie: Especie) => void;
  onCancelar: () => void;
}

const estadosConservacion = [
  "",
  "No evaluada",
  "Preocupación menor",
  "Casi amenazada",
  "Vulnerable",
  "En peligro",
  "En peligro crítico",
] as const;

/** Formulario para crear o editar una especie de flora o fauna. */
export function FormularioEspecie({ inicial, onGuardado, onCancelar }: Props) {
  const [formulario, setFormulario] = useState<DatosEspecie>({
    nombreComun: inicial?.nombreComun ?? "",
    nombreCientifico: inicial?.nombreCientifico ?? "",
    familia: inicial?.familia ?? "",
    tipo: inicial?.tipo ?? "FLORA",
    descripcion: inicial?.descripcion ?? "",
    estadoConservacion: inicial?.estadoConservacion ?? "",
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

      const datos: DatosEspecie = {
        ...formulario,
        nombreComun: formulario.nombreComun.trim(),
        nombreCientifico: formulario.nombreCientifico?.trim() || undefined,
        familia: formulario.familia?.trim() || undefined,
        descripcion: formulario.descripcion?.trim() || undefined,
        estadoConservacion:
          formulario.estadoConservacion?.trim() || undefined,
        imagenUrl,
      };

      const especie = inicial
        ? await actualizarEspecie(inicial.id, datos)
        : await crearEspecie(datos);

      onGuardado(especie);
    } catch (causa) {
      setError(
        causa instanceof Error
          ? causa.message
          : "No se pudo guardar la especie."
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
          {inicial ? "Editar especie" : "Agregar especie"}
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
          etiqueta="Nombre común"
          name="nombreComun"
          placeholder="Ej. Caimán negro"
          minLength={2}
          maxLength={120}
          required
          value={formulario.nombreComun}
          onChange={(evento) =>
            setFormulario((actual) => ({
              ...actual,
              nombreComun: evento.target.value,
            }))
          }
        />
        <CampoEntrada
          etiqueta="Nombre científico (opcional)"
          name="nombreCientifico"
          placeholder="Ej. Melanosuchus niger"
          maxLength={200}
          value={formulario.nombreCientifico ?? ""}
          onChange={(evento) =>
            setFormulario((actual) => ({
              ...actual,
              nombreCientifico: evento.target.value,
            }))
          }
        />

        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-zinc-700">Tipo</span>
          <select
            name="tipo"
            className={estiloSelect}
            value={formulario.tipo}
            onChange={(evento) =>
              setFormulario((actual) => ({
                ...actual,
                tipo: evento.target.value as TipoEspecie,
              }))
            }
          >
            <option value="FLORA">Flora (plantas y árboles)</option>
            <option value="FAUNA">Fauna (animales)</option>
          </select>
        </label>

        <CampoEntrada
          etiqueta="Familia (opcional)"
          name="familia"
          placeholder="Ej. Alligatoridae"
          maxLength={120}
          value={formulario.familia ?? ""}
          onChange={(evento) =>
            setFormulario((actual) => ({
              ...actual,
              familia: evento.target.value,
            }))
          }
        />

        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-zinc-700">
            Estado de conservación (opcional)
          </span>
          <select
            name="estadoConservacion"
            className={estiloSelect}
            value={formulario.estadoConservacion ?? ""}
            onChange={(evento) =>
              setFormulario((actual) => ({
                ...actual,
                estadoConservacion: evento.target.value,
              }))
            }
          >
            {estadosConservacion.map((estado) => (
              <option key={estado || "sin-estado"} value={estado}>
                {estado || "Sin especificar"}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label className="mt-4 flex flex-col gap-1.5">
        <span className="text-sm font-medium text-zinc-700">
          Descripción (opcional)
        </span>
        <textarea
          name="descripcion"
          rows={4}
          maxLength={2000}
          placeholder="Cuéntale a los visitantes sobre esta especie (avistamiento, curiosidades, etc.)."
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

      {/* Imagen de la especie */}
      <div className="mt-4">
        <span className="text-sm font-medium text-zinc-700">
          Imagen de la especie
        </span>
        <div className="mt-2 flex items-center gap-4">
          {(vistaPrevia || (formulario.imagenUrl && !archivo)) && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={vistaPrevia ?? formulario.imagenUrl!}
              alt="Vista previa de la especie"
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
          {inicial ? "Guardar cambios" : "Agregar especie"}
        </Boton>
        <Boton type="button" variante="secundario" onClick={onCancelar}>
          Cancelar
        </Boton>
      </div>
    </form>
  );
}