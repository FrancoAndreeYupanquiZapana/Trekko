import type { FotoPaseo, PuntoPaseo } from "@/tipos";

/**
 * Mapa del paseo dibujado con SVG (sin dependencias ni API key).
 * Dibuja la LÍNEA caminada, los puntos y marca las fotos (📍) sobre el
 * recorrido. Se usa en la página pública "El viaje de X en Y".
 */

interface Props {
  track: PuntoPaseo[];
  fotos: FotoPaseo[];
  /** Clases de tamaño (por defecto alto fluido). */
  className?: string;
}

const ANCHO = 640;
const ALTO = 340;
const PAD = 28;

function esNumero(valor: unknown): valor is number {
  return typeof valor === "number" && Number.isFinite(valor);
}

export function MapaPaseo({ track, fotos, className = "h-64 w-full" }: Props) {
  const puntos = (track ?? []).filter(
    (p) => esNumero(p?.lat) && esNumero(p?.lng)
  );

  if (puntos.length === 0) {
    return (
      <div
        className={`flex items-center justify-center rounded-2xl border border-dashed border-emerald-200 bg-emerald-50 text-sm text-emerald-700 ${className}`}
      >
        Recorrido sin puntos GPS registrados
      </div>
    );
  }

  const lats = puntos.map((p) => p.lat);
  const lngs = puntos.map((p) => p.lng);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);
  const spanLat = Math.max(1e-6, maxLat - minLat);
  const spanLng = Math.max(1e-6, maxLng - minLng);

  const x = (lng: number) => PAD + ((lng - minLng) / spanLng) * (ANCHO - 2 * PAD);
  const y = (lat: number) => PAD + ((maxLat - lat) / spanLat) * (ALTO - 2 * PAD);

  const camino = puntos
    .map((p, i) => `${i === 0 ? "M" : "L"}${x(p.lng).toFixed(1)},${y(p.lat).toFixed(1)}`)
    .join(" ");

  const fotosValidas = (fotos ?? []).filter(
    (f) => esNumero(f?.lat) && esNumero(f?.lng)
  );
  const inicio = puntos[0];
  const fin = puntos[puntos.length - 1];

  return (
    <svg
      viewBox={`0 0 ${ANCHO} ${ALTO}`}
      className={`${className} rounded-2xl bg-emerald-50`}
      role="img"
      aria-label="Mapa del recorrido caminado"
    >
      {/* Cuadrícula suave para dar sensación de plano. */}
      {[0.25, 0.5, 0.75].map((f) => (
        <g key={`g-${f}`} stroke="#CFE3D6" strokeWidth={1}>
          <line x1={PAD} y1={ALTO * f} x2={ANCHO - PAD} y2={ALTO * f} />
          <line x1={ANCHO * f} y1={PAD} x2={ANCHO * f} y2={ALTO - PAD} />
        </g>
      ))}

      {/* Línea de la caminata. */}
      <path
        d={camino}
        fill="none"
        stroke="#1B4332"
        strokeWidth={3.5}
        strokeLinejoin="round"
        strokeLinecap="round"
      />

      {/* Inicio (verde) y fin (azul). */}
      {inicio && (
        <circle cx={x(inicio.lng)} cy={y(inicio.lat)} r={7} fill="#2D6A4F" stroke="#fff" strokeWidth={2} />
      )}
      {fin && fin !== inicio && (
        <circle cx={x(fin.lng)} cy={y(fin.lat)} r={7} fill="#1D3557" stroke="#fff" strokeWidth={2} />
      )}

      {/* Fotos marcadas sobre el recorrido. */}
      {fotosValidas.map((foto, i) => (
        <g key={`foto-${i}`}>
          <circle
            cx={x(foto.lng)}
            cy={y(foto.lat)}
            r={10}
            fill="#C0392B"
            stroke="#fff"
            strokeWidth={2}
          />
          <text
            x={x(foto.lng)}
            y={y(foto.lat) + 3.5}
            fill="#fff"
            fontSize={9}
            fontWeight={800}
            textAnchor="middle"
          >
            {i + 1}
          </text>
        </g>
      ))}
    </svg>
  );
}
