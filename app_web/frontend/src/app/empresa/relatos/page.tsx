import type { Metadata } from "next";
import { verificarSesion } from "@/servicios/autenticacionServidor";
import { listarMisRelatosServidor } from "@/servicios/relatosServidor";
import { listarMisEspeciesServidor } from "@/servicios/especiesServidor";
import { EncabezadoPortal } from "@/componentes/layout/EncabezadoPortal";
import { NavegacionEmpresa } from "@/componentes/empresa/NavegacionEmpresa";
import { GestionRelatos } from "@/componentes/empresa/GestionRelatos";

export const metadata: Metadata = {
  title: "Relatos locales",
  description: "Mitos, leyendas, datos curiosos y simbiosis de tu lugar.",
};

/** Página "Relatos locales" de la agencia. Solo accesible con sesión EMPRESA. */
export default async function PaginaRelatosEmpresa() {
  const usuario = await verificarSesion("EMPRESA");
  const [relatos, especies] = await Promise.all([
    listarMisRelatosServidor(),
    listarMisEspeciesServidor(),
  ]);

  return (
    <div className="min-h-screen bg-zinc-100">
      <EncabezadoPortal etiquetaRol="EMPRESA" usuario={usuario} />

      <main className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
        <h1 className="text-2xl font-bold">Relatos locales</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Cuenta los mitos y leyendas de tu lugar, los datos curiosos de tus
          especies y las simbiosis de la naturaleza. Se descargan con el paquete
          y aparecen como &ldquo;historias del guía&rdquo; en la app.
        </p>

        <NavegacionEmpresa paginaActiva="relatos" />

        <GestionRelatos
          relatosIniciales={relatos}
          especiesIniciales={especies}
        />
      </main>
    </div>
  );
}