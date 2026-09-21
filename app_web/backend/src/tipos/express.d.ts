import { Request } from "express";
import type { UsuarioSesion } from "./index.js";

declare global {
  namespace Express {
    interface Request {
      /** Token JWT de acceso extraído de la cabecera Authorization. */
      tokenAcceso?: string;
      /** Usuario autenticado (lo rellena el middleware validarToken). */
      usuario?: UsuarioSesion;
    }
  }
}

export {};