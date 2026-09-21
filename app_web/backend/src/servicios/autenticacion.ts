import { createClient } from "@supabase/supabase-js";
import { entorno } from "../config/entorno.js";
import {
  crearClienteAutenticacionEfimero,
  obtenerClienteSupabase,
} from "../config/supabase.js";
import type { Sesion, UsuarioSesion } from "../tipos/index.js";

/**
 * Servicio de autenticación. Única fuente de lógica de Negocio de auth.
 * El resto del backend importa funciones desde aquí, sin repetir código.
 */

/** Normaliza un usuario de Supabase a nuestro tipo UsuarioSesion. */
function normalizarUsuario(
  datosUsuario: {
    id?: string;
    email?: string;
    user_metadata?: Record<string, unknown> | null;
  },
  rolPorDefecto = "TURISTA"
): UsuarioSesion {
  const metadatos = datosUsuario.user_metadata ?? {};
  return {
    id: datosUsuario.id ?? "",
    email: datosUsuario.email ?? "",
    nombre: typeof metadatos.nombre === "string" ? metadatos.nombre : undefined,
    apellido: typeof metadatos.apellido === "string" ? metadatos.apellido : undefined,
    rol: typeof metadatos.rol === "string" ? metadatos.rol : rolPorDefecto,
  };
}

/**
 * Registra una agencia o lugar turístico y deja su sesión iniciada.
 * Usa la API admin (service_role) con email_confirm: true para no depender
 * de la confirmación por correo ni del límite de envíos de Supabase.
 * En el portal web SOLO se registran cuentas de rol EMPRESA (las cuentas de
 * turista pertenecen a la app móvil).
 */
export async function registrar(datos: {
  email: string;
  contrasena: string;
  /** Nombre del lugar o establecimiento (ej. "Lago Sandoval"). */
  nombre: string;
}): Promise<{ usuario: UsuarioSesion; sesion: Sesion | null }> {
  const cliente = obtenerClienteSupabase();

  const { data: creado, error: errorCreacion } = await cliente.auth.admin.createUser({
    email: datos.email,
    password: datos.contrasena,
    email_confirm: true,
    user_metadata: {
      nombre: datos.nombre,
      rol: "EMPRESA",
    },
  });

  if (errorCreacion) throw errorCreacion;
  if (!creado.user) throw new Error("No se pudo crear el usuario.");

  const usuario = normalizarUsuario(creado.user, "EMPRESA");

  // Inicia la sesión del usuario recién creado para devolver los tokens.
  // Se usa un cliente efímero para no contaminar la sesión del cliente
  // compartido (que debe seguir operando como service_role).
  const clienteAuth = crearClienteAutenticacionEfimero();
  const { data: datosSesion, error: errorSesion } = await clienteAuth.auth.signInWithPassword({
    email: datos.email,
    password: datos.contrasena,
  });

  if (errorSesion || !datosSesion.session) {
    return { usuario, sesion: null };
  }

  return {
    usuario,
    sesion: {
      tokenAcceso: datosSesion.session.access_token,
      tokenRefresco: datosSesion.session.refresh_token,
      usuario,
    },
  };
}

/** Inicia sesión y devuelve la sesión con sus tokens. */
export async function iniciarSesion(datos: {
  email: string;
  contrasena: string;
}): Promise<Sesion> {
  // Cliente efímero: iniciar sesión no debe fijar la sesión del cliente
  // compartido (debe seguir siendo service_role para leer/escribir la BD).
  const clienteAuth = crearClienteAutenticacionEfimero();
  const { data, error: errorSupabase } = await clienteAuth.auth.signInWithPassword({
    email: datos.email,
    password: datos.contrasena,
  });

  if (errorSupabase) throw errorSupabase;
  if (!data.session || !data.user) throw new Error("Credenciales inválidas.");

  return {
    tokenAcceso: data.session.access_token,
    tokenRefresco: data.session.refresh_token,
    usuario: normalizarUsuario(data.user, "TURISTA"),
  };
}

/** Cierra la sesión del token indicado revocando la sesión del usuario. */
export async function cerrarSesion(token: string): Promise<void> {
  // Cliente efímero "disfrazado" del usuario: revoca SOLO su sesión con su
  // propio token, sin depender de la clave (anon o service_role) configurada.
  const clienteSesion = createClient(entorno.supabaseUrl, entorno.supabaseServiceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });

  const { error: errorSupabase } = await clienteSesion.auth.signOut({ scope: "local" });
  if (errorSupabase) throw errorSupabase;
}

/** Verifica un token JWT y devuelve el usuario autenticado. */
export async function obtenerUsuarioDesdeToken(token: string): Promise<UsuarioSesion | null> {
  const { data, error } = await obtenerClienteSupabase().auth.getUser(token);

  if (error || !data.user) return null;
  return normalizarUsuario(data.user, "TURISTA");
}