import { entorno } from "@/config/entorno";

/**
 * POST /api/evaluar-paseo?id=...
 * -------------------------------------------------------------
 * Proxy del mismo origen: el navegador NO habla con Gemini (la clave vive en
 * el servidor). Esta ruta reenvía al backend `POST /api/paseos/:id/evaluar`,
 * que puntúa con IA las fotos y devuelve el JSON con los puntajes.
 * Así funciona igual en Vercel (frontend) sin exponer ninguna clave.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function POST(peticion: Request): Promise<Response> {
  try {
    const url = new URL(peticion.url);
    const id = url.searchParams.get("id")?.trim() ?? "";
    if (!id) {
      return Response.json(
        { exito: false, mensaje: "Falta el id del paseo." },
        { status: 400 }
      );
    }

    const respuesta = await fetch(
      `${entorno.apiUrl}/paseos/${encodeURIComponent(id)}/evaluar`,
      { method: "POST", cache: "no-store" }
    );
    const cuerpo = await respuesta.json().catch(() => null);

    return Response.json(
      cuerpo ?? { exito: false, mensaje: "Respuesta inválida del servidor." },
      { status: respuesta.status }
    );
  } catch {
    return Response.json(
      { exito: false, mensaje: "No se pudo evaluar el paseo." },
      { status: 500 }
    );
  }
}