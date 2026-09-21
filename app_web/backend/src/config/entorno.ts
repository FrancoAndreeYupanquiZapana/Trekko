import "dotenv/config";

/**
 * Configuración centralizada del backend.
 * Todas las variables de entorno se leen desde un solo lugar.
 */
export const entorno = {
  /** Puerto donde escucha la API. Por defecto 4000. */
  puerto: Number(process.env.PUERTO ?? 4000),

  /** URL del proyecto en Supabase. */
  supabaseUrl: process.env.SUPABASE_URL ?? "",

  /** Clave service_role de Supabase (solo para el servidor). */
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",

  /** Clave de la API de Gemini (solo servidor). Sin ella, la IA queda desactivada. */
  geminiApiKey: process.env.GEMINI_API_KEY ?? "",

  /** Modelo de Gemini para puntuar fotos y escribir el recuerdo. */
  geminiModelo: process.env.GEMINI_MODELO ?? "gemini-3.5-flash",
} as const;

export function validarEntorno(): void {
  const faltantes: string[] = [];

  if (!entorno.supabaseUrl) faltantes.push("SUPABASE_URL");
  if (!entorno.supabaseServiceRoleKey) faltantes.push("SUPABASE_SERVICE_ROLE_KEY");

  if (faltantes.length > 0) {
    throw new Error(
      `Faltan variables de entorno: ${faltantes.join(", ")}. Revisa el archivo .env o .env.example.`
    );
  }
}