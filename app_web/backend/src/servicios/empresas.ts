import { obtenerClienteSupabase } from "../config/supabase.js";
import type {
  Afiche,
  DetalleLugarPublico,
  Especie,
  PerfilEmpresa,
  PuntoInteres,
  Relato,
  TipoEspecie,
  TipoPunto,
  TipoRelato,
} from "../tipos/index.js";
import {
  optimizarImagenDesdeUrl,
  type ImagenPaquete,
  type PerfilImagenes,
} from "../utilidades/imagenes.js";
import {
  clavePaqueteEnAlmacen,
  guardarPaqueteEnAlmacen,
  leerPaqueteDeAlmacen,
} from "../utilidades/cachePaquete.js";
import { listarEspeciesDeEmpresa } from "./especies.js";
import { listarRelatosDeEmpresa } from "./relatos.js";
import { listarAfichesDeEmpresa } from "./afiches.js";
import { listarPuntosDeEmpresa } from "./puntos.js";

/**
 * Servicio de perfiles de empresa.
 * Los perfiles viven en la tabla public.empresas, ligada por usuario_id
 * al usuario de Supabase Auth. El backend usa la clave service_role;
 * las políticas RLS de la tabla protegen accesos directos futuros.
 */

/** Datos del perfil tal como los envía el formulario del portal. */
export interface DatosGuardarPerfil {
  nombre: string;
  telefono?: string;
  descripcion?: string;
  logoUrl?: string;
  web?: string;
  redesSociales?: string;
  ubicacion?: string;
}

/** Forma de la fila tal como existe en PostgreSQL. */
interface FilaEmpresa {
  id: string;
  usuario_id: string;
  nombre: string;
  descripcion: string | null;
  telefono: string | null;
  logo_url: string | null;
  web: string | null;
  redes_sociales: string | null;
  ubicacion: string | null;
}

/** Convierte una fila de la base a nuestro tipo PerfilEmpresa. */
function mapearPerfil(fila: FilaEmpresa): PerfilEmpresa {
  return {
    id: fila.id,
    usuarioId: fila.usuario_id,
    nombre: fila.nombre,
    descripcion: fila.descripcion ?? undefined,
    telefono: fila.telefono ?? undefined,
    logoUrl: fila.logo_url ?? undefined,
    web: fila.web ?? undefined,
    redesSociales: fila.redes_sociales ?? undefined,
    ubicacion: fila.ubicacion ?? undefined,
  };
}

/** Obtiene el perfil del usuario indicado (null si aún no lo creó). */
export async function obtenerMiPerfil(
  usuarioId: string
): Promise<PerfilEmpresa | null> {
  const { data, error } = await obtenerClienteSupabase()
    .from("empresas")
    .select("*")
    .eq("usuario_id", usuarioId)
    .maybeSingle();

  if (error) throw error;
  return data ? mapearPerfil(data as FilaEmpresa) : null;
}

/**
 * Mantiene sincronizado el nombre visible del usuario en auth con el del
 * perfil, para que el encabezado del portal muestre el nombre del lugar.
 */
async function actualizarNombreEnMetadatos(
  usuarioId: string,
  nombre: string
): Promise<void> {
  const cliente = obtenerClienteSupabase();
  const { data: usuario } = await cliente.auth.admin.getUserById(usuarioId);
  const metadatos = usuario?.user?.user_metadata ?? {};

  const { error } = await cliente.auth.admin.updateUserById(usuarioId, {
    user_metadata: { ...metadatos, nombre },
  });

  if (error) throw error;
}

/** Crea o actualiza el perfil de la empresa del usuario indicado. */
export async function guardarMiPerfil(
  usuarioId: string,
  datos: DatosGuardarPerfil
): Promise<PerfilEmpresa> {
  const cliente = obtenerClienteSupabase();

  const fila = {
    usuario_id: usuarioId,
    nombre: datos.nombre,
    telefono: datos.telefono ?? null,
    descripcion: datos.descripcion ?? null,
    logo_url: datos.logoUrl ?? null,
    web: datos.web ?? null,
    redes_sociales: datos.redesSociales ?? null,
    ubicacion: datos.ubicacion ?? null,
  };

  const { data, error } = await cliente
    .from("empresas")
    .upsert(fila, { onConflict: "usuario_id" })
    .select()
    .single();

  if (error) throw error;

  // El nombre del lugar también se refleja en la sesión (encabezado del portal).
  await actualizarNombreEnMetadatos(usuarioId, datos.nombre);

  return mapearPerfil(data as FilaEmpresa);
}

/** Lista todas las empresas registradas (catálogo público del home). */
export async function listarEmpresas(): Promise<PerfilEmpresa[]> {
  const { data, error } = await obtenerClienteSupabase()
    .from("empresas")
    .select("*")
    .order("nombre");

  if (error) throw error;
  return (data as FilaEmpresa[] | null ?? []).map(mapearPerfil);
}

/** Obtiene una empresa por su id (página pública del lugar). */
export async function obtenerEmpresaPorId(
  id: string
): Promise<PerfilEmpresa | null> {
  const { data, error } = await obtenerClienteSupabase()
    .from("empresas")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  return data ? mapearPerfil(data as FilaEmpresa) : null;
}

/**
 * Detalle público completo de un lugar: perfil + flora y fauna + relatos
 * + afiches. Se usa en la página pública /lugar/:id y en el paquete descargable.
 */
export async function obtenerDetalleLugar(
  id: string
): Promise<DetalleLugarPublico | null> {
  const empresa = await obtenerEmpresaPorId(id);
  if (!empresa) return null;

  const [especies, relatos, afiches, puntos, revisionLugar] = await Promise.all([
    listarEspeciesDeEmpresa(empresa.usuarioId),
    listarRelatosSiDisponibles(empresa.usuarioId),
    listarAfichesSiDisponibles(empresa.usuarioId),
    listarPuntosSiDisponibles(empresa.usuarioId),
    calcularRevisionLugar(empresa.usuarioId),
  ]);
  return { empresa, especies, relatos, afiches, puntos, revisionLugar };
}

/** Indica si el error es de una tabla que aún no existe (migración pendiente). */
function esTablaInexistente(causa: unknown): boolean {
  const objeto = causa as { code?: string; message?: string } | null;
  return (
    objeto?.code === "PGRST205" ||
    (typeof objeto?.message === "string" &&
      (objeto.message.includes("Could not find the table") ||
        objeto.message.includes("does not exist")))
  );
}

/**
 * Lista los relatos del lugar sin tumbar la página pública si la tabla
 * public.relatos aún no se ha creado (migración 003 pendiente en Supabase).
 * En ese caso devuelve una lista vacía; los relatos aparecen al migrar.
 */
async function listarRelatosSiDisponibles(empresaId: string): Promise<Relato[]> {
  try {
    return await listarRelatosDeEmpresa(empresaId);
  } catch (causa) {
    if (esTablaInexistente(causa)) return [];
    throw causa;
  }
}

/**
 * Lista los afiches del lugar sin tumbar la página pública si la tabla
 * public.afiches aún no se ha creado (migración 004 pendiente en Supabase).
 * En ese caso devuelve una lista vacía; los afiches aparecen al migrar.
 */
async function listarAfichesSiDisponibles(empresaId: string): Promise<Afiche[]> {
  try {
    return await listarAfichesDeEmpresa(empresaId);
  } catch (causa) {
    if (esTablaInexistente(causa)) return [];
    throw causa;
  }
}

/**
 * Lista los puntos del lugar sin tumbar la página pública si la tabla
 * public.puntos aún no se ha creado (migración 007 pendiente en Supabase).
 * En ese caso devuelve una lista vacía; los puntos aparecen al migrar.
 */
async function listarPuntosSiDisponibles(
  empresaId: string
): Promise<PuntoInteres[]> {
  try {
    return await listarPuntosDeEmpresa(empresaId);
  } catch (causa) {
    if (esTablaInexistente(causa)) return [];
    throw causa;
  }
}

/** Paquete descargable para la app móvil ("Descargar información para Trekko"). */
export interface PaqueteDescargaEmpresa {
  version: number;
  tipo: "empresa";
  empresa: {
    id: string;
    nombre: string;
    descripcion: string;
    telefono: string;
    logoUrl: string;
    web: string;
    redesSociales: string;
    ubicacion: string;
  };
  /** Flora y fauna del lugar (imágenes por URL para que el JSON sea liviano). */
  especies: Especie[];
  /** Historias del lugar: mitos, leyendas, datos curiosos y simbiosis. */
  relatos: Relato[];
  /** Afiches informativos: reglas, seguridad y especies protegidas. */
  afiches: Afiche[];
  /** Puntos geolocalizados que muestran un aviso al acercarse. */
  puntos: PuntoInteres[];
}

/**
 * Construye el paquete JSON con la información del lugar para la app móvil.
 * Se usa sin conexión: el archivo contiene el perfil, las especies, los
 * relatos, los afiches y los puntos, y las imágenes se referencian por URL
 * para no inflar el peso.
 */
export function construirPaqueteDescarga(
  empresa: PerfilEmpresa,
  especies: Especie[],
  relatos: Relato[],
  afiches: Afiche[],
  puntos: PuntoInteres[]
): PaqueteDescargaEmpresa {
  return {
    version: 5,
    tipo: "empresa",
    empresa: {
      id: empresa.id,
      nombre: empresa.nombre,
      descripcion: empresa.descripcion ?? "",
      telefono: empresa.telefono ?? "",
      logoUrl: empresa.logoUrl ?? "",
      web: empresa.web ?? "",
      redesSociales: empresa.redesSociales ?? "",
      ubicacion: empresa.ubicacion ?? "",
    },
    especies,
    relatos,
    afiches,
    puntos,
  };
}

/* ── Paquete v6 para la app móvil (offline-first) ────────────────────────
 * A diferencia del paquete "ligero" de /exportar (que referencia imágenes
 * por URL), este paquete INCORPORA las imágenes ya optimizadas (JPEG base64)
 * para que el turista vea el lugar completo sin conexión. La app lo guarda
 * tal cual en SQLite y usa `revision` para detectar actualizaciones.
 * ──────────────────────────────────────────────────────────────────────── */

/** Empresa dentro del paquete v6. */
export interface PaqueteAppEmpresa {
  id: string;
  nombre: string;
  descripcion: string;
  telefono: string;
  web: string;
  redesSociales: string;
  ubicacion: string;
  logoUrl: string;
  logo: ImagenPaquete | null;
}

/** Especie dentro del paquete v5. */
export interface PaqueteAppEspecie {
  id: string;
  nombreComun: string;
  nombreCientifico: string;
  familia: string;
  tipo: TipoEspecie;
  descripcion: string;
  estadoConservacion: string;
  imagenUrl: string;
  imagen: ImagenPaquete | null;
}

/** Relato dentro del paquete v5. */
export interface PaqueteAppRelato {
  id: string;
  titulo: string;
  tipo: TipoRelato;
  contenido: string;
  especieId: string;
  imagenUrl: string;
  imagen: ImagenPaquete | null;
}

/** Afiche dentro del paquete v6. */
export interface PaqueteAppAfiche {
  id: string;
  titulo: string;
  descripcion: string;
  imagenUrl: string;
  imagen: ImagenPaquete | null;
}

/** Punto geolocalizado dentro del paquete v6. */
export interface PaqueteAppPunto {
  id: string;
  /** Coordenadas del punto. */
  lat: number;
  lng: number;
  /** Radio de aviso en metros. */
  radioM: number;
  /** AFICHE, ESPECIE o NOTA. */
  tipo: TipoPunto;
  /** Afiche vinculado (vacío si no aplica). */
  aficheId: string;
  /** Especie vinculada (vacío si no aplica). */
  especieId: string;
  /** Título propio o de respaldo. */
  titulo: string;
  descripcion: string;
  imagenUrl: string;
  imagen: ImagenPaquete | null;
}

/** Paquete completo de un lugar para la app móvil. */
export interface PaqueteAppLugar {
  /** Versión del formato del paquete (6). */
  version: number;
  /** Identificador del formato. */
  formato: "trekko";
  /** Fecha ISO de generación del paquete. */
  generado: string;
  /** Revisión del contenido: cambia cuando el dueño actualiza el lugar. */
  revision: string;
  empresa: PaqueteAppEmpresa;
  especies: PaqueteAppEspecie[];
  relatos: PaqueteAppRelato[];
  afiches: PaqueteAppAfiche[];
  puntos: PaqueteAppPunto[];
}

/** Clave única de una imagen dentro del paquete (perfil + URL). */
function claveImagen(url: string, perfil: PerfilImagenes): string {
  return `${perfil}:${url}`;
}

/**
 * Ejecuta una tarea asíncrona sobre una lista limitando la concurrencia.
 * Evita saturar la red/CPU al optimizar muchas imágenes a la vez.
 */
async function procesarConLimite<T, R>(
  elementos: T[],
  limite: number,
  tarea: (elemento: T) => Promise<R>
): Promise<R[]> {
  const resultados: R[] = new Array(elementos.length);
  let siguiente = 0;
  async function trabajador() {
    while (siguiente < elementos.length) {
      const actual = siguiente++;
      resultados[actual] = await tarea(elementos[actual]);
    }
  }
  const trabajadores = Array.from(
    { length: Math.min(limite, elementos.length) },
    trabajador
  );
  await Promise.all(trabajadores);
  return resultados;
}

/** Recoge todas las imágenes del lugar que deben optimizarse. */
function recogerImagenesDelLugar(detalle: DetalleLugarPublico): Array<{
  url: string;
  perfil: PerfilImagenes;
}> {
  const tareas: Array<{ url: string; perfil: PerfilImagenes }> = [];
  if (detalle.empresa.logoUrl) {
    tareas.push({ url: detalle.empresa.logoUrl, perfil: "foto" });
  }
  for (const especie of detalle.especies) {
    if (especie.imagenUrl) {
      tareas.push({ url: especie.imagenUrl, perfil: "foto" });
    }
  }
  for (const relato of detalle.relatos) {
    if (relato.imagenUrl) {
      tareas.push({ url: relato.imagenUrl, perfil: "foto" });
    }
  }
  for (const afiche of detalle.afiches) {
    if (afiche.imagenUrl) {
      tareas.push({ url: afiche.imagenUrl, perfil: "afiche" });
    }
  }
  for (const punto of detalle.puntos) {
    if (punto.imagenUrl) {
      tareas.push({ url: punto.imagenUrl, perfil: "afiche" });
    }
  }
  return tareas;
}

/** Monta el paquete v5 a partir del detalle y de las imágenes optimizadas. */
function aPaqueteApp(
  detalle: DetalleLugarPublico,
  revision: string,
  imagenes: Map<string, ImagenPaquete | null>
): PaqueteAppLugar {
  const empresa = detalle.empresa;
  return {
    version: 6,
    formato: "trekko",
    generado: new Date().toISOString(),
    revision,
    empresa: {
      id: empresa.id,
      nombre: empresa.nombre,
      descripcion: empresa.descripcion ?? "",
      telefono: empresa.telefono ?? "",
      web: empresa.web ?? "",
      redesSociales: empresa.redesSociales ?? "",
      ubicacion: empresa.ubicacion ?? "",
      logoUrl: empresa.logoUrl ?? "",
      logo: empresa.logoUrl
        ? (imagenes.get(claveImagen(empresa.logoUrl, "foto")) ?? null)
        : null,
    },
    especies: detalle.especies.map((especie) => ({
      id: especie.id,
      nombreComun: especie.nombreComun,
      nombreCientifico: especie.nombreCientifico ?? "",
      familia: especie.familia ?? "",
      tipo: especie.tipo,
      descripcion: especie.descripcion ?? "",
      estadoConservacion: especie.estadoConservacion ?? "",
      imagenUrl: especie.imagenUrl ?? "",
      imagen: especie.imagenUrl
        ? (imagenes.get(claveImagen(especie.imagenUrl, "foto")) ?? null)
        : null,
    })),
    relatos: detalle.relatos.map((relato) => ({
      id: relato.id,
      titulo: relato.titulo,
      tipo: relato.tipo,
      contenido: relato.contenido,
      especieId: relato.especieId ?? "",
      imagenUrl: relato.imagenUrl ?? "",
      imagen: relato.imagenUrl
        ? (imagenes.get(claveImagen(relato.imagenUrl, "foto")) ?? null)
        : null,
    })),
    afiches: detalle.afiches.map((afiche) => ({
      id: afiche.id,
      titulo: afiche.titulo,
      descripcion: afiche.descripcion ?? "",
      imagenUrl: afiche.imagenUrl,
      imagen: imagenes.get(claveImagen(afiche.imagenUrl, "afiche")) ?? null,
    })),
    puntos: detalle.puntos.map((punto) => {
      // El título visible: el propio del punto o, si no, el del afiche/especie
      // vinculado (así el aviso en el celular siempre tiene encabezado).
      const vinculado =
        punto.tipo === "AFICHE"
          ? detalle.afiches.find((a) => a.id === punto.aficheId)?.titulo
          : punto.tipo === "ESPECIE"
            ? detalle.especies.find((e) => e.id === punto.especieId)?.nombreComun
            : undefined;
      return {
        id: punto.id,
        lat: punto.lat,
        lng: punto.lng,
        radioM: punto.radioM,
        tipo: punto.tipo,
        aficheId: punto.aficheId ?? "",
        especieId: punto.especieId ?? "",
        titulo: punto.titulo ?? vinculado ?? "Punto de interés",
        descripcion: punto.descripcion ?? "",
        imagenUrl: punto.imagenUrl ?? "",
        imagen: punto.imagenUrl
          ? (imagenes.get(claveImagen(punto.imagenUrl, "afiche")) ?? null)
          : null,
      };
    }),
  };
}

/** Caché de paquetes: clave = id del lugar, se regenera solo si cambió la revision. */
const cachéPaquetesApp = new Map<string, { revision: string; json: string }>();
/** Límite de lugares en caché (cada uno puede pesar varios MB). */
const TAMAÑO_MÁXIMO_CACHÉ = 10;

/**
 * Revisión del lugar: la fecha de la actualización más reciente de sus
 * contenidos (perfil, especies, relatos o afiches). Es lo que la app
 * compara para saber si hay una actualización nueva disponible.
 */
async function calcularRevisionLugar(usuarioId: string): Promise<string> {
  const consultas = (
    ["empresas", "especies", "relatos", "afiches", "puntos"] as const
  ).map(async (tabla) => {
      try {
        const columnaId = tabla === "empresas" ? "usuario_id" : "empresa_id";
        const { data } = await obtenerClienteSupabase()
          .from(tabla)
          .select("actualizado_en")
          .eq(columnaId, usuarioId)
          .order("actualizado_en", { ascending: false })
          .limit(1)
          .maybeSingle();
        return (data as { actualizado_en?: string } | null)?.actualizado_en ?? null;
      } catch {
        // Tabla ausente (migración pendiente): se ignora sin tumbar el paquete.
        return null;
      }
    }
  );

  const fechas = (await Promise.all(consultas)).filter(
    (fecha): fecha is string => Boolean(fecha)
  );
  return fechas.sort().at(-1) ?? "0";
}

/**
 * Genera (o sirve de caché) el paquete completo del lugar para la app.
 * La caché en memoria se invalida SOLO cuando cambia la `revision` del
 * contenido. Así, aunque el lugar tenga 30–40 imágenes, la costosa
 * optimización ocurre una única vez por versión: el dueño la actualiza y
 * todo el mundo recibe el paquete nuevo casi sin espera.
 */
export async function construirPaqueteAppLugar(
  id: string
): Promise<PaqueteAppLugar | null> {
  const detalle = await obtenerDetalleLugar(id);
  if (!detalle) return null;

  const revision = await calcularRevisionLugar(detalle.empresa.usuarioId);
  const enCaché = cachéPaquetesApp.get(id);
  if (enCaché && enCaché.revision === revision) {
    return JSON.parse(enCaché.json) as PaqueteAppLugar;
  }

  // Caché persistente (Supabase Storage): sobrevive cold starts en Vercel.
  const claveAlmacen = clavePaqueteEnAlmacen(id, revision);
  const deAlmacen = await leerPaqueteDeAlmacen(claveAlmacen);
  if (deAlmacen) {
    cachéPaquetesApp.set(id, { revision, json: deAlmacen });
    return JSON.parse(deAlmacen) as PaqueteAppLugar;
  }

  // Optimiza cada imagen (una vez por URL única) con concurrencia acotada.
  const tareas = recogerImagenesDelLugar(detalle);
  const unicas = [
    ...new Map(tareas.map((tarea) => [claveImagen(tarea.url, tarea.perfil), tarea])).values(),
  ];
  const optimizadas = await procesarConLimite(unicas, 4, async (tarea) => {
    const imagen = await optimizarImagenDesdeUrl(tarea.url, tarea.perfil);
    return [claveImagen(tarea.url, tarea.perfil), imagen] as const;
  });

  const paquete: PaqueteAppLugar = aPaqueteApp(
    detalle,
    revision,
    new Map<string, ImagenPaquete | null>(optimizadas)
  );

  if (cachéPaquetesApp.size >= TAMAÑO_MÁXIMO_CACHÉ) cachéPaquetesApp.clear();
  cachéPaquetesApp.set(id, { revision, json: JSON.stringify(paquete) });
  // Archiva en Storage sin bloquear la respuesta al usuario.
  void guardarPaqueteEnAlmacen(claveAlmacen, JSON.stringify(paquete)).catch(
    () => null
  );
  return paquete;
}