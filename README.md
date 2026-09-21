# 🥾 Trekko

Plataforma turística **offline-first** que permite a agencias publicar destinos y rutas georreferenciadas, mientras los turistas los descargan, recorren con GPS, registran fotografías y observaciones de flora/fauna, y luego sincronizan y comparten sus experiencias.

> Proyecto de Ingeniería de Sistemas. Más contexto en [`planificacion.md`](./planificacion.md).

---

## 📁 Estructura del repositorio

```
Trekko/
├── planificacion.md          # Documento de arquitectura y fases
├── app_web/                  # Portal web (agencias, admin) + API
│   ├── frontend/             # Next.js + TypeScript + Tailwind CSS
│   └── backend/              # Express API (Node.js + Supabase)
└── app_movile/               # App para turistas (React Native + Expo)
```

## 🧱 Stack

| Componente | Tecnología |
| ---------- | ---------- |
| Portal web | Next.js + TypeScript + Tailwind CSS |
| Backend    | Express (Node.js) |
| Base de datos / Auth | Supabase (PostgreSQL + Auth) — **solo en el backend** |
| App móvil  | React Native + Expo (SDK 57) con `expo-router` y `expo-sqlite` |

> **Arquitectura**: Supabase (Auth, PostgreSQL, Storage) vive exclusivamente en
> el backend Express. El frontend (Next.js) habla **únicamente** con la API de
> Trekko mediante `fetch`; nunca importa ni expone credenciales de Supabase.

## 🤝 Reglas de arquitectura (convención del equipo)

1. **Centralizado**: una sola fuente de verdad para servicios, config y tipos. No repetir funciones ni clases.
2. **Archivos cortos**: máximo **700–800 líneas** por archivo. Si algo crece, se extrae.
3. **Componentes reutilizables** en `componentes/`, separados por capa (`ui/`, `layout/`).
4. **Todo en español**: carpetas, archivos, funciones, variables y rutas.
5. **Naming y estructura** consistentes entre frontend y backend:
   - `servicios/` → lógica que habla con APIs externas o Supabase.
   - `controladores/` (solo backend) → orquestan petición → servicio → respuesta.
   - `rutas/` → definición de endpoints.
   - `utilidades/` → helpers puros y validadores.
   - `tipos/` → tipos compartidos.
   - `config/` → configuración/solo variables de entorno.

## 📦 Gestión de paquetes (pnpm)

El repositorio es un **monorepo pnpm** (workspace). No uses `npm install`: usa
pnpm desde la raíz para instalar todo de una vez.

```bash
pnpm install                # instala backend, frontend y app móvil
pnpm dev                    # levanta API (4000) y web (3000) en paralelo
pnpm dev:backend            # solo la API
pnpm dev:frontend           # solo la web
pnpm dev:app                # la app móvil (Expo) — escanea el QR con Expo Go
pnpm tipo                   # chequeo de tipos de los tres proyectos
pnpm lint                   # eslint del frontend y de la app móvil
pnpm build                  # build de producción del frontend
```

## 🚀 Cómo arrancar (desarrollo local)

### Backend (puerto 4000)

```bash
cd app_web/backend
cp .env.example .env   # llena tus credenciales de Supabase
cd ../..               # o trabaja desde la raíz
pnpm dev:backend
```

### Frontend (puerto 3000)

```bash
cd app_web/frontend
cp .env.local.example .env.local   # ajusta NEXT_PUBLIC_URL_API si es necesario
cd ../..
pnpm dev:frontend
```

### App móvil (Expo — celular)

```bash
pnpm dev:backend   # terminal 1: la API en http://localhost:4000
pnpm dev:app       # terminal 2: aparece un código QR
```

Escanea el QR con la app **Expo Go** (Android/iOS) y la app abre en tu
celular. La app detecta sola la IP de tu PC en la red local (no configura
nada). También se puede probar en el navegador con
`pnpm --filter trekko-app web`. Más detalles en [`app_movile/README.md`](./app_movile/README.md).

> Si el celular no logra conectar a la API, revisa que el firewall permita el
> puerto 4000 y que ambos estén en la misma red Wi-Fi.

## Despliegue (producción)

- **Web (frontend)** → **Vercel** (usa Next.js: `pnpm build` en `app_web/frontend`).
  CORS ya está abierto (`app.use(cors())`), así que la app y la web pueden
  llamar a la API sin problema. El **recuerdo PDF** (`/api/recuerdo`) y el
  **puntaje IA** (`/api/evaluar-paseo`) son serverless-friendly (JS puro) y
  **nunca tocan la clave de Gemini**: la piden al backend. En Vercel solo
  configura `NEXT_PUBLIC_API_URL` (tu API desplegada).
- **API (backend)** → dos caminos:
  - **Vercel (serverless)**: usa el soporte **zero-config de Express**: Vercel
    detecta `app_web/backend/src/server.ts` (importa `express` y hace
    `export default app`) y empaqueta toda la API en una sola Vercel Function.
    Pasos:
    1. En Vercel, **Root Directory** = `app_web/backend`.
    2. Define las variables de entorno (`SUPABASE_URL`,
       `SUPABASE_SERVICE_ROLE_KEY`; opcional `GEMINI_API_KEY`, `GEMINI_MODELO`).
    3. No hace falta build command ni output directory (Vercel transpila el
       TypeScript por su cuenta).
    La caché persistente de paquetes en Supabase Storage
    (`utilidades/cachePaquete.ts`) evita regenerar el paquete pesado cuando cae
    en una instancia nueva. `vercel.json` sube `maxDuration` a 60 s y memoria a
    1024 MB para `/paquete-app` (en plan Pro se puede subir hasta 300 s).
    > `src/index.ts` (con `app.listen()`) se mantiene solo para desarrollo
    > local; `src/aplicacion.ts` contiene la fábrica `crearApp()` y se llama así
    > para no chocar con los nombres de entrypoint que Vercel reconoce.
  - **Render / Railway** (servidor persistente): más simple para el endpoint
    pesado de imágenes, porque la caché en memoria sobrevive entre requests.
- **App móvil** → instalar `expo-sqlite`/módulos con `npx expo install`.
  Para entregar APK a los compañeros usa **EAS Build** con
  `EXPO_PUBLIC_API_URL=https://tu-api.com/api` (ver
  [`app_movile/README.md`](./app_movile/README.md)).

En producción la app deja de depender de la red local: apunta a la URL
pública de la API y funciona desde cualquier red.

Las variables de entorno requeridas son:

| Variable | Proyecto | Descripción |
| -------- | -------- | ----------- |
| `SUPABASE_URL` | backend | URL del proyecto Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | backend | Clave `service_role` de Supabase (nunca la `anon`; solo vive en el servidor) |
| `NEXT_PUBLIC_API_URL` | frontend | URL de la API de Trekko, incluye `/api` (por defecto `http://localhost:4000/api`). **En Vercel**: apunta a la API desplegada, ej. `https://tu-api.com/api` |
| `GEMINI_API_KEY` | backend | Clave de la **API de Gemini** (Google AI Studio) para el **puntaje IA de fotos** (`POST /api/paseos/:id/evaluar`) y la **frase del recuerdo** PDF. Vive SOLO en el servidor; el navegador nunca la ve. Opcional: sin ella la web usa plantillas |
| `GEMINI_MODELO` | backend | Modelo de Gemini a usar (por defecto `gemini-3.5-flash`) |

**Flujo de sesión**: el frontend guarda el token de acceso en una cookie
(`tk_token_acceso`) y lo envía a la API en `Authorization: Bearer <token>`. El
backend valida el token contra Supabase Auth en cada petición protegida.

## 🗺 Rutas actuales del portal web

| Ruta               | Descripción                          |
| ------------------ | ------------------------------------ |
| `/`                | Home público con catálogo de lugares (con logo y datos de cada agencia) |
| `/lugar/:id`       | Página pública de un lugar + botón de descarga para la app |
| `/paseos`          | Muro público de paseos: fotos y recorridos de los viajeros |
| `/paseo/:dni`      | Página pública reutilizable del viajero ("El viaje de {nombre} en {lugar}"): fotos + track GPS, acumula lugares/fechas |
| `/api/recuerdo`    | Genera y descarga el **recuerdo PDF** de un viajero (collage imprimible con título, fecha y frase IA opcional) |
| `/registro`        | Registro de agencia o lugar turístico (solo rol EMPRESA) |
| `/iniciar-sesion`  | Inicio de sesión                     |
| `/admin/panel`     | Panel de administración (rol ADMIN)  |
| `/empresa`         | Panel de la agencia (rol EMPRESA)    |
| `/empresa/perfil`  | Mi perfil — datos públicos de la agencia (rol EMPRESA) |
| `/empresa/especies`| Flora y fauna — registrar especies con imagen (rol EMPRESA) |
| `/empresa/relatos` | Relatos locales — mitos, leyendas, datos curiosos y simbiosis (rol EMPRESA) |
| `/empresa/afiches` | Afiches informativos — reglas, seguridad y especies protegidas como imágenes (rol EMPRESA) |
| `/turista`         | Mi Trekko — portal del turista (rol TURISTA) |

## 🔌 Endpoints del backend

| Método | Ruta                              | Descripción                          |
| ------ | --------------------------------- | ------------------------------------ |
| GET    | `/api/salud`                      | Verifica que la API responde         |
| POST   | `/api/autenticacion/registro`     | Registra agencia/lugar turístico confirmado y devuelve su sesión |
| POST   | `/api/autenticacion/ingreso`      | Inicia sesión y devuelve la sesión   |
| GET    | `/api/autenticacion/sesion`       | Valida el token y devuelve el usuario (protegido) |
| POST   | `/api/autenticacion/cerrar-sesion`| Cierra la sesión (protegido)         |
| GET    | `/api/empresas/mi-perfil`         | Perfil de la agencia autenticada (protegido) |
| PUT    | `/api/empresas/mi-perfil`         | Crea o actualiza el perfil (protegido) |
| GET    | `/api/empresas`                   | Lista empresas registradas (público) |
| GET    | `/api/empresas/:id`               | Detalle completo: perfil + flora y fauna + `revisionLugar` para detectar actualizaciones (público) |
| GET    | `/api/empresas/:id/exportar`      | Paquete JSON ligero: perfil + especies + relatos + afiches, imágenes por URL (público) |
| GET    | `/api/empresas/:id/paquete-app`   | Paquete v5 para la app: mismo contenido + **imágenes optimizadas incrustadas** (base64) y `revision` para caché/actualizaciones (público) |
| GET    | `/api/especies`                   | Especies de mi lugar (protegido)     |
| POST   | `/api/especies`                   | Crea una especie (protegido)         |
| PUT    | `/api/especies/:id`               | Actualiza una especie propia (protegido) |
| DELETE | `/api/especies/:id`               | Elimina una especie propia (protegido) |
| GET    | `/api/relatos`                    | Relatos locales de mi lugar (protegido) |
| POST   | `/api/relatos`                    | Crea un relato local (protegido)     |
| PUT    | `/api/relatos/:id`                | Actualiza un relato propio (protegido) |
| DELETE | `/api/relatos/:id`                | Elimina un relato propio (protegido) |
| GET    | `/api/afiches`                    | Afiches informativos de mi lugar (protegido) |
| POST   | `/api/afiches`                    | Crea un afiche (protegido)         |
| PUT    | `/api/afiches/:id`                | Actualiza un afiche propio (protegido) |
| DELETE | `/api/afiches/:id`                | Elimina un afiche propio (protegido) |
| POST   | `/api/archivos/imagen`            | Sube una imagen (multipart `archivo`) y devuelve su URL (protegido) |
| POST   | `/api/paseos`                     | Sube un paseo desde la app (multipart: `datos` JSON + hasta 5 `fotos`); devuelve el paseo con URLs (público) |
| GET    | `/api/paseos`                     | Muro público: paseos recientes (público) |
| GET    | `/api/paseos/dni/:dni`            | Todos los paseos de un DNI (página reutilizable) (público) |
| POST   | `/api/paseos/:id/evaluar`         | Puntúa con IA las fotos del paseo (0-10 + justificación + validación de zona GPS) y **guarda el JSON** como registro (público) |
| POST   | `/api/paseos/texto-recuerdo`      | Frase emotiva IA para el PDF "recuerdo" (público) |

## 📱 Paquete v5 para la app móvil (offline-first)

La app del turista descarga un **único JSON anidado** por lugar desde
`GET /api/empresas/:id/paquete-app` y lo guarda **tal cual** en una fila de
SQLite (columna `TEXT`). El paquete incluye las imágenes ya optimizadas en el
servidor (JPEG base64, sin PX innecesarios), así el celular no necesita red
para ver nada y no se descargan originales pesados.

Estructura (todas las entidades conservan su `imagenUrl` original como
referencia y agregan `imagen` con la versión incrustada):

```jsonc
{
  "version": 5,             // versión del formato del paquete
  "formato": "trekko",
  "generado": "2026-09-20T12:00:00.000Z",
  "revision": "2026-09-19T18:30:00.000Z",   // ← caché/actualizaciones
  "empresa": { "id": "...", "nombre": "...", "logoUrl": "...", "logo": { "datos": "data:image/jpeg;base64,...", "ancho": 720, "alto": 405 }, "..." },
  "especies": [ { "id": "...", "nombreComun": "...", "imagen": { "datos": "...", "ancho": 720, "alto": 480 }, "..." } ],
  "relatos":  [ { "id": "...", "titulo": "...", "imagen": { "datos": "...", "ancho": 720, "alto": 480 }, "..." } ],
  "afiches":  [ { "id": "...", "titulo": "...", "imagen": { "datos": "...", "ancho": 1080, "alto": 1350 }, "..." } ]
}
```

**Contrato de actualización (caché por `revision`):** la app guarda el
`revision` (y el `version`) junto al paquete. Al abrir el lugar compara contra
el servidor; si el `revision` es mayor → muestra **"Hay una actualización"** y
re-descarga. La `revision` es la fecha del cambio más reciente (perfil,
especies, relatos o afiches). Cada `imagen` trae `ancho`/`alto` para reservar
layout sin saltos, y perfiles de compresión ya aplicados: fotos 720px q68,
afiches 1080px q78 (texto legible offline).

> Diferencia con `/exportar`: ese paquete ligero (v4) referencia imágenes por
> URL — sirve para el botón de descarga de la web (demo). El de la app es
> `/paquete-app` (v5). El servidor mantiene una caché en memoria que se
> invalida **solo cuando cambia la `revision`** del contenido: aunque el lugar
> tenga 30–40 imágenes, la optimización ocurre una vez por versión; las demás
> llamadas se sirven de la caché.

La guía de consumo para Expo/React Native está en
[`app_movile/INTEGRACION-PAQUETE.md`](./app_movile/INTEGRACION-PAQUETE.md).

## 🗄 Base de datos (Supabase)

El backend escribe/lee la tabla `public.empresas` (perfil de las agencias),
`public.especies` (flora y fauna de cada lugar), `public.relatos` (mitos,
leyendas, datos curiosos y simbiosis), `public.afiches` (afiches informativos
con reglas, seguridad y especies protegidas) y `public.paseos` (envíos de la
galería móvil: fotos + track GPS, página pública por DNI); las imágenes se
guardan en el bucket público `imagenes` de **Storage**. Las migraciones viven en
`app_web/backend/db/migraciones/` y se ejecutan manualmente en el **SQL Editor**
de Supabase:

1. Supabase Dashboard → **SQL Editor**.
2. Pega el contenido de `001_crear_empresas.sql` → **Run**.
3. Pega el contenido de `002_crear_especies.sql` → **Run**.
4. Pega el contenido de `003_crear_relatos.sql` → **Run**.
5. Pega el contenido de `004_crear_afiches.sql` → **Run**.
6. Pega el contenido de `005_crear_paseos.sql` → **Run**.
7. Pega el contenido de `006_evaluacion_paseos.sql` → **Run** (columnas del puntaje IA).

> Ejecutar `001_crear_empresas.sql` es obligatorio para "Mi perfil"; ejecutar
> `002_crear_especies.sql` lo es para el módulo de flora y fauna; ejecutar
> `003_crear_relatos.sql` lo es para el módulo de relatos locales,
> `004_crear_afiches.sql` para el de afiches (si la tabla no existe, la API
> responde 500; la página pública tolera las tablas faltantes y muestra el
> módulo vacío), `005_crear_paseos.sql` para la subida de la galería móvil y las
> páginas `/paseos` y `/paseo/:dni`, y `006_evaluacion_paseos.sql` para que el
> puntaje IA se GUARDE como registro (sin ella, `POST /api/paseos/:id/evaluar`
> responde igual con `guardado: false`). El bucket `imagenes` se crea solo en la
> primera subida.

## 🗓 Fases (según planificación)

- **Fase 1 (MVP)**: registro/login, crear destinos, especies, puntos y rutas (portal) · descargar destinos, recorridos con GPS, fotos y sincronización (app).
- **Fase 2**: geofence, PostGIS, validación GPS, historial, perfil y álbum.
- **Fase 3**: IA (Gemini): identificación preliminar, clasificación flora/fauna, traducción, moderación.
- **Fase 4**: logros, pasaporte, concursos, ranking, estadísticas y reportes.

Ver sección *"MVP que realmente construiría"* de la planificación para el detalle completo.