// https://docs.expo.dev/guides/customizing-metro/
const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

// expo-sqlite en web usa WA-SQLite (WebAssembly): Metro debe tratar los
// archivos .wasm como assets. En el celular (Expo Go) se usa SQLite nativo.
// Referencia: https://docs.expo.dev/versions/v57.0.0/sdk/sqlite/ (sección Web).
config.resolver.assetExts.push("wasm");

module.exports = config;