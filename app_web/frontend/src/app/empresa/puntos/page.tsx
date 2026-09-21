import type { Metadata } from "next";
import { verificarSesion } from "@/servicios/autenticacionServidor";
import { listarMisPuntosServidor } from "@/servicios/puntosServidor";
import { listarMisAfichesServidor } from "@/servicios/afichesServidor";
import { listarMisEspeciesServidor } from "@/servicios/especiesServidor";
import { EncabezadoPortal } from "@/componentes/layout/EncabezadoPortal";
import { NavegacionEmpresa } from "@/componentes/empresa/NavegacionEmpresa";
import { GestionPuntos } from "@/componentes/empresa/GestionPuntos";

export const metadata: Metadata = {
  title: "Puntos de interés",
  description:
    "Marca puntos en el mapa y muestra un aviso automático al turista que se acerca.",
};

/** Página "Puntos de interés" de la agencia. Solo accesible con sesión EMPRESA. */
export default async function PaginaPuntosEmpresa() {
  const usuario = await verificarSesion("EMPRESA");
  const [puntos, afiches, especies] = await Promise.all([
    listarMisPuntosServidor(),
    listarMisAfichesServidor(),
    listarMisEspeciesServidor(),
  ]);

  return (
    <div className="min-h-screen bg-zinc-100">
      <EncabezadoPortal etiquetaRol="EMPRESA" usuario={usuario} />

      <main className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
        <h1 className="text-2xl font-bold">Puntos de interés</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Marca un lugar en el mapa y vincúlalo a un afiche, a una especie o a
          una nota. Cuando el turista se acerque, la app de Trekko le muestra el
          contenido automáticamente, incluso sin conexión.
        </p>

        <NavegacionEmpresa paginaActiva="puntos" />

        <GestionPuntos
          puntosIniciales={puntos}
          afiches={afiches}
          especies={especies}
        />
      </main>
    </div>
  );
}
