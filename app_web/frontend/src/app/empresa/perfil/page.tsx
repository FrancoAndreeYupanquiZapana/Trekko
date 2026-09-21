import type { Metadata } from "next";
import { verificarSesion } from "@/servicios/autenticacionServidor";
import { obtenerPerfilEmpresaServidor } from "@/servicios/empresasServidor";
import { EncabezadoPortal } from "@/componentes/layout/EncabezadoPortal";
import { NavegacionEmpresa } from "@/componentes/empresa/NavegacionEmpresa";
import { FormularioPerfilEmpresa } from "@/componentes/empresa/FormularioPerfilEmpresa";

export const metadata: Metadata = {
  title: "Mi perfil",
  description: "Edita la información pública de tu agencia o lugar turístico.",
};

/** Página "Mi perfil" de la agencia. Solo accesible con sesión EMPRESA. */
export default async function PaginaPerfilEmpresa() {
  const usuario = await verificarSesion("EMPRESA");
  const perfil = await obtenerPerfilEmpresaServidor();

  return (
    <div className="min-h-screen bg-zinc-100">
      <EncabezadoPortal etiquetaRol="EMPRESA" usuario={usuario} />

      <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <h1 className="text-2xl font-bold">Mi perfil</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Los datos de tu agencia se incluyen en el paquete que descargan los
          visitantes para su viaje.
        </p>

        <NavegacionEmpresa paginaActiva="perfil" />

        <div className="mt-8 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm sm:p-8">
          <FormularioPerfilEmpresa perfilInicial={perfil} usuario={usuario} />
        </div>
      </main>
    </div>
  );
}