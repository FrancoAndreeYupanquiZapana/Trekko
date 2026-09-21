import { Router } from "express";
import {
  crearPaseoControlador,
  evaluarPaseoControlador,
  listarPaseosControlador,
  obtenerPaseosPorDniControlador,
  prepararSubidaPaseoControlador,
  procesarFotosPaseo,
  textoRecuerdoControlador,
} from "../controladores/paseos.js";

/**
 * Rutas de paseos bajo /api/paseos.
 * - POST /preparar-subida        pública: firma URLs de Storage para que la app
 *                                suba las fotos directo (Vercel no acepta
 *                                archivos en multipart desde la app).
 * - POST /                       pública: registra el paseo (JSON con rutas ya
 *                                subidas, o multipart para servidor local).
 * - GET  /                       pública: muro de paseos recientes.
 * - GET  /dni/:dni               pública: la página "El viaje de {nombre} en {lugar}".
 * - POST /texto-recuerdo         pública: frase IA del PDF "recuerdo" (Gemini en el servidor).
 * - POST /:id/evaluar            pública: puntúa con IA las fotos y valida zona, devolviendo JSON.
 */
const rutasPaseos = Router();

rutasPaseos.post("/preparar-subida", prepararSubidaPaseoControlador);
rutasPaseos.post("/", procesarFotosPaseo, crearPaseoControlador);
rutasPaseos.post("/texto-recuerdo", textoRecuerdoControlador);
rutasPaseos.post("/:id/evaluar", evaluarPaseoControlador);
rutasPaseos.get("/dni/:dni", obtenerPaseosPorDniControlador);
rutasPaseos.get("/", listarPaseosControlador);

export default rutasPaseos;
