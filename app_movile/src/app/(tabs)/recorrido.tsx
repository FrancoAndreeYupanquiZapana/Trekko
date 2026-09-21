import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { Directory, File, Paths } from "expo-file-system";
import * as ImagePicker from "expo-image-picker";
import * as Location from "expo-location";
import { useSQLiteContext } from "expo-sqlite";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import MapaRecorrido from "@/componentes/MapaRecorrido";
import { listarLugaresLocales, obtenerLugarActivoId } from "@/servicios/descargas";
import {
  actualizarDescripcionPunto,
  agregarPunto,
  cerrarRecorridosAbandonados,
  crearRecorrido,
  distanciaDePuntosM,
  distanciaHaversineM,
  finalizarRecorrido,
  listarPuntos,
  listarRecorridosResumen,
  type PuntoRecorrido,
  type RecorridoLocal,
  type RecorridoResumen,
} from "@/servicios/recorridos";
import type { LugarTarjeta } from "@/tipos";

/* ── Helpers de formato ───────────────────────────────────────────────── */

function formatearDistancia(m: number): string {
  if (m >= 1000) return `${(m / 1000).toFixed(2)} km`;
  return `${Math.round(m)} m`;
}

function formatearHora(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString("es", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  } catch {
    return iso;
  }
}

function formatearFecha(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("es", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

function duracionEntre(inicioIso: string, finIso: string | null): string {
  const fin = finIso ? new Date(finIso).getTime() : Date.now();
  const ms = Math.max(0, fin - new Date(inicioIso).getTime());
  const min = Math.floor(ms / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  return `${min} min ${s} s`;
}

/** Guarda la foto de la cámara en la carpeta de documentos de la app. */
async function guardarFotoComoArchivo(uriOrigen: string): Promise<string> {
  const dir = new Directory(Paths.document, "trekko", "fotos");
  dir.create({ intermediates: true, idempotent: true });
  const destino = new File(dir, `foto-${Date.now()}.jpg`);
  const origen = new File(uriOrigen);
  await origen.copy(destino);
  return destino.uri;
}

/**
 * Pestaña RECORRIDO (trazabilidad tipo QuickCapture).
 *
 * Tal como planificacion.md:
 *  - "Iniciar recorrido" prende el GPS y deja una polilínea de puntos.
 *  - No se guarda un punto cada segundo: se guarda cuando se avanza >=15 m
 *    o pasan ~25 s, y la precisión GPS es aceptable.
 *  - "Foto y punto": toma una foto georreferenciada (fecha, ubicación,
 *    descripción de lo que viste) marcada como punto del recorrido.
 *  - Todo se almacena LOCALMENTE (SQLite + carpeta de documentos) por ahora.
 */
export default function Recorrido() {
  const db = useSQLiteContext();

  const [lugarSel, setLugarSel] = useState<LugarTarjeta | null>(null);
  const [activo, setActivo] = useState<RecorridoLocal | null>(null);
  const [puntos, setPuntos] = useState<PuntoRecorrido[]>([]);
  const [posicion, setPosicion] = useState<Location.LocationObject | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);
  const [historial, setHistorial] = useState<RecorridoResumen[]>([]);
  const [expandidoId, setExpandidoId] = useState<number | null>(null);
  const [puntosExp, setPuntosExp] = useState<PuntoRecorrido[]>([]);
  const [puntoParaDescripcion, setPuntoParaDescripcion] = useState<PuntoRecorrido | null>(null);
  const [descripcion, setDescripcion] = useState("");

  const activoIdRef = useRef<number | null>(null);
  const suscripcionRef = useRef<Location.LocationSubscription | null>(null);
  const ultimoRef = useRef<{ lat: number; lng: number; ts: number } | null>(null);
  // "Ancla": última posición del GPS (aunque no se guarde punto). Sirve para
  // no guardar puntos cuando el GPS tiembla sin que el turista haya avanzado.
  const anclaRef = useRef<{ lat: number; lng: number; ts: number } | null>(null);

  const recargarHistorial = useCallback(async () => {
    const lista = await listarRecorridosResumen(db).catch(() => []);
    setHistorial(lista);
  }, [db]);

  /** Guarda un punto del recorrido actual (línea según el plan). */
  const guardarPuntoLocal = useCallback(
    async (loc: Location.LocationObject, fotoUri: string | null) => {
      const recorridoId = activoIdRef.current;
      if (recorridoId == null) return null;
      const timestampIso = new Date(loc.timestamp).toISOString();
      const id = await agregarPunto(db, recorridoId, {
        lat: loc.coords.latitude,
        lng: loc.coords.longitude,
        altitud: loc.coords.altitude,
        precisionGps: loc.coords.accuracy,
        velocidad: loc.coords.speed,
        timestamp: timestampIso,
        fotoUri,
      });
      const punto: PuntoRecorrido = {
        id,
        recorridoId,
        lat: loc.coords.latitude,
        lng: loc.coords.longitude,
        altitud: loc.coords.altitude,
        precisionGps: loc.coords.accuracy,
        velocidad: loc.coords.speed,
        timestamp: timestampIso,
        fotoUri,
        descripcion: null,
      };
      ultimoRef.current = { lat: punto.lat, lng: punto.lng, ts: loc.timestamp };
      setPuntos((prev) => [...prev, punto]);
      return punto;
    },
    [db]
  );

  /** Callback del GPS: guarda SOLO cuando hubo avance real. */
  const alRecibirPosicion = useCallback(
    (loc: Location.LocationObject) => {
      setPosicion(loc);
      if (activoIdRef.current == null) return;
      const acc = loc.coords.accuracy;
      if (acc != null && acc > 80) return; // precisión demasiado mala
      const ancla = anclaRef.current;
      const ultimo = ultimoRef.current;
      const desplazamiento = ancla
        ? distanciaHaversineM(ancla, { lat: loc.coords.latitude, lng: loc.coords.longitude })
        : Infinity;
      const desdePunto = ultimo ? loc.timestamp - ultimo.ts : Infinity;
      anclaRef.current = {
        lat: loc.coords.latitude,
        lng: loc.coords.longitude,
        ts: loc.timestamp,
      };
      // Parado (el GPS tiembla unos metros): NO se guarda nada. Así no
      // aparece "X m recorridos" sin que el turista haya caminado.
      if (desplazamiento < 10) return;
      // Avanzó poco y hace poco: se espera al siguiente reporte del GPS.
      if (desplazamiento < 15 && desdePunto < 25000) return;
      void guardarPuntoLocal(loc, null);
    },
    [guardarPuntoLocal]
  );

  async function iniciar() {
    if (ocupado) return;
    setOcupado(true);
    setAviso(null);
    try {
      const servicios = await Location.hasServicesEnabledAsync();
      if (!servicios) {
        Alert.alert(
          "Ubicación apagada",
          "Activa la ubicación del teléfono para poder grabar tu recorrido."
        );
        return;
      }
      const p = await Location.requestForegroundPermissionsAsync();
      if (p.status !== "granted") {
        Alert.alert(
          "Permiso necesario",
          "Trekko necesita tu ubicación (en uso) para registrar la línea del recorrido."
        );
        return;
      }
      await cerrarRecorridosAbandonados(db);
      const id = await crearRecorrido(db, {
        lugarId: lugarSel?.id ?? null,
        lugarNombre: lugarSel?.nombre ?? null,
      });
      activoIdRef.current = id;
      ultimoRef.current = null;
      setActivo({
        id,
        lugarId: lugarSel?.id ?? null,
        lugarNombre: lugarSel?.nombre ?? null,
        iniciadoEn: new Date().toISOString(),
        terminadoEn: null,
        estado: "EN_CURSO",
      });
      setPuntos([]);
      // Primero la posición actual: sirve de "ancla" para no guardar puntos
      // por el simple temblor del GPS (evita el "9 m sin haber caminado").
      const actual = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      setPosicion(actual);
      await guardarPuntoLocal(actual, null); // punto inicial
      anclaRef.current = {
        lat: actual.coords.latitude,
        lng: actual.coords.longitude,
        ts: actual.timestamp,
      };
      suscripcionRef.current = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.High, timeInterval: 10000, distanceInterval: 10 },
        alRecibirPosicion
      );
      setAviso(
        "Recorrido iniciado 🚶 Camina: se irá dibujando tu línea y podrás marcar fotos."
      );
    } catch (causa) {
      Alert.alert(
        "No se pudo iniciar",
        causa instanceof Error ? causa.message : "Revisa tu GPS e intenta de nuevo."
      );
    } finally {
      setOcupado(false);
    }
  }

  async function registrarPuntoManual() {
    const loc =
      posicion ??
      (await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High }));
    setPosicion(loc);
    await guardarPuntoLocal(loc, null);
    setAviso("Punto registrado ✓");
  }

  async function tomarFotoYPunto() {
    const cam = await ImagePicker.requestCameraPermissionsAsync();
    if (!cam.granted) {
      Alert.alert("Permiso necesario", "Habilita la cámara para capturar tu foto del recorrido.");
      return;
    }
    const res = await ImagePicker.launchCameraAsync({
      mediaTypes: ["images"],
      quality: 0.7,
      exif: true,
      allowsEditing: false,
    });
    if (res.canceled || !res.assets?.length) return;
    const asset = res.assets[0];
    let uri = asset.uri;
    try {
      uri = await guardarFotoComoArchivo(asset.uri);
    } catch {
      // Si la copia falla, usamos la temporal (visible en esta sesión).
    }
    const loc =
      posicion ??
      (await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High }));
    setPosicion(loc);
    const punto = await guardarPuntoLocal(loc, uri);
    if (punto) {
      setPuntoParaDescripcion(punto);
      setDescripcion("");
      setAviso("Foto guardada con su ubicación. Cuéntanos qué viste.");
    }
  }

  async function guardarDescripcionPunto() {
    if (!puntoParaDescripcion) return;
    const texto = descripcion.trim();
    await actualizarDescripcionPunto(db, puntoParaDescripcion.id, texto);
    setPuntos((prev) =>
      prev.map((p) =>
        p.id === puntoParaDescripcion.id ? { ...p, descripcion: texto } : p
      )
    );
    setPuntoParaDescripcion(null);
    setDescripcion("");
    setAviso("Descripción guardada ✓");
  }

  async function finalizar() {
    const rec = activo;
    if (!rec) return;
    suscripcionRef.current?.remove();
    suscripcionRef.current = null;
    const fotos = puntos.filter((p) => p.fotoUri).length;
    const dist = distanciaDePuntosM(puntos);
    await finalizarRecorrido(db, rec.id);
    activoIdRef.current = null;
    ultimoRef.current = null;
    anclaRef.current = null;
    setActivo(null);
    setPuntos([]);
    setPosicion(null);
    setPuntoParaDescripcion(null);
    await recargarHistorial();
    Alert.alert(
      "Recorrido terminado 🎉",
      `${puntos.length} punto(s), ${fotos} foto(s) y ${formatearDistancia(dist)} recorridos.`
    );
  }

  async function alternarExpansion(id: number) {
    if (expandidoId === id) {
      setExpandidoId(null);
      setPuntosExp([]);
      return;
    }
    setExpandidoId(id);
    setPuntosExp(await listarPuntos(db, id).catch(() => []));
  }

  useEffect(() => {
    let activo = true;
    void (async () => {
      const [lugaresLocales, abandonados, lugarActivoId] = await Promise.all([
        listarLugaresLocales(db).catch(() => []),
        cerrarRecorridosAbandonados(db).catch(() => 0),
        obtenerLugarActivoId(db).catch(() => null),
      ]);
      if (abandonados > 0) {
        // Un recorrido anterior se cerró solo (por ejemplo, al cerrar la app).
      }
      if (activo && lugarActivoId) {
        const lugarActivo = lugaresLocales.find((l) => l.id === lugarActivoId);
        if (lugarActivo) setLugarSel(lugarActivo);
      }
      const lista = await listarRecorridosResumen(db).catch(() => []);
      if (activo) setHistorial(lista);
    })();
    return () => {
      activo = false;
      suscripcionRef.current?.remove();
    };
  }, [db]);

  const distancia = distanciaDePuntosM(puntos);
  const fotosRecorrido = puntos.filter((p) => p.fotoUri).length;
  const ultimo = puntos[puntos.length - 1] ?? null;

  return (
    <SafeAreaView style={styles.contenedor} edges={["top", "left", "right"]}>
      <ScrollView contentContainerStyle={styles.contenido}>
        <View style={styles.encabezado}>
          <Text style={styles.titulo}>Recorrido</Text>
          <Text style={styles.subtitulo}>
            Tu línea de caminata con puntos y fotos marcadas, como QuickCapture.
          </Text>
        </View>

        {activo ? (
          <View style={styles.tarjetaVivo}>
            <View style={styles.filaVivo}>
              <View style={styles.puntoVivo} />
              <Text style={styles.estadoVivo}>GRABANDO</Text>
              <Text style={styles.lugarVivo}>
                {activo.lugarNombre ?? "Sin lugar"}
              </Text>
            </View>
            <View style={styles.metricas}>
              <View style={styles.metrica}>
                <Text style={styles.metricaValor}>{puntos.length}</Text>
                <Text style={styles.metricaEtiqueta}>puntos</Text>
              </View>
              <View style={styles.metrica}>
                <Text style={styles.metricaValor}>{formatearDistancia(distancia)}</Text>
                <Text style={styles.metricaEtiqueta}>recorrido</Text>
              </View>
              <View style={styles.metrica}>
                <Text style={styles.metricaValor}>{fotosRecorrido}</Text>
                <Text style={styles.metricaEtiqueta}>fotos</Text>
              </View>
              <View style={styles.metrica}>
                <Text style={styles.metricaValor}>
                  {duracionEntre(activo.iniciadoEn, null)}
                </Text>
                <Text style={styles.metricaEtiqueta}>duración</Text>
              </View>
            </View>
            {ultimo ? (
              <Text style={styles.ultimoPunto}>
                Último punto: {ultimo.lat.toFixed(5)}, {ultimo.lng.toFixed(5)} ·{" "}
                {formatearHora(ultimo.timestamp)}
              </Text>
            ) : null}

            {puntos.length > 0 && (
              <MapaRecorrido puntos={puntos} seguimiento altura={240} />
            )}

            <View style={styles.botonesAccion}>
              <Pressable style={styles.botonFoto} onPress={() => void tomarFotoYPunto()}>
                <Ionicons name="camera" size={18} color="#fff" />
                <Text style={styles.botonFotoTexto}>Foto y punto</Text>
              </Pressable>
              <Pressable style={styles.botonPunto} onPress={() => void registrarPuntoManual()}>
                <Ionicons name="locate" size={18} color="#1B4332" />
                <Text style={styles.botonPuntoTexto}>Punto aquí</Text>
              </Pressable>
            </View>

            {puntoParaDescripcion && (
              <View style={styles.tarjetaDescripcion}>
                <Text style={styles.descripcionTitulo}>
                  ¿Qué viste en este punto?
                </Text>
                <TextInput
                  style={styles.input}
                  placeholder="Ej. Un mono aullador en la copa del árbol…"
                  placeholderTextColor="#9A9A9A"
                  value={descripcion}
                  onChangeText={setDescripcion}
                  multiline
                />
                <Pressable
                  style={[styles.botonGuardarDesc, !descripcion.trim() && styles.botonInactivo]}
                  onPress={() => void guardarDescripcionPunto()}
                  disabled={!descripcion.trim()}
                >
                  <Text style={styles.botonGuardarDescTexto}>Guardar descripción</Text>
                </Pressable>
              </View>
            )}

            <Pressable
              style={[styles.botonFinalizar, ocupado && styles.botonInactivo]}
              onPress={() => void finalizar()}
              disabled={ocupado}
            >
              <Text style={styles.botonFinalizarTexto}>Finalizar recorrido</Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.tarjetaNuevo}>
            <Text style={styles.tarjetaTitulo}>Nuevo recorrido</Text>
            {lugarSel ? (
              <View style={styles.filaLugar}>
                <Ionicons name="location" size={16} color="#1B4332" />
                <Text style={styles.filaLugarTexto} numberOfLines={1}>
                  {lugarSel.nombre}
                </Text>
              </View>
            ) : (
              <Text style={styles.nota}>
                Primero selecciona tu lugar actual en «Info» (mi lugar actual).
                Sin lugar seleccionado no se puede iniciar un recorrido.
              </Text>
            )}
            <Pressable
              style={[
                styles.botonIniciar,
                (ocupado || !lugarSel) && styles.botonInactivo,
              ]}
              onPress={() => void iniciar()}
              disabled={ocupado || !lugarSel}
            >
              {ocupado ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Ionicons name="play" size={18} color="#fff" />
                  <Text style={styles.botonIniciarTexto}>Iniciar recorrido</Text>
                </>
              )}
            </Pressable>
          </View>
        )}

        {aviso && (
          <View style={styles.aviso}>
            <Ionicons name="information-circle-outline" size={18} color="#1B4332" />
            <Text style={styles.avisoTexto}>{aviso}</Text>
          </View>
        )}

        <View style={styles.tarjetaComoFunciona}>
          <Text style={styles.comoFuncionaTitulo}>¿Cómo funciona?</Text>
          <Text style={styles.comoFuncionaTexto}>
            · La app prende tu ubicación y deja una {""}
            <Text style={{ fontWeight: "700" }}>línea de recorrido</Text> (QuickCapture).
          </Text>
          <Text style={styles.comoFuncionaTexto}>
            · Guarda un punto cuando avanzas ~15 m o pasan ~25 s, si la precisión
            GPS es buena (así se cuida la batería).
          </Text>
          <Text style={styles.comoFuncionaTexto}>
            · Cada foto queda marcada con su ubicación, fecha y tu descripción;
            es tu evidencia de que la tomaste en el lugar.
          </Text>
          <Text style={styles.comoFuncionaTexto}>
            · Todo se guarda localmente en tu teléfono por ahora; la validación
            dentro de la zona turística y el envío llegan con internet.
          </Text>
        </View>

        <View style={styles.seccionHistorial}>
          <Text style={styles.tituloHistorial}>Tus recorridos</Text>
          {historial.length === 0 ? (
            <Text style={styles.textoSecundario}>
              Aún no tienes recorridos. Inicia el primero arriba 👆
            </Text>
          ) : (
            historial.map((rec) => {
              const expandido = expandidoId === rec.id;
              return (
                <Pressable
                  key={rec.id}
                  style={styles.tarjetaHistorial}
                  onPress={() => void alternarExpansion(rec.id)}
                >
                  <View style={styles.filaHistorial}>
                    <View style={styles.historialTexto}>
                      <Text style={styles.historialTitulo}>
                        {rec.lugarNombre ?? "Recorrido libre"}
                      </Text>
                      <Text style={styles.historialFecha}>
                        {formatearFecha(rec.iniciadoEn)} ·{" "}
                        {rec.estado === "ABANDONADO"
                          ? "no terminado"
                          : duracionEntre(rec.iniciadoEn, rec.terminadoEn)}
                      </Text>
                    </View>
                    <Ionicons
                      name={expandido ? "chevron-up" : "chevron-down"}
                      size={18}
                      color="#8A8A8A"
                    />
                  </View>
                  <View style={styles.filaStats}>
                    <Text style={styles.stat}>📍 {rec.puntos} pts</Text>
                    <Text style={styles.stat}>📷 {rec.fotos} fotos</Text>
                    <Text style={styles.stat}>📏 {formatearDistancia(rec.distanciaM)}</Text>
                  </View>
                  {expandido && (
                    <View style={styles.listaPuntos}>
                      <MapaRecorrido puntos={puntosExp} altura={220} />
                      {puntosExp.length === 0 ? (
                        <Text style={styles.textoSecundario}>Sin puntos.</Text>
                      ) : (
                        puntosExp.map((punto, i) => (
                          <View key={punto.id} style={styles.filaPunto}>
                            <Text style={styles.puntoNum}>#{i + 1}</Text>
                            <Text style={styles.puntoHora}>
                              {formatearHora(punto.timestamp)}
                            </Text>
                            <Text style={styles.puntoCoords} numberOfLines={1}>
                              {punto.lat.toFixed(5)}, {punto.lng.toFixed(5)}
                            </Text>
                            {punto.fotoUri ? (
                              <Image
                                source={{ uri: punto.fotoUri }}
                                style={styles.puntoFoto}
                                contentFit="cover"
                              />
                            ) : (
                              <View style={[styles.puntoFoto, styles.puntoFotoVacia]}>
                                <Ionicons name="radio-button-off" size={14} color="#1B4332" />
                              </View>
                            )}
                          </View>
                        ))
                      )}
                    </View>
                  )}
                </Pressable>
              );
            })
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  contenedor: { flex: 1, backgroundColor: "#F7F7F5" },
  contenido: { padding: 20, paddingBottom: 48, gap: 16 },
  encabezado: { gap: 4 },
  titulo: { fontSize: 28, fontWeight: "800", color: "#1B4332" },
  subtitulo: { fontSize: 14, color: "#555" },

  /* En vivo */
  tarjetaVivo: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 18,
    gap: 14,
    borderWidth: 1,
    borderColor: "#1B4332",
  },
  filaVivo: { flexDirection: "row", alignItems: "center", gap: 8 },
  puntoVivo: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#C0392B",
  },
  estadoVivo: {
    color: "#C0392B",
    fontWeight: "800",
    fontSize: 12,
    letterSpacing: 1,
  },
  lugarVivo: { flex: 1, textAlign: "right", fontSize: 13, color: "#666" },
  metricas: { flexDirection: "row", justifyContent: "space-between" },
  metrica: { alignItems: "center", gap: 2 },
  metricaValor: { fontSize: 18, fontWeight: "800", color: "#1B4332" },
  metricaEtiqueta: { fontSize: 11, color: "#8A8A8A" },
  ultimoPunto: { fontSize: 12, color: "#666", textAlign: "center" },
  botonesAccion: { flexDirection: "row", gap: 10 },
  botonFoto: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#1B4332",
    paddingVertical: 13,
    borderRadius: 999,
  },
  botonFotoTexto: { color: "#fff", fontWeight: "700" },
  botonPunto: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#E8EFE9",
    paddingVertical: 13,
    borderRadius: 999,
  },
  botonPuntoTexto: { color: "#1B4332", fontWeight: "700" },
  tarjetaDescripcion: {
    backgroundColor: "#F0F3F0",
    borderRadius: 14,
    padding: 12,
    gap: 8,
  },
  descripcionTitulo: { fontSize: 13, fontWeight: "700", color: "#1B4332" },
  input: {
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 10,
    fontSize: 14,
    color: "#111",
    minHeight: 60,
    textAlignVertical: "top",
  },
  botonGuardarDesc: {
    alignSelf: "flex-start",
    backgroundColor: "#1B4332",
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  botonGuardarDescTexto: { color: "#fff", fontWeight: "700", fontSize: 13 },
  botonInactivo: { opacity: 0.5 },
  botonFinalizar: {
    backgroundColor: "#C0392B",
    borderRadius: 999,
    paddingVertical: 13,
    alignItems: "center",
  },
  botonFinalizarTexto: { color: "#fff", fontWeight: "800" },

  /* Nuevo recorrido */
  tarjetaNuevo: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 18,
    gap: 12,
  },
  tarjetaTitulo: { fontSize: 18, fontWeight: "800", color: "#111" },
  filaLugar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#F0F3F0",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
    alignSelf: "flex-start",
    maxWidth: "100%",
  },
  filaLugarTexto: { fontSize: 13, fontWeight: "600", color: "#1B4332", flexShrink: 1 },
  nota: { fontSize: 12, color: "#8A8A8A" },
  botonIniciar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#1B4332",
    borderRadius: 999,
    paddingVertical: 14,
    marginTop: 4,
  },
  botonIniciarTexto: { color: "#fff", fontWeight: "800", fontSize: 15 },

  aviso: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#E8EFE9",
    borderRadius: 12,
    padding: 12,
  },
  avisoTexto: { flex: 1, fontSize: 13, color: "#1B4332" },

  tarjetaComoFunciona: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    gap: 8,
  },
  comoFuncionaTitulo: { fontSize: 15, fontWeight: "800", color: "#111" },
  comoFuncionaTexto: { fontSize: 13, lineHeight: 19, color: "#555" },

  seccionHistorial: { gap: 10 },
  tituloHistorial: { fontSize: 18, fontWeight: "800", color: "#1B4332" },
  textoSecundario: { fontSize: 14, color: "#666", textAlign: "center" },
  tarjetaHistorial: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 14,
    gap: 8,
  },
  filaHistorial: { flexDirection: "row", alignItems: "center", gap: 8 },
  historialTexto: { flex: 1 },
  historialTitulo: { fontSize: 15, fontWeight: "700", color: "#111" },
  historialFecha: { fontSize: 12, color: "#8A8A8A", marginTop: 1 },
  filaStats: { flexDirection: "row", gap: 12 },
  stat: { fontSize: 12, color: "#1B4332", fontWeight: "600" },
  listaPuntos: { gap: 6, marginTop: 4 },
  filaPunto: { flexDirection: "row", alignItems: "center", gap: 8 },
  puntoNum: { width: 30, fontSize: 12, fontWeight: "700", color: "#1B4332" },
  puntoHora: { width: 62, fontSize: 12, color: "#666" },
  puntoCoords: { flex: 1, fontSize: 12, color: "#555" },
  puntoFoto: { width: 32, height: 32, borderRadius: 6 },
  puntoFotoVacia: { backgroundColor: "#F0F3F0", alignItems: "center", justifyContent: "center" },
});