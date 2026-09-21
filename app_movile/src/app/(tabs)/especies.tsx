import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useFocusEffect, useRouter } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { useCallback, useState } from "react";
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import SinLugarActivo from "@/componentes/SinLugarActivo";
import {
  listarDescargas,
  listarEspeciesLocales,
  obtenerLugarActivoId,
  type DescargaLocal,
  type EspecieConLugar,
} from "@/servicios/descargas";
import type { EspeciePaquete } from "@/tipos";

type Categoria = "TODAS" | "FAUNA" | "FLORA";

const CATEGORIAS: Categoria[] = ["TODAS", "FAUNA", "FLORA"];

/**
 * Área informática de especies: el turista busca la flora y fauna de su
 * LUGAR ACTIVO (el que eligió en «Info»). Si no hay lugar seleccionado,
 * no se muestra nada.
 */
export default function Especies() {
  const db = useSQLiteContext();
  const router = useRouter();

  const [especies, setEspecies] = useState<EspecieConLugar[]>([]);
  const [descargas, setDescargas] = useState<Record<string, DescargaLocal>>({});
  const [lugarActivoId, setLugarActivoId] = useState<string | null>(null);
  const [busqueda, setBusqueda] = useState("");
  const [categoria, setCategoria] = useState<Categoria>("TODAS");
  const [expandida, setExpandida] = useState<string | null>(null);
  const [cargando, setCargando] = useState(true);

  useFocusEffect(
    useCallback(() => {
      let activo = true;
      void (async () => {
        const [lista, resumenes, lugarActivo] = await Promise.all([
          listarEspeciesLocales(db).catch(() => []),
          listarDescargas(db).catch(() => []),
          obtenerLugarActivoId(db).catch(() => null),
        ]);
        if (!activo) return;
        setEspecies(lista);
        setDescargas(Object.fromEntries(resumenes.map((d) => [d.lugarId, d])));
        // Solo vale un lugar ACTIVO que además esté descargado.
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
  // Filtro ESTRICTO: solo las especies del lugar seleccionado.
  const visibles = lugarActivo
    ? especies.filter((e) => e.lugarId === lugarActivo.lugarId)
    : [];

  const texto = busqueda.trim().toLowerCase();
  const totales = {
    TODAS: visibles.length,
    FAUNA: visibles.filter(({ especie }) => especie.tipo === "FAUNA").length,
    FLORA: visibles.filter(({ especie }) => especie.tipo === "FLORA").length,
  } as const;
  const filtradas = visibles.filter(({ especie }: EspecieConLugar) => {
    if (categoria !== "TODAS" && especie.tipo !== categoria) return false;
    if (!texto) return true;
    return [especie.nombreComun, especie.nombreCientifico, especie.familia, especie.descripcion]
      .filter(Boolean)
      .some((campo) => campo!.toLowerCase().includes(texto));
  });

  function claveDe(especie: EspecieConLugar): string {
    return `${especie.lugarId}-${especie.especie.id}`;
  }

  return (
    <SafeAreaView style={styles.contenedor} edges={["top", "left", "right"]}>
      <View style={styles.encabezado}>
        <Text style={styles.titulo}>Especies</Text>
        {lugarActivo ? (
          <>
            <Pressable
              style={styles.botonLugarActivo}
              onPress={() => router.navigate("/")}
            >
              <Ionicons name="location" size={15} color="#1B4332" />
              <Text style={styles.botonLugarActivoTexto} numberOfLines={1}>
                {lugarActivo.nombre} · cambiar en Info
              </Text>
            </Pressable>
            <View style={styles.buscador}>
              <Ionicons name="search-outline" size={18} color="#8A8A8A" />
              <TextInput
                style={styles.input}
                placeholder="Buscar por nombre, familia…"
                placeholderTextColor="#9A9A9A"
                value={busqueda}
                onChangeText={setBusqueda}
                autoCapitalize="none"
                autoCorrect={false}
              />
              {busqueda !== "" && (
                <Pressable onPress={() => setBusqueda("")} hitSlop={8}>
                  <Ionicons name="close-circle" size={18} color="#8A8A8A" />
                </Pressable>
              )}
            </View>

            <View style={styles.chips}>
              {CATEGORIAS.map((cat) => {
                const activa = cat === categoria;
                return (
                  <Pressable
                    key={cat}
                    style={[styles.chip, activa && styles.chipActiva]}
                    onPress={() => setCategoria(cat)}
                  >
                    <Text style={[styles.chipTexto, activa && styles.chipTextoActiva]}>
                      {cat === "TODAS"
                        ? `Todas (${totales.TODAS})`
                        : cat === "FAUNA"
                          ? `Fauna (${totales.FAUNA})`
                          : `Flora (${totales.FLORA})`}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </>
        ) : (
          <Text style={styles.subtitulo}>
            Elige tu lugar actual en «Info» para ver su flora y fauna.
          </Text>
        )}
      </View>

      {cargando ? (
        <View style={styles.vacio}>
          <Text style={styles.textoSecundario}>Cargando especies…</Text>
        </View>
      ) : !lugarActivo ? (
        <SinLugarActivo />
      ) : visibles.length === 0 ? (
        <View style={styles.vacio}>
          <Ionicons name="cloud-download-outline" size={40} color="#1B4332" />
          <Text style={styles.vacioTitulo}>Este lugar aún no tiene especies</Text>
          <Text style={styles.textoSecundario}>
            Descarga {lugarActivo.nombre} desde la pestaña «Info» y aquí
            aparecerá su flora y fauna.
          </Text>
        </View>
      ) : filtradas.length === 0 ? (
        <View style={styles.vacio}>
          <Text style={styles.vacioTitulo}>Sin resultados</Text>
          <Text style={styles.textoSecundario}>
            Prueba con otro nombre o cambia la categoría.
          </Text>
        </View>
      ) : (
        <FlatList
          data={filtradas}
          keyExtractor={claveDe}
          contentContainerStyle={styles.lista}
          renderItem={({ item }) => {
            const { especie } = item;
            const expandidaEsta = expandida === claveDe(item);
            return (
              <Pressable
                style={({ pressed }) => [
                  styles.tarjeta,
                  pressed && styles.tarjetaPresionada,
                ]}
                onPress={() => setExpandida(expandidaEsta ? null : claveDe(item))}
              >
                <Miniatura especie={especie} />
                <View style={styles.tarjetaCuerpo}>
                  <View style={styles.filaSuperior}>
                    <Text style={styles.nombreComun} numberOfLines={1}>
                      {especie.nombreComun || "Especie"}
                    </Text>
                    <View
                      style={[
                        styles.etiquetaTipo,
                        especie.tipo === "FAUNA"
                          ? styles.tipoFauna
                          : styles.tipoFlora,
                      ]}
                    >
                      <Text style={styles.etiquetaTipoTexto}>{especie.tipo}</Text>
                    </View>
                  </View>
                  {especie.nombreCientifico ? (
                    <Text style={styles.cientifico} numberOfLines={1}>
                      {especie.nombreCientifico}
                    </Text>
                  ) : null}

                  {expandidaEsta && (
                    <View style={styles.detalle}>
                      {especie.descripcion ? (
                        <Text style={styles.descripcion}>{especie.descripcion}</Text>
                      ) : null}
                      <View style={styles.filaDatos}>
                        {especie.familia ? (
                          <TextoDato etiqueta="Familia" valor={especie.familia} />
                        ) : null}
                        {especie.estadoConservacion ? (
                          <TextoDato
                            etiqueta="Conservación"
                            valor={especie.estadoConservacion}
                          />
                        ) : null}
                      </View>
                    </View>
                  )}
                  <Text style={styles.toque}>
                    {expandidaEsta ? "Toca para cerrar ▲" : "Toca para ver más ▼"}
                  </Text>
                </View>
              </Pressable>
            );
          }}
        />
      )}
    </SafeAreaView>
  );
}

function Miniatura({ especie }: { especie: EspeciePaquete }) {
  if (especie.imagen) {
    return (
      <Image
        source={{ uri: especie.imagen.datos }}
        style={styles.miniatura}
        contentFit="cover"
        transition={200}
      />
    );
  }
  return (
    <View style={[styles.miniatura, styles.miniaturaVacia]}>
      <Text style={styles.miniaturaInicial}>
        {(especie.nombreComun || "?").trim().charAt(0).toUpperCase()}
      </Text>
    </View>
  );
}

function TextoDato({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <View style={styles.dato}>
      <Text style={styles.datoEtiqueta}>{etiqueta}</Text>
      <Text style={styles.datoValor}>{valor}</Text>
    </View>
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
  buscador: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#fff",
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  input: { flex: 1, fontSize: 15, color: "#111", padding: 0 },
  chips: { flexDirection: "row", gap: 8 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: "#E8EFE9",
  },
  chipActiva: { backgroundColor: "#1B4332" },
  chipTexto: { fontSize: 13, fontWeight: "700", color: "#1B4332" },
  chipTextoActiva: { color: "#fff" },
  lista: { padding: 20, paddingTop: 8, gap: 12 },
  tarjeta: {
    flexDirection: "row",
    gap: 12,
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 12,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  tarjetaPresionada: { opacity: 0.92 },
  miniatura: {
    width: 64,
    height: 64,
    borderRadius: 12,
    backgroundColor: "#E8EFE9",
  },
  miniaturaVacia: { alignItems: "center", justifyContent: "center" },
  miniaturaInicial: { fontSize: 26, fontWeight: "800", color: "#1B4332" },
  tarjetaCuerpo: { flex: 1 },
  filaSuperior: { flexDirection: "row", alignItems: "center", gap: 8 },
  nombreComun: { flex: 1, fontSize: 16, fontWeight: "700", color: "#111" },
  etiquetaTipo: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  tipoFauna: { backgroundColor: "#DCE7F5" },
  tipoFlora: { backgroundColor: "#D6F0DC" },
  etiquetaTipoTexto: { fontSize: 11, fontWeight: "800", color: "#1B4332" },
  cientifico: { fontSize: 13, fontStyle: "italic", color: "#1B4332", marginTop: 2 },
  detalle: { marginTop: 8, gap: 8 },
  descripcion: { fontSize: 14, lineHeight: 20, color: "#333" },
  filaDatos: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  dato: {
    backgroundColor: "#F0F3F0",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  datoEtiqueta: { fontSize: 11, color: "#7A7A7A", fontWeight: "600" },
  datoValor: { fontSize: 13, color: "#111", fontWeight: "600" },
  toque: { fontSize: 11, color: "#9A9A9A", marginTop: 8 },
  vacio: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    padding: 32,
  },
  vacioTitulo: { fontSize: 16, fontWeight: "700", color: "#1B4332", textAlign: "center" },
  textoSecundario: { fontSize: 14, color: "#666", textAlign: "center" },
});