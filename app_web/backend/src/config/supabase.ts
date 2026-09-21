import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { entorno, validarEntorno } from "./entorno.js";

/**
 * Cliente único de Supabase para todo el backend.
 * Se crea de forma perezosa (lazy) la primera vez que se usa, previa
 * validación de las variables de entorno. Esto permite arrancar la API
 * incluso sin credenciales y mostrar un error claro si faltan.
 */

let clienteSupabase: SupabaseClient | null = null;

/** Devuelve el cliente de Supabase, creándolo la primera vez que se usa. */
export function obtenerClienteSupabase(): SupabaseClient {
  if (!clienteSupabase) {
    validarEntorno();
    clienteSupabase = createClient(entorno.supabaseUrl, entorno.supabaseServiceRoleKey);
  }
  return clienteSupabase;
}

/**
 * Crea un cliente de Supabase EFÍMERO para operaciones de autenticación
 * (iniciar sesión, refrescar tokens, etc.).
 *
 * Es indispensable que NO sea el cliente compartido: `signInWithPassword`
 * guarda la sesión del usuario dentro del cliente y, si eso ocurre en el
 * cliente global (service_role), todas las consultas posteriores dejarían
 * de ejecutarse con permisos de administrador y quedarían sujetas a RLS
 * (el catálogo aparecería vacío). Este cliente se descarta al terminar.
 */
export function crearClienteAutenticacionEfimero(): SupabaseClient {
  validarEntorno();
  return createClient(entorno.supabaseUrl, entorno.supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  });
}