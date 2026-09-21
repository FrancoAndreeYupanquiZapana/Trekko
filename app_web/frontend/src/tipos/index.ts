/** Tipos compartidos del frontend (autenticación y usuarios). */

/** Credenciales recibidas en el formulario de inicio de sesión. */
export interface Credenciales {
  email: string;
  contrasena: string;
}

/** Usuario normalizado para la aplicación. */
export interface UsuarioSesion {
  id: string;
  email: string;
  nombre?: string;
  apellido?: string;
  /** Rol del usuario: ADMIN, EMPRESA o TURISTA. */
  rol: string;
}

/** Sesión completa devuelta por el backend al iniciar sesión. */
export interface Sesion {
  tokenAcceso: string;
  tokenRefresco: string;
  usuario: UsuarioSesion;
}

/** Forma estándar de respuesta de la API del backend. */
export interface RespuestaApi<T = unknown> {
  exito: boolean;
  mensaje?: string;
  datos?: T;
  errores?: unknown[];
}

/** Datos para crear la cuenta de una agencia o lugar turístico. */
export interface DatosRegistro {
  email: string;
  contrasena: string;
  /** Nombre del lugar o establecimiento (ej. "Lago Sandoval"). */
  nombre: string;
}

/** Resultado del registro: usuario creado y sesión (si ya quedó autenticado). */
export interface RespuestaRegistro {
  usuario: UsuarioSesion;
  /** Null si Supabase exige confirmación por correo antes de iniciar sesión. */
  sesion: Sesion | null;
}

/** Perfil de la agencia/lugar turístico (tabla public.empresas). */
export interface PerfilEmpresa {
  id: string;
  /** ID del usuario de Supabase Auth dueño del perfil. */
  usuarioId: string;
  /** Nombre del lugar o establecimiento (ej. "Lago Sandoval"). */
  nombre: string;
  descripcion?: string;
  telefono?: string;
  logoUrl?: string;
  web?: string;
  /** Redes sociales, una por línea. */
  redesSociales?: string;
  ubicacion?: string;
}

/** Datos del perfil editables desde el formulario del portal. */
export interface DatosPerfilEmpresa {
  nombre: string;
  telefono?: string;
  descripcion?: string;
  logoUrl?: string;
  web?: string;
  redesSociales?: string;
  ubicacion?: string;
}

/** Tipo de especie: FLORA (plantas) o FAUNA (animales). */
export type TipoEspecie = "FLORA" | "FAUNA";

/** Especie (flora o fauna) registrada por una agencia (tabla public.especies). */
export interface Especie {
  id: string;
  /** ID del usuario dueño (agencia) de la especie. */
  empresaId: string;
  /** Nombre común con el que la conocen los visitantes. */
  nombreComun: string;
  /** Nombre científico (ej. "Caiman crocodilus"). */
  nombreCientifico?: string;
  familia?: string;
  tipo: TipoEspecie;
  descripcion?: string;
  /** Estado de conservación (ej. "En peligro", "Vulnerable"). */
  estadoConservacion?: string;
  /** URL de la imagen en Supabase Storage. */
  imagenUrl?: string;
}

/** Datos de una especie editables desde el formulario del portal. */
export interface DatosEspecie {
  nombreComun: string;
  nombreCientifico?: string;
  familia?: string;
  tipo: TipoEspecie;
  descripcion?: string;
  estadoConservacion?: string;
  imagenUrl?: string;
}

/** Tipo de relato local: historia o saber que solo conoce la gente del lugar. */
export type TipoRelato = "MITO" | "LEYENDA" | "DATO_CURIOSO" | "SIMBIOSIS";

/** Relato local (tabla public.relatos): mitos, leyendas, datos curiosos y simbiosis. */
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

/** Datos de un relato editables desde el formulario del portal. */
export interface DatosRelato {
  titulo: string;
  tipo: TipoRelato;
  contenido: string;
  especieId?: string;
  imagenUrl?: string;
}

/** Afiche informativo del lugar (tabla public.afiches). */
export interface Afiche {
  id: string;
  /** ID del usuario dueño (agencia) del afiche. */
  empresaId: string;
  /** Título breve (ej. "Reglas del sendero"). */
  titulo: string;
  /** Descripción o detalle del afiche (opcional). */
  descripcion?: string;
  /** URL de la imagen del afiche en Supabase Storage. */
  imagenUrl: string;
}

/** Datos de un afiche editables desde el formulario del portal. */
export interface DatosAfiche {
  titulo: string;
  descripcion?: string;
  imagenUrl: string;
}

/** Qué contenido muestra un punto de interés al acercarse. */
export type TipoPunto = "AFICHE" | "ESPECIE" | "NOTA";

/** Punto geolocalizado del lugar (tabla public.puntos). */
export interface PuntoInteres {
  id: string;
  /** ID del usuario dueño (agencia) del punto. */
  empresaId: string;
  /** Latitud marcada en el mapa. */
  lat: number;
  /** Longitud marcada en el mapa. */
  lng: number;
  /** Radio en metros dentro del cual salta el aviso en el celular. */
  radioM: number;
  tipo: TipoPunto;
  /** Afiche vinculado (cuando tipo = AFICHE). */
  aficheId?: string;
  /** Especie vinculada (cuando tipo = ESPECIE). */
  especieId?: string;
  /** Título propio (notas). */
  titulo?: string;
  /** Texto o advertencia adicional. */
  descripcion?: string;
  /** URL de la imagen propia (notas). */
  imagenUrl?: string;
}

/** Datos de un punto editables desde el formulario del portal. */
export interface DatosPunto {
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

/** Detalle de un lugar para la página pública /lugar/:id. */
export interface DetalleLugarPublico {
  empresa: PerfilEmpresa;
  especies: Especie[];
  relatos: Relato[];
  /** Afiches informativos del lugar: reglas, seguridad y especies protegidas. */
  afiches: Afiche[];
  /** Puntos geolocalizados que muestran un aviso al acercarse. */
  puntos: PuntoInteres[];
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

/** Un punto del track GPS de un paseo. */
export interface PuntoPaseo {
  lat: number;
  lng: number;
  timestamp?: string;
}

/** Evaluación con IA de una foto: puntaje 0-10 + validación de zona. */
export interface EvaluacionFoto {
  /** Índice (orden) de la foto dentro del paseo. */
  indice: number;
  url: string;
  lat: number;
  lng: number;
  /** Distancia mínima en metros al recorrido (para validar la zona). */
  distanciaMinimaM: number | null;
  /** true si está dentro de la zona del recorrido; null sin track. */
  enZona: boolean | null;
  /** Puntaje estético 0-10 (IA); null si no se pudo puntuar. */
  puntaje: number | null;
  /** Justificación breve de la IA. */
  justificacion: string | null;
}

/** Evaluación con IA completa de un paseo (se guarda en public.paseos). */
export interface EvaluacionPaseo {
  fotos: EvaluacionFoto[];
  /** Promedio de los puntajes IA (0-10). */
  puntajePromedio: number | null;
  /** Modelo de Gemini usado. */
  modelo: string;
  fechaEvaluacion: string;
}

/**
 * Paseo público: "El viaje de {nombre} en {lugar}".
 * Un turista puede tener varios paseos (mismo DNI) y la página los acumula.
 */
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
  /** Evaluación con IA guardada (puntajes por foto + validación de zona). */
  evaluacion?: EvaluacionPaseo;
  /** Promedio del puntaje IA (0-10). */
  puntajePromedio?: number;
  creadoEn: string;
}
