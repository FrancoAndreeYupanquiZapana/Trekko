import { obtenerClienteSupabase } from "../config/supabase.js";
import type {
  EvaluacionPaseo,
  FotoPaseo,
  Paseo,
  PuntoPaseo,
} from "../tipos/index.js";

/**
 * Servicio de paseos: los envíos de la galería móvil ("El viaje de {nombre}
 * en {lugar}") con las mejores fotos y el track GPS completo del recorrido.
 *
 * Viven en la tabla public.paseos y se agrupan por DNI: la página pública
 * se reutiliza y acumula lugares/fechas sin borrar lo anterior.
 */

/** Datos ya validados y con las fotos subidas, listos para insertar. */
export interface DatosCrearPaseo {
  dni: string;
  nombre: string;
  lugarId: string | null;
  lugarNombre: string | null;
  fechaExperiencia: string | null;
  track: PuntoPaseo[];
  fotos: FotoPaseo[];
}

/** Forma de la fila tal como existe en PostgreSQL. */
interface FilaPaseo {
  id: string;
  dni: string;
  nombre: string;
  lugar_id: string | null;
  lugar_nombre: string | null;
  fecha_experiencia: string | null;
  track: PuntoPaseo[] | null;
  fotos: FotoPaseo[] | null;
  /** Evaluación con IA (puntajes + validación de zona). Columnas de la migración 006. */
  evaluacion: EvaluacionPaseo | null;
  puntaje_promedio: number | null;
  creado_en: string;
}

/** Convierte una fila de la base a nuestro tipo Paseo. */
function mapearPaseo(fila: FilaPaseo): Paseo {
  return {
    id: fila.id,
    dni: fila.dni,
    nombre: fila.nombre,
    lugarId: fila.lugar_id ?? undefined,
    lugarNombre: fila.lugar_nombre ?? undefined,
    fechaExperiencia: fila.fecha_experiencia ?? undefined,
    track: fila.track ?? [],
    fotos: fila.fotos ?? [],
    evaluacion: fila.evaluacion ?? undefined,
    puntajePromedio: fila.puntaje_promedio ?? undefined,
    creadoEn: fila.creado_en,
  };
}

/** Publica un paseo nuevo y devuelve la fila creada. */
export async function crearPaseo(datos: DatosCrearPaseo): Promise<Paseo> {
  const { data, error } = await obtenerClienteSupabase()
    .from("paseos")
    .insert({
      dni: datos.dni,
      nombre: datos.nombre,
      lugar_id: datos.lugarId,
      lugar_nombre: datos.lugarNombre,
      fecha_experiencia: datos.fechaExperiencia,
      track: datos.track,
      fotos: datos.fotos,
    })
    .select("*")
    .single();

  if (error) throw error;
  return mapearPaseo(data as FilaPaseo);
}

/**
 * Todos los paseos de un DNI, del más reciente al más antiguo.
 * Es la base de la página pública reutilizable /paseo/:dni.
 */
export async function listarPaseosPorDni(dni: string): Promise<Paseo[]> {
  const { data, error } = await obtenerClienteSupabase()
    .from("paseos")
    .select("*")
    .eq("dni", dni)
    .order("creado_en", { ascending: false });

  if (error) throw error;
  return ((data as FilaPaseo[] | null) ?? []).map(mapearPaseo);
}

/** Un paseo completo por su id, o null si no existe. */
export async function obtenerPaseoPorId(id: string): Promise<Paseo | null> {
  if (!id) return null;
  const { data, error } = await obtenerClienteSupabase()
    .from("paseos")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  return data ? mapearPaseo(data as FilaPaseo) : null;
}

/**
 * Guarda la evaluación con IA de un paseo (puntajes por foto + más).
 * Si la columna aún no existe (migración 006 pendiente), lanza error y el
 * controlador lo convierte en "no se pudo guardar", sin romper la consulta.
 */
export async function guardarEvaluacionPaseo(
  id: string,
  evaluacion: EvaluacionPaseo
): Promise<void> {
  const { error } = await obtenerClienteSupabase()
    .from("paseos")
    .update({
      evaluacion,
      puntaje_promedio: evaluacion.puntajePromedio,
    })
    .eq("id", id);

  if (error) throw error;
}

/**
 * Paseos recientes publicados por cualquier turista (muro público).
 * Omite el `track` completo (hasta 5000 puntos por paseo): el muro solo muestra
 * la portada y los datos del viajero, así la respuesta queda liviana.
 */
export async function listarPaseosRecientes(limite = 40): Promise<Paseo[]> {
  const { data, error } = await obtenerClienteSupabase()
    .from("paseos")
    .select(
      "id, dni, nombre, lugar_id, lugar_nombre, fecha_experiencia, fotos, creado_en"
    )
    .order("creado_en", { ascending: false })
    .limit(limite);

  if (error) throw error;
  return ((data as FilaPaseo[] | null) ?? []).map(mapearPaseo);
}
