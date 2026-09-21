import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /**
   * El logo de Trekko se lee desde `public/` en las rutas que generan el
   * collage (PNG) y el recuerdo (PDF). En Vercel los archivos de `public`
   * no se empaquetan en la función por defecto, así que los incluimos en el
   * trace para que `readFile` funcione en producción.
   */
  outputFileTracingIncludes: {
    "/api/recuerdo": ["./public/trekko-logo.png"],
    "/api/compartir": ["./public/trekko-logo.png"],
  },
};

export default nextConfig;
