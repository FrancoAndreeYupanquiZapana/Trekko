/**
 * Tipos de la app móvil de Trekko.
 * Espejo del contrato del backend (paquete v5 y detalle público).
 */

/** Lugar tal como aparece en el catálogo del home (GET /api/empresas). */
export interface LugarTarjeta {
  id: string;
  nombre: string;
  descripcion: string;
  telefono: string;
  logoUrl: string;
  web: string;
  redesSociales: string;
  ubicacion: string;
}

/** Imagen optimizada incrustada en el paquete v5. */
export interface ImagenPaquete {
  /** JPEG en formato data URI (render directo en <Image>). */
  datos: string;
  ancho: number;
  alto: number;
}

/** Empresa dentro del paquete v5. */
export interface EmpresaPaquete {
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
export interface EspeciePaquete {
  id: string;
  nombreComun: string;
  nombreCientifico: string;
  familia: string;
  tipo: string;
  descripcion: string;
  estadoConservacion: string;
  imagenUrl: string;
  imagen: ImagenPaquete | null;
}

/** Relato local dentro del paquete v5. */
export interface RelatoPaquete {
  id: string;
  titulo: string;
  tipo: string;
  contenido: string;
  especieId: string;
  imagenUrl: string;
  imagen: ImagenPaquete | null;
}

/** Afiche informativo dentro del paquete v5. */
export interface AfichePaquete {
  id: string;
  titulo: string;
  descripcion: string;
  imagenUrl: string;
  imagen: ImagenPaquete | null;
}

/**
 * Paquete v5 completo descargado de /api/empresas/:id/paquete-app.
 * Se guarda tal cual (JSON.stringify) en SQLite.
 */
export interface PaqueteLugar {
  /** Versión del formato del paquete (5). */
  version: number;
  formato: "trekko";
  /** Fecha ISO de generación. */
  generado: string;
  /** Revisión del contenido: cambia cuando el dueño actualiza el lugar. */
  revision: string;
  empresa: EmpresaPaquete;
  especies: EspeciePaquete[];
  relatos: RelatoPaquete[];
  afiches: AfichePaquete[];
}

/** Detalle público remoto (GET /api/empresas/:id) para vista previa y revisiones. */
export interface DetalleRemoto {
  empresa: LugarTarjeta;
  especies: EspeciePaquete[];
  relatos: RelatoPaquete[];
  afiches: AfichePaquete[];
  /** Revisión remota: se compara contra la del paquete local. */
  revisionLugar: string;
}