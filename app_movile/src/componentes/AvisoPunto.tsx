import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import type { AvisoPunto as AvisoPuntoDatos } from "@/servicios/descargas";

/**
 * Aviso automático de un punto de interés.
 * Aparece cuando el turista se acerca a un punto marcado por la agencia
 * (afiche, especie o nota) y muestra su contenido sin necesidad de buscarlo.
 * Funciona offline: usa la imagen incrustada en el paquete descargado.
 */

interface Props {
  /** Punto a mostrar; null oculta el aviso. */
  punto: AvisoPuntoDatos | null;
  /** Cierra el aviso. */
  onCerrar: () => void;
}

/** Icono según el tipo de punto. */
function iconoDeTipo(tipo: string): keyof typeof Ionicons.glyphMap {
  if (tipo === "AFICHE") return "megaphone";
  if (tipo === "ESPECIE") return "leaf";
  return "alert-circle";
}

/** Etiqueta legible según el tipo de punto. */
function etiquetaDeTipo(tipo: string): string {
  if (tipo === "AFICHE") return "Afiche informativo";
  if (tipo === "ESPECIE") return "Especie del lugar";
  return "Aviso del lugar";
}

export default function AvisoPunto({ punto, onCerrar }: Props) {
  return (
    <Modal
      visible={punto != null}
      transparent
      animationType="slide"
      statusBarTranslucent
      onRequestClose={onCerrar}
    >
      <Pressable style={styles.fondo} onPress={onCerrar}>
        {/* La tarjeta detiene el toque para no cerrarse al desplazarla. */}
        <Pressable style={styles.tarjeta} onPress={() => undefined}>
          {punto ? (
            <>
              <View style={styles.encabezado}>
                <View style={styles.etiqueta}>
                  <Ionicons
                    name={iconoDeTipo(punto.tipo)}
                    size={14}
                    color="#1B4332"
                  />
                  <Text style={styles.etiquetaTexto}>
                    {etiquetaDeTipo(punto.tipo)}
                  </Text>
                </View>
                <Pressable
                  style={styles.cerrar}
                  onPress={onCerrar}
                  accessibilityRole="button"
                  accessibilityLabel="Cerrar aviso"
                >
                  <Ionicons name="close" size={22} color="#666" />
                </Pressable>
              </View>

              <Text style={styles.cerca}>
                <Ionicons name="navigate" size={12} color="#C0392B" /> Estás
                cerca de este punto
              </Text>

              <ScrollView
                contentContainerStyle={styles.cuerpo}
                showsVerticalScrollIndicator={false}
              >
                {punto.imagen ? (
                  <Image
                    source={{ uri: punto.imagen.datos }}
                    style={[
                      styles.imagen,
                      {
                        aspectRatio:
                          punto.imagen.ancho / punto.imagen.alto || 1,
                      },
                    ]}
                    contentFit="cover"
                    transition={200}
                  />
                ) : null}

                <Text style={styles.titulo}>{punto.titulo}</Text>
                {punto.descripcion ? (
                  <Text style={styles.descripcion}>{punto.descripcion}</Text>
                ) : null}

                <View style={styles.lugar}>
                  <Ionicons name="location" size={13} color="#1B4332" />
                  <Text style={styles.lugarTexto}>{punto.lugarNombre}</Text>
                </View>
              </ScrollView>

              <Pressable style={styles.boton} onPress={onCerrar}>
                <Text style={styles.botonTexto}>Entendido</Text>
              </Pressable>
            </>
          ) : null}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  fondo: {
    flex: 1,
    backgroundColor: "rgba(11,15,13,0.55)",
    justifyContent: "flex-end",
  },
  tarjeta: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 28,
    maxHeight: "82%",
    gap: 10,
  },
  encabezado: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  etiqueta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#E8EFE9",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  etiquetaTexto: { fontSize: 12, fontWeight: "700", color: "#1B4332" },
  cerrar: { padding: 4 },
  cerca: { fontSize: 12, color: "#C0392B", fontWeight: "700" },
  cuerpo: { gap: 12, paddingBottom: 4 },
  imagen: {
    width: "100%",
    borderRadius: 16,
    backgroundColor: "#E8EFE9",
  },
  titulo: { fontSize: 20, fontWeight: "800", color: "#111" },
  descripcion: { fontSize: 15, lineHeight: 22, color: "#444" },
  lugar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    alignSelf: "flex-start",
    backgroundColor: "#F0F3F0",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  lugarTexto: { fontSize: 12, fontWeight: "600", color: "#1B4332" },
  boton: {
    backgroundColor: "#1B4332",
    borderRadius: 999,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 4,
  },
  botonTexto: { color: "#fff", fontWeight: "800", fontSize: 15 },
});
