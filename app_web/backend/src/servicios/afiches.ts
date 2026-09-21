import { obtenerClienteSupabase } from "../config/supabase.js";
import type { Afiche } from "../tipos/index.js";

/**
 * Servicio de afiches informativos (reglas, seguridad y especies protegidas).
 * Los afiches viven en la tabla public.afiches, ligados por empresa_id al
 * usuario de Supabase Auth dueño del lugar (misma clave que especies y relatos).
 */

/** Datos de un afiche tal como los envía el formulario del portal. */
export interface DatosGuardarAfiche {
  titulo: string;
  descripcion?: string;
  imagenUrl: string;
}

/** Forma de la fila tal como existe en PostgreSQL. */
interface FilaAfiche {
  id: string;
  empresa_id: string;
  titulo: string;
  descripcion: string | null;
  imagen_url: string;
}

/** Convierte una fila de la base a nuestro tipo Afiche. */
function mapearAfiche(fila: FilaAfiche): Afiche {
  return {
    id: fila.id,
    empresaId: fila.empresa_id,
    titulo: fila.titulo,
    descripcion: fila.descripcion ?? undefined,
    imagenUrl: fila.imagen_url,
  };
}

/** Construye la fila a insertar/actualizar a partir de la entrada validada. */
function aFila(datos: DatosGuardarAfiche) {
  return {
    titulo: datos.titulo,
    descripcion: datos.descripcion ?? null,
    imagen_url: datos.imagenUrl,
  };
}

/** Lista los afiches de un lugar, ordenados del más reciente al más antiguo. */
export async function listarAfichesDeEmpresa(
  empresaId: string
): Promise<Afiche[]> {
  const { data, error } = await obtenerClienteSupabase()
    .from("afiches")
    .select("*")
    .eq("empresa_id", empresaId)
    .order("creado_en", { ascending: false });

  if (error) throw error;
  return ((data as FilaAfiche[] | null) ?? []).map(mapearAfiche);
}

/** Crea un afiche para el lugar del usuario indicado. */
export async function crearAfiche(
  empresaId: string,
  datos: DatosGuardarAfiche
): Promise<Afiche> {
  const { data, error } = await obtenerClienteSupabase()
    .from("afiches")
    .insert({ empresa_id: empresaId, ...aFila(datos) })
    .select()
    .single();

  if (error) throw error;
  return mapearAfiche(data as FilaAfiche);
}

/**
 * Actualiza un afiche del lugar. Devuelve null si el afiche no existe
 * o no pertenece al usuario (protección contra ediciones ajenas).
 */
export async function actualizarAfiche(
  empresaId: string,
  id: string,
  datos: DatosGuardarAfiche
): Promise<Afiche | null> {
  const { data, error } = await obtenerClienteSupabase()
    .from("afiches")
    .update(aFila(datos))
    .eq("id", id)
    .eq("empresa_id", empresaId)
    .select()
    .maybeSingle();

  if (error) throw error;
  return data ? mapearAfiche(data as FilaAfiche) : null;
}

/** Elimina un afiche del lugar. Devuelve false si no existía o no era propio. */
export async function eliminarAfiche(
  empresaId: string,
  id: string
): Promise<boolean> {
  const { data, error } = await obtenerClienteSupabase()
    .from("afiches")
    .delete()
    .eq("id", id)
    .eq("empresa_id", empresaId)
    .select("id")
    .maybeSingle();

  if (error) throw error;
  return Boolean(data);
}