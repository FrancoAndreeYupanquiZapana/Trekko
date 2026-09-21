import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from "expo-router";
import { SQLiteProvider } from "expo-sqlite";
import { useCallback } from "react";
import { useColorScheme } from "react-native";
import type { SQLiteDatabase } from "expo-sqlite";

import { inicializarBaseDatos } from "@/servicios/descargas";

/**
 * Raíz de la app.
 * - SQLiteProvider abre la base local (trekko.db) y crea la tabla de paquetes.
 * - Stack define: el grupo de pestañas (tabs) y el detalle de un lugar
 *   (presentado encima con su botón "Atrás").
 */
export default function Raiz() {
  const colorScheme = useColorScheme();
  const prepararBase = useCallback(
    (db: SQLiteDatabase) => inicializarBaseDatos(db),
    []
  );

  return (
    <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
      <SQLiteProvider databaseName="trekko.db" onInit={prepararBase}>
        <Stack>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen
            name="lugar/[id]"
            options={{ title: "Lugar", headerBackTitle: "Atrás" }}
          />
        </Stack>
      </SQLiteProvider>
    </ThemeProvider>
  );
}