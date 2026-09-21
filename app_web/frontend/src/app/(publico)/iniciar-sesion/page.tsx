import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { obtenerUsuarioActual } from "@/servicios/autenticacionServidor";
import { rutaInicioSegunRol } from "@/utilidades/roles";
import { FormularioInicioSesion } from "@/componentes/autenticacion/FormularioInicioSesion";
import { Icono } from "@/componentes/ui/Icono";

export const metadata: Metadata = {
  title: "Iniciar sesión",
  description: "Accede al portal de Trekko (admin, agencias y turistas).",
};

/** Página de inicio de sesión para administradores, agencias y turistas. */
export default async function PaginaIniciarSesion() {
  const usuario = await obtenerUsuarioActual();
  if (usuario) redirect(rutaInicioSegunRol(usuario.rol));

  return (
    <div className="flex min-h-[70vh] items-center justify-center px-4 py-16">
      <div className="w-full max-w-md">
        <div className="rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm">
          <div className="mb-6 text-center">
            <span className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
              <Icono tipo="sendero" className="size-8" />
            </span>
            <h1 className="mt-3 text-2xl font-bold">Iniciar sesión</h1>
            <p className="mt-1 text-sm text-zinc-500">
              Accede al portal de Trekko
            </p>
          </div>

          <FormularioInicioSesion />
        </div>

        <p className="mt-4 text-center text-xs text-zinc-400">
          ¿Aún no tienes cuenta?{" "}
          <Link
            href="/registro"
            className="font-medium text-emerald-700 hover:underline"
          >
            Crea una cuenta
          </Link>
        </p>
      </div>
    </div>
  );
}