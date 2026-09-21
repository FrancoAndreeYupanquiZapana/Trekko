import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useFocusEffect, useRouter } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { useCallback, useState, type ComponentProps } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import SinLugarActivo from "@/componentes/SinLugarActivo";
import {
  listarDescargas,
  listarRelatosLocales,
  obtenerLugarActivoId,
  type DescargaLocal,
  type RelatoConLugar,
} from "@/servicios/descargas";

type Icono = ComponentProps<typeof Ionicons>["name"];

const TIPOS: { valor: string; etiqueta: string; icono: Icono; color: string }[] = [
  { valor: "MITO", etiqueta: "Mito", icono: "moon-outline", color: "#7B5EA7" },
  { valor: "LEYENDA", etiqueta: "Leyenda", icono: "book-outline", color: "#2E86AB" },
  {
    valor: "DATO_CURIOSO",
    etiqueta: "Dato curioso",
    icono: "bulb-outline",
    color: "#B7791F",
  },
  {
    valor: "SIMBIOSIS",
    etiqueta: "Simbiosis",
    icono: "swap-horizontal-outline",
    color: "#14866D",
  },
];

/**
 * Pestaña MITOS Y LEYENDAS.
 * Muestra los relatos locales del LUGAR ACTIVO (mitos, leyendas, datos
 * curiosos y simbiosis). Si no hay lugar seleccionado, no se muestra nada.
 */
export default function Mitos() {
  const db = useSQLiteContext();
  const router = useRouter();

  const [relatos, setRelatos] = useState<RelatoConLugar[]>([]);
  const [descargas, setDescargas] = useState<Record<string, DescargaLocal>>({});
  const [lugarActivoId, setLugarActivoId] = useState<string | null>(null);
  const [tipo, setTipo] = useState<string | null>(null);
  const [expandido, setExpandido] = useState<string | null>(null);
  const [cargando, setCargando] = useState(true);

  useFocusEffect(
    useCallback(() => {
      let activo = true;
      void (async () => {
        const [lista, resumenes, lugarActivo] = await Promise.all([
          listarRelatosLocales(db).catch(() => []),
          listarDescargas(db).catch(() => []),
          obtenerLugarActivoId(db).catch(() => null),
        ]);
        if (!activo) return;
        setRelatos(lista);
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
  // Filtro ESTRICTO: solo las historias del lugar seleccionado.
  const porLugar = lugarActivo
    ? relatos.filter((r) => r.lugarId === lugarActivo.lugarId)
    : [];
  const visibles = tipo
    ? porLugar.filter((r) => r.relato.tipo === tipo)
    : porLugar;

  function claveDe(relato: RelatoConLugar): string {
    return `${relato.lugarId}-${relato.relato.id}`;
  }

  return (
    <SafeAreaView style={styles.contenedor} edges={["top", "left", "right"]}>
      <View style={styles.encabezado}>
        <Text style={styles.titulo}>Mitos y leyendas</Text>
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

            {porLugar.length > 0 && (
              <View style={styles.chipsTipos}>
                <Pressable
                  key="todos"
                  style={[styles.chipTipo, tipo == null && styles.chipTipoActiva]}
                  onPress={() => setTipo(null)}
                >
                  <Text
                    style={[
                      styles.chipTipoTexto,
                      tipo == null && styles.chipTipoTextoActiva,
                    ]}
                  >
                    Todos ({porLugar.length})
                  </Text>
                </Pressable>
                {TIPOS.map((t) => {
                  const cantidad = porLugar.filter(
                    (r) => r.relato.tipo === t.valor
                  ).length;
                  if (cantidad === 0) return null;
                  const activa = tipo === t.valor;
                  return (
                    <Pressable
                      key={t.valor}
                      style={[styles.chipTipo, activa && styles.chipTipoActiva]}
                      onPress={() => setTipo(activa ? null : t.valor)}
                    >
                      <Ionicons
                        name={t.icono}
                        size={14}
                        color={activa ? "#fff" : t.color}
                      />
                      <Text
                        style={[
                          styles.chipTipoTexto,
                          activa && styles.chipTipoTextoActiva,
                          !activa && { color: t.color },
                        ]}
                      >
                        {t.etiqueta} ({cantidad})
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            )}
          </>
        ) : (
          <Text style={styles.subtitulo}>
            Elige tu lugar actual en «Info» para ver sus historias.
          </Text>
        )}
      </View>

      {cargando ? (
        <View style={styles.vacio}>
          <Text style={styles.textoSecundario}>Cargando historias…</Text>
        </View>
      ) : !lugarActivo ? (
        <SinLugarActivo />
      ) : porLugar.length === 0 ? (
        <View style={styles.vacio}>
          <Ionicons name="book-outline" size={40} color="#1B4332" />
          <Text style={styles.vacioTitulo}>Este lugar aún no tiene historias</Text>
          <Text style={styles.textoSecundario}>
            Descarga {lugarActivo.nombre} desde «Info»: aquí aparecerán sus
            mitos, leyendas y datos curiosos.
          </Text>
        </View>
      ) : visibles.length === 0 ? (
        <View style={styles.vacio}>
          <Text style={styles.vacioTitulo}>Sin resultados</Text>
          <Text style={styles.textoSecundario}>
            Prueba con otro tipo de historia.
          </Text>
        </View>
      ) : (
        <FlatList
          data={visibles}
          keyExtractor={claveDe}
          contentContainerStyle={styles.lista}
          renderItem={({ item }) => {
            const { relato } = item;
            const tipoInfo = TIPOS.find((t) => t.valor === relato.tipo);
            const expandidoEsta = expandido === claveDe(item);
            return (
              <Pressable
                style={({ pressed }) => [
                  styles.tarjeta,
                  pressed && styles.tarjetaPresionada,
                ]}
                onPress={() => setExpandido(expandidoEsta ? null : claveDe(item))}
              >
                {relato.imagen ? (
                  <Image
                    source={{ uri: relato.imagen.datos }}
                    style={[
                      styles.imagen,
                      { aspectRatio: relato.imagen.ancho / relato.imagen.alto },
                    ]}
                    contentFit="cover"
                    transition={200}
                  />
                ) : (
                  <View style={styles.imagenSin}>
                    <Ionicons
                      name={tipoInfo?.icono ?? "book-outline"}
                      size={34}
                      color={tipoInfo?.color ?? "#1B4332"}
                    />
                  </View>
                )}
                <View style={styles.cuerpo}>
                  <View style={styles.filaTitulo}>
                    <Text style={styles.tituloRelato} numberOfLines={expandidoEsta ? 0 : 2}>
                      {relato.titulo || "Historia del lugar"}
                    </Text>
                    {tipoInfo && (
                      <View
                        style={[
                          styles.etiquetaTipo,
                          { backgroundColor: `${tipoInfo.color}1A` },
                        ]}
                      >
                        <Text
                          style={[styles.etiquetaTipoTexto, { color: tipoInfo.color }]}
                        >
                          {tipoInfo.etiqueta}
                        </Text>
                      </View>
                    )}
                  </View>
                  {expandidoEsta && relato.contenido ? (
                    <Text style={styles.contenido}>{relato.contenido}</Text>
                  ) : null}
                  <Text style={styles.toque}>
                    {expandidoEsta ? "Toca para cerrar ▲" : "Toca para leer la historia ▼"}
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
  chipsTipos: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chipTipo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#DFE6DF",
  },
  chipTipoActiva: { backgroundColor: "#1B4332", borderColor: "#1B4332" },
  chipTipoTexto: { fontSize: 12, fontWeight: "700", color: "#1B4332" },
  chipTipoTextoActiva: { color: "#fff" },
  lista: { padding: 20, paddingTop: 8, gap: 12 },
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
    backgroundColor: "#F0ECF4",
  },
  cuerpo: { padding: 14, gap: 6 },
  filaTitulo: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  tituloRelato: { flex: 1, fontSize: 16, fontWeight: "700", color: "#111" },
  etiquetaTipo: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  etiquetaTipoTexto: { fontSize: 11, fontWeight: "800" },
  contenido: { fontSize: 14, lineHeight: 22, color: "#333", marginTop: 6 },
  toque: { fontSize: 11, color: "#9A9A9A", marginTop: 6 },
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