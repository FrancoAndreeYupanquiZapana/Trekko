#!/usr/bin/env node
/**
 * Trekko · Prueba REAL del flujo "subida de la galería móvil".
 * --------------------------------------------------------------
 * Genera fotos sintéticas con sharp, un track GPS de ejemplo y los sube por
 * multipart a `POST /api/paseos`, como haría la app. Luego consulta la
 * página pública del DNI para confirmar que quedó publicado.
 *
 * Uso:  node scripts/probar_paseo.mjs   (desde app_web/backend)
 * Requiere: la migración 005 ejecutada y la API corriendo en :4000.
 */
import sharp from "sharp";

const API = "http://localhost:4000/api";
const DNI = "00000001";
const NOMBRE = "Alex Quispe";
const LUGAR = "Lago Sandoval";
const LUGAR_ID = "lago-sandoval";

/** Caminata sintética: un bucle de ~41 puntos alrededor de un centro. */
function track() {
  const lat0 = -12.512;
  const lng0 = -69.167;
  const puntos = [];
  for (let i = 0; i <= 40; i++) {
    const t = i / 40;
    puntos.push({
      lat: +(lat0 + Math.sin(t * Math.PI * 2) * 0.0008).toFixed(6),
      lng: +(lng0 + Math.cos(t * Math.PI * 2) * 0.0008).toFixed(6),
      timestamp: new Date(Date.now() - (40 - i) * 5000).toISOString(),
    });
  }
  return puntos;
}

/** Genera una foto sintética 640x480 con un texto visible. */
async function foto(n, color) {
  const svg = Buffer.from(
    `<svg width="640" height="480" xmlns="http://www.w3.org/2000/svg">
       <rect width="640" height="480" fill="${color}"/>
       <circle cx="320" cy="160" r="70" fill="rgba(255,255,255,0.25)"/>
       <text x="320" y="230" font-family="Arial" font-size="64"
             fill="white" text-anchor="middle" font-weight="bold">FOTO ${n}</text>
       <text x="320" y="420" font-family="Arial" font-size="36"
             fill="white" text-anchor="middle">${LUGAR}</text>
     </svg>`
  );
  return sharp(svg).jpeg({ quality: 82 }).toBuffer();
}

async function main() {
  const trackPuntos = track();
  const colores = ["#2E8B57", "#D35400", "#8E44AD"];
  const archivos = [];
  const metadatos = [];
  for (let i = 0; i < 3; i++) {
    archivos.push(await foto(i + 1, colores[i]));
    const p = trackPuntos[Math.floor((i + 1) * trackPuntos.length * 0.25)];
    metadatos.push({
      lat: p.lat,
      lng: p.lng,
      timestamp: new Date(Date.now() - (3 - i) * 120000).toISOString(),
      descripcion: `Una de las mejores fotos del día (${i + 1})`,
    });
  }

  const formulario = new FormData();
  formulario.append(
    "datos",
    JSON.stringify({
      nombre: NOMBRE,
      dni: DNI,
      lugarId: LUGAR_ID,
      lugarNombre: LUGAR,
      fechaExperiencia: new Date(Date.now() - 3 * 3600 * 1000).toISOString(),
      track: trackPuntos,
      fotos: metadatos,
    })
  );
  archivos.forEach((buffer, i) => {
    formulario.append(
      "fotos",
      new Blob([buffer], { type: "image/jpeg" }),
      `foto_${i + 1}.jpg`
    );
  });

  console.log(`→ Subiendo ${archivos.length} fotos + ${trackPuntos.length} puntos GPS...`);
  const respuesta = await fetch(`${API}/paseos`, { method: "POST", body: formulario });
  const cuerpo = await respuesta.json().catch(() => null);
  console.log(`POST /api/paseos → ${respuesta.status}`);
  if (!respuesta.ok) {
    console.error("FALLÓ:", JSON.stringify(cuerpo, null, 2));
    process.exit(1);
  }
  console.log("   ✓ publicado:", cuerpo?.datos?.id);

  const lista = await fetch(`${API}/paseos/dni/${DNI}`).then((r) => r.json());
  console.log(`GET /api/paseos/dni/${DNI} → ${lista?.datos?.length ?? 0} paseo(s) para el DNI.`);

  const muro = await fetch(`${API}/paseos`).then((r) => r.json());
  console.log(`GET /api/paseos → ${muro?.datos?.length ?? 0} paseo(s) en el muro.`);
  console.log("\n✓ FLUJO COMPLETO OK");
}

main().catch((causa) => {
  console.error(causa);
  process.exit(1);
});