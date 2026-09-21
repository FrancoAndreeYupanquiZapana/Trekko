import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import * as DocumentPicker from "expo-document-picker";
import { File } from "expo-file-system";
import { useRouter } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import {
  guardarPaquete,
  listarDescargas,
  listarLugaresLocales,
  obtenerLugarActivoId,
  seleccionarLugarActivo,
  type DescargaLocal,
} from "@/servicios/descargas";
import { listarLugares } from "@/servicios/lugares";
import type { LugarTarjeta, PaqueteLugar } from "@/tipos";
import TrekkoLogo from "@/assets/images/trekko-logo.png";

/**
 * Convierte el archivo .json descargado desde la página web en un paquete
 * válido. Acepta el paquete directo o envuelto en la respuesta de la API
 * ({ exito, mensaje, datos }).
 */
function normalizarPaquete(texto: string): PaqueteLugar {
  const crudo = JSON.parse(texto) as unknown;
  const candidato =
    crudo && typeof crudo === "object" && "datos" in (crudo as Record<string, unknown>)
      ? (crudo as { datos: unknown }).datos
      : crudo;
  const p = candidato as Partial<PaqueteLugar> | null;
  if (
    !p ||
    p.formato !== "trekko" ||
    !p.empresa?.id ||
    !Array.isArray(p.especies) ||
    !Array.isArray(p.relatos) ||
    !Array.isArray(p.afiches)
  ) {
    throw new Error("El archivo no parece un paquete Trekko (.json) válido.");
  }
  return p as PaqueteLugar;
}

/**
 * Lee el texto de un archivo elegido con el selector del sistema.
 *
 * En Android el selector suele devolver un URI `content://` al que la API nueva
 * de `expo-file-system` no siempre puede acceder (error "Missing READ
 * permission"). `fetch` sí resuelve esos URIs a través del ContentResolver de
 * Android, así que lo usamos como respaldo.
 */
async function leerTextoDeArchivo(uri: string): Promise<string> {
  try {
    return await new File(uri).text();
  } catch (causa) {
    try {
      const respuesta = await fetch(uri);
      return await respuesta.text();
    } catch {
      throw causa;
    }
  }
}

/** Logo del lugar: el real si existe; si no, la inicial del nombre. */
function Logo({ nombre, logoUrl, tamaño }: { nombre: string; logoUrl: string; tamaño: number }) {
  const estilo = {
    width: tamaño,
    height: tamaño,
    borderRadius: tamaño / 2,
  } as const;
  if (logoUrl) {
    return <Image source={{ uri: logoUrl }} style={estilo} contentFit="cover" />;
  }
  return (
    <View style={[estilo, styles.circuloInicial]}>
      <Text style={[styles.inicial, { fontSize: tamaño * 0.42 }]}>
        {nombre.trim().charAt(0).toUpperCase() || "?"}
      </Text>
    </View>
  );
}

/**
 * Pestaña INFORMACIÓN.
 * - Con internet: catálogo con todos los lugares disponibles para descargar.
 * - Sin internet: solo los lugares que ya descargó el turista.
 * - "Mi lugar actual": el turista marca dónde está AHORA (Sandoval, no
 *   Yacumama). Esa selección filtra Especies, Afiches, Recorrido y Galería.
 */
export default function Informacion() {
  const router = useRouter();
  const db = useSQLiteContext();

  const [lugares, setLugares] = useState<LugarTarjeta[]>([]);
  const [descargas, setDescargas] = useState<Record<string, DescargaLocal>>({});
  const [lugarActivoId, setLugarActivoId] = useState<string | null>(null);
  const [usandoLocal, setUsandoLocal] = useState(false);
  const [importando, setImportando] = useState(false);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const [lista, locales, activoId] = await Promise.all([
        listarLugares(),
        listarDescargas(db),
        obtenerLugarActivoId(db),
      ]);
      setLugares(lista);
      setUsandoLocal(false);
      setDescargas(Object.fromEntries(locales.map((d) => [d.lugarId, d])));
      setLugarActivoId(activoId);
      setError(null);
    } catch (causaRed) {
      // Sin internet: mostramos las descargas guardadas (offline).
      try {
        const [localesLugares, resumenes, activoId] = await Promise.all([
          listarLugaresLocales(db),
          listarDescargas(db),
          obtenerLugarActivoId(db),
        ]);
        setLugares(localesLugares);
        setUsandoLocal(true);
        setDescargas(Object.fromEntries(resumenes.map((d) => [d.lugarId, d])));
        setLugarActivoId(activoId);
        setError(null);
      } catch {
        setError(
          causaRed instanceof Error ? causaRed.message : "No se pudo cargar el catálogo."
        );
      }
    } finally {
      setCargando(false);
    }
  }, [db]);

  useEffect(() => {
    let activo = true;
    void (async () => {
      try {
        const [lista, locales, activoId] = await Promise.all([
          listarLugares(),
          listarDescargas(db),
          obtenerLugarActivoId(db),
        ]);
        if (!activo) return;
        setLugares(lista);
        setUsandoLocal(false);
        setDescargas(Object.fromEntries(locales.map((d) => [d.lugarId, d])));
        setLugarActivoId(activoId);
        setError(null);
      } catch (causaRed) {
        if (!activo) return;
        try {
          const [localesLugares, resumenes, activoId] = await Promise.all([
            listarLugaresLocales(db),
            listarDescargas(db),
            obtenerLugarActivoId(db),
          ]);
          setLugares(localesLugares);
          setUsandoLocal(true);
          setDescargas(Object.fromEntries(resumenes.map((d) => [d.lugarId, d])));
          setLugarActivoId(activoId);
          setError(null);
        } catch {
          setError(
            causaRed instanceof Error ? causaRed.message : "No se pudo cargar el catálogo."
          );
        }
      } finally {
        if (activo) setCargando(false);
      }
    })();
    return () => {
      activo = false;
    };
  }, [db]);

  /** Reintentar desde el estado de error. */
  function reintentar() {
    setCargando(true);
    void cargar();
  }

  /** Marca el lugar actual (o lo desmarca si ya era el activo). */
  async function cambiarLugarActivo(id: string) {
    const nuevo = lugarActivoId === id ? null : id;
    await seleccionarLugarActivo(db, nuevo);
    setLugarActivoId(nuevo);
  }

  /**
   * Importa un paquete (.json) descargado desde la página web: así el turista
   * no descarga dos veces la misma información. Valida y guarda en SQLite.
   */
  async function importarPaquete() {
    if (importando) return;
    try {
      const res = await DocumentPicker.getDocumentAsync({
        type: ["application/json"],
        copyToCacheDirectory: true,
      });
      if (res.canceled || !res.assets?.length) return;
      const asset = res.assets[0];
      const texto = await leerTextoDeArchivo(asset.uri);
      const paquete = normalizarPaquete(texto);
      setImportando(true);
      await guardarPaquete(db, paquete);
      await cargar();
      Alert.alert(
        "Paquete importado ✓",
        `«${paquete.empresa.nombre}» ya está en tu teléfono.` +
          (lugarActivoId == null
            ? " Ahora márcalo como tu lugar actual para ver su información."
            : "")
      );
    } catch (causa) {
      Alert.alert(
        "No se pudo importar el archivo",
        causa instanceof Error ? causa.message : "Elige el .json que descargaste de la web."
      );
    } finally {
      setImportando(false);
    }
  }

  const soloDescargas = Object.values(descargas);
  const activoNombre = lugarActivoId ? descargas[lugarActivoId]?.nombre : null;

  if (cargando) {
    return (
      <SafeAreaView style={styles.centro}>
        <ActivityIndicator size="large" />
        <Text style={styles.textoSecundario}>Cargando lugares…</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.contenedor} edges={["top", "left", "right"]}>
      <View style={styles.encabezado}>
        <View style={styles.marca}>
          <Image source={TrekkoLogo} style={styles.logoTrekko} contentFit="contain" />
          <View style={{ flex: 1 }}>
            <Text style={styles.titulo}>Información</Text>
            <Text style={styles.subtitulo}>
              Lugares disponibles y tus descargas para usar sin conexión.
            </Text>
          </View>
        </View>
      </View>

      {usandoLocal && !error && (
        <View style={styles.avisoSinRed}>
          <Ionicons name="cloud-offline-outline" size={18} color="#7A5A00" />
          <Text style={styles.avisoSinRedTexto}>
            Sin conexión: mostrando tus descargas. Con internet aparecerán
            todos los lugares disponibles.
          </Text>
        </View>
      )}

      {!error && (
        <View style={styles.seccionImportar}>
          <View style={styles.importarTexto}>
            <Text style={styles.importarTitulo}>
              ¿Descargaste un lugar en la web?
            </Text>
            <Text style={styles.importarDetalle}>
              Importa el archivo (.json) para no descargarlo dos veces.
            </Text>
          </View>
          <Pressable
            style={[styles.botonImportar, importando && styles.botonImportarOcupado]}
            onPress={() => void importarPaquete()}
            disabled={importando}
          >
            {importando ? (
              <ActivityIndicator size="small" color="#1B4332" />
            ) : (
              <Ionicons name="folder-open-outline" size={18} color="#1B4332" />
            )}
            <Text style={styles.botonImportarTexto}>
              {importando ? "Importando…" : "Seleccionar archivo"}
            </Text>
          </Pressable>
        </View>
      )}

      {!error && soloDescargas.length > 0 && (
        <View style={styles.seccionLugarActual}>
          <Text style={styles.tituloLugarActual}>
            📍 Mi lugar actual
            {activoNombre ? `: ${activoNombre}` : " — selecciónalo"}
          </Text>
          <Text style={styles.notaLugarActual}>
            Toda la información (especies, afiches, recorrido) se centra en el
            lugar que elegiste. Si hoy estás en Sandoval, marca Sandoval y no
            te aparecerá Yacumama.
          </Text>
          <View style={styles.chips}>
            {soloDescargas.map((d) => {
              const activo = d.lugarId === lugarActivoId;
              return (
                <Pressable
                  key={d.lugarId}
                  style={[styles.chip, activo && styles.chipActiva]}
                  onPress={() => void cambiarLugarActivo(d.lugarId)}
                >
                  <Ionicons
                    name={activo ? "checkbox" : "ellipse-outline"}
                    size={14}
                    color={activo ? "#fff" : "#1B4332"}
                  />
                  <Text
                    style={[styles.chipTexto, activo && styles.chipTextoActiva]}
                    numberOfLines={1}
                  >
                    {d.nombre}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      )}

      {error ? (
        <View style={styles.mensaje}>
          <Text style={styles.textoError}>{error}</Text>
          <Text style={styles.textoSecundario}>
            Verifica que la API esté corriendo y vuelve a intentar.
          </Text>
          <Pressable style={styles.boton} onPress={reintentar}>
            <Text style={styles.botonTexto}>Reintentar</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={lugares}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.lista}
          refreshControl={
            <RefreshControl refreshing={cargando} onRefresh={cargar} />
          }
          ListEmptyComponent={
            <View style={styles.mensaje}>
              <Text style={styles.textoError}>
                Todavía no hay lugares publicados.
              </Text>
            </View>
          }
          renderItem={({ item }) => {
            const descargado = descargas[item.id];
            const activo = lugarActivoId === item.id;
            return (
              <View style={styles.tarjeta}>
                <Pressable
                  style={({ pressed }) => [
                    styles.filaPrincipal,
                    pressed && styles.tarjetaPresionada,
                  ]}
                  onPress={() =>
                    router.push({ pathname: "/lugar/[id]", params: { id: item.id } })
                  }
                >
                  <Logo nombre={item.nombre} logoUrl={item.logoUrl} tamaño={56} />
                  <View style={styles.tarjetaTexto}>
                    <Text style={styles.nombre} numberOfLines={1}>
                      {item.nombre}
                    </Text>
                    <Text style={styles.detalle} numberOfLines={2}>
                      {item.descripcion || item.ubicacion || "Sin descripción aún"}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color="#8A8A8A" />
                </Pressable>
                <View style={styles.acciones}>
                  {descargado ? (
                    <View style={[styles.chipEstado, styles.chipDescargado]}>
                      <Text
                        style={[
                          styles.chipEstadoTexto,
                          styles.chipEstadoTextoDescargado,
                        ]}
                      >
                        Descargado ✓
                      </Text>
                    </View>
                  ) : (
                    <Pressable
                      style={({ pressed }) => [
                        styles.chipEstado,
                        styles.chipPendiente,
                        styles.chipBoton,
                        pressed && styles.chipBotonPresionado,
                      ]}
                      onPress={() =>
                        router.push({
                          pathname: "/lugar/[id]",
                          params: { id: item.id },
                        })
                      }
                    >
                      <Ionicons name="download-outline" size={14} color="#fff" />
                      <Text style={styles.chipEstadoTexto}>Descargar</Text>
                    </Pressable>
                  )}
                  {descargado ? (
                    <Pressable
                      style={[
                        styles.botonUsar,
                        activo && styles.botonUsarActivo,
                      ]}
                      onPress={() => void cambiarLugarActivo(item.id)}
                    >
                      <Ionicons
                        name={activo ? "checkmark-circle" : "locate-outline"}
                        size={15}
                        color={activo ? "#fff" : "#1B4332"}
                      />
                      <Text
                        style={[
                          styles.botonUsarTexto,
                          activo && styles.botonUsarTextoActivo,
                        ]}
                      >
                        {activo ? "Estás aquí ✓" : "Usar ahora"}
                      </Text>
                    </Pressable>
                  ) : null}
                </View>
              </View>
            );
          }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  contenedor: { flex: 1, backgroundColor: "#F7F7F5" },
  centro: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  encabezado: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 },
  marca: { flexDirection: "row", alignItems: "center", gap: 12 },
  logoTrekko: { width: 44, height: 44 },
  titulo: { fontSize: 28, fontWeight: "800", color: "#1B4332" },
  subtitulo: { fontSize: 14, color: "#555", marginTop: 1 },
  avisoSinRed: {
    marginHorizontal: 20,
    marginBottom: 4,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#FFF4D6",
    borderRadius: 12,
    padding: 12,
  },
  avisoSinRedTexto: { flex: 1, color: "#7A5A00", fontSize: 13 },
  seccionImportar: {
    marginHorizontal: 20,
    marginBottom: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: "#DFE6DF",
    borderStyle: "dashed",
  },
  importarTexto: { flex: 1, gap: 2 },
  importarTitulo: { fontSize: 14, fontWeight: "700", color: "#1B4332" },
  importarDetalle: { fontSize: 12, color: "#8A8A8A" },
  botonImportar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#E8EFE9",
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  botonImportarOcupado: { opacity: 0.6 },
  botonImportarTexto: { fontSize: 13, fontWeight: "700", color: "#1B4332" },
  seccionLugarActual: {
    marginHorizontal: 20,
    marginBottom: 8,
    backgroundColor: "#E8EFE9",
    borderRadius: 16,
    padding: 14,
    gap: 8,
  },
  tituloLugarActual: { fontSize: 15, fontWeight: "800", color: "#1B4332" },
  notaLugarActual: { fontSize: 12, color: "#4A6B5C", lineHeight: 17 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#fff",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
    maxWidth: "100%",
    borderWidth: 1,
    borderColor: "#DFE6DF",
  },
  chipActiva: { backgroundColor: "#1B4332", borderColor: "#1B4332" },
  chipTexto: { color: "#1B4332", fontSize: 13, fontWeight: "700" },
  chipTextoActiva: { color: "#fff" },
  lista: { padding: 20, paddingTop: 8, gap: 12 },
  tarjeta: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 12,
    gap: 10,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  filaPrincipal: { flexDirection: "row", alignItems: "center", gap: 12 },
  tarjetaPresionada: { opacity: 0.85 },
  circuloInicial: {
    backgroundColor: "#E8EFE9",
    alignItems: "center",
    justifyContent: "center",
  },
  inicial: { fontWeight: "800", color: "#1B4332" },
  tarjetaTexto: { flex: 1 },
  nombre: { fontSize: 17, fontWeight: "700", color: "#111" },
  detalle: { fontSize: 13, color: "#666", marginTop: 2 },
  acciones: { flexDirection: "row", alignItems: "center", gap: 8 },
  chipEstado: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999 },
  chipDescargado: { backgroundColor: "#D6F0DC" },
  chipPendiente: { backgroundColor: "#1B4332" },
  chipBoton: { flexDirection: "row", alignItems: "center", gap: 5 },
  chipBotonPresionado: { opacity: 0.8 },
  chipEstadoTexto: { fontSize: 12, fontWeight: "700", color: "#fff" },
  chipEstadoTextoDescargado: { color: "#1B4332" },
  botonUsar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderWidth: 1,
    borderColor: "#1B4332",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  botonUsarActivo: { backgroundColor: "#1B4332", borderColor: "#1B4332" },
  botonUsarTexto: { fontSize: 12, fontWeight: "700", color: "#1B4332" },
  botonUsarTextoActivo: { color: "#fff" },
  mensaje: {
    margin: 20,
    padding: 24,
    backgroundColor: "#fff",
    borderRadius: 16,
    alignItems: "center",
    gap: 8,
  },
  textoError: {
    fontSize: 16,
    fontWeight: "600",
    color: "#B23B3B",
    textAlign: "center",
  },
  textoSecundario: { fontSize: 14, color: "#666", textAlign: "center" },
  boton: {
    marginTop: 8,
    backgroundColor: "#1B4332",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 999,
  },
  botonTexto: { color: "#fff", fontWeight: "700" },
});