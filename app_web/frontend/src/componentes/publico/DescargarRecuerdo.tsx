"use client";

import { useState } from "react";

/**
 * Botón "Generar y descargar recuerdo": pide el PDF al route handler
 * /api/recuerdo y lo descarga (collage imprimible de las fotos del viajero).
 */
export function DescargarRecuerdo({ dni }: { dni: string }) {
  const [generando, setGenerando] = useState(false);
  const [mensaje, setMensaje] = useState<string | null>(null);

  const generar = async () => {
    setGenerando(true);
    setMensaje(null);
    try {
      const respuesta = await fetch(
        `/api/recuerdo?dni=${encodeURIComponent(dni)}`
      );
      if (!respuesta.ok) {
        const texto = await respuesta.text().catch(() => "");
        throw new Error(
          texto || `No se pudo generar el recuerdo (${respuesta.status}).`
        );
      }
      const blob = await respuesta.blob();
      const url = URL.createObjectURL(blob);
      const enlace = document.createElement("a");
      enlace.href = url;
      enlace.download = `recuerdo-${dni}.pdf`;
      document.body.appendChild(enlace);
      enlace.click();
      enlace.remove();
      setTimeout(() => URL.revokeObjectURL(url), 4000);
      setMensaje("✅ PDF descargado. Ábrelo o imprímelo 🖨️");
    } catch (causa) {
      setMensaje(
        causa instanceof Error
          ? causa.message
          : "No se pudo generar el recuerdo. Inténtalo otra vez."
      );
    } finally {
      setGenerando(false);
    }
  };

  return (
    <div className="mt-7 flex flex-col items-center gap-2">
      <button
        type="button"
        onClick={() => void generar()}
        disabled={generando}
        className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-white px-7 text-sm font-bold text-emerald-800 shadow-lg transition hover:bg-emerald-50 active:scale-[0.98] disabled:cursor-wait disabled:opacity-70"
      >
        {generando ? (
          <>
            <span className="size-4 animate-spin rounded-full border-2 border-emerald-700 border-t-transparent" />
            Generando tu recuerdo…
          </>
        ) : (
          <>📸 Generar y descargar recuerdo (PDF)</>
        )}
      </button>
      {mensaje && (
        <p className="max-w-md text-center text-sm text-emerald-100">
          {mensaje}
        </p>
      )}
    </div>
  );
}