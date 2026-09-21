import { Router } from "express";
import {
  procesarImagen,
  subirImagenControlador,
} from "../controladores/archivos.js";
import { validarToken } from "../middlewares/validarToken.js";

/**
 * Rutas de archivos bajo /api/archivos.
 * Post /imagen: sube una imagen (multipart, campo "archivo") y devuelve la URL.
 * Protegida: solo agencias autenticadas.
 */
const rutasArchivos = Router();

rutasArchivos.post("/imagen", validarToken, procesarImagen, subirImagenControlador);

export default rutasArchivos;