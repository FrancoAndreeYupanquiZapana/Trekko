import express from "express";
import cors from "cors";
import rutasPrincipales from "./rutas/index.js";
import { rutaNoEncontrada, manejarErrores } from "./middlewares/manejoErrores.js";

/**
 * Configuración central de Express.
 * Aquí se registran middlewares globales y rutas. Nada más debe tocar la app.
 */
export function crearApp(): express.Express {
  const app = express();

  app.use(cors());
  app.use(express.json({ limit: "2mb" }));

  app.use(rutasPrincipales);

  app.use(rutaNoEncontrada);
  app.use(manejarErrores);

  return app;
}