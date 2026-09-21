# Trekko — App móvil (turistas)

App **offline-first** para turistas hecha con **React Native + Expo (SDK 57)**,
TypeScript, `expo-router` (rutas por archivos) y `expo-sqlite`.

- Catálogo de lugares descargables (pestaña Información).
- Cada lugar se descarga como un **paquete JSON anidado** (texto + imágenes
  optimizadas) y se guarda **tal cual en SQLite** para verse sin conexión.
- **Sin internet**, la pestaña Información muestra solo los lugares que ya
  descargaste (con aviso), en vez de un error.
- Pestañas: **Información · Especies · Mitos · Afiches · Recorrido · Galería**.
- **Mitos**: mitos, leyendas, datos curiosos y simbiosis de los lugares
  descargados (offline).
- **Afiches**: carteles y precauciones de las empresas (offline); tocar uno lo
  abre **a pantalla completa**.
- **Especies / Mitos / Afiches / Recorrido / Galería**: exigen un **lugar
  actual** (filtro estricto). Sin lugar seleccionado no se muestra ni se puede
  hacer nada; el lugar activo se elige **solo en Información** ("Mi lugar
  actual"), que ya lista todos los descargados. Los temas del lugar activo se
  muestran con una píldora "📍 {lugar} · cambiar en Info".
- **Información**: botón **"¿Descargaste un lugar en la web? · Seleccionar
  archivo"** para importar el `.json` del paquete ya descargado en la web (no
  descargarlo dos veces).
- **Recorrido**: trazabilidad tipo QuickCapture (línea GPS + fotos marcadas
  con ubicación/descripción), **mapa con la línea y los puntos** en vivo y en
  el historial, todo guardado localmente. El mapa usa **OpenStreetMap** (teselas
  libres, sin API key); sin conexión se ve un **plano SVG** con la línea y los
  puntos, y hay botones **"Mapa"/"Plano"** pegajosos.
- **Galería**: se elige **de qué recorrido** sacar las fotos (numerados con
  fecha/hora), formulario con **nombre + DNI + zona**, preview **"El viaje de
  X en Y"**, y guarda en la **cola local** (track completo + hasta 5 fotos).
  Con internet **sube de verdad** (`POST /api/paseos`) y muestra el enlace a la
  **página pública**; si falla, reintenta solo.

## Estructura

```
src/
├── app/                    # rutas de expo-router
│   ├── _layout.tsx         # SQLiteProvider + Stack
│   ├── (tabs)/             # barra inferior (navbar) — 6 pestañas
│   │   ├── _layout.tsx     # Info · Especies · Mitos · Afiches · Recorrido · Galería
│   │   ├── index.tsx       # Información: catálogo + respaldo offline
│   │   ├── especies.tsx    # buscador de flora/fauna (offline)
│   │   ├── mitos.tsx       # mitos, leyendas, datos curiosos y simbiosis
│   │   ├── afiches.tsx     # carteles de las empresas + visor a pantalla completa
│   │   ├── recorrido.tsx   # trazabilidad QuickCapture (GPS + mapa)
│   │   └── galeria.tsx     # formulario de las mejores fotos del día
│   └── lugar/[id].tsx      # Detalle del lugar (offline) + descargar
├── componentes/
│   ├── SinLugarActivo.tsx   # bloqueo global: sin lugar activo no se muestra nada
│   └── MapaRecorrido.*      # mapa línea/puntos: OpenStreetMap nativo + SVG offline
├── constantes/ambiente.ts  # URL de la API (auto-detecta la IP del PC)
├── servicios/
│   ├── api.ts              # fetch tipado contra la API (+ subida multipart)
│   ├── conexion.ts         # prueba real de internet (fetch con timeout)
│   ├── lugares.ts          # catálogo, detalle y paquete v5
│   ├── descargas.ts        # capa SQLite (guardar/leer/eliminar/buscar/relatos)
│   ├── recorridos.ts       # capa SQLite de recorridos + puntos (GPS)
│   ├── galeria.ts          # cola local de envíos (track + fotos + DNI)
│   └── paseos.ts           # sube la cola al backend + URL de la página pública
└── tipos/                  # contrato del backend (paquete v5)
```

## Cómo correrla

Desde la raíz del repo (requiere que la API de Trekko esté corriendo):

```bash
pnpm dev:backend   # terminal 1: API en http://localhost:4000
pnpm dev:app       # terminal 2: Expo en modo desarrollo
```

Con `pnpm dev:app` verás un **código QR**: escanéalo con la app
[Expo Go](https://expo.dev/go) (Android/iOS) y la app se abre en tu celular.
Como el backend y tu PC están en la misma red, la app detecta sola la IP
correcta (no configures nada).

También puedes probar en el navegador:

```bash
pnpm --filter trekko-app web   # abre http://localhost:8081
```

> En el navegador, `expo-sqlite` usa WA-SQLite (WebAssembly) y necesita que
> Metro soporte `.wasm` — ya configurado en `metro.config.js`.

## Producción (APK para tus compañeros)

Expo Go es solo para desarrollo. Cuando la API esté desplegada y quieras
entregar la app sin publicarla aún en las tiendas:

1. Crea un `.env` en esta carpeta con la URL pública de la API:

   ```
   EXPO_PUBLIC_API_URL=https://tu-api.com/api
   ```

2. Genera el APK con **EAS Build** (la primera vez pedirá `eas login` y un
   `eas build:configure`):

   ```bash
   npx eas-cli@latest build --platform android --profile preview
   ```

3. Al terminar te da un **enlace de descarga del APK**: los compañeros lo
   instalan directo en su celular (sin Expo Go, sin tienda).

Cuando el proyecto sume módulos nativos que Expo Go no trae (p. ej. cámara
personalizada, IA, sensores), en vez de Expo Go se usa un **development
build** (`eas build --profile development`) que instala esos módulos.

## Cómo se comporta sin red

- **Con descarga guardada**: el lugar se abre completo desde SQLite
  (imágenes incluidas, sin internet).
- **Sin descarga y con red**: ves una vista previa online con el botón
  **"Descargar para ver sin conexión"**.
- **Sin nada**: mensaje claro pidiendo descargar mientras tengas señal.

El contrato completo del paquete (formato v5, SQLite, caché por `revision`)
está en [`INTEGRACION-PAQUETE.md`](./INTEGRACION-PAQUETE.md).