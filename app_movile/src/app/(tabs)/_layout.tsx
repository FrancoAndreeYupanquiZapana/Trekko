import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";

/**
 * Barra inferior (navbar) de la app. El turista navega entre:
 *  - Información: lugares disponibles para descargar y tus descargas.
 *  - Especies:   flora y fauna avistada (buscador offline).
 *  - Mitos:      mitos, leyendas, datos curiosos y simbiosis del lugar.
 *  - Afiches:    carteles y precauciones publicados por las empresas.
 *  - Recorrido:  trazabilidad tipo QuickCapture (GPS + fotos marcadas).
 *  - Galería:    formulario para mandar las mejores fotos del día.
 */
export default function Pestañas() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: "#1B4332",
        tabBarInactiveTintColor: "#9A9A9A",
        tabBarLabelStyle: { fontSize: 10, fontWeight: "600" },
        tabBarItemStyle: { paddingVertical: 2 },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Info",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home-outline" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="especies"
        options={{
          title: "Especies",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="leaf-outline" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="mitos"
        options={{
          title: "Mitos",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="book-outline" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="afiches"
        options={{
          title: "Afiches",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="megaphone-outline" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="recorrido"
        options={{
          title: "Recorrido",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="navigate-outline" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="galeria"
        options={{
          title: "Galería",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="images-outline" color={color} size={size} />
          ),
        }}
      />
    </Tabs>
  );
}