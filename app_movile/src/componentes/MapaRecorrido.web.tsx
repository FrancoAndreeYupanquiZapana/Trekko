import { StyleSheet, Text, View } from "react-native";

import type { MapaRecorridoProps } from "@/componentes/mapa-types";

/**
 * Versión web del mapa (el export estático no puede usar react-native-maps).
 * En el celular la app usa `MapaRecorrido.native.tsx` (mapa real).
 */
export default function MapaRecorridoWeb({
  puntos,
  altura = 220,
}: MapaRecorridoProps) {
  const conFoto = puntos.filter((p) => p.fotoUri).length;
  return (
    <View style={[styles.caja, { height: altura }]}>
      <Text style={styles.titulo}>🗺️ Mapa del recorrido</Text>
      <Text style={styles.texto}>
        {puntos.length} punto(s) · {conFoto} con foto. En tu celular verás la
        línea que caminaste aquí.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  caja: {
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    padding: 20,
    backgroundColor: "#E8EFE9",
  },
  titulo: { fontSize: 15, fontWeight: "800", color: "#1B4332" },
  texto: { fontSize: 13, color: "#555", textAlign: "center", lineHeight: 18 },
});