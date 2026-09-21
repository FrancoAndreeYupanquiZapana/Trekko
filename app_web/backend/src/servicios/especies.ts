import { obtenerClienteSupabase } from "../config/supabase.js";
import type { Especie, TipoEspecie } from "../tipos/index.js";

/**
 * Servicio de especies (flora y fauna) de los lugares turísticos.
 * Las especies viven en la tabla public.especies, ligadas por empresa_id
 * al usuario de Supabase Auth dueño del lugar (misma clave que personas_empresa).
 */

/** Datos de una especie tal como los envía el formulario del portal. */
export interface DatosGuardarEspecie {
  nombreComun: string;
  nombreCientifico?: string;
  familia?: string;
  tipo: TipoEspecie;
  descripcion?: string;
  estadoConservacion?: string;
  imagenUrl?: string;
}

/** Forma de la fila tal como existe en PostgreSQL. */
interface FilaEspecie {
  id: string;
  empresa_id: string;
  nombre_comun: string;
  nombre_cientifico: string | null;
  familia: string | null;
  tipo: TipoEspecie;
  descripcion: string | null;
  estado_conservacion: string | null;
  imagen_url: string | null;
}

/** Convierte una fila de la base a nuestro tipo Especie. */
function mapearEspecie(fila: FilaEspecie): Especie {
  return {
    id: fila.id,
    empresaId: fila.empresa_id,
    nombreComun: fila.nombre_comun,
    nombreCientifico: fila.nombre_cientifico ?? undefined,
    familia: fila.familia ?? undefined,
    tipo: fila.tipo,
    descripcion: fila.descripcion ?? undefined,
    estadoConservacion: fila.estado_conservacion ?? undefined,
    imagenUrl: fila.imagen_url ?? undefined,
  };
}

/** Construye la fila a insertar/actualizar a partir de la entrada validada. */
function aFila(datos: DatosGuardarEspecie) {
  return {
    nombre_comun: datos.nombreComun,
    nombre_cientifico: datos.nombreCientifico ?? null,
    familia: datos.familia ?? null,
    tipo: datos.tipo,
    descripcion: datos.descripcion ?? null,
    estado_conservacion: datos.estadoConservacion ?? null,
    imagen_url: datos.imagenUrl ?? null,
  };
}

/** Lista las especies de un lugar, ordenadas por tipo y nombre. */
export async function listarEspeciesDeEmpresa(
  empresaId: string
): Promise<Especie[]> {
  const { data, error } = await obtenerClienteSupabase()
    .from("especies")
    .select("*")
    .eq("empresa_id", empresaId)
    .order("tipo")
    .order("nombre_comun");

  if (error) throw error;
  return ((data as FilaEspecie[] | null) ?? []).map(mapearEspecie);
}

/** Crea una especie para el lugar del usuario indicado. */
export async function crearEspecie(
  empresaId: string,
  datos: DatosGuardarEspecie
): Promise<Especie> {
  const { data, error } = await obtenerClienteSupabase()
    .from("especies")
    .insert({ empresa_id: empresaId, ...aFila(datos) })
    .select()
    .single();

  if (error) throw error;
  return mapearEspecie(data as FilaEspecie);
}

/**
 * Actualiza una especie del lugar. Devuelve null si la especie no existe
 * o no pertenece al usuario (protección contra ediciones ajenas).
 */
export async function actualizarEspecie(
  empresaId: string,
  id: string,
  datos: DatosGuardarEspecie
): Promise<Especie | null> {
  const { data, error } = await obtenerClienteSupabase()
    .from("especies")
    .update(aFila(datos))
    .eq("id", id)
    .eq("empresa_id", empresaId)
    .select()
    .maybeSingle();

  if (error) throw error;
  return data ? mapearEspecie(data as FilaEspecie) : null;
}

/**
 * Elimina una especie del lugar. Devuelve false si no existía o no era propia.
 */
export async function eliminarEspecie(
  empresaId: string,
  id: string
): Promise<boolean> {
  const { data, error } = await obtenerClienteSupabase()
    .from("especies")
    .delete()
    .eq("id", id)
    .eq("empresa_id", empresaId)
    .select("id")
    .maybeSingle();

  if (error) throw error;
  return Boolean(data);
}