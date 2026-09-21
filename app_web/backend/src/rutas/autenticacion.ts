import { Router } from "express";
import {
  registrarUsuario,
  iniciarSesionUsuario,
  cerrarSesionUsuario,
  obtenerSesionActual,
} from "../controladores/autenticacion.js";
import { validarToken } from "../middlewares/validarToken.js";

/** Rutas de autenticación bajo /api/autenticacion. */
const rutasAutenticacion = Router();

rutasAutenticacion.post("/registro", registrarUsuario);
rutasAutenticacion.post("/ingreso", iniciarSesionUsuario);
rutasAutenticacion.post("/cerrar-sesion", validarToken, cerrarSesionUsuario);
rutasAutenticacion.get("/sesion", validarToken, obtenerSesionActual);

export default rutasAutenticacion;