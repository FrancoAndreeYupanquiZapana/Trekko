import { Router } from "express";
import {
  listarMisPuntos,
  crearMiPunto,
  actualizarMiPunto,
  eliminarMiPunto,
} from "../controladores/puntos.js";
import { validarToken } from "../middlewares/validarToken.js";

/**
 * Rutas de puntos de interés bajo /api/puntos.
 * Todas protegidas: la agencia gestiona los puntos de su lugar.
 */
const rutasPuntos = Router();

rutasPuntos.get("/", validarToken, listarMisPuntos);
rutasPuntos.post("/", validarToken, crearMiPunto);
rutasPuntos.put("/:id", validarToken, actualizarMiPunto);
rutasPuntos.delete("/:id", validarToken, eliminarMiPunto);

export default rutasPuntos;
