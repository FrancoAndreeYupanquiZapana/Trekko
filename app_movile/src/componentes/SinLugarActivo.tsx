import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";

/**
 * Bloqueo de la app cuando el turista todavía no eligió su «lugar actual».
 * Regla del negocio: si no hay un lugar seleccionado, NO se muestra ni se
 * puede hacer nada (ni flora/fauna, ni afiches, ni historias, ni recorrido,
 * ni galería). Solo «Info» para descargar y elegir.
 */
export default function SinLugarActivo() {
  const router = useRouter();
  return (
    <View style={styles.caja}>
      <View style={styles.icono}>
        <Ionicons name="location-outline" size={34} color="#1B4332" />
      </View>
      <Text style={styles.titulo}>Primero elige tu lugar actual</Text>
      <Text style={styles.texto}>
        En la pestaña «Info» tienes todos tus lugares descargados. Marca el
        lugar donde estás ahora y recién ahí aparecerá su flora y fauna,
        afiches, historias, recorridos y galería.
      </Text>
      <Pressable style={styles.boton} onPress={() => router.navigate("/")}>
        <Ionicons name="map-outline" size={16} color="#fff" />
        <Text style={styles.botonTexto}>Ir a Info y seleccionar</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  caja: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    padding: 32,
  },
  icono: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#E8EFE9",
    alignItems: "center",
    justifyContent: "center",
  },
  titulo: {
    fontSize: 17,
    fontWeight: "800",
    color: "#1B4332",
    textAlign: "center",
  },
  texto: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    lineHeight: 20,
  },
  boton: {
    marginTop: 6,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#1B4332",
    borderRadius: 999,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  botonTexto: { color: "#fff", fontWeight: "700", fontSize: 14 },
});