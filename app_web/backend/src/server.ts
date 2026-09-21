import express from "express";
import { crearApp } from "./aplicacion.js";

/**
 * Punto de entrada para Vercel (Express zero-config).
 *
 * Vercel reconoce los archivos `app.ts`, `index.ts` o `server.ts` (o sus
 * equivalentes bajo `src/`) siempre que importen `express` y exporten la
 * aplicación con `export default`. Por eso este archivo importa express y
 * devuelve la app ya configurada; `src/index.ts` se conserva solo para el
 * arranque local con `app.listen()`.
 *
 * Nota: aquí NO se llama a `validarEntorno()`. En serverless el proceso no
 * debe morir si falta una variable: la validación ocurre de forma perezosa
 * en `config/supabase.ts` al usar el cliente.
 */
const app: express.Express = crearApp();

// Referencia explícita para que el bundler no elimine el import de express
// (Vercel lo usa para detectar que el proyecto es un backend Express).
void express;

export default app;
