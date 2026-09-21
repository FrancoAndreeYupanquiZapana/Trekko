import { obtenerClienteSupabase } from "../config/supabase.js";
import type { PuntoInteres, TipoPunto } from "../tipos/index.js";

/**
 * Servicio de puntos de interés geolocalizados.
 * Viven en la tabla public.puntos, ligados por empresa_id al usuario de
 * Supabase Auth dueño del lugar (misma clave que especies, relatos y afiches).
 * Cada punto muestra un afiche, una especie o una nota al acercarse.
 */

/** Datos de un punto tal como los envía el formulario del portal. */
export interface DatosGuardarPunto {
  lat: number;
  lng: number;
  radioM: number;
  tipo: TipoPunto;
  aficheId?: string;
  especieId?: string;
  titulo?: string;
  descripcion?: string;
  imagenUrl?: string;
}

/** Forma de la fila tal como existe en PostgreSQL. */
interface FilaPunto {
  id: string;
  empresa_id: string;
  lat: number;
  lng: number;
  radio_m: number;
  tipo: TipoPunto;
  afiche_id: string | null;
  especie_id: string | null;
  titulo: string | null;
  descripcion: string | null;
  imagen_url: string | null;
}

/** Convierte una fila de la base a nuestro tipo PuntoInteres. */
function mapearPunto(fila: FilaPunto): PuntoInteres {
  return {
    id: fila.id,
    empresaId: fila.empresa_id,
    lat: Number(fila.lat),
    lng: Number(fila.lng),
    radioM: Number(fila.radio_m ?? 60),
    tipo: fila.tipo,
    aficheId: fila.afiche_id ?? undefined,
    especieId: fila.especie_id ?? undefined,
    titulo: fila.titulo ?? undefined,
    descripcion: fila.descripcion ?? undefined,
    imagenUrl: fila.imagen_url ?? undefined,
  };
}

/** Construye la fila a insertar/actualizar a partir de la entrada validada. */
function aFila(datos: DatosGuardarPunto) {
  return {
    lat: datos.lat,
    lng: datos.lng,
    radio_m: datos.radioM,
    tipo: datos.tipo,
    afiche_id: datos.tipo === "AFICHE" ? (datos.aficheId ?? null) : null,
    especie_id: datos.tipo === "ESPECIE" ? (datos.especieId ?? null) : null,
    titulo: datos.titulo ?? null,
    descripcion: datos.descripcion ?? null,
    imagen_url: datos.imagenUrl ?? null,
  };
}

/** Lista los puntos de un lugar, del más reciente al más antiguo. */
export async function listarPuntosDeEmpresa(
  empresaId: string
): Promise<PuntoInteres[]> {
  const { data, error } = await obtenerClienteSupabase()
    .from("puntos")
    .select("*")
    .eq("empresa_id", empresaId)
    .order("creado_en", { ascending: false });

  if (error) throw error;
  return ((data as FilaPunto[] | null) ?? []).map(mapearPunto);
}

/** Crea un punto para el lugar del usuario indicado. */
export async function crearPunto(
  empresaId: string,
  datos: DatosGuardarPunto
): Promise<PuntoInteres> {
  const { data, error } = await obtenerClienteSupabase()
    .from("puntos")
    .insert({ empresa_id: empresaId, ...aFila(datos) })
    .select()
    .single();

  if (error) throw error;
  return mapearPunto(data as FilaPunto);
}

/**
 * Actualiza un punto del lugar. Devuelve null si el punto no existe o no
 * pertenece al usuario (protección contra ediciones ajenas).
 */
export async function actualizarPunto(
  empresaId: string,
  id: string,
  datos: DatosGuardarPunto
): Promise<PuntoInteres | null> {
  const { data, error } = await obtenerClienteSupabase()
    .from("puntos")
    .update({ ...aFila(datos), actualizado_en: new Date().toISOString() })
    .eq("id", id)
    .eq("empresa_id", empresaId)
    .select()
    .maybeSingle();

  if (error) throw error;
  return data ? mapearPunto(data as FilaPunto) : null;
}

/** Elimina un punto del lugar. Devuelve false si no existía o no era propio. */
export async function eliminarPunto(
  empresaId: string,
  id: string
): Promise<boolean> {
  const { data, error } = await obtenerClienteSupabase()
    .from("puntos")
    .delete()
    .eq("id", id)
    .eq("empresa_id", empresaId)
    .select("id")
    .maybeSingle();

  if (error) throw error;
  return Boolean(data);
}
