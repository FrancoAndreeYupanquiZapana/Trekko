import { BarraNavegacion } from "@/componentes/layout/BarraNavegacion";
import { Icono } from "@/componentes/ui/Icono";

/** Layout de la zona pública: navegación + contenido + pie. */
export default function LayoutPublico({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <BarraNavegacion />
      <main className="flex-1">{children}</main>
      <footer className="border-t border-zinc-200 bg-white py-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-1 px-4 text-center text-sm text-zinc-500 sm:px-6">
          <p className="flex items-center justify-center gap-2 font-semibold text-emerald-700">
            <Icono tipo="sendero" className="size-5" />
            Trekko — Turismo amazónico
          </p>
          <p>
            Descarga destinos, camina con GPS y registra la flora y fauna
            mientras exploras.
          </p>
        </div>
      </footer>
    </>
  );
}