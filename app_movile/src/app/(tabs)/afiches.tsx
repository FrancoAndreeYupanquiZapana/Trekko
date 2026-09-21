import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useFocusEffect, useRouter } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { useCallback, useState } from "react";
import {
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import SinLugarActivo from "@/componentes/SinLugarActivo";
import {
  listarAfichesLocales,
  listarDescargas,
  obtenerLugarActivoId,
  type AficheConLugar,
  type DescargaLocal,
} from "@/servicios/descargas";

/**
 * Pestaña AFICHES (carteles).
 * Muestra los afiches del LUGAR ACTIVO (precauciones, normas,
 * recomendaciones). Si no hay lugar seleccionado, no se muestra nada.
 * Tocar un afiche lo abre a pantalla completa.
 */
export default function Afiches() {
  const db = useSQLiteContext();
  const router = useRouter();

  const [afiches, setAfiches] = useState<AficheConLugar[]>([]);
  const [descargas, setDescargas] = useState<Record<string, DescargaLocal>>({});
  const [lugarActivoId, setLugarActivoId] = useState<string | null>(null);
  const [aficheVisto, setAficheVisto] = useState<AficheConLugar | null>(null);
  const [cargando, setCargando] = useState(true);

  useFocusEffect(
    useCallback(() => {
      let activo = true;
      void (async () => {
        const [lista, resumenes, lugarActivo] = await Promise.all([
          listarAfichesLocales(db).catch(() => []),
          listarDescargas(db).catch(() => []),
          obtenerLugarActivoId(db).catch(() => null),
        ]);
        if (!activo) return;
        setAfiches(lista);
        setDescargas(Object.fromEntries(resumenes.map((d) => [d.lugarId, d])));
        setLugarActivoId(
          lugarActivo && resumenes.some((d) => d.lugarId === lugarActivo)
            ? lugarActivo
            : null
        );
        setCargando(false);
      })();
      return () => {
        activo = false;
      };
    }, [db])
  );

  const lugarActivo = lugarActivoId ? (descargas[lugarActivoId] ?? null) : null;
  // Filtro ESTRICTO: solo los carteles del lugar seleccionado.
  const visibles = lugarActivo
    ? afiches.filter((a) => a.lugarId === lugarActivo.lugarId)
    : [];

  return (
    <SafeAreaView style={styles.contenedor} edges={["top", "left", "right"]}>
      <View style={styles.encabezado}>
        <Text style={styles.titulo}>Afiches</Text>
        {lugarActivo ? (
          <Pressable style={styles.botonLugarActivo} onPress={() => router.navigate("/")}>
            <Ionicons name="location" size={15} color="#1B4332" />
            <Text style={styles.botonLugarActivoTexto} numberOfLines={1}>
              {lugarActivo.nombre} · cambiar en Info
            </Text>
          </Pressable>
        ) : (
          <Text style={styles.subtitulo}>
            Elige tu lugar actual en «Info» para ver sus carteles.
          </Text>
        )}
      </View>

      {cargando ? (
        <View style={styles.vacio}>
          <Text style={styles.textoSecundario}>Cargando afiches…</Text>
        </View>
      ) : !lugarActivo ? (
        <SinLugarActivo />
      ) : visibles.length === 0 ? (
        <View style={styles.vacio}>
          <Ionicons name="megaphone-outline" size={40} color="#1B4332" />
          <Text style={styles.vacioTitulo}>Este lugar aún no tiene afiches</Text>
          <Text style={styles.textoSecundario}>
            Descarga {lugarActivo.nombre} desde «Info»: aquí aparecerán sus
            carteles y recomendaciones.
          </Text>
        </View>
      ) : (
        <FlatList
          data={visibles}
          keyExtractor={(item) => `${item.lugarId}-${item.afiche.id}`}
          contentContainerStyle={styles.lista}
          ListHeaderComponent={
            <Text style={styles.contador}>
              {visibles.length} afiche{visibles.length === 1 ? "" : "s"} de{" "}
              {lugarActivo.nombre} · toca uno para verlo completo
            </Text>
          }
          renderItem={({ item }) => {
            const { afiche } = item;
            return (
              <Pressable
                style={({ pressed }) => [
                  styles.tarjeta,
                  pressed && styles.tarjetaPresionada,
                ]}
                onPress={() => setAficheVisto(item)}
              >
                {afiche.imagen ? (
                  <Image
                    source={{ uri: afiche.imagen.datos }}
                    style={[
                      styles.imagen,
                      { aspectRatio: afiche.imagen.ancho / afiche.imagen.alto },
                    ]}
                    contentFit="cover"
                    transition={200}
                  />
                ) : (
                  <View style={styles.imagenSin}>
                    <Ionicons name="megaphone" size={32} color="#1B4332" />
                  </View>
                )}
                <View style={styles.contenido}>
                  <Text style={styles.tituloAfiche} numberOfLines={2}>
                    {afiche.titulo || "Sin título"}
                  </Text>
                  {afiche.descripcion ? (
                    <Text style={styles.descripcion} numberOfLines={4}>
                      {afiche.descripcion}
                    </Text>
                  ) : null}
                  <Text style={styles.toque}>
                    Tocar para ver a pantalla completa 🔍
                  </Text>
                </View>
              </Pressable>
            );
          }}
        />
      )}

      <Modal
        visible={aficheVisto != null}
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setAficheVisto(null)}
      >
        <Pressable
          style={styles.visor}
          onPress={() => setAficheVisto(null)}
          accessibilityRole="button"
          accessibilityLabel="Cerrar afiche"
        >
          <Pressable style={styles.visorImagenContenedor}>
            {aficheVisto?.afiche.imagen ? (
              <Image
                source={{ uri: aficheVisto.afiche.imagen.datos }}
                style={styles.visorImagen}
                contentFit="contain"
                transition={150}
              />
            ) : (
              <View style={styles.visorSinImagen}>
                <Ionicons name="megaphone" size={56} color="#1B4332" />
              </View>
            )}
          </Pressable>
          <View style={styles.visorInfo}>
            <Text style={styles.visorTitulo}>
              {aficheVisto?.afiche.titulo ?? ""}
            </Text>
            <Text style={styles.visorLugar}>
              📍 {aficheVisto?.lugarNombre ?? ""}
            </Text>
          </View>
          <View style={styles.visorCerrar}>
            <Ionicons name="close" size={26} color="#fff" />
          </View>
          <Text style={styles.visorToque}>Toca en cualquier parte para cerrar</Text>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  contenedor: { flex: 1, backgroundColor: "#F7F7F5" },
  encabezado: { paddingHorizontal: 20, paddingTop: 16, gap: 12 },
  titulo: { fontSize: 28, fontWeight: "800", color: "#1B4332" },
  subtitulo: { fontSize: 14, color: "#555" },
  botonLugarActivo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
    backgroundColor: "#E8EFE9",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
    maxWidth: "100%",
  },
  botonLugarActivoTexto: {
    fontSize: 13,
    fontWeight: "700",
    color: "#1B4332",
    flexShrink: 1,
  },
  lista: { padding: 20, paddingTop: 8, gap: 12 },
  contador: { fontSize: 12, color: "#8A8A8A", marginBottom: 2 },
  tarjeta: {
    backgroundColor: "#fff",
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  tarjetaPresionada: { opacity: 0.92 },
  imagen: { width: "100%" },
  imagenSin: {
    height: 110,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#E8EFE9",
  },
  contenido: { padding: 14, gap: 6 },
  tituloAfiche: { fontSize: 16, fontWeight: "700", color: "#111" },
  descripcion: { fontSize: 14, lineHeight: 20, color: "#444" },
  toque: { fontSize: 11, color: "#9A9A9A", marginTop: 2 },
  vacio: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    padding: 32,
  },
  vacioTitulo: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1B4332",
    textAlign: "center",
  },
  textoSecundario: { fontSize: 14, color: "#666", textAlign: "center" },
  // Visor a pantalla completa.
  visor: {
    flex: 1,
    backgroundColor: "#0B0F0D",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
  },
  visorImagenContenedor: {
    width: "100%",
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: "#111",
  },
  visorImagen: { width: "100%", aspectRatio: 1 },
  visorSinImagen: {
    height: 300,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#E8EFE9",
  },
  visorInfo: {
    position: "absolute",
    left: 20,
    right: 20,
    bottom: 56,
    alignItems: "center",
    gap: 4,
  },
  visorTitulo: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "800",
    textAlign: "center",
  },
  visorLugar: { color: "#CFE3D6", fontSize: 13 },
  visorCerrar: {
    position: "absolute",
    top: 56,
    right: 20,
    backgroundColor: "rgba(255,255,255,0.18)",
    borderRadius: 999,
    padding: 8,
  },
  visorToque: {
    position: "absolute",
    bottom: 22,
    color: "#8FA79A",
    fontSize: 12,
  },
});