"use client";

import { useEffect, useRef, useState, type PointerEvent } from "react";

/**
 * Mapa interactivo mínimo, sin dependencias ni API key.
 * Dibuja los tiles de OpenStreetMap directamente y permite:
 *   · arrastrar para desplazarse,
 *   · hacer clic para marcar el punto,
 *   · acercar / alejar con los botones,
 *   · ver el radio de aviso y los demás puntos del lugar.
 * Se usa en el portal de la agencia para ubicar los puntos de interés.
 */

interface Marcador {
  id: string;
  lat: number;
  lng: number;
  /** Etiqueta corta para el tooltip. */
  etiqueta?: string;
}

interface Props {
  /** Latitud actual del punto (centro inicial). */
  lat: number;
  /** Longitud actual del punto (centro inicial). */
  lng: number;
  /** Radio de aviso en metros (dibuja el círculo). */
  radioM?: number;
  /** Otros puntos del lugar, para ubicarse. */
  marcadores?: Marcador[];
  /** Se llama al hacer clic en el mapa con las coordenadas nuevas. */
  onChange: (lat: number, lng: number) => void;
  /** Alto del mapa (clases Tailwind). */
  className?: string;
}

const TILE = 256;
const ZOOM_INICIAL = 14;
const ZOOM_MINIMO = 3;
const ZOOM_MAXIMO = 19;
/** Límite de latitud del sistema de tiles (Web Mercator). */
const LAT_MAXIMA = 85.05112878;

/** Longitud -> píxel del mundo a un zoom dado. */
function lngAPx(lng: number, z: number): number {
  return ((lng + 180) / 360) * TILE * 2 ** z;
}

/** Latitud -> píxel del mundo a un zoom dado. */
function latAPx(lat: number, z: number): number {
  const seno = Math.sin((lat * Math.PI) / 180);
  return (
    (0.5 - Math.log((1 + seno) / (1 - seno)) / (4 * Math.PI)) * TILE * 2 ** z
  );
}

/** Píxel del mundo -> longitud. */
function pxALng(px: number, z: number): number {
  return (px / (TILE * 2 ** z)) * 360 - 180;
}

/** Píxel del mundo -> latitud. */
function pxALat(py: number, z: number): number {
  const n = Math.PI - (2 * Math.PI * py) / (TILE * 2 ** z);
  return (180 / Math.PI) * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)));
}

/** Metros por píxel a una latitud y zoom dados. */
function metrosPorPx(lat: number, z: number): number {
  return (156543.03392 * Math.cos((lat * Math.PI) / 180)) / 2 ** z;
}

function limitarLat(lat: number): number {
  return Math.max(-LAT_MAXIMA, Math.min(LAT_MAXIMA, lat));
}

export function MapaSelector({
  lat,
  lng,
  radioM = 60,
  marcadores = [],
  onChange,
  className = "h-80",
}: Props) {
  const contenedor = useRef<HTMLDivElement>(null);
  const [tamaño, setTamaño] = useState({ ancho: 0, alto: 0 });
  const [zoom, setZoom] = useState(ZOOM_INICIAL);
  const [centro, setCentro] = useState({ lat, lng });
  // Referencia del arrastre: punto de partida y centro en píxeles.
  const arrastre = useRef<{
    x: number;
    y: number;
    centroPxX: number;
    centroPxY: number;
    movido: number;
  } | null>(null);

  // El centro inicial viene del punto. Al arrastrar se mueve el centro, pero
  // NO las coordenadas del punto (eso solo ocurre al hacer clic). Cuando el
  // formulario cambia el punto desde fuera, remonta el mapa con una nueva key.

  // Medimos el contenedor para saber cuántos tiles dibujar.
  useEffect(() => {
    const nodo = contenedor.current;
    if (!nodo) return;
    const medir = () =>
      setTamaño({ ancho: nodo.clientWidth, alto: nodo.clientHeight });
    medir();
    const observador = new ResizeObserver(medir);
    observador.observe(nodo);
    return () => observador.disconnect();
  }, []);

  const { ancho, alto } = tamaño;
  const centroPxX = lngAPx(centro.lng, zoom);
  const centroPxY = latAPx(centro.lat, zoom);
  const totalTiles = 2 ** zoom;
  const mpp = metrosPorPx(centro.lat, zoom);
  const radioPx = Math.max(6, (radioM || 0) / mpp);

  /** Posición en pantalla de una coordenada. */
  function aPantalla(puntoLat: number, puntoLng: number) {
    return {
      x: lngAPx(puntoLng, zoom) - centroPxX + ancho / 2,
      y: latAPx(puntoLat, zoom) - centroPxY + alto / 2,
    };
  }

  /** Convierte una posición de pantalla a coordenadas. */
  function aCoordenadas(x: number, y: number) {
    return {
      lat: limitarLat(pxALat(centroPxY + (y - alto / 2), zoom)),
      lng: pxALng(centroPxX + (x - ancho / 2), zoom),
    };
  }

  function alPresionar(evento: PointerEvent<HTMLDivElement>) {
    if (ancho === 0) return;
    evento.currentTarget.setPointerCapture(evento.pointerId);
    arrastre.current = {
      x: evento.clientX,
      y: evento.clientY,
      centroPxX,
      centroPxY,
      movido: 0,
    };
  }

  function alMover(evento: PointerEvent<HTMLDivElement>) {
    const inicio = arrastre.current;
    if (!inicio) return;
    const dx = evento.clientX - inicio.x;
    const dy = evento.clientY - inicio.y;
    inicio.movido = Math.max(inicio.movido, Math.hypot(dx, dy));
    setCentro({
      lat: limitarLat(pxALat(inicio.centroPxY - dy, zoom)),
      lng: pxALng(inicio.centroPxX - dx, zoom),
    });
  }

  function alSoltar(evento: PointerEvent<HTMLDivElement>) {
    const inicio = arrastre.current;
    arrastre.current = null;
    if (!inicio) return;
    // Si apenas se movió, fue un clic: marcamos el punto ahí.
    if (inicio.movido < 6 && ancho > 0) {
      const rect = evento.currentTarget.getBoundingClientRect();
      const coordenadas = aCoordenadas(
        evento.clientX - rect.left,
        evento.clientY - rect.top
      );
      setCentro(coordenadas);
      onChange(coordenadas.lat, coordenadas.lng);
    }
  }

  /** Centra el mapa en el punto actual sin cambiar sus coordenadas. */
  function centrarEnPunto() {
    setCentro({ lat, lng });
  }

  // Rango de tiles visibles.
  const primerTileX = Math.floor((centroPxX - ancho / 2) / TILE);
  const ultimoTileX = Math.floor((centroPxX + ancho / 2) / TILE);
  const primerTileY = Math.floor((centroPxY - alto / 2) / TILE);
  const ultimoTileY = Math.floor((centroPxY + alto / 2) / TILE);

  const tiles: Array<{ clave: string; x: number; y: number; izq: number; arr: number }> = [];
  if (ancho > 0 && alto > 0) {
    for (let ty = primerTileY; ty <= ultimoTileY; ty++) {
      if (ty < 0 || ty >= totalTiles) continue;
      for (let tx = primerTileX; tx <= ultimoTileX; tx++) {
        // Envuelve la longitud alrededor del mundo.
        const envolturaX = ((tx % totalTiles) + totalTiles) % totalTiles;
        tiles.push({
          clave: `${zoom}/${tx}/${ty}`,
          x: envolturaX,
          y: ty,
          izq: tx * TILE - centroPxX + ancho / 2,
          arr: ty * TILE - centroPxY + alto / 2,
        });
      }
    }
  }

  const punto = aPantalla(lat, lng);

  return (
    <div className="relative">
      <div
        ref={contenedor}
        onPointerDown={alPresionar}
        onPointerMove={alMover}
        onPointerUp={alSoltar}
        onPointerCancel={alSoltar}
        className={`relative w-full cursor-crosshair overflow-hidden rounded-xl border border-zinc-300 bg-emerald-50 select-none ${className}`}
      >
        {/* Tiles del mapa */}
        {tiles.map((tile) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={tile.clave}
            src={`https://tile.openstreetmap.org/${zoom}/${tile.x}/${tile.y}.png`}
            alt=""
            draggable={false}
            className="pointer-events-none absolute size-64 select-none"
            style={{ left: tile.izq, top: tile.arr }}
          />
        ))}

        {/* Otros puntos del lugar */}
        {marcadores.map((marcador) => {
          const posicion = aPantalla(marcador.lat, marcador.lng);
          return (
            <div
              key={marcador.id}
              title={marcador.etiqueta ?? "Punto del lugar"}
              className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2"
              style={{ left: posicion.x, top: posicion.y }}
            >
              <span className="block size-3 rounded-full border-2 border-white bg-zinc-500 shadow" />
            </div>
          );
        })}

        {/* Círculo del radio de aviso */}
        <div
          className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-emerald-600/70 bg-emerald-500/20"
          style={{
            left: punto.x,
            top: punto.y,
            width: radioPx * 2,
            height: radioPx * 2,
          }}
        />

        {/* Punto seleccionado */}
        <div
          className="pointer-events-none absolute -translate-x-1/2 -translate-y-full"
          style={{ left: punto.x, top: punto.y }}
        >
          <svg viewBox="0 0 24 24" className="size-8 drop-shadow" aria-hidden>
            <path
              fill="#059669"
              d="M12 2a7 7 0 0 0-7 7c0 5.25 7 13 7 13s7-7.75 7-13a7 7 0 0 0-7-7Z"
            />
            <circle cx="12" cy="9" r="2.6" fill="#fff" />
          </svg>
        </div>

        {/* Controles de zoom */}
        <div
          onPointerDown={(evento) => evento.stopPropagation()}
          className="absolute top-3 right-3 flex flex-col overflow-hidden rounded-lg border border-zinc-300 bg-white shadow-sm"
        >
          <button
            type="button"
            aria-label="Acercar"
            onClick={() => setZoom((z) => Math.min(ZOOM_MAXIMO, z + 1))}
            className="size-9 text-lg font-semibold text-zinc-700 hover:bg-zinc-100"
          >
            +
          </button>
          <button
            type="button"
            aria-label="Alejar"
            onClick={() => setZoom((z) => Math.max(ZOOM_MINIMO, z - 1))}
            className="size-9 border-t border-zinc-200 text-lg font-semibold text-zinc-700 hover:bg-zinc-100"
          >
            −
          </button>
        </div>

        {/* Botón centrar */}
        <button
          type="button"
          onPointerDown={(evento) => evento.stopPropagation()}
          onClick={centrarEnPunto}
          className="absolute bottom-3 left-3 rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 shadow-sm hover:bg-zinc-100"
        >
          Centrar en el punto
        </button>

        {/* Atribución */}
        <span className="pointer-events-none absolute right-1 bottom-0.5 rounded bg-white/80 px-1 text-[10px] text-zinc-500">
          © OpenStreetMap
        </span>
      </div>

      <p className="mt-2 text-xs text-zinc-400">
        Arrastra para mover el mapa y haz clic para colocar el punto. El círculo
        muestra el radio dentro del cual la app avisa al turista.
      </p>
    </div>
  );
}
