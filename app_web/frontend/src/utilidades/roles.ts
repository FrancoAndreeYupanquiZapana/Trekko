/**
 * Define la ruta de inicio de cada portal según el rol del usuario.
 * ADMIN -> panel de administración; EMPRESA -> panel de la agencia;
 * TURISTA -> portal del turista.
 */
export function rutaInicioSegunRol(rol: string | undefined): string {
  switch (rol) {
    case "ADMIN":
      return "/admin/panel";
    case "EMPRESA":
      return "/empresa";
    default:
      return "/turista";
  }
}