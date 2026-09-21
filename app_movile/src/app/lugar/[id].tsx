import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useLocalSearchParams } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import {
  eliminarPaquete,
  guardarPaquete,
  leerPaquete,
} from "@/servicios/descargas";
import { descargarPaquete, obtenerDetalle } from "@/servicios/lugares";
import type {
  AfichePaquete,
  DetalleRemoto,
  EmpresaPaquete,
  EspeciePaquete,
  ImagenPaquete,
  PaqueteLugar,
  RelatoPaquete,
} from "@/tipos";

type Estado = "cargando" | "listo" | "error";

/** Elige la imagen incrustada (offline) o la URL original (online). */
function fuenteImagen(imagen: ImagenPaquete | null, url: string): string {
  return imagen?.datos ?? url;
}

export default function DetalleLugar() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const db = useSQLiteContext();

  const [local, setLocal] = useState<PaqueteLugar | null>(null);
  const [remoto, setRemoto] = useState<DetalleRemoto | null>(null);
  const [estado, setEstado] = useState<Estado>("cargando");
  const [ocupado, setOcupado] = useState(false);
  const [hayActualizacion, setHayActualizacion] = useState(false);

  const scrollRef = useRef<ScrollView>(null);
  const seccionesY = useRef<Record<string, number>>({});

  /** Botón "ir a": desplaza la pantalla hasta la sección pedida. */
  function irASeccion(clave: string) {
    const y = seccionesY.current[clave] ?? 0;
    scrollRef.current?.scrollTo({ y, animated: true });
  }

  const cargar = useCallback(async () => {
    try {
      const [paqueteLocal, detalle] = await Promise.all([
        leerPaquete(db, id).catch(() => null),
        obtenerDetalle(id).catch(() => null),
      ]);
      setLocal(paqueteLocal);
      setRemoto(detalle);
      if (paqueteLocal && detalle) {
        setHayActualizacion(paqueteLocal.revision !== detalle.revisionLugar);
      }
      setEstado("listo");
    } catch {
      setEstado("error");
    }
  }, [db, id]);

  useEffect(() => {
    let activo = true;
    void (async () => {
      try {
        const [paqueteLocal, detalle] = await Promise.all([
          leerPaquete(db, id).catch(() => null),
          obtenerDetalle(id).catch(() => null),
        ]);
        if (!activo) return;
        setLocal(paqueteLocal);
        setRemoto(detalle);
        if (paqueteLocal && detalle) {
          setHayActualizacion(paqueteLocal.revision !== detalle.revisionLugar);
        }
        setEstado("listo");
      } catch {
        if (activo) setEstado("error");
      }
    })();
    return () => {
      activo = false;
    };
  }, [db, id]);

  /** Reintentar desde el estado de error (sí puede resetear el spinner). */
  function reintentar() {
    setEstado("cargando");
    void cargar();
  }

  const descargarOA = useCallback(
    async (esActualizacion: boolean) => {
      setOcupado(true);
      try {
        const paquete = await descargarPaquete(id);
        await guardarPaquete(db, paquete);
        setLocal(paquete);
        setHayActualizacion(false);
        Alert.alert(
          esActualizacion ? "¡Actualizado!" : "¡Descargado!",
          "Este lugar ya está guardado en tu teléfono y funciona sin conexión."
        );
      } catch (causa) {
        Alert.alert(
          "No se pudo descargar",
          causa instanceof Error ? causa.message : "Revisa tu conexión e intenta de nuevo."
        );
      } finally {
        setOcupado(false);
      }
    },
    [db, id]
  );

  const confirmarEliminar = useCallback(() => {
    Alert.alert(
      "Eliminar descarga",
      "Dejarás de ver este lugar sin conexión. ¿Continuar?",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Eliminar",
          style: "destructive",
          onPress: async () => {
            await eliminarPaquete(db, id).catch(() => null);
            setLocal(null);
            setHayActualizacion(false);
          },
        },
      ]
    );
  }, [db, id]);

  if (estado === "cargando") {
    return (
      <View style={styles.centro}>
        <ActivityIndicator size="large" />
        <Text style={styles.textoSecundario}>Cargando lugar…</Text>
      </View>
    );
  }

  if (estado === "error") {
    return (
      <View style={styles.centro}>
        <Text style={styles.textoError}>No se pudo abrir este lugar.</Text>
        <Pressable style={styles.botonPrimario} onPress={reintentar}>
          <Text style={styles.botonPrimarioTexto}>Reintentar</Text>
        </Pressable>
      </View>
    );
  }

  // Contenido OFFLINE: prioridad al paquete descargado (SQLite).
  if (local) {
    return (
      <ScrollView
        ref={scrollRef}
        style={styles.pantalla}
        contentContainerStyle={styles.contenido}
      >
        <EncabezadoPaquete paquete={local} />
        <BotonesInfo
          especies={local.especies.length}
          relatos={local.relatos.length}
          afiches={local.afiches.length}
          alIr={irASeccion}
        />
        {hayActualizacion && (
          <AvisoActualizacion
            ocupado={ocupado}
            alActualizar={() => descargarOA(true)}
          />
        )}
        <SeccionSobreLugar lugar={local.empresa} />
        <View
          onLayout={(e) => {
            seccionesY.current["especies"] = e.nativeEvent.layout.y;
          }}
        >
          <SeccionEspecies especies={local.especies} />
        </View>
        <View
          onLayout={(e) => {
            seccionesY.current["relatos"] = e.nativeEvent.layout.y;
          }}
        >
          <SeccionRelatos relatos={local.relatos} />
        </View>
        <View
          onLayout={(e) => {
            seccionesY.current["afiches"] = e.nativeEvent.layout.y;
          }}
        >
          <SeccionAfiches afiches={local.afiches} />
        </View>
        <View style={styles.barraAcciones}>
          <Pressable
            style={[styles.botonPrimario, ocupado && styles.botonInactivo]}
            onPress={() => descargarOA(false)}
            disabled={ocupado}
          >
            <Text style={styles.botonPrimarioTexto}>
              {ocupado ? "Descargando…" : "Actualizar copia"}
            </Text>
          </Pressable>
          <Pressable style={styles.botonPeligro} onPress={confirmarEliminar}>
            <Text style={styles.botonPeligroTexto}>Eliminar descarga</Text>
          </Pressable>
        </View>
      </ScrollView>
    );
  }

  // Contenido ONLINE (sin descarga todavía): vista previa + llamado a descargar.
  if (remoto) {
    const empresa = remoto.empresa;
    return (
      <ScrollView
        ref={scrollRef}
        style={styles.pantalla}
        contentContainerStyle={styles.contenido}
      >
        <View style={styles.encabezado}>
          {empresa.logoUrl ? (
            <Image
              source={{ uri: empresa.logoUrl }}
              style={styles.logoGrande}
              contentFit="cover"
            />
          ) : (
            <View style={[styles.logoGrande, styles.logoSinImagen]}>
              <Text style={styles.logoInicial}>
                {empresa.nombre.trim().charAt(0).toUpperCase() || "?"}
              </Text>
            </View>
          )}
          <Text style={styles.nombreLugar}>{empresa.nombre}</Text>
          {empresa.ubicacion ? (
            <Text style={styles.textoSecundario}>{empresa.ubicacion}</Text>
          ) : null}
        </View>

        <Pressable
          style={[styles.botonPrimario, ocupado && styles.botonInactivo]}
          onPress={() => descargarOA(false)}
          disabled={ocupado}
        >
          <Text style={styles.botonPrimarioTexto}>
            {ocupado ? "Descargando…" : "Descargar para ver sin conexión ↓"}
          </Text>
        </Pressable>

        <BotonesInfo
          especies={remoto.especies.length}
          relatos={remoto.relatos.length}
          afiches={remoto.afiches.length}
          alIr={irASeccion}
        />

        <SeccionSobreLugar lugar={empresa} />
        <View
          onLayout={(e) => {
            seccionesY.current["especies"] = e.nativeEvent.layout.y;
          }}
        >
          <SeccionEspecies especies={remoto.especies} />
        </View>
        <View
          onLayout={(e) => {
            seccionesY.current["relatos"] = e.nativeEvent.layout.y;
          }}
        >
          <SeccionRelatos relatos={remoto.relatos} />
        </View>
        <View
          onLayout={(e) => {
            seccionesY.current["afiches"] = e.nativeEvent.layout.y;
          }}
        >
          <SeccionAfiches afiches={remoto.afiches} />
        </View>
      </ScrollView>
    );
  }

  // Sin red y sin copia local.
  return (
    <View style={styles.centro}>
      <Text style={styles.textoError}>
        Sin conexión y sin descarga guardada.
      </Text>
      <Text style={styles.textoSecundario}>
        Conecta a internet y descarga este lugar antes de salir de viaje.
      </Text>
      <Pressable style={styles.botonPrimario} onPress={reintentar}>
        <Text style={styles.botonPrimarioTexto}>Reintentar</Text>
      </Pressable>
    </View>
  );
}

/* ── Bloques de contenido ─────────────────────────────────────────────── */

function EncabezadoPaquete({ paquete }: { paquete: PaqueteLugar }) {
  const imagen = fuenteImagen(paquete.empresa.logo, paquete.empresa.logoUrl);
  return (
    <View style={styles.encabezado}>
      {paquete.empresa.logo ? (
        <Image source={{ uri: imagen }} style={styles.logoGrande} contentFit="cover" />
      ) : (
        <View style={[styles.logoGrande, styles.logoSinImagen]}>
          <Text style={styles.logoInicial}>
            {paquete.empresa.nombre.trim().charAt(0).toUpperCase() || "?"}
          </Text>
        </View>
      )}
      <Text style={styles.nombreLugar}>{paquete.empresa.nombre}</Text>
      {paquete.empresa.ubicacion ? (
        <Text style={styles.textoSecundario}>{paquete.empresa.ubicacion}</Text>
      ) : null}
      <View style={styles.chipDescargado}>
        <Text style={styles.chipDescargadoTexto}>
          Disponible sin conexión (revisión {paquete.revision.slice(5, 16)})
        </Text>
      </View>
    </View>
  );
}

/**
 * Botones de atajo: la ficha tiene "botones para ver la información" —
 * flora y fauna, historias del guía y afiches. Desplazan la pantalla.
 */
function BotonesInfo({
  especies,
  relatos,
  afiches,
  alIr,
}: {
  especies: number;
  relatos: number;
  afiches: number;
  alIr: (clave: "especies" | "relatos" | "afiches") => void;
}) {
  const items = [
    { clave: "especies", etiqueta: "Flora y fauna", n: especies, icono: "leaf-outline" },
    { clave: "relatos", etiqueta: "Relatos", n: relatos, icono: "chatbubbles-outline" },
    { clave: "afiches", etiqueta: "Afiches", n: afiches, icono: "megaphone-outline" },
  ].filter((i) => i.n > 0) as {
    clave: "especies" | "relatos" | "afiches";
    etiqueta: string;
    n: number;
    icono: keyof typeof Ionicons.glyphMap;
  }[];
  if (items.length === 0) return null;
  return (
    <View style={styles.botonesInfo}>
      {items.map((item) => (
        <Pressable
          key={item.clave}
          style={styles.botonInfo}
          onPress={() => alIr(item.clave)}
        >
          <Ionicons name={item.icono} size={16} color="#1B4332" />
          <Text style={styles.botonInfoTexto}>
            {item.etiqueta} ({item.n})
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

function AvisoActualizacion({
  ocupado,
  alActualizar,
}: {
  ocupado: boolean;
  alActualizar: () => void;
}) {
  return (
    <View style={styles.aviso}>
      <Text style={styles.avisoTexto}>
        🔄 Hay una actualización disponible de este lugar.
      </Text>
      <Pressable
        style={[styles.botonPrimario, ocupado && styles.botonInactivo]}
        onPress={alActualizar}
        disabled={ocupado}
      >
        <Text style={styles.botonPrimarioTexto}>
          {ocupado ? "Descargando…" : "Actualizar ahora"}
        </Text>
      </Pressable>
    </View>
  );
}

function SeccionSobreLugar({
  lugar,
}: {
  lugar: Pick<EmpresaPaquete, "descripcion" | "telefono" | "web" | "redesSociales">;
}) {
  return (
    <View style={styles.seccion}>
      <Text style={styles.tituloSeccion}>Sobre el lugar</Text>
      <Text style={styles.parrafo}>
        {lugar.descripcion || "Sin descripción registrada todavía."}
      </Text>
      {(lugar.telefono || lugar.web || lugar.redesSociales) && (
        <View style={styles.contacto}>
          {lugar.telefono ? <Text style={styles.contactoLinea}>📞 {lugar.telefono}</Text> : null}
          {lugar.web ? <Text style={styles.contactoLinea}>🌐 {lugar.web}</Text> : null}
          {lugar.redesSociales ? (
            <Text style={styles.contactoLinea}>📱 {lugar.redesSociales}</Text>
          ) : null}
        </View>
      )}
    </View>
  );
}

function SeccionEspecies({ especies }: { especies: EspeciePaquete[] }) {
  if (especies.length === 0) return null;
  return (
    <View style={styles.seccion}>
      <Text style={styles.tituloSeccion}>Flora y fauna</Text>
      {especies.map((especie) => (
        <View key={especie.id} style={styles.tarjeta}>
          {especie.imagen ? (
            <Image
              source={{ uri: fuenteImagen(especie.imagen, especie.imagenUrl) }}
              style={[
                styles.imagenTarjeta,
                { aspectRatio: especie.imagen.ancho / especie.imagen.alto },
              ]}
              contentFit="cover"
            />
          ) : null}
          <View style={styles.tarjetaContenido}>
            <Text style={styles.nombreCientifico}>
              {especie.nombreComun || "Especie"}
            </Text>
            {especie.nombreCientifico ? (
              <Text style={styles.cientifico}>{especie.nombreCientifico}</Text>
            ) : null}
            <Text style={styles.parrafo}>{especie.descripcion}</Text>
            {especie.estadoConservacion ? (
              <Text style={styles.etiqueta}>
                Estado: {especie.estadoConservacion}
              </Text>
            ) : null}
          </View>
        </View>
      ))}
    </View>
  );
}

function SeccionRelatos({ relatos }: { relatos: RelatoPaquete[] }) {
  if (relatos.length === 0) return null;
  return (
    <View style={styles.seccion}>
      <Text style={styles.tituloSeccion}>Historias del guía</Text>
      {relatos.map((relato) => (
        <View key={relato.id} style={styles.tarjeta}>
          {relato.imagen ? (
            <Image
              source={{ uri: fuenteImagen(relato.imagen, relato.imagenUrl) }}
              style={[
                styles.imagenTarjeta,
                { aspectRatio: relato.imagen.ancho / relato.imagen.alto },
              ]}
              contentFit="cover"
            />
          ) : null}
          <View style={styles.tarjetaContenido}>
            <Text style={styles.nombreCientifico}>{relato.titulo}</Text>
            <Text style={styles.parrafo}>{relato.contenido}</Text>
          </View>
        </View>
      ))}
    </View>
  );
}

function SeccionAfiches({ afiches }: { afiches: AfichePaquete[] }) {
  if (afiches.length === 0) return null;
  return (
    <View style={styles.seccion}>
      <Text style={styles.tituloSeccion}>Afiches informativos</Text>
      {afiches.map((afiche) => (
        <View key={afiche.id} style={styles.tarjeta}>
          {afiche.imagen ? (
            <Image
              source={{ uri: fuenteImagen(afiche.imagen, afiche.imagenUrl) }}
              style={[
                styles.imagenTarjeta,
                { aspectRatio: afiche.imagen.ancho / afiche.imagen.alto },
              ]}
              contentFit="cover"
            />
          ) : null}
          <View style={styles.tarjetaContenido}>
            <Text style={styles.nombreCientifico}>{afiche.titulo}</Text>
            {afiche.descripcion ? (
              <Text style={styles.parrafo}>{afiche.descripcion}</Text>
            ) : null}
          </View>
        </View>
      ))}
    </View>
  );
}

/* ── Estilos ──────────────────────────────────────────────────────────── */

const styles = StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: "#F7F7F5" },
  contenido: { padding: 20, paddingBottom: 48, gap: 8 },
  centro: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    padding: 24,
    backgroundColor: "#F7F7F5",
  },
  encabezado: { alignItems: "center", gap: 6, marginBottom: 8 },
  logoGrande: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: "#E8EFE9",
  },
  logoSinImagen: { alignItems: "center", justifyContent: "center" },
  logoInicial: { fontSize: 40, fontWeight: "800", color: "#1B4332" },
  nombreLugar: { fontSize: 26, fontWeight: "800", color: "#111", textAlign: "center" },
  textoSecundario: { fontSize: 14, color: "#666", textAlign: "center" },
  textoError: { fontSize: 16, fontWeight: "600", color: "#B23B3B", textAlign: "center" },
  chipDescargado: {
    marginTop: 6,
    backgroundColor: "#D6F0DC",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  chipDescargadoTexto: { color: "#1B4332", fontSize: 12, fontWeight: "700" },
  botonesInfo: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginVertical: 8,
    justifyContent: "center",
  },
  botonInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#fff",
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: "#DFE6DF",
  },
  botonInfoTexto: { fontSize: 13, color: "#1B4332", fontWeight: "700" },
  aviso: {
    backgroundColor: "#FFF4D6",
    borderRadius: 16,
    padding: 16,
    gap: 12,
    alignItems: "center",
    marginVertical: 8,
  },
  avisoTexto: { color: "#7A5A00", fontWeight: "600" },
  seccion: { marginTop: 16, gap: 12 },
  tituloSeccion: {
    fontSize: 20,
    fontWeight: "800",
    color: "#1B4332",
  },
  parrafo: { fontSize: 15, lineHeight: 22, color: "#333" },
  contacto: { gap: 4, marginTop: 4 },
  contactoLinea: { fontSize: 14, color: "#444" },
  tarjeta: {
    backgroundColor: "#fff",
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  imagenTarjeta: { width: "100%" },
  tarjetaContenido: { padding: 14, gap: 6 },
  nombreCientifico: { fontSize: 17, fontWeight: "700", color: "#111" },
  cientifico: { fontSize: 13, fontStyle: "italic", color: "#1B4332" },
  etiqueta: { fontSize: 13, color: "#555", fontWeight: "600" },
  barraAcciones: { marginTop: 24, gap: 12 },
  botonPrimario: {
    backgroundColor: "#1B4332",
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 999,
    alignItems: "center",
    alignSelf: "center",
  },
  botonPrimarioTexto: { color: "#fff", fontWeight: "700", fontSize: 15 },
  botonInactivo: { opacity: 0.5 },
  botonPeligro: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 999,
    alignItems: "center",
    alignSelf: "center",
  },
  botonPeligroTexto: { color: "#B23B3B", fontWeight: "600" },
});