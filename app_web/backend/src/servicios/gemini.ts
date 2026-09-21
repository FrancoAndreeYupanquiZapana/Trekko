import { entorno } from "../config/entorno.js";
import type {
  EvaluacionFoto,
  EvaluacionPaseo,
  Paseo,
} from "../tipos/index.js";
import { distanciaMinimaATrack, RADIO_ZONA_M } from "./geometria.js";

/**
 * Servicio de IA (Gemini API) del BACKEND — la clave vive aquí, en el
 * servidor (.env), nunca en la app ni en el navegador.
 *
 * Dos usos novedosos:
 *  1. evaluarPaseo(): puntúa de 0 a 10 cada foto del turista (jurado del
 *     concurso) y devuelve un JSON estructurado con justificación. La
 *     VALIDACIÓN de zona se calcula además con matemática GPS (sin gastar IA).
 *  2. escribirFraseRecuerdo(): una frase emotiva para el PDF "recuerdo".
 */

/** Resultado en bruto que Gemini debe devolver (JSON estricto). */
interface PuntajeIa {
  indice: number;
  puntaje: number;
  justificacion: string;
}

const URL_BASE = "https://generativelanguage.googleapis.com/v1beta";

/** Baja la foto y la prepara para enviarla a Gemini como base64. */
async function bajarFotoBase64(
  url: string
): Promise<{ mimeType: string; data: string } | null> {
  try {
    const respuesta = await fetch(url, { cache: "no-store" });
    if (!respuesta.ok) return null;
    const bytes = new Uint8Array(await respuesta.arrayBuffer());
    const mimeType = respuesta.headers.get("content-type") ?? "image/jpeg";
    // Pasamos la foto a base64 en pedacitos para no duplicar memoria.
    let binario = "";
    const TAMANO = 0x8000;
    for (let i = 0; i < bytes.length; i += TAMANO) {
      binario += String.fromCharCode(...bytes.subarray(i, i + TAMANO));
    }
    return { mimeType, data: btoa(binario) };
  } catch {
    return null;
  }
}

/** Intenta extraer el JSON `{"fotos":[...]}` del texto que devuelve Gemini. */
function extraerPuntajes(texto: string): PuntajeIa[] | null {
  const limpio = texto.replace(/```json|```/g, "").trim();
  const inicio = limpio.indexOf("{");
  const fin = limpio.lastIndexOf("}");
  if (inicio === -1 || fin === -1) return null;
  try {
    const objeto = JSON.parse(limpio.slice(inicio, fin + 1)) as {
      fotos?: unknown[];
    };
    if (!Array.isArray(objeto.fotos)) return null;
    return objeto.fotos
      .map((f) => {
        const crudo = (f ?? {}) as Record<string, unknown>;
        return {
          indice: Number(crudo.indice),
          puntaje: Number(crudo.puntaje),
          justificacion: String(crudo.justificacion ?? "").slice(0, 200),
        };
      })
      .filter(
        (f) => Number.isFinite(f.indice) && Number.isFinite(f.puntaje)
      );
  } catch {
    return null;
  }
}

/** Llama a la API de Gemini con un prompt de texto (+ imágenes opcionales). */
async function generarTexto(
  prompt: string,
  imagenes: { mimeType: string; data: string }[]
): Promise<string | null> {
  const clave = entorno.geminiApiKey;
  if (!clave) return null;

  const partes: { text?: string; inlineData?: { mimeType: string; data: string } }[] =
    [{ text: prompt }];
  for (const imagen of imagenes) {
    partes.push({ inlineData: imagen });
  }

  const respuesta = await fetch(
    `${URL_BASE}/models/${entorno.geminiModelo}:generateContent?key=${clave}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: partes }],
        generationConfig: { maxOutputTokens: 1024 },
      }),
    }
  );
  if (!respuesta.ok) return null;

  const cuerpo = (await respuesta.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
  };
  return cuerpo.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? null;
}

/**
 * Puntúa las fotos de un paseo con Gemini (0-10 + justificación) y combina
 * ese puntaje con la validación GEOMÉTRICA de zona (distancia al track).
 */
export async function evaluarPaseo(paseo: Paseo): Promise<EvaluacionPaseo> {
  if (!entorno.geminiApiKey) {
    throw new Error(
      "Falta GEMINI_API_KEY en el backend (archivo .env). La IA está desactivada."
    );
  }
  if (paseo.fotos.length === 0) {
    throw new Error("El paseo no tiene fotos para puntuar.");
  }

  // 1) Baja las fotos para pasárselas a Gemini (máx. 5, comprimidas ~1600 px).
  const bajadas = [];
  for (const foto of paseo.fotos) {
    bajadas.push(await bajarFotoBase64(foto.url));
  }
  const imagenes = bajadas.filter(
    (img): img is { mimeType: string; data: string } => img !== null
  );

  // 2) Prompt del jurado: exige JSON estructurado.
  const prompt =
    `Eres el jurado del concurso "Mejores fotos de la Amazonía" de Trekko. ` +
    `Evalúa las ${imagenes.length} fotos que te adjunto, en el orden de envío ` +
    `(índice 1 = primera foto). Da a cada una un puntaje de 0.0 a 10.0 con un ` +
    `decimal según: nitidez y técnica, composición, luz y color, y cuánto ` +
    `transmite la naturaleza amazónica. Responde ÚNICAMENTE con JSON válido, ` +
    `sin markdown ni texto extra, con esta forma exacta: ` +
    `{"fotos":[{"indice":1,"puntaje":8.5,"justificacion":"frase corta en español"}]}`;

  const textoIa = await generarTexto(prompt, imagenes);
  const puntajes = textoIa ? extraerPuntajes(textoIa) : null;
  const porIndice = new Map(puntajes?.map((p) => [p.indice, p]));

  // 3) Combina el puntaje de la IA con la validación de zona (matemática).
  const fotos: EvaluacionFoto[] = paseo.fotos.map((foto, i) => {
    const indice = i + 1;
    const ia = porIndice.get(indice);
    const distancia = distanciaMinimaATrack(
      { lat: foto.lat, lng: foto.lng },
      paseo.track
    );
    return {
      indice,
      url: foto.url,
      lat: foto.lat,
      lng: foto.lng,
      distanciaMinimaM:
        distancia === null ? null : Math.round(distancia * 10) / 10,
      enZona: distancia === null ? null : distancia <= RADIO_ZONA_M,
      puntaje: ia?.puntaje && Number.isFinite(ia.puntaje) ? ia.puntaje : null,
      justificacion: ia?.justificacion ?? null,
    };
  });

  const puntuadas = fotos.filter(
    (f): f is EvaluacionFoto & { puntaje: number } => f.puntaje !== null
  );
  const puntajePromedio =
    puntuadas.length > 0
      ? Math.round(
          (puntuadas.reduce((suma, f) => suma + f.puntaje, 0) /
            puntuadas.length) *
            10
        ) / 10
      : null;

  return {
    fotos,
    puntajePromedio,
    modelo: entorno.geminiModelo,
    fechaEvaluacion: new Date().toISOString(),
  };
}

/** Datos mínimos para escribir la frase del recuerdo PDF. */
export interface DatosFraseRecuerdo {
  nombre: string;
  lugar: string;
  fecha?: string;
  paseos: number;
  puntos: number;
  fotos: number;
}

/** Frase emotiva (una línea, corta) para el recuerdo PDF. Null si no hay IA. */
export async function escribirFraseRecuerdo(
  datos: DatosFraseRecuerdo
): Promise<string | null> {
  if (!entorno.geminiApiKey) return null;
  const prompt =
    `Eres el redactor de un recuerdo de viaje. Escribe UNA frase emotiva y ` +
    `breve (máximo 150 caracteres, sin comillas ni saltos de línea) para el ` +
    `recuerdo de ${datos.nombre}, que exploró ${datos.lugar}` +
    `${datos.fecha ? ` el ${datos.fecha}` : ""} con ${datos.puntos} puntos GPS ` +
    `caminados y ${datos.fotos} fotos. En español, sin markdown.`;
  return generarTexto(prompt, []);
}