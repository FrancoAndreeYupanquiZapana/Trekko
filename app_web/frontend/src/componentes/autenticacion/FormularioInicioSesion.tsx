"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { iniciarSesion } from "@/servicios/autenticacion";
import { rutaInicioSegunRol } from "@/utilidades/roles";
import { CampoEntrada } from "@/componentes/ui/CampoEntrada";
import { Boton } from "@/componentes/ui/Boton";
import { Alerta } from "@/componentes/ui/Alerta";

/** Formulario de inicio de sesión (admin, agencias y turistas). */
export function FormularioInicioSesion() {
  const router = useRouter();
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function manejarEnvio(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setError(null);
    setCargando(true);

    const datos = new FormData(evento.currentTarget);
    const credenciales = {
      email: String(datos.get("email") ?? ""),
      contrasena: String(datos.get("contrasena") ?? ""),
    };

    try {
      const usuario = await iniciarSesion(credenciales);
      router.push(rutaInicioSegunRol(usuario.rol));
      router.refresh();
    } catch (causa) {
      const mensaje =
        causa instanceof Error
          ? "Correo o contraseña incorrectos."
          : "Ocurrió un error inesperado.";
      setError(mensaje);
      setCargando(false);
    }
  }

  return (
    <form onSubmit={manejarEnvio} className="flex flex-col gap-5" noValidate>
      {error && <Alerta tipo="error">{error}</Alerta>}

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
        autoComplete="current-password"
        placeholder="••••••••"
        required
      />

      <Boton type="submit" cargando={cargando} className="w-full">
        Iniciar sesión
      </Boton>
    </form>
  );
}