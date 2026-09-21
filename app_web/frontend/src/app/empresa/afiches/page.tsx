import type { Metadata } from "next";
import { verificarSesion } from "@/servicios/autenticacionServidor";
import { listarMisAfichesServidor } from "@/servicios/afichesServidor";
import { EncabezadoPortal } from "@/componentes/layout/EncabezadoPortal";
import { NavegacionEmpresa } from "@/componentes/empresa/NavegacionEmpresa";
import { GestionAfiches } from "@/componentes/empresa/GestionAfiches";

export const metadata: Metadata = {
  title: "Afiches informativos",
  description: "Reglas, seguridad y especies protegidas de tus senderos.",
};

/** Página "Afiches" de la agencia. Solo accesible con sesión EMPRESA. */
export default async function PaginaAfichesEmpresa() {
  const usuario = await verificarSesion("EMPRESA");
  const afiches = await listarMisAfichesServidor();

  return (
    <div className="min-h-screen bg-zinc-100">
      <EncabezadoPortal etiquetaRol="EMPRESA" usuario={usuario} />

      <main className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
        <h1 className="text-2xl font-bold">Afiches informativos</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Sube las imágenes con las reglas, recomendaciones de seguridad y
          especies protegidas de tus senderos. Se ven en tu página pública y se
          descargan con el paquete del lugar para la app.
        </p>

        <NavegacionEmpresa paginaActiva="afiches" />

        <GestionAfiches afichesIniciales={afiches} />
      </main>
    </div>
  );
}