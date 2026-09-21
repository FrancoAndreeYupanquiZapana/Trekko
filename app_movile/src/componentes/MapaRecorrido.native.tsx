import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import MapView, { Marker, Polyline, UrlTile } from "react-native-maps";
import {
  Circle,
  G,
  Line,
  Polyline as SvgPolyline,
  Rect,
  Text as SvgText,
  Svg,
} from "react-native-svg";

import type { MapaRecorridoProps } from "@/componentes/mapa-types";
import { hayInternet } from "@/servicios/conexion";
import type { PuntoRecorrido } from "@/servicios/recorridos";

/**
 * Mapa del recorrido (línea + puntos).
 *
 * Usa OPENSTREETMAP en vez de Google Maps: son teselas libres que no
 * necesitan API key ni cuenta, y evitan el rectángulo NEGRO que deja Google
 * en muchos celulares. Si no hay internet confirmado, o si el turista lo
 * pide, se dibuja un PLANO SVG que SIEMPRE muestra la línea y los puntos.
 *
 * La elección manual (Mapa / Plano) es PEGAJOSA: no se revierte sola.
 */

/** Encuadra la región para que se vean todos los puntos con holgura. */
function encuadrar(
  coords: { latitude: number; longitude: number }[]
): {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
} {
  const lats = coords.map((c) => c.latitude);
  const lngs = coords.map((c) => c.longitude);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);
  return {
    latitude: (minLat + maxLat) / 2,
    longitude: (minLng + maxLng) / 2,
    latitudeDelta: Math.max(0.004, (maxLat - minLat) * 1.6),
    longitudeDelta: Math.max(0.004, (maxLng - minLng) * 1.6),
  };
}

/** Plano del recorrido dibujado siempre (no depende de ninguna red). */
function PlanoOffline({
  puntos,
  altura,
  mensaje,
}: {
  puntos: PuntoRecorrido[];
  altura: number;
  mensaje: string;
}) {
  const [ancho, setAncho] = useState(0);
  if (ancho === 0) {
    return (
      <View
        onLayout={(e) => setAncho(e.nativeEvent.layout.width)}
        style={[styles.plano, { height: altura }]}
      >
        <Text style={styles.planoTexto}>{mensaje}</Text>
      </View>
    );
  }

  const lats = puntos.map((p) => p.lat);
  const lngs = puntos.map((p) => p.lng);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);
  const PAD = 26;
  const spanLat = Math.max(1e-6, maxLat - minLat);
  const spanLng = Math.max(1e-6, maxLng - minLng);
  const x = (lng: number) => PAD + ((lng - minLng) / spanLng) * (ancho - 2 * PAD);
  const y = (lat: number) =>
    PAD + ((maxLat - lat) / spanLat) * (altura - 2 * PAD);
  const puntosStr = puntos.map((p) => `${x(p.lng)},${y(p.lat)}`).join(" ");

  return (
    <View style={[styles.plano, { height: altura }]}>
      <Svg width={ancho} height={altura}>
        <Rect x={0} y={0} width={ancho} height={altura} fill="#EAF0EA" rx={16} />
        {[0.25, 0.5, 0.75].map((f) => (
          <G key={f}>
            <Line
              x1={PAD}
              y1={altura * f}
              x2={ancho - PAD}
              y2={altura * f}
              stroke="#CBDCCF"
              strokeWidth={1}
            />
            <Line
              x1={ancho * f}
              y1={PAD}
              x2={ancho * f}
              y2={altura - PAD}
              stroke="#CBDCCF"
              strokeWidth={1}
            />
          </G>
        ))}
        {puntos.length > 1 && (
          <SvgPolyline
            points={puntosStr}
            fill="none"
            stroke="#1B4332"
            strokeWidth={3.5}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        )}
        {puntos.map((p, i) => (
          <G key={p.id}>
            <Circle
              cx={x(p.lng)}
              cy={y(p.lat)}
              r={p.fotoUri ? 10 : 8}
              fill={p.fotoUri ? "#C0392B" : "#1B4332"}
              stroke="#fff"
              strokeWidth={2}
            />
            <SvgText
              x={x(p.lng)}
              y={y(p.lat) + 3}
              fill="#fff"
              fontSize={p.fotoUri ? 8 : 9}
              fontWeight="800"
              textAnchor="middle"
            >
              {p.fotoUri ? "📷" : i + 1}
            </SvgText>
          </G>
        ))}
      </Svg>
      <View style={styles.planoEtiqueta}>
        <Ionicons name="map-outline" size={13} color="#1B4332" />
        <Text style={styles.planoEtiquetaTexto}>{mensaje}</Text>
      </View>
    </View>
  );
}

export default function MapaRecorrido({
  puntos,
  altura = 220,
  seguimiento = false,
}: MapaRecorridoProps) {
  // "auto": mapa si hay internet confirmado; si no, plano.
  // "mapa" / "plano": elección manual del turista (no se revierte sola).
  const [modo, setModo] = useState<"auto" | "mapa" | "plano">("auto");
  const [enLinea, setEnLinea] = useState<boolean | null>(null);

  useEffect(() => {
    let activo = true;
    hayInternet().then((ok) => {
      if (activo) setEnLinea(ok);
    });
    return () => {
      activo = false;
    };
  }, []);

  const coords = puntos.map((p) => ({ latitude: p.lat, longitude: p.lng }));
  if (coords.length === 0) return null;

  const mostrarMapa = modo === "mapa" || (modo === "auto" && enLinea === true);
  const mensaje =
    enLinea === false
      ? "Sin conexión · puntos y línea de tu caminata"
      : "Puntos y línea de tu caminata";

  if (mostrarMapa) {
    return (
      <View style={styles.envoltura}>
        <MapView
          style={[styles.mapa, { height: altura }]}
          initialRegion={encuadrar(coords)}
          showsUserLocation={seguimiento}
          followsUserLocation={seguimiento}
          showsCompass
          // En Android ocultamos la base de Google (que sale negra) y encima
          // dibujamos las teselas libres de OpenStreetMap.
          mapType={Platform.OS === "android" ? "none" : "standard"}
          loadingEnabled
          loadingBackgroundColor="#E8EFE9"
        >
          <UrlTile
            urlTemplate="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
            maximumZ={19}
            flipY={false}
          />
          {coords.length > 1 && (
            <Polyline
              coordinates={coords}
              strokeColor="#1B4332"
              strokeWidth={4}
            />
          )}
          {puntos.map((punto, i) => (
            <Marker
              key={punto.id}
              coordinate={{ latitude: punto.lat, longitude: punto.lng }}
              tracksViewChanges={false}
              title={`Punto ${i + 1}`}
              description={
                punto.descripcion ??
                `${punto.lat.toFixed(5)}, ${punto.lng.toFixed(5)}`
              }
            >
              <View
                style={[
                  styles.marcador,
                  punto.fotoUri ? styles.marcadorFoto : styles.marcadorBase,
                ]}
              >
                {punto.fotoUri ? (
                  <Ionicons name="camera" size={13} color="#fff" />
                ) : (
                  <Text style={styles.marcadorNumero}>{i + 1}</Text>
                )}
              </View>
            </Marker>
          ))}
        </MapView>
        <Text style={styles.atribucion}>© OpenStreetMap</Text>
        <Pressable
          style={styles.botonCorner}
          onPress={() => setModo("plano")}
          accessibilityRole="button"
          accessibilityLabel="Ver el plano del recorrido"
        >
          <Ionicons name="grid-outline" size={13} color="#1B4332" />
          <Text style={styles.botonCornerTexto}>Plano</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.envoltura}>
      <PlanoOffline puntos={puntos} altura={altura} mensaje={mensaje} />
      {enLinea !== false && (
        <Pressable
          style={styles.botonCorner}
          onPress={() => setModo("mapa")}
          accessibilityRole="button"
          accessibilityLabel="Ver el mapa con OpenStreetMap"
        >
          <Ionicons name="map" size={13} color="#1B4332" />
          <Text style={styles.botonCornerTexto}>Mapa</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  envoltura: {
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: "#EAF0EA",
  },
  mapa: { borderRadius: 16 },
  botonCorner: {
    position: "absolute",
    top: 8,
    right: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(255,255,255,0.92)",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 3,
  },
  botonCornerTexto: { color: "#1B4332", fontSize: 11, fontWeight: "800" },
  atribucion: {
    position: "absolute",
    left: 6,
    bottom: 4,
    fontSize: 9,
    color: "#666",
    backgroundColor: "rgba(255,255,255,0.75)",
    paddingHorizontal: 4,
    borderRadius: 4,
  },
  marcador: {
    borderRadius: 999,
    borderWidth: 2,
    borderColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    width: 26,
    height: 26,
  },
  marcadorBase: { backgroundColor: "#1B4332" },
  marcadorFoto: { backgroundColor: "#C0392B" },
  marcadorNumero: { color: "#fff", fontSize: 11, fontWeight: "800" },
  plano: {
    borderRadius: 16,
    backgroundColor: "#EAF0EA",
    overflow: "hidden",
    justifyContent: "center",
  },
  planoTexto: { textAlign: "center", color: "#1B4332", fontSize: 13 },
  planoEtiqueta: {
    position: "absolute",
    left: 10,
    bottom: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(255,255,255,0.85)",
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  planoEtiquetaTexto: { color: "#1B4332", fontSize: 11, fontWeight: "700" },
});
