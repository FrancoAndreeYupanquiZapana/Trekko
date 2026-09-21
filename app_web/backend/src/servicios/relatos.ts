import { obtenerClienteSupabase } from "../config/supabase.js";
import type { Relato, TipoRelato } from "../tipos/index.js";

/**
 * Servicio de relatos locales (mitos, leyendas, datos curiosos y simbiosis).
 * Los relatos viven en la tabla public.relatos, ligados por empresa_id
 * al usuario de Supabase Auth dueño del lugar (misma clave que especies).
 */

/** Datos de un relato tal como los envía el formulario del portal. */
export interface DatosGuardarRelato {
  titulo: string;
  tipo: TipoRelato;
  contenido: string;
  especieId?: string;
  imagenUrl?: string;
}

/** Forma de la fila tal como existe en PostgreSQL. */
interface FilaRelato {
  id: string;
  empresa_id: string;
  titulo: string;
  tipo: TipoRelato;
  contenido: string;
  especie_id: string | null;
  imagen_url: string | null;
}

/** Convierte una fila de la base a nuestro tipo Relato. */
function mapearRelato(fila: FilaRelato): Relato {
  return {
    id: fila.id,
    empresaId: fila.empresa_id,
    titulo: fila.titulo,
    tipo: fila.tipo,
    contenido: fila.contenido,
    especieId: fila.especie_id ?? undefined,
    imagenUrl: fila.imagen_url ?? undefined,
  };
}

/** Construye la fila a insertar/actualizar a partir de la entrada validada. */
function aFila(datos: DatosGuardarRelato) {
  return {
    titulo: datos.titulo,
    tipo: datos.tipo,
    contenido: datos.contenido,
    especie_id: datos.especieId ?? null,
    imagen_url: datos.imagenUrl ?? null,
  };
}

/** Error para cuando la especie vinculada no pertenece al lugar del relato. */
export class EspecieInvalidaError extends Error {
  constructor() {
    super("La especie seleccionada no pertenece a tu lugar.");
    this.name = "EspecieInvalidaError";
  }
}

/** Si el relato cita una especie, verifica que sea de la misma empresa. */
async function validarEspeciePropia(
  empresaId: string,
  especieId?: string
): Promise<void> {
  if (!especieId) return;

  const { data, error } = await obtenerClienteSupabase()
    .from("especies")
    .select("id")
    .eq("id", especieId)
    .eq("empresa_id", empresaId)
    .maybeSingle();

  if (error) throw error;
  if (!data) throw new EspecieInvalidaError();
}

/** Lista los relatos de un lugar, ordenados por tipo y título. */
export async function listarRelatosDeEmpresa(
  empresaId: string
): Promise<Relato[]> {
  const { data, error } = await obtenerClienteSupabase()
    .from("relatos")
    .select("*")
    .eq("empresa_id", empresaId)
    .order("tipo")
    .order("titulo");

  if (error) throw error;
  return ((data as FilaRelato[] | null) ?? []).map(mapearRelato);
}

/** Crea un relato para el lugar del usuario indicado. */
export async function crearRelato(
  empresaId: string,
  datos: DatosGuardarRelato
): Promise<Relato> {
  await validarEspeciePropia(empresaId, datos.especieId);

  const { data, error } = await obtenerClienteSupabase()
    .from("relatos")
    .insert({ empresa_id: empresaId, ...aFila(datos) })
    .select()
    .single();

  if (error) throw error;
  return mapearRelato(data as FilaRelato);
}

/**
 * Actualiza un relato del lugar. Devuelve null si el relato no existe
 * o no pertenece al usuario (protección contra ediciones ajenas).
 */
export async function actualizarRelato(
  empresaId: string,
  id: string,
  datos: DatosGuardarRelato
): Promise<Relato | null> {
  await validarEspeciePropia(empresaId, datos.especieId);

  const { data, error } = await obtenerClienteSupabase()
    .from("relatos")
    .update(aFila(datos))
    .eq("id", id)
    .eq("empresa_id", empresaId)
    .select()
    .maybeSingle();

  if (error) throw error;
  return data ? mapearRelato(data as FilaRelato) : null;
}

/** Elimina un relato del lugar. Devuelve false si no existía o no era propio. */
export async function eliminarRelato(
  empresaId: string,
  id: string
): Promise<boolean> {
  const { data, error } = await obtenerClienteSupabase()
    .from("relatos")
    .delete()
    .eq("id", id)
    .eq("empresa_id", empresaId)
    .select("id")
    .maybeSingle();

  if (error) throw error;
  return Boolean(data);
}