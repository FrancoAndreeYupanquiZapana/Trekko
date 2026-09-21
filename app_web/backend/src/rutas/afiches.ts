import { Router } from "express";
import {
  listarMisAfiches,
  crearMiAfiche,
  actualizarMiAfiche,
  eliminarMiAfiche,
} from "../controladores/afiches.js";
import { validarToken } from "../middlewares/validarToken.js";

/**
 * Rutas de afiches bajo /api/afiches.
 * Todas protegidas: la agencia gestiona los afiches de su lugar.
 */
const rutasAfiches = Router();

rutasAfiches.get("/", validarToken, listarMisAfiches);
rutasAfiches.post("/", validarToken, crearMiAfiche);
rutasAfiches.put("/:id", validarToken, actualizarMiAfiche);
rutasAfiches.delete("/:id", validarToken, eliminarMiAfiche);

export default rutasAfiches;