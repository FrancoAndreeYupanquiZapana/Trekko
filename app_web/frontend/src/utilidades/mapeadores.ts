import type { UsuarioSesion } from "@/tipos";

/** Datos de un usuario tal como los entrega la API del backend. */
export interface DatosUsuarioApi {
  id?: string;
  email?: string;
  nombre?: string;
  apellido?: string;
  rol?: string;
}

/** Convierte un usuario de la API al tipo UsuarioSesion de la aplicación. */
export function normalizarUsuario(
  datos: DatosUsuarioApi,
  rolPorDefecto = "TURISTA"
): UsuarioSesion {
  return {
    id: datos.id ?? "",
    email: datos.email ?? "",
    nombre: datos.nombre,
    apellido: datos.apellido,
    rol: datos.rol ?? rolPorDefecto,
  };
}