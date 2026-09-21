import { crearApp } from "./aplicacion.js";
import { entorno, validarEntorno } from "./config/entorno.js";

/**
 * Punto de entrada del backend.
 * Valida configuración y arranca el servidor.
 */
function iniciarServidor(): void {
  try {
    validarEntorno();
  } catch (causa) {
    console.error(causa instanceof Error ? causa.message : causa);
    process.exit(1);
  }

  const app = crearApp();

  app.listen(entorno.puerto, () => {
    console.log(`API de Trekko escuchando en http://localhost:${entorno.puerto}`);
  });
}

iniciarServidor();