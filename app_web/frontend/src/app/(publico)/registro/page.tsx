import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { obtenerUsuarioActual } from "@/servicios/autenticacionServidor";
import { rutaInicioSegunRol } from "@/utilidades/roles";
import { FormularioRegistro } from "@/componentes/autenticacion/FormularioRegistro";
import { Icono } from "@/componentes/ui/Icono";

export const metadata: Metadata = {
  title: "Crear cuenta",
  description: "Regístrate en el portal de Trekko como agencia o lugar turístico.",
};

/** Página de registro para agencias y lugares turísticos. */
export default async function PaginaRegistro() {
  const usuario = await obtenerUsuarioActual();
  if (usuario) redirect(rutaInicioSegunRol(usuario.rol));

  return (
    <div className="flex min-h-[70vh] items-center justify-center px-4 py-16">
      <div className="w-full max-w-lg">
        <div className="rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm">
          <div className="mb-6 text-center">
            <span className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
              <Icono tipo="edificio" className="size-8" />
            </span>
            <h1 className="mt-3 text-2xl font-bold">Crear cuenta</h1>
            <p className="mt-1 text-sm text-zinc-500">
              Únete al portal de Trekko como agencia o lugar turístico
            </p>
          </div>

          <FormularioRegistro />
        </div>

        <p className="mt-4 text-center text-xs text-zinc-400">
          ¿Ya tienes cuenta?{" "}
          <Link
            href="/iniciar-sesion"
            className="font-medium text-emerald-700 hover:underline"
          >
            Inicia sesión
          </Link>
        </p>
      </div>
    </div>
  );
}