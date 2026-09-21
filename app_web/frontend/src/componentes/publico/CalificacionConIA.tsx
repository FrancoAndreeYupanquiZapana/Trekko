"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

/**
 * Botón "Puntuar con IA": manda a evaluar cada paseo del viajero al backend
 * (la clave de Gemini vive en el servidor). Al terminar refresca la página
 * para que se muestren los puntajes guardados.
 */
export function CalificacionConIA({ paseos }: { paseos: { id: string }[] }) {
  const [ocupado, setOcupado] = useState(false);
  const [mensaje, setMensaje] = useState<string | null>(null);
  const router = useRouter();

  const calificar = async () => {
    setOcupado(true);
    setMensaje(null);
    try {
      let fallo: string | null = null;
      for (const paseo of paseos) {
        const respuesta = await fetch(
          `/api/evaluar-paseo?id=${encodeURIComponent(paseo.id)}`,
          { method: "POST" }
        );
        const cuerpo = (await respuesta.json().catch(() => null)) as {
          exito?: boolean;
          mensaje?: string;
        } | null;
        if (respuesta.status === 503 || cuerpo?.exito !== true) {
          fallo =
            cuerpo?.mensaje ??
            "No se pudo evaluar (el backend quizá no tiene clave de Gemini).";
          break;
        }
      }
      router.refresh();
      setMensaje(
        fallo ? `⚠ ${fallo}` : "✅ Fotos puntuadas y guardadas en el registro."
      );
    } catch {
      setMensaje("⚠ Error de conexión. Intenta otra vez.");
    } finally {
      setOcupado(false);
    }
  };

  return (
    <div className="mt-3 flex flex-col items-center gap-1.5">
      <button
        type="button"
        onClick={() => void calificar()}
        disabled={ocupado}
        className="inline-flex h-11 items-center justify-center gap-2 rounded-full border-2 border-white/40 bg-white/10 px-6 text-sm font-bold text-white transition hover:bg-white/20 active:scale-[0.98] disabled:cursor-wait disabled:opacity-70"
      >
        {ocupado ? (
          <>
            <span className="size-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
            Puntuando con IA…
          </>
        ) : (
          <>🏆 Puntuar con IA</>
        )}
      </button>
      {mensaje && (
        <p className="max-w-md text-center text-xs text-emerald-100">
          {mensaje}
        </p>
      )}
    </div>
  );
}