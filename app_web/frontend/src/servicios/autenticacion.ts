/**
 * Servicio de autenticación del lado del navegador.
 * El frontend se comunica SOLO con la API del backend (nada de Supabase).
 * Los tokens de sesión se guardan en una cookie para que el servidor los
 * pueda leer al renderizar páginas protegidas.
 */
import { entorno } from "@/config/entorno";
import type {
  Credenciales,
  DatosRegistro,
  RespuestaApi,
  RespuestaRegistro,
  Sesion,
  UsuarioSesion,
} from "@/tipos";

/** Nombre de la cookie donde se guarda el token de acceso. */
export const NOMBRE_COOKIE_TOKEN = "tk_token_acceso";

function construirUrl(ruta: string): string {
  return `${entorno.apiUrl}${ruta}`;
}

/** Lee el token de acceso desde las cookies del navegador. */
export function obtenerTokenNavegador(): string | null {
  if (typeof document === "undefined") return null;
  const valor = document.cookie
    .split("; ")
    .find((parte) => parte.startsWith(`${NOMBRE_COOKIE_TOKEN}=`));
  return valor ? decodeURIComponent(valor.split("=")[1]) : null;
}

/** Guarda el token de acceso en una cookie (acceso también desde el servidor). */
export function guardarTokenNavegador(token: string): void {
  document.cookie = `${NOMBRE_COOKIE_TOKEN}=${encodeURIComponent(token)}; path=/; max-age=604800; samesite=lax`;
}

/** Elimina la cookie del token de acceso. */
export function eliminarTokenNavegador(): void {
  document.cookie = `${NOMBRE_COOKIE_TOKEN}=; path=/; max-age=0`;
}

/**
 * Registra una cuenta nueva contra la API del backend.
 * Si Supabase no exige confirmación por correo, la respuesta trae una sesión
 * y se guarda el token para quedar autenticado de inmediato.
 */
export async function registrar(datos: DatosRegistro): Promise<RespuestaRegistro> {
  const respuesta = await fetch(construirUrl("/autenticacion/registro"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(datos),
  });

  const cuerpo = (await respuesta.json().catch(() => null)) as RespuestaApi<RespuestaRegistro> | null;

  if (!respuesta.ok || !cuerpo?.exito || !cuerpo.datos) {
    throw new Error(cuerpo?.mensaje ?? "No se pudo crear la cuenta.");
  }

  if (cuerpo.datos.sesion) {
    guardarTokenNavegador(cuerpo.datos.sesion.tokenAcceso);
  }

  return cuerpo.datos;
}

/**
 * Inicia sesión con email y contraseña contra la API del backend.
 * Devuelve el usuario normalizado de la sesión.
 */
export async function iniciarSesion(credenciales: Credenciales): Promise<UsuarioSesion> {
  const respuesta = await fetch(construirUrl("/autenticacion/ingreso"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: credenciales.email,
      contrasena: credenciales.contrasena,
    }),
  });

  const cuerpo = (await respuesta.json().catch(() => null)) as RespuestaApi<Sesion> | null;

  if (!respuesta.ok || !cuerpo?.exito || !cuerpo.datos) {
    throw new Error(cuerpo?.mensaje ?? "No se pudo iniciar sesión.");
  }

  guardarTokenNavegador(cuerpo.datos.tokenAcceso);
  return cuerpo.datos.usuario;
}

/** Cierra la sesión actual contra la API del backend y limpia la cookie. */
export async function cerrarSesion(): Promise<void> {
  const token = obtenerTokenNavegador();

  try {
    if (token) {
      await fetch(construirUrl("/autenticacion/cerrar-sesion"), {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
    }
  } finally {
    eliminarTokenNavegador();
  }
}

/** Obtiene el usuario autenticado en el navegador llamando al backend (null sin sesión). */
export async function obtenerUsuarioNavegador(): Promise<UsuarioSesion | null> {
  const token = obtenerTokenNavegador();
  if (!token) return null;

  const respuesta = await fetch(construirUrl("/autenticacion/sesion"), {
    headers: { Authorization: `Bearer ${token}` },
  });

  const cuerpo = (await respuesta.json().catch(() => null)) as RespuestaApi<UsuarioSesion> | null;

  if (!respuesta.ok || !cuerpo?.exito) return null;
  return cuerpo.datos ?? null;
}