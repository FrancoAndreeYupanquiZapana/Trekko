import { Router } from "express";
import {
  listarMisRelatos,
  crearMiRelato,
  actualizarMiRelato,
  eliminarMiRelato,
} from "../controladores/relatos.js";
import { validarToken } from "../middlewares/validarToken.js";

/**
 * Rutas de relatos bajo /api/relatos.
 * Todas protegidas: la agencia gestiona los relatos de su lugar.
 */
const rutasRelatos = Router();

rutasRelatos.get("/", validarToken, listarMisRelatos);
rutasRelatos.post("/", validarToken, crearMiRelato);
rutasRelatos.put("/:id", validarToken, actualizarMiRelato);
rutasRelatos.delete("/:id", validarToken, eliminarMiRelato);

export default rutasRelatos;