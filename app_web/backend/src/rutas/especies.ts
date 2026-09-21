import { Router } from "express";
import {
  listarMisEspecies,
  crearMiEspecie,
  actualizarMiEspecie,
  eliminarMiEspecie,
} from "../controladores/especies.js";
import { validarToken } from "../middlewares/validarToken.js";

/**
 * Rutas de especies bajo /api/especies.
 * Todas protegidas: la agencia gestiona las especies de su lugar.
 */
const rutasEspecies = Router();

rutasEspecies.get("/", validarToken, listarMisEspecies);
rutasEspecies.post("/", validarToken, crearMiEspecie);
rutasEspecies.put("/:id", validarToken, actualizarMiEspecie);
rutasEspecies.delete("/:id", validarToken, eliminarMiEspecie);

export default rutasEspecies;