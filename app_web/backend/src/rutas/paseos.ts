import { Router } from "express";
import {
  crearPaseoControlador,
  evaluarPaseoControlador,
  listarPaseosControlador,
  obtenerPaseosPorDniControlador,
  procesarFotosPaseo,
  textoRecuerdoControlador,
} from "../controladores/paseos.js";

/**
 * Rutas de paseos bajo /api/paseos.
 * - POST /                     pública: la app móvil sube fotos + track (multipart).
 * - GET  /                     pública: muro de paseos recientes.
 * - GET  /dni/:dni             pública: la página "El viaje de {nombre} en {lugar}".
 * - POST /texto-recuerdo       pública: frase IA del PDF "recuerdo" (Gemini en el servidor).
 * - POST /:id/evaluar          pública: puntúa con IA las fotos y valida zona, devolviendo JSON.
 */
const rutasPaseos = Router();

rutasPaseos.post("/", procesarFotosPaseo, crearPaseoControlador);
rutasPaseos.post("/texto-recuerdo", textoRecuerdoControlador);
rutasPaseos.post("/:id/evaluar", evaluarPaseoControlador);
rutasPaseos.get("/dni/:dni", obtenerPaseosPorDniControlador);
rutasPaseos.get("/", listarPaseosControlador);

export default rutasPaseos;
