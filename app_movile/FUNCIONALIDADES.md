# 🧭 Funcionalidades de la app Trekko — Visión y plan

Documento vivo que captura lo que el equipo quiere en la app para turistas.
Cada sección indica **dónde vive** (local/backend), **estado** (hecho, en
construcción, pendiente) y las reglas de negocio definidas.

Principio rector: **offline-first**. Todo lo que el turista genera (recorridos,
fotos, puntos, referencias) se **almacena localmente en el teléfono**; las
validaciones y la compartición se hacen cuando hay conexión.

---

## 1. Catálogo y descarga de lugares — HECHO ✅

- Home con catálogo de lugares (`GET /api/empresas`), cada uno con su logo
  (o la inicial del nombre si no tiene).
- "Descargar" guarda el **paquete v5** (texto + imágenes optimizadas) en
  SQLite; se ve completo sin conexión.
- El navbar inferior (pestañas) aparece siempre con 6 pestañas:
  **Información · Especies · Mitos · Afiches · Recorrido · Galería**.
- **Sin internet**, la pestaña Información muestra **solo los lugares que ya
  descargaste** (con un aviso), en vez de un error.

## 1b. Afiches de las empresas (carteles) — HECHO ✅

- La pestaña **Afiches** junta los carteles/precauciones que publicaron las
  empresas de turismo de **todos los lugares descargados** (funciona offline).
- Cada afiche muestra su imagen (incluida en el paquete v5), título,
  descripción y el lugar al que pertenece.
- Tocar un afiche lo abre **a pantalla completa** para leerlo bien.

## 1c. Mitos y leyendas (relatos locales) — HECHO ✅

- La pestaña **Mitos** reúne los **relatos locales** (`public.relatos`) de
  todos los lugares descargados: **mitos, leyendas, datos curiosos y
  simbiosis** (funciona offline).
- Cada historia muestra su imagen (si la tiene), el tipo con su color/icono,
  el lugar y el contenido, en tarjetas expandibles.
- Filtros por **lugar** y por **tipo de historia** (Mito / Leyenda / Dato
  curioso / Simbiosis), con contadores.

## 1d. Lugar actual obligatorio (filtro estricto) — HECHO ✅

- **Sin un lugar seleccionado NO se muestra ni se puede usar nada** en la app:
  Especies, Mitos, Afiches, Recorrido y Galería muestran el aviso `SinLugarActivo`
  ("Elige tu lugar actual en «Info»") y el botón **Iniciar** del recorrido queda
  deshabilitado.
- El **lugar actual** se elige **solo en «Info»** ("Mi lugar actual – selecciónalo"),
  que ya lista todos los lugares descargados.
- Con **Sandoval + Yacumama** descargados y activo **Sandoval**, fuera de Info se
  ven **únicamente** los datos de Sandoval; con la pestaña Especies/Mitos/Afiches
  se indica "📍 {lugar activo} · cambiar en Info" para volver a cambiarlo.
- Si el paquete de un lugar **no está descargado**, no vale como lugar activo.

## 1e. Importar paquete descargado desde la web — HECHO ✅

- En **Info** hay un botón **"¿Descargaste un lugar en la web? · Seleccionar
  archivo"** que importa el `.json` del paquete v5 (que se descargó desde la
  página web) para **no descargarlo dos veces** en el teléfono.
- Usa `expo-document-picker` + `File.text()` y `guardarPaquete` (SQLite); valida
  que sea un paquete **formato `trekko`** (acepta la respuesta `{exito, datos}`
  de la API o el paquete directo).

## 2. Área informática de especies (flora y fauna) — HECHO ✅

- El turista **busca** las especies registradas de sus lugares descargados:
  por nombre común, nombre científico, familia o descripción.
- Filtros rápidos por categoría: **Todas / Fauna / Flora**.
- Ficha expandible: descripción, familia y estado de conservación.
- Funciona **sin conexión** (los datos vienen de los paquetes descargados).
- Si el guía olvidó un detalle o un punto, el turista lo ubica al instante.

## 3. Recorrido con trazabilidad (estilo QuickCapture) — HECHO ✅

- El turista **prende su ubicación** al empezar la caminata (`expo-location`):
  la app deja una **línea de recorrido** de puntos.
- **Mapa del recorrido**: mientras graba se ve la **polilínea en vivo** que
  sigue su posición; al abrir un recorrido del historial se ve el mapa con la
  **línea caminada y todos los puntos** (los que tienen foto van marcados 📷).
  Se usa `react-native-maps` (incluido en Expo Go).
- **El mapa ya no se ve negro**: se usa **OpenStreetMap** (teselas libres, sin
  API key ni cuenta) en vez de Google Maps. Con internet se ve el mapa real; el
  plano SVG dibuja SIEMPRE la **línea y los puntos** (📷 rojo / verdes
  numerados) como respaldo sin conexión. Botones **"Mapa"** / **"Plano"**
  pegajosos: la elección manual no se revierte sola.
- Siguiendo `planificacion.md`: **no se guarda un punto cada segundo** ni por el
  simple **temblor del GPS**. Solo cuando hay **avance real** (≥10 m desde la
  última lectura) y, si es poco, esperando ~25 s; además la precisión debe ser
  aceptable (≤80 m). Así no aparece distancia "fantasma" estando parado.
- **"Foto y punto"**: abre la cámara, copia la foto a la carpeta de la app y
  la marca como **punto del recorrido con su ubicación, fecha y la
  descripción de lo que viste**.
- **"Punto aquí"**: registra un punto manual al instante.
- Todo se guarda **localmente**: tablas `recorridos` + `puntos_recorrido`
  (SQLite) y fotos en la carpeta de documentos. Historial con puntos, fotos,
  distancia y duración por recorrido.

  > Herramientas: `expo-location` (GPS), `expo-image-picker` (cámara),
  > `expo-file-system` (copiar fotos), SQLite (`recorridos` +
  > `puntos_recorrido`).

## 4. Fotos marcadas y validación de zona — PENDIENTE 🚧

- Cada foto de árboles/fauna debe quedar **marcada** (metadato: coordenadas
  + hora) para **comprobar que se tomó en el lugar** y que no sea una foto
  bajada de Google.
- Si la foto **no cae dentro de la zona turística** del lugar (geocerca del
  polígono del lugar), **no se marca como foto de recorrido**.
- Por ahora **solo se almacena**; la validación definitiva con internet viene
  después.

  > Necesita el **polígono/zona** de cada lugar (pendiente en el backend:
  > campo en `empresas` o tabla `zonas`).

## 5. Compartir recorrido — PENDIENTE 🚧

- Al **terminar el recorrido**, el usuario elige si **compartirlo**.
- Localmente el usuario ve **todos sus puntos**; al compartir para todos:
  - una **IA revisa cuáles son fauna** (ej. un mono → fauna, se muestra;
    una planta medicinal → se salta, para no subir fotos de más),
  - **se separa por especies, una foto por especie**,
  - se incluye la **descripción de la especie**,
  - para que **otros usuarios vean los animales observados**.

## 6. Galería: las 5 mejores fotos del día — HECHO ✅ (con subida real)

- La pestaña **Galería** arma el envío para el concurso: el turista elige un
  recorrido **de su lugar activo** (gate `SinLugarActivo`) y marca **hasta 5
  fotos** de sus puntos. Los recorridos se listan **numerados con fecha y hora**
  para distinguir el 1.º del 2.º.
- Formulario implementado:
  - **nombre completo** del usuario,
  - **DNI** (para que la página pública se reutilice en varios lugares sin
    borrar lo anterior),
  - **zona / lugar** del recorrido (autocompletado, editable),
  - la **fecha sale de cada foto y del recorrido** (su propia marca temporal),
  - **preview de la página**: "El viaje de {nombre} en {zona}" con fecha, DNI,
    miniaturas de las 5 fotos y el resumen del track,
  - aviso de **límite de peso/fotos** para no gastar datos al subir.
- Al **Enviar** se guarda en la **cola local** (`envios_galeria` en SQLite:
  nombre, DNI, lugar, track completo + fotos, estado `PENDIENTE`) con
  `guardarEnvioGaleria`.
- **Subida REAL** (`src/servicios/paseos.ts`): cuando hay internet de verdad
  (prueba con `hayInternet`), sube cada envío como **multipart** a
  `POST /api/paseos` (fotos + track). Al lograrlo guarda el estado `ENVIADO` y
  la **URL de la página pública**; si falla queda `ERROR` para reintentar. Se
  dispara al guardar y al entrar a la pestaña; hay botón **"Subir"** manual y un
  enlace **"Ver mi página pública"**.
- **En la web**: muro público `/paseos` y página reutilizable `/paseo/[dni]`
  con el **mapa SVG del recorrido**, los puntos y las mejores fotos.
- **Puntaje IA + validación de zona**: botón **"🏆 Puntuar con IA"** en la
  página pública → `POST /api/paseos/:id/evaluar` (la clave de Gemini vive en
  el **backend**). Devuelve un **JSON** `{"fotos":[{"indice","puntaje",
  "justificacion"}], "puntajePromedio"}` y se **guarda como registro** en la
  columna `evaluacion`. Además valida con **matemática GPS** (sin gastar IA)
  si cada foto cayó dentro de la zona del recorrido (`enZona`, ≤250 m del track).
- **Pendiente (concurso)**: ranking/mes y patrocinio de las empresas.

## 7. Página "El viaje de [nombre] en [lugar]" — HECHO ✅

- Se genera a partir de los envíos subidos: **"El viaje de Juan Marcos Quispe
  Quispe en Lago Sandoval"** (web pública `/paseo/[dni]`).
- Muestra las **mejores fotos** del usuario + su **track completo** (la línea
  caminada y los puntos), dibujado con **SVG** (sin dependencias).
- **Página reutilizable por DNI**: si la persona **visita otro lugar**, se usa
  **la misma página** (mismo DNI), **acumula** los nuevos lugares/fechas **sin
  borrar** lo anterior. Por eso la Galería pide el DNI.
- **Backend**: tabla `public.paseos` (migración `005_crear_paseos.sql`), servicio
  `servicios/paseos.ts` y rutas `/api/paseos` (`POST` sube, `GET /` muro,
  `GET /dni/:dni` página). Las fotos van a Supabase Storage (carpeta `paseos/`).

## 8. Puntaje IA de fotos (jurado del concurso) — HECHO ✅

- **"🏆 Puntuar con IA"** en la página pública `/paseo/[dni]`: llama al backend
  `POST /api/paseos/:id/evaluar`, que manda las fotos a **Gemini** (clave SOLO
  en el backend `.env`) y recibe un **JSON** con `indice`, `puntaje` (0–10) y
  `justificacion` por foto + `puntajePromedio`.
- El resultado se **guarda como registro** (`evaluacion` jsonb + 
  `puntaje_promedio`, migración `006`) y se muestra en la página: 🏆 promedio
  por recorrido, ★ puntaje por foto y **"⚠ fuera de zona"** si la foto se tomó
  lejos del track.
- La **validación de zona** (si lat/lng pertenece al recorrido) se calcula con
  **matemática GPS** (Haversine, ≤250 m), no con IA: más fiable y sin coste.
- **Pendiente**: ranking mensual con las mejores fotos y concurso patrocinado.

## 9. Recuerdo en PDF para imprimir — HECHO ✅ (web)

- La **página pública del viajero** (`/paseo/[dni]`) muestra el botón
  **"📸 Generar y descargar recuerdo (PDF)"** → `GET /api/recuerdo?dni=...`.
- Genera un **A4 horizontal (collage)** con el **título** ("El viaje de X"),
  **lugar, fecha**, la cuadrícula de las **mejores fotos** (hasta 12), el
  detalle del recorrido (número de paseos, puntos GPS, distancia) y una
  **frase emotiva** que, si hay `GEMINI_API_KEY` configurada en el servidor,
  escribe **Gemini** (con respaldo por plantilla si no hay clave o falla).
- Funciona con **pdf-lib** (JS puro) descargando las fotos desde el servidor:
  compatible con **Vercel** (sin binarios ni CORS del navegador) e imprimible.

---

## Mapa rápido por sección

| # | Función | Dónde vive | Estado |
| - | ------- | ---------- | ------ |
| 1 | Catálogo + descarga offline | App (SQLite) + API | ✅ Hecho |
| 1b | Afiches (carteles, pantalla completa) | App (paquetes locales) | ✅ Hecho |
| 1c | Mitos y leyendas (relatos locales) | App (paquetes locales) | ✅ Hecho |
| 1d | Lugar actual obligatorio (filtro estricto) | App (SQLite `configuracion`) | ✅ Hecho |
| 1e | Importar paquete (.json) desde la web | App (DocumentPicker + SQLite) | ✅ Hecho |
| 2 | Buscador de especies | App (paquetes locales) | ✅ Hecho |
| 3 | Recorrido QuickCapture (GPS + fotos + mapa) | App (local), expo-location | ✅ Hecho |
| 4 | Fotos marcadas + zona turística (geocerca) | App + backend (polígono) | 🚧 Construir |
| 5 | Compartir recorrido (filtro IA por especies) | Backend (IA) | 🚧 Construir |
| 6 | Galería: mejores fotos + formulario | App (formulario + subida) + Backend (`paseos`) | ✅ Hecho |
| 7 | Página "El viaje de … en …" | Web pública (`/paseo/[dni]`) + Backend | ✅ Hecho |
| 8 | Puntaje IA de fotos (JSON guardado) + validación de zona GPS | Backend | ✅ Hecho |
| 9 | Recuerdo PDF imprimible (collage) | Web: `GET /api/recuerdo` (pdf-lib) + IA opcional | ✅ Hecho |

> Antes de cada 🚧 conviene decidir con el equipo: ¿cómo se modela el polígono
> de cada lugar? El puntaje IA ya funciona con la clave `GEMINI_API_KEY` en el
> backend `.env` (Google AI Studio); sin ella, la web avisa y usa plantillas.