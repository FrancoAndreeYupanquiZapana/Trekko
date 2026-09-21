"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { registrar } from "@/servicios/autenticacion";
import { rutaInicioSegunRol } from "@/utilidades/roles";
import { Alerta } from "@/componentes/ui/Alerta";
import { Boton } from "@/componentes/ui/Boton";
import { CampoEntrada } from "@/componentes/ui/CampoEntrada";
import { Icono } from "@/componentes/ui/Icono";

/** Formulario de registro del portal: agencias y lugares turísticos. */
export function FormularioRegistro() {
  const router = useRouter();
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cuentaCreada, setCuentaCreada] = useState<string | null>(null);

  async function manejarEnvio(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setError(null);
    setCargando(true);

    const datos = new FormData(evento.currentTarget);
    const email = String(datos.get("email") ?? "");
    const contrasena = String(datos.get("contrasena") ?? "");
    const confirmacion = String(datos.get("confirmacion") ?? "");
    const nombre = String(datos.get("nombre") ?? "");

    if (contrasena !== confirmacion) {
      setError("Las contraseñas no coinciden.");
      setCargando(false);
      return;
    }

    try {
      const resultado = await registrar({ email, contrasena, nombre });

      // Si la API devuelve sesión, el usuario quedó autenticado de inmediato.
      if (resultado.sesion) {
        router.push(rutaInicioSegunRol(resultado.usuario.rol));
        router.refresh();
        return;
      }

      // Caso excepcional: mostrar confirmación por si no se pudo iniciar sesión.
      setCuentaCreada(email);
      setCargando(false);
    } catch (causa) {
      const mensaje =
        causa instanceof Error ? causa.message : "Ocurrió un error inesperado.";
      setError(mensaje);
      setCargando(false);
    }
  }

  // Pantalla de éxito cuando no se devolvió una sesión en el registro.
  if (cuentaCreada) {
    return (
      <div className="flex flex-col items-center gap-4 text-center">
        <span className="flex size-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
          <Icono tipo="check" className="size-8" />
        </span>
        <div>
          <p className="font-semibold">Cuenta creada correctamente</p>
          <p className="mt-1 text-sm leading-relaxed text-zinc-500">
            La cuenta de <b>{cuentaCreada}</b> quedó creada.
            Inicia sesión para entrar a tu portal.
          </p>
        </div>
        <Link
          href="/iniciar-sesion"
          className="inline-flex h-11 items-center justify-center rounded-lg bg-emerald-600 px-5 text-sm font-semibold text-white transition-colors hover:bg-emerald-700"
        >
          Ir a iniciar sesión
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={manejarEnvio} className="flex flex-col gap-5" noValidate>
      {error && <Alerta tipo="error">{error}</Alerta>}

      <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm leading-relaxed text-emerald-800">
        Este portal es para <strong>agencias y lugares turísticos</strong>:
        publica tus destinos, rutas y especies.
      </div>

      <CampoEntrada
        etiqueta="Nombre del lugar"
        name="nombre"
        autoComplete="organization"
        placeholder="Ej. Lago Sandoval"
        minLength={2}
        required
      />

      <CampoEntrada
        etiqueta="Correo electrónico"
        name="email"
        type="email"
        autoComplete="email"
        placeholder="tucorreo@ejemplo.com"
        required
      />

      <CampoEntrada
        etiqueta="Contraseña"
        name="contrasena"
        type="password"
        autoComplete="new-password"
        placeholder="Mínimo 6 caracteres"
        minLength={6}
        required
      />

      <CampoEntrada
        etiqueta="Confirmar contraseña"
        name="confirmacion"
        type="password"
        autoComplete="new-password"
        placeholder="Repite tu contraseña"
        minLength={6}
        required
      />

      <Boton type="submit" cargando={cargando} className="w-full">
        Crear cuenta
      </Boton>
    </form>
  );
}