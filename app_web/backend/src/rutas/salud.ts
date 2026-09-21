import { Router } from "express";
import { exito } from "../utilidades/respuestas.js";

/** Ruta de salud para verificar que la API responde. */
const rutasSalud = Router();

rutasSalud.get("/salud", (_peticion, respuesta) => {
  respuesta.status(200).json(exito({ estado: "ok", fecha: new Date().toISOString() }));
});

export default rutasSalud;