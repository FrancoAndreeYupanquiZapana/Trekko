"use client";

import { useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { guardarMiPerfil } from "@/servicios/empresas";
import { subirImagen } from "@/servicios/archivos";
import type { PerfilEmpresa, UsuarioSesion } from "@/tipos";
import { Alerta } from "@/componentes/ui/Alerta";
import { Boton } from "@/componentes/ui/Boton";
import { CampoEntrada } from "@/componentes/ui/CampoEntrada";
import { Icono } from "@/componentes/ui/Icono";

interface Props {
  /** Perfil precargado desde el servidor (null si aún no existe). */
  perfilInicial: PerfilEmpresa | null;
  /** Usuario autenticado: aporta el nombre inicial si no hay perfil. */
  usuario: UsuarioSesion;
}

/** Estilos compartidos de las áreas de texto (descripción y redes). */
const estilosArea =
  "w-full rounded-lg border border-zinc-300 bg-white px-3.5 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline focus:outline-2 focus:outline-offset-1 focus:outline-emerald-600";

/** Formulario de edición del perfil de la agencia / lugar turístico. */
export function FormularioPerfilEmpresa({ perfilInicial, usuario }: Props) {
  const router = useRouter();

  const [nombre, setNombre] = useState(perfilInicial?.nombre ?? usuario.nombre ?? "");
  const [telefono, setTelefono] = useState(perfilInicial?.telefono ?? "");
  const [descripcion, setDescripcion] = useState(perfilInicial?.descripcion ?? "");
  const [ubicacion, setUbicacion] = useState(perfilInicial?.ubicacion ?? "");
  const [logoUrl, setLogoUrl] = useState(perfilInicial?.logoUrl ?? "");
  const [web, setWeb] = useState(perfilInicial?.web ?? "");
  const [redesSociales, setRedesSociales] = useState(
    perfilInicial?.redesSociales ?? ""
  );

  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [guardado, setGuardado] = useState(false);

  const [archivo, setArchivo] = useState<File | null>(null);
  const [vistaPrevia, setVistaPrevia] = useState<string | null>(null);
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
    setLogoUrl("");
  }

  async function manejarEnvio(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setError(null);
    setGuardado(false);
    setCargando(true);

    try {
      // Si el usuario eligió un logo nuevo, primero lo subimos a la API.
      let logoGuardado = logoUrl;
      if (archivo) logoGuardado = await subirImagen(archivo);

      await guardarMiPerfil({
        nombre,
        telefono,
        descripcion,
        ubicacion,
        logoUrl: logoGuardado,
        web,
        redesSociales,
      });
      setGuardado(true);
      router.refresh();
    } catch (causa) {
      setError(
        causa instanceof Error ? causa.message : "No se pudo guardar el perfil."
      );
    } finally {
      setCargando(false);
    }
  }

  return (
    <form onSubmit={manejarEnvio} className="flex flex-col gap-5" noValidate>
      {error && <Alerta tipo="error">{error}</Alerta>}
      {guardado && <Alerta tipo="exito">Perfil guardado correctamente.</Alerta>}

      <CampoEntrada
        etiqueta="Nombre del lugar"
        value={nombre}
        onChange={(evento) => setNombre(evento.target.value)}
        placeholder="Ej. Lago Sandoval"
        minLength={2}
        maxLength={120}
        required
      />

      <CampoEntrada
        etiqueta="Teléfono"
        value={telefono}
        onChange={(evento) => setTelefono(evento.target.value)}
        placeholder="+51 999 999 999"
        maxLength={40}
      />

      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-zinc-700">Descripción</span>
        <textarea
          value={descripcion}
          onChange={(evento) => setDescripcion(evento.target.value)}
          placeholder="Describe tu lugar: qué lo hace especial, qué actividades ofrece…"
          rows={4}
          maxLength={2000}
          className={estilosArea}
        />
      </label>

      <CampoEntrada
        etiqueta="Ubicación"
        value={ubicacion}
        onChange={(evento) => setUbicacion(evento.target.value)}
        placeholder="Ej. Puerto Maldonado, Madre de Dios"
        maxLength={200}
      />

      {/* Logo del lugar */}
      <div>
        <span className="text-sm font-medium text-zinc-700">Logo del lugar</span>
        <div className="mt-2 flex items-center gap-4">
          {(vistaPrevia || (logoUrl && !archivo)) && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={vistaPrevia ?? logoUrl}
              alt="Vista previa del logo"
              className="size-24 rounded-full border border-zinc-200 bg-zinc-50 object-cover"
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
              {vistaPrevia || logoUrl ? "Cambiar logo" : "Subir logo"}
            </Boton>
            {(vistaPrevia || logoUrl) && (
              <button
                type="button"
                onClick={quitarImagen}
                className="text-sm font-medium text-red-600 hover:underline"
              >
                Quitar logo
              </button>
            )}
          </div>
        </div>
        <p className="mt-2 text-xs text-zinc-400">
          Hasta 5 MB. Se guarda en la nube y aparece en la portada de tu lugar.
        </p>
      </div>

      <CampoEntrada
        etiqueta="Sitio web"
        value={web}
        onChange={(evento) => setWeb(evento.target.value)}
        placeholder="https://misitio.com"
        maxLength={500}
      />

      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-zinc-700">
          Redes sociales <span className="font-normal text-zinc-400">(una por línea)</span>
        </span>
        <textarea
          value={redesSociales}
          onChange={(evento) => setRedesSociales(evento.target.value)}
          placeholder={"Facebook: lago sandoval tours\nInstagram: @lagosandoval"}
          rows={3}
          maxLength={1000}
          className={estilosArea}
        />
      </label>

      <div className="flex flex-wrap items-center gap-3">
        <Boton type="submit" cargando={cargando}>
          Guardar cambios
        </Boton>
        <p className="text-xs text-zinc-400">
          Esta información la verán los visitantes al descargar los datos de tu
          destino.
        </p>
      </div>
    </form>
  );
}