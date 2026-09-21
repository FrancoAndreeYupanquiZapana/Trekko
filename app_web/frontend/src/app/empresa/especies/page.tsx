import type { Metadata } from "next";
import { verificarSesion } from "@/servicios/autenticacionServidor";
import { listarMisEspeciesServidor } from "@/servicios/especiesServidor";
import { EncabezadoPortal } from "@/componentes/layout/EncabezadoPortal";
import { NavegacionEmpresa } from "@/componentes/empresa/NavegacionEmpresa";
import { GestionEspecies } from "@/componentes/empresa/GestionEspecies";

export const metadata: Metadata = {
  title: "Flora y fauna",
  description: "Agrega las especies de tu lugar para incluirlas en la descarga.",
};

/** Página "Flora y fauna" de la agencia. Solo accesible con sesión EMPRESA. */
export default async function PaginaEspeciesEmpresa() {
  const usuario = await verificarSesion("EMPRESA");
  const especies = await listarMisEspeciesServidor();

  return (
    <div className="min-h-screen bg-zinc-100">
      <EncabezadoPortal etiquetaRol="EMPRESA" usuario={usuario} />

      <main className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
        <h1 className="text-2xl font-bold">Flora y fauna</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Registra las especies de tu lugar. Todas se incluyen en el paquete
          que los visitantes descargan para su viaje sin conexión.
        </p>

        <NavegacionEmpresa paginaActiva="especies" />

        <GestionEspecies especiesIniciales={especies} />
      </main>
    </div>
  );
}