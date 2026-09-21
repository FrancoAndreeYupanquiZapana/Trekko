/** Tipos compartidos de autenticación y respuestas de la API. */

/** Metadatos del usuario almacenados en Supabase Auth. */
export interface MetadatosUsuario {
  nombre?: string;
  apellido?: string;
  /** Rol del usuario: ADMIN, EMPRESA o TURISTA. */
  rol?: string;
}

/** Usuario autenticado normalizado para la API. */
export interface UsuarioSesion {
  id: string;
  email: string;
  nombre?: string;
  apellido?: string;
  rol: string;
}

/** Sesión devuelta al iniciar sesión. */
export interface Sesion {
  /** Token JWT de acceso. */
  tokenAcceso: string;
  /** Token de refresco. */
  tokenRefresco: string;
  usuario: UsuarioSesion;
}

/** Cuerpo estándar de toda respuesta de la API. */
export interface RespuestaApi<T = unknown> {
  exito: boolean;
  mensaje?: string;
  datos?: T;
  errores?: unknown[];
}

/** Tabla public.empresas */
export interface PerfilEmpresa {
  id: string;
  /** ID del usuario de Supabase Auth dueño del perfil. */
  usuarioId: string;
  /** Nombre del lugar o establecimiento (ej. "Lago Sandoval"). */
  nombre: string;
  /** Descripción breve del lugar. */
  descripcion?: string;
  telefono?: string;
  logoUrl?: string;
  web?: string;
  /** Redes sociales, una por línea. */
  redesSociales?: string;
  ubicacion?: string;
}

/** Tipo de especie: FLORA (plantas) o FAUNA (animales). */
export type TipoEspecie = "FLORA" | "FAUNA";

/** Tabla public.especies — flora y fauna de un lugar. */
export interface Especie {
  id: string;
  /** ID del usuario dueño (empresa) de la especie. */
  empresaId: string;
  /** Nombre común con el que la conocen los visitantes. */
  nombreComun: string;
  /** Nombre científico (ej. "Caiman crocodilus"). */
  nombreCientifico?: string;
  familia?: string;
  tipo: TipoEspecie;
  /** Descripción breve para los visitantes. */
  descripcion?: string;
  /** Estado de conservación (ej. "En peligro", "Vulnerable"). */
  estadoConservacion?: string;
  /** URL de la imagen en Supabase Storage. */
  imagenUrl?: string;
}

/** Tipo de relato local: historia o saber que solo conoce la gente del lugar. */
export type TipoRelato = "MITO" | "LEYENDA" | "DATO_CURIOSO" | "SIMBIOSIS";

/** Tabla public.relatos — mitos, leyendas, datos curiosos y simbiosis. */
export interface Relato {
  id: string;
  /** ID del usuario dueño (empresa) del relato. */
  empresaId: string;
  titulo: string;
  tipo: TipoRelato;
  contenido: string;
  /** Especie asociada del mismo lugar (opcional). */
  especieId?: string;
  /** URL de la imagen ilustrativa en Supabase Storage. */
  imagenUrl?: string;
}

/** Tabla public.afiches — afiches informativos del lugar. */
export interface Afiche {
  id: string;
  /** ID del usuario dueño (empresa) del afiche. */
  empresaId: string;
  /** Título breve (ej. "Reglas del sendero"). */
  titulo: string;
  /** Descripción o detalle del afiche (opcional). */
  descripcion?: string;
  /** URL de la imagen del afiche en Supabase Storage. */
  imagenUrl: string;
}

/** Qué contenido muestra un punto de interés al acercarse. */
export type TipoPunto = "AFICHE" | "ESPECIE" | "NOTA";

/** Tabla public.puntos — puntos geolocalizados del lugar. */
export interface PuntoInteres {
  id: string;
  /** ID del usuario dueño (empresa) del punto. */
  empresaId: string;
  lat: number;
  lng: number;
  /** Radio en metros dentro del cual salta el aviso en el celular. */
  radioM: number;
  tipo: TipoPunto;
  /** Afiche vinculado (cuando tipo = AFICHE). */
  aficheId?: string;
  /** Especie vinculada (cuando tipo = ESPECIE). */
  especieId?: string;
  /** Título propio (notas o anulación del vinculado). */
  titulo?: string;
  /** Descripción o advertencia propia. */
  descripcion?: string;
  /** URL de la imagen propia (notas). */
  imagenUrl?: string;
}

/** Una foto publicada en un paseo (tabla public.paseos). */
export interface FotoPaseo {
  /** URL pública de la imagen en Supabase Storage. */
  url: string;
  lat: number;
  lng: number;
  timestamp?: string;
  descripcion?: string;
}

/** Un punto del track GPS del paseo. */
export interface PuntoPaseo {
  lat: number;
  lng: number;
  timestamp?: string;
}

/** Evaluación con IA de una foto del paseo. */
export interface EvaluacionFoto {
  /** Índice (orden) de la foto dentro del paseo. */
  indice: number;
  url: string;
  lat: number;
  lng: number;
  /** Distancia mínima en metros a la línea del recorrido (validación de zona). */
  distanciaMinimaM: number | null;
  /** true si está dentro del recorrido (≤250 m); null si no hay track. */
  enZona: boolean | null;
  /** Puntaje estético 0-10 dado por Gemini (null si no se pudo puntuar). */
  puntaje: number | null;
  /** Justificación breve de la IA. */
  justificacion: string | null;
}

/** Evaluación con IA completa de un paseo (se guarda en public.paseos). */
export interface EvaluacionPaseo {
  fotos: EvaluacionFoto[];
  /** Promedio de los puntajes IA (0-10). */
  puntajePromedio: number | null;
  /** Quién/cómo se generó (modelo de Gemini usado). */
  modelo: string;
  fechaEvaluacion: string;
}

/** Tabla public.paseos — "El viaje de {nombre} en {lugar}". */
export interface Paseo {
  id: string;
  /** Documento del turista: agrupa todos sus viajes en una página. */
  dni: string;
  nombre: string;
  /** Id del lugar visitado (empresa/paquete). */
  lugarId?: string;
  /** Nombre legible del lugar visitado. */
  lugarNombre?: string;
  /** Fecha de la experiencia (inicio del recorrido). */
  fechaExperiencia?: string;
  /** Track GPS completo de la caminata. */
  track: PuntoPaseo[];
  /** Mejores fotos elegidas por el turista. */
  fotos: FotoPaseo[];
  /** Evaluación con IA guardada (si ya se puntuó). */
  evaluacion?: EvaluacionPaseo;
  /** Promedio del puntaje IA (0-10). */
  puntajePromedio?: number;
  creadoEn: string;
}

/** Detalle de un lugar para la página pública /lugar/:id. */
export interface DetalleLugarPublico {
  empresa: PerfilEmpresa;
  especies: Especie[];
  relatos: Relato[];
  /** Afiches informativos del lugar: reglas, seguridad y especies protegidas. */
  afiches: Afiche[];
  /** Puntos geolocalizados que muestran un afiche/especie/nota al acercarse. */
  puntos: PuntoInteres[];
  /**
   * Revisión del contenido (fecha del último cambio). La app la compara para
   * saber si el paquete descargado quedó desactualizado.
   */
  revisionLugar: string;
}