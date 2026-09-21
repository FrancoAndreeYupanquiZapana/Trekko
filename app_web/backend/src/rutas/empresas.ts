import { Router } from "express";
import {
  obtenerMiPerfilEmpresa,
  guardarMiPerfilEmpresa,
  listarEmpresasRegistradas,
  obtenerEmpresaPublica,
  descargarEmpresaPublica,
  paqueteAppEmpresaPublica,
} from "../controladores/empresas.js";
import { validarToken } from "../middlewares/validarToken.js";

/**
 * Rutas de empresas bajo /api/empresas.
 * - GET / y GET /:id son públicas (catálogo y página del lugar).
 * - mi-perfil es protegido (requiere sesión).
 */
const rutasEmpresas = Router();

rutasEmpresas.get("/", listarEmpresasRegistradas);
rutasEmpresas.get("/mi-perfil", validarToken, obtenerMiPerfilEmpresa);
rutasEmpresas.put("/mi-perfil", validarToken, guardarMiPerfilEmpresa);
rutasEmpresas.get("/:id/exportar", descargarEmpresaPublica);
// Paquete completo (v5) con imágenes optimizadas para la app móvil offline-first.
rutasEmpresas.get("/:id/paquete-app", paqueteAppEmpresaPublica);
rutasEmpresas.get("/:id", obtenerEmpresaPublica);

export default rutasEmpresas;