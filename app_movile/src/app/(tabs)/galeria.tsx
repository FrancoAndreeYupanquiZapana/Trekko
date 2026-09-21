import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useFocusEffect } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { useCallback, useRef, useState } from "react";
import {
  Alert,
  Linking,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import SinLugarActivo from "@/componentes/SinLugarActivo";
import {
  guardarEnvioGaleria,
  listarEnviosGaleria,
  type EnvioGaleriaNuevo,
  type FotoEnvio,
  type PuntoTrackEnvio,
} from "@/servicios/galeria";
import {
  contarEnviosPendientes,
  sincronizarEnviosGaleria,
} from "@/servicios/paseos";
import { hayInternet } from "@/servicios/conexion";
import {
  listarDescargas,
  obtenerLugarActivoId,
  type DescargaLocal,
} from "@/servicios/descargas";
import {
  listarPuntos,
  listarRecorridosResumen,
  type PuntoRecorrido,
  type RecorridoResumen,
} from "@/servicios/recorridos";

/** Número máximo de fotos por día (regla del negocio). */
const MAX_FOTOS = 5;

function formatearFechaCorta(iso: string): string {
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

/** Fecha + hora, para distinguir un recorrido de otro. */
function formatearFechaHora(iso: string): string {
  try {
    return new Date(iso).toLocaleString("es", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

/** Comparte la página pública del turista con las apps del teléfono. */
function compartirPaginaPublica(url: string): void {
  void Share.share({
    message: `🌿 ¡Mira «El viaje» que armé con Trekko en la selva! ${url}`,
  }).catch(() => {
    // El sistema cerró el diálogo al tocar afuera: no es un error.
  });
}

/**
 * Pestaña GALERÍA — el turista elige hasta 5 fotos de un recorrido de SU
 * LUGAR ACTIVO. El formulario pide nombre, DNI y zona (lugar), muestra el
 * preview de la página «El viaje de X en Y» y guarda el envío en la cola
 * local (track completo + fotos). Cuando haya internet, la cola se
 * sincroniza en segundo plano y se crea la página pública por DNI.
 * Si no hay lugar seleccionado, NO se puede usar la galería.
 */
export default function Galeria() {
  const db = useSQLiteContext();

  const [descargas, setDescargas] = useState<Record<string, DescargaLocal>>({});
  const [lugarActivoId, setLugarActivoId] = useState<string | null>(null);
  const [recorridos, setRecorridos] = useState<RecorridoResumen[]>([]);
  const [conFotos, setConFotos] = useState<RecorridoResumen[]>([]);
  const [seleccionId, setSeleccionId] = useState<number | null>(null);
  const [fotos, setFotos] = useState<PuntoRecorrido[]>([]);
  const [seleccionadas, setSeleccionadas] = useState<number[]>([]);
  const [nombre, setNombre] = useState("");
  const [dni, setDni] = useState("");
  const [zona, setZona] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [cargando, setCargando] = useState(true);
  const [sincronizando, setSincronizando] = useState(false);
  const [pendientes, setPendientes] = useState(0);
  const [urlPublica, setUrlPublica] = useState<string | null>(null);
  const sincronizandoRef = useRef(false);

  /** Sube los envíos pendientes (solo si hay internet real). */
  const sincronizar = useCallback(
    async (mostrarAlerta: boolean) => {
      if (sincronizandoRef.current) return;
      sincronizandoRef.current = true;
      setSincronizando(true);
      try {
        // En modo silencioso (al entrar a la pestaña) comprobamos rápido la
        // conexión para no dejar peticiones colgadas. El botón "Subir" intenta
        // SIEMPRE: así una red que bloquea Google no impide subir tus fotos,
        // y si falla, se muestra el mensaje real del servidor.
        if (!mostrarAlerta && !(await hayInternet())) {
          setPendientes(await contarEnviosPendientes(db).catch(() => 0));
          return;
        }
        const resultado = await sincronizarEnviosGaleria(db);
        const n = await contarEnviosPendientes(db).catch(() => 0);
        setPendientes(n);
        if (resultado.urlPublica) setUrlPublica(resultado.urlPublica);
        if (mostrarAlerta) {
          if (resultado.subidos > 0) {
            Alert.alert(
              "¡Subido! 🎉",
              `Tu viaje ya está en la página pública.\n\n${resultado.urlPublica ?? ""}`
            );
          } else if (resultado.fallidos > 0) {
            Alert.alert(
              "No se pudo subir",
              `${resultado.primerError ?? "Revisa tu conexión e inténtalo otra vez."}\n\n` +
                "Tus fotos siguen guardadas y se reintentarán solas."
            );
          } else {
            Alert.alert("Todo al día", "No hay envíos pendientes por subir.");
          }
        }
      } finally {
        sincronizandoRef.current = false;
        setSincronizando(false);
      }
    },
    [db]
  );

  // Al entrar a la pestaña: cuenta pendientes, recupera el último enlace
  // público guardado y, solo si hay algo en cola, intenta subir (en silencio).
  useFocusEffect(
    useCallback(() => {
      void (async () => {
        const envios = await listarEnviosGaleria(db).catch(() => []);
        setPendientes(envios.filter((envio) => envio.estado !== "ENVIADO").length);
        const conUrl = envios.find((envio) => envio.urlPublica);
        if (conUrl?.urlPublica) setUrlPublica(conUrl.urlPublica);
        if (envios.some((envio) => envio.estado !== "ENVIADO")) {
          await sincronizar(false);
        }
      })();
    }, [db, sincronizar])
  );

  useFocusEffect(
    useCallback(() => {
      let activo = true;
      void (async () => {
        const [lista, resumenes, lugarActivo] = await Promise.all([
          listarRecorridosResumen(db).catch(() => []),
          listarDescargas(db).catch(() => []),
          obtenerLugarActivoId(db).catch(() => null),
        ]);
        if (!activo) return;
        setRecorridos(lista);
        setDescargas(Object.fromEntries(resumenes.map((d) => [d.lugarId, d])));
        const lugarValido =
          lugarActivo && resumenes.some((d) => d.lugarId === lugarActivo)
            ? lugarActivo
            : null;
        setLugarActivoId(lugarValido);
        // Los recorridos de la galería: los del lugar activo + los antiguos
        // que quedaron sin lugar (grabados antes del filtro estricto).
        const con = lugarValido
          ? lista.filter(
              (r) => r.fotos > 0 && (r.lugarId === lugarValido || r.lugarId == null)
            )
          : [];
        setConFotos(con);
        setSeleccionId((prev) =>
          con.some((c) => c.id === prev) ? prev : (con[0]?.id ?? null)
        );
        setCargando(false);
      })();
      return () => {
        activo = false;
      };
    }, [db])
  );

  useFocusEffect(
    useCallback(() => {
      if (seleccionId == null) return;
      let activo = true;
      void (async () => {
        const puntos = await listarPuntos(db, seleccionId).catch(() => []);
        const conFoto = puntos.filter((p) => p.fotoUri);
        if (!activo) return;
        setFotos(conFoto);
        setSeleccionadas([]);
        const rec = recorridos.find((r) => r.id === seleccionId);
        // Zona: la del recorrido o la del lugar activo (recorridos antiguos).
        if (rec?.lugarNombre) {
          setZona(rec.lugarNombre);
        } else {
          const activa = lugarActivoId ? descargas[lugarActivoId] : null;
          if (activa) setZona(activa.nombre);
        }
      })();
      return () => {
        activo = false;
      };
    }, [db, seleccionId, recorridos, lugarActivoId, descargas])
  );

  function alternar(fotoId: number) {
    setSeleccionadas((prev) => {
      if (prev.includes(fotoId)) return prev.filter((id) => id !== fotoId);
      if (prev.length >= MAX_FOTOS) {
        Alert.alert(
          "Límite del día",
          `Puedes mandar hasta ${MAX_FOTOS} fotos por día. Quita una para elegir otra.`
        );
        return prev;
      }
      return [...prev, fotoId];
    });
  }

  const lugarActivo = lugarActivoId ? (descargas[lugarActivoId] ?? null) : null;
  const lugarSeleccionado =
    seleccionId != null
      ? recorridos.find((r) => r.id === seleccionId) ?? null
      : null;
  const seleccionadasLista = fotos.filter((f) => seleccionadas.includes(f.id));
  const dniValido = dni.trim().length >= 6;
  const listo =
    seleccionadas.length > 0 &&
    nombre.trim().length >= 2 &&
    dniValido &&
    zona.trim().length > 0;

  async function enviar() {
    const rec = lugarSeleccionado;
    if (!rec || !listo || enviando) return;
    setEnviando(true);
    try {
      // Track completo del recorrido (todos los puntos de la caminata).
      const todosPuntos = await listarPuntos(db, rec.id).catch(() => []);
      const track: PuntoTrackEnvio[] = todosPuntos.map((p) => ({
        lat: p.lat,
        lng: p.lng,
        timestamp: p.timestamp,
        fotoUri: p.fotoUri,
      }));
      const fotosEnvio: FotoEnvio[] = seleccionadasLista.map((f) => ({
        puntoId: f.id,
        uri: f.fotoUri!,
        lat: f.lat,
        lng: f.lng,
        timestamp: f.timestamp,
        descripcion: f.descripcion,
      }));
      const envio: EnvioGaleriaNuevo = {
        nombre: nombre.trim(),
        dni: dni.trim(),
        lugarId: rec.lugarId,
        lugarNombre: zona.trim(),
        recorridoId: rec.id,
        fechaExperiencia: rec.iniciadoEn,
        track,
        fotos: fotosEnvio,
      };
      const id = await guardarEnvioGaleria(db, envio);
      setSeleccionadas([]);
      setNombre("");
      setDni("");
      setPendientes((p) => p + 1);
      Alert.alert(
        "Envío guardado en tu teléfono 🎉",
        `«El viaje de ${envio.nombre} en ${envio.lugarNombre}» quedó listo (N.º ${id}).\n\n` +
          `Se subirá con tu caminata completa y tus ${fotosEnvio.length} mejor(es) foto(s). ` +
          "Si hay internet ahora, se sube enseguida; si no, queda en cola. Con el mismo DNI " +
          "se agrega el nuevo lugar a tu misma página (sin borrar lo anterior)."
      );
      void sincronizar(false);
    } catch {
      Alert.alert(
        "No se pudo guardar",
        "Revisa que tengas seleccionada al menos una foto e inténtalo de nuevo."
      );
    } finally {
      setEnviando(false);
    }
  }

  const nombreConZona = nombre.trim().length >= 2 && zona.trim().length > 0;

  return (
    <SafeAreaView style={styles.contenedor} edges={["top", "left", "right"]}>
      <ScrollView contentContainerStyle={styles.contenido}>
        <View style={styles.encabezado}>
          <Text style={styles.titulo}>Galería</Text>
          <Text style={styles.subtitulo}>
            Elige las mejores fotos del día de tu recorrido (hasta {MAX_FOTOS}).
          </Text>
        </View>

        {(pendientes > 0 || urlPublica) && (
          <View style={styles.syncCard}>
            <Ionicons
              name={pendientes > 0 ? "cloud-upload-outline" : "cloud-done-outline"}
              size={20}
              color="#1B4332"
            />
            <View style={styles.syncTextos}>
              <Text style={styles.syncTitulo}>
                {pendientes > 0
                  ? `${pendientes} envío${pendientes === 1 ? "" : "s"} esperando subir`
                  : "Todo subido"}
              </Text>
              <Text style={styles.syncTexto}>
                {sincronizando
                  ? "Subiendo tus fotos…"
                  : pendientes > 0
                    ? "Se suben solos cuando tengas internet."
                    : "Tu página pública está lista."}
              </Text>
              {urlPublica && (
                <View style={styles.syncEnlaces}>
                  <Pressable onPress={() => void Linking.openURL(urlPublica)}>
                    <Text style={styles.syncEnlace}>Ver mi página pública →</Text>
                  </Pressable>
                  <Pressable
                    style={styles.syncCompartir}
                    onPress={() => compartirPaginaPublica(urlPublica)}
                  >
                    <Ionicons name="share-social-outline" size={14} color="#2D6A4F" />
                    <Text style={styles.syncEnlace}>Compartir</Text>
                  </Pressable>
                </View>
              )}
            </View>
            {pendientes > 0 && (
              <Pressable
                style={styles.syncBoton}
                onPress={() => void sincronizar(true)}
                disabled={sincronizando}
              >
                <Text style={styles.syncBotonTexto}>
                  {sincronizando ? "…" : "Subir"}
                </Text>
              </Pressable>
            )}
          </View>
        )}

        {cargando ? (
          <Text style={styles.textoSecundario}>Cargando…</Text>
        ) : !lugarActivo ? (
          <SinLugarActivo />
        ) : conFotos.length === 0 ? (
          <View style={styles.vacio}>
            <Ionicons name="images-outline" size={40} color="#1B4332" />
            <Text style={styles.vacioTitulo}>
              No hay recorridos con fotos en {lugarActivo.nombre}
            </Text>
            <Text style={styles.textoSecundario}>
              Graba un recorrido en la pestaña «Recorrido» (con {lugarActivo.nombre}{" "}
              como lugar actual) y toma fotos marcadas: aquí podrás elegir las
              mejores del día.
            </Text>
          </View>
        ) : (
          <>
            <Text style={styles.tituloCampo}>1 · Elige de qué recorrido sacas las fotos</Text>
            <Text style={styles.ayuda}>
              Toca el recorrido que quieras: sus fotos marcadas (📷) aparecen
              abajo para elegir.
            </Text>
            <View style={styles.chips}>
              {conFotos.map((rec, indice) => {
                const activo = rec.id === seleccionId;
                return (
                  <Pressable
                    key={rec.id}
                    style={[styles.chip, activo && styles.chipActiva]}
                    onPress={() => setSeleccionId(rec.id)}
                  >
                    <Text style={[styles.chipTexto, activo && styles.chipTextoActiva]}>
                      Recorrido {indice + 1} · {formatearFechaHora(rec.iniciadoEn)} ·{" "}
                      {rec.fotos} 📷
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <Text style={styles.tituloCampo}>
              2 · Marca tus mejores fotos ({seleccionadas.length}/{MAX_FOTOS})
            </Text>
            <View style={styles.grilla}>
              {fotos.map((foto) => {
                const orden = seleccionadas.indexOf(foto.id);
                const elegida = orden >= 0;
                return (
                  <Pressable
                    key={foto.id}
                    style={[styles.celda, elegida && styles.celdaElegida]}
                    onPress={() => alternar(foto.id)}
                  >
                    <Image
                      source={{ uri: foto.fotoUri! }}
                      style={styles.foto}
                      contentFit="cover"
                      transition={150}
                    />
                    {elegida && (
                      <View style={styles.badge}>
                        <Text style={styles.badgeTexto}>{orden + 1}</Text>
                      </View>
                    )}
                    <View style={[styles.overlay, elegida && styles.overlayElegida]} />
                  </Pressable>
                );
              })}
            </View>
            {seleccionadasLista.length > 0 && (
              <View style={styles.resumen}>
                <Text style={styles.resumenTitulo}>Seleccionadas</Text>
                {seleccionadasLista.map((foto, i) => (
                  <Text key={foto.id} style={styles.resumenLinea}>
                    {i + 1}. 📍 {foto.lat.toFixed(5)}, {foto.lng.toFixed(5)} ·{" "}
                    {formatearFechaCorta(foto.timestamp)}
                  </Text>
                ))}
              </View>
            )}

            <Text style={styles.tituloCampo}>3 · Tus datos</Text>
            <TextInput
              style={styles.input}
              placeholder="Nombre completo (ej. Julián Quispe Quispe)"
              placeholderTextColor="#9A9A9A"
              value={nombre}
              onChangeText={setNombre}
              autoCapitalize="words"
            />
            <TextInput
              style={styles.input}
              placeholder="DNI (ej. 45678901)"
              placeholderTextColor="#9A9A9A"
              value={dni}
              onChangeText={setDni}
              keyboardType="number-pad"
            />
            <TextInput
              style={styles.input}
              placeholder="Zona / lugar (ej. Lago Sandoval)"
              placeholderTextColor="#9A9A9A"
              value={zona}
              onChangeText={setZona}
            />
            <Text style={styles.ayuda}>
              Con el mismo DNI tu página se reutiliza: si visitas otro lugar, se
              agrega a la misma página sin borrar lo anterior.
            </Text>

            {nombreConZona && seleccionadas.length > 0 && (
              <View style={styles.previewPagina}>
                <Text style={styles.previewEtiqueta}>Así se verá tu página</Text>
                <Text style={styles.previewTitulo}>
                  El viaje de {nombre.trim()} en {zona.trim()}
                </Text>
                <Text style={styles.previewFecha}>
                  📅{" "}
                  {formatearFechaCorta(lugarSeleccionado?.iniciadoEn ?? "")} · DNI{" "}
                  {dni.trim() || "—"}
                </Text>
                <View style={styles.previewFotos}>
                  {seleccionadasLista.slice(0, MAX_FOTOS).map((foto, i) => (
                    <Image
                      key={foto.id}
                      source={{ uri: foto.fotoUri! }}
                      style={styles.previewFoto}
                      contentFit="cover"
                    />
                  ))}
                </View>
                <Text style={styles.previewTrack}>
                  🚶 Caminata completa: {lugarSeleccionado?.puntos ?? "?"} puntos ·{" "}
                  {lugarSeleccionado?.distanciaM != null
                    ? `${Math.round(lugarSeleccionado.distanciaM)} m`
                    : "distancia aún no calculada"}
                </Text>
              </View>
            )}

            <Pressable
              style={[styles.boton, !listo && styles.botonInactivo]}
              onPress={() => void enviar()}
              disabled={!listo || enviando}
            >
              <Ionicons name="paper-plane" size={18} color="#fff" />
              <Text style={styles.botonTexto}>
                {enviando
                  ? "Guardando…"
                  : `Guardar para enviar${seleccionadas.length > 0 ? ` (${seleccionadas.length})` : ""}`}
              </Text>
            </Pressable>
            {!listo && (
              <Text style={styles.ayuda}>
                Marca entre 1 y {MAX_FOTOS} fotos, escribe nombre completo, DNI
                (mín. 6 dígitos) y la zona para guardar tu envío.
              </Text>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  contenedor: { flex: 1, backgroundColor: "#F7F7F5" },
  contenido: { padding: 20, paddingBottom: 48, gap: 14 },
  encabezado: { gap: 4 },
  titulo: { fontSize: 28, fontWeight: "800", color: "#1B4332" },
  subtitulo: { fontSize: 14, color: "#555" },
  syncCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#E8EFE9",
    borderRadius: 14,
    padding: 12,
  },
  syncTextos: { flex: 1, gap: 2 },
  syncTitulo: { fontSize: 13, fontWeight: "800", color: "#1B4332" },
  syncTexto: { fontSize: 12, color: "#4A5A50" },
  syncEnlace: { fontSize: 12, fontWeight: "700", color: "#2D6A4F", marginTop: 2 },
  syncEnlaces: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    marginTop: 2,
  },
  syncCompartir: { flexDirection: "row", alignItems: "center", gap: 4 },
  syncBoton: {
    backgroundColor: "#1B4332",
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  syncBotonTexto: { color: "#fff", fontWeight: "800", fontSize: 13 },
  tituloCampo: { fontSize: 15, fontWeight: "700", color: "#1B4332", marginTop: 6 },
  textoSecundario: { fontSize: 14, color: "#666", textAlign: "center" },
  vacio: { alignItems: "center", gap: 8, padding: 24 },
  vacioTitulo: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1B4332",
    textAlign: "center",
  },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    backgroundColor: "#fff",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: "#DFE6DF",
  },
  chipActiva: { backgroundColor: "#1B4332", borderColor: "#1B4332" },
  chipTexto: { fontSize: 13, color: "#1B4332", fontWeight: "600" },
  chipTextoActiva: { color: "#fff" },
  grilla: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  celda: {
    width: "31%",
    aspectRatio: 1,
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "#E8EFE9",
  },
  celdaElegida: { borderWidth: 3, borderColor: "#1B4332" },
  foto: { width: "100%", height: "100%" },
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0)",
  },
  overlayElegida: { backgroundColor: "rgba(27,67,50,0.15)" },
  badge: {
    position: "absolute",
    top: 6,
    right: 6,
    backgroundColor: "#1B4332",
    borderRadius: 999,
    minWidth: 24,
    height: 24,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 5,
  },
  badgeTexto: { color: "#fff", fontWeight: "800", fontSize: 12 },
  resumen: {
    backgroundColor: "#E8EFE9",
    borderRadius: 12,
    padding: 12,
    gap: 4,
  },
  resumenTitulo: { fontSize: 13, fontWeight: "800", color: "#1B4332" },
  resumenLinea: { fontSize: 12, color: "#444" },
  input: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    color: "#111",
  },
  ayuda: { fontSize: 12, color: "#8A8A8A" },
  previewPagina: {
    backgroundColor: "#1B4332",
    borderRadius: 16,
    padding: 14,
    gap: 6,
  },
  previewEtiqueta: { fontSize: 11, fontWeight: "700", color: "#BFDCC9" },
  previewTitulo: { fontSize: 18, fontWeight: "800", color: "#fff" },
  previewFecha: { fontSize: 13, color: "#D8E8DE" },
  previewFotos: { flexDirection: "row", gap: 6, marginTop: 4 },
  previewFoto: {
    width: 56,
    height: 56,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.15)",
  },
  previewTrack: { fontSize: 12, color: "#D8E8DE", marginTop: 2 },
  boton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#1B4332",
    borderRadius: 999,
    paddingVertical: 14,
    marginTop: 4,
  },
  botonInactivo: { opacity: 0.4 },
  botonTexto: { color: "#fff", fontWeight: "800", fontSize: 15 },
});