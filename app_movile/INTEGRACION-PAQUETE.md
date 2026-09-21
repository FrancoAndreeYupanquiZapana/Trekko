# 📦 Paquete v5 — Guía de integración (app Expo/React Native)

Guía para consumir el paquete offline de un lugar desde la app del turista.
El backend ya resuelve la parte pesada (optimizar y embeber imágenes); la app
solo tiene que **descargar una vez**, **guardar en SQLite** y **comparar la
`revision`** para detectar actualizaciones.

---

## 1. Endpoint

```
GET {URL_API}/api/empresas/:id/paquete-app
```

- **Público** (no necesita sesión).
- Devuelve `{ exito, mensaje, datos }`; el paquete vive en `datos`.
- `URL_API` = base de la API, p. ej. `http://localhost:4000` en desarrollo.

Respuesta mínima por lugar (el JSON completo es *anidado* y autónomo):

| Campo       | Tipo           | Uso                                                        |
| ----------- | -------------- | ---------------------------------------------------------- |
| `version`   | `number` (5)   | Versión del **formato** del paquete.                        |
| `revision`  | `string` (ISO) | Fecha del último cambio. **Comparar para detectar updates.** |
| `empresa`   | objeto         | Perfil + logo incrustado (`logo.datos` = data URI JPEG).    |
| `especies`  | array          | Flora/fauna, cada una con `imagen` incrustada.              |
| `relatos`   | array          | Mitos, leyendas, datos curiosos, simbiosis + `imagen`.      |
| `afiches`   | array          | Afiches (posters) + `imagen` a mayor resolución.            |

Cada `imagen` incrustada tiene la forma:

```ts
{ datos: "data:image/jpeg;base64,...", ancho: 720, alto: 480 }
```

> `datos` se puede renderizar directo en `<Image source={{ uri: item.imagen.datos }} />`
> y `imagenUrl` (la URL original) sirve como referencia/fallback online.

---

## 2. Guardar en SQLite (offline-first)

La opción más simple y recomendada para el MVP: **una tabla por lugar** que
guarda todo el JSON en una columna `TEXT`. SQLite maneja sin problema varios
MB si el índice por `lugar_id` está bien hecho.

```sql
CREATE TABLE IF NOT EXISTS paquetes (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  lugar_id    TEXT    NOT NULL UNIQUE,   -- id de la empresa
  version     INTEGER NOT NULL,          -- formato del paquete
  revision    TEXT    NOT NULL,          -- fecha del último cambio
  json        TEXT    NOT NULL,          -- el paquete completo (datos)
  descargado_en TEXT   NOT NULL          -- cuándo se guardó local
);
```

Con esto la lectura es trivial: `SELECT * FROM paquetes WHERE lugar_id = ?`,
haces `JSON.parse(json)` y renderizas. Cuando quieras informes o filtros por
entidad (p. ej. «todas las especies de todos mis lugares descargados»), puedes
normalizar después copiando los arrays a tablas propias; el JSON anidado sigue
siendo la fuente de verdad local.

---

## 3. Flujo de descarga + actualizaciones (la caché por `revision`)

```ts
import * as FileSystem from "expo-file-system";
// DB local: expo-sqlite (o tu wrapper favorito).

async function tienePaquete(lugarId: string) {
  // SELECT version, revision FROM paquetes WHERE lugar_id = ?
}

async function descargarPaquete(lugarId: string) {
  const respuesta = await fetch(`${API}/api/empresas/${lugarId}/paquete-app`);
  const { datos } = (await respuesta.json()) as { datos: PaqueteV5 };
  // INSERT OR REPLACE INTO paquetes (lugar_id, version, revision, json, descargado_en)
  //   VALUES (?, datos.version, datos.revision, JSON.stringify(datos), now);
  return datos;
}

async function sincronizarLugar(lugarId: string): Promise<"nuevo" | "actualizado" | "al-dia"> {
  const local = await tienePaquete(lugarId);

  // 1) Detección ligera de actualización: /api/empresas/:id da el detalle
  //    con `revision`? → mejor: llama a una mini-consulta de revision.
  // Para el MVP basta descargar el paquete cuando no hay local:
  if (!local) return (await descargarPaquete(lugarId), "nuevo");

  // 2) Para detectar updates SIN descargar todo, usa un endpoint ligero
  //    (ver nota abajo "¿Cómo saber si hay actualización sin bajar todo?").
  //    Si la revisión remota > local.revision → descargar y avisar:
  //    -> "Hay una actualización de <nombre del lugar> ⬇️"
  return "al-dia";
}
```

**Detección de actualización sin descargar el paquete completo.** Ya
implementado: `GET /api/empresas/:id` devuelve `detalle.revisionLugar` (la
fecha del último cambio: perfil, especies, relatos o afiches). La app compara
esa revisión contra `local.revision` y, si difieren, muestra **"Hay una
actualización"**; solo entonces ejecuta `descargarPaquete`. Si el celular está
sin red, se usa el paquete local tal cual (offline-first) y se marca la
actualización pendiente para cuando haya conexión.

---

## 4. Imágenes: cero trabajo extra en la app

Las imágenes viajan **ya optimizadas dentro del JSON** (data URI). La app no
debe descargarlas aparte ni redimensionarlas:

```tsx
<Image
  source={{ uri: especie.imagen.datos }}
  style={{ width: "100%", aspectRatio: especie.imagen.ancho / especie.imagen.alto }}
/>
```

- Usar `ancho`/`alto` evita saltos de layout al pasar de pantalla a pantalla.
- En afiches el backend ya conserva más resolución (1080px) para que el texto
  siga legible offline.
- Si quieres espejo en disco (archivos sueltos), extrae `imagen.datos` con
  `FileSystem.writeAsStringAsync` en `documentDirectory/lugares/<id>/`, pero en
  el MVP **no es necesario**: SQLite + data URIs funciona perfecto.

---

## 5. Rendimiento (para que la app sea liviana)

| Evitar                                        | Hacer                                             |
| --------------------------------------------- | ------------------------------------------------- |
| Descargar el paquete en cada apertura         | Descargar solo si no hay local o si `revision` cambió |
| Bajar varias veces el mismo lugar             | `UNIQUE(lugar_id)` en SQLite + guardar `revision` |
| Mostrar imágenes originales por URL sin red   | Usar siempre `imagen.datos` (incrustada)          |
| Mantener paquetes viejos de lugares borrados  | Borrar la fila al desinstalar/eliminar la descarga |
| Bloquear la UI mientras descarga              | Descarga en segundo plano con indicador; usa el local de inmediato |
| Traer todo el paquete solo para ver si cambió | Endpoint ligero de detalle para comparar `revision` |

Tamaño esperado: un lugar con ~10 imágenes ronda **300 KB – 1,5 MB**
(depende de los afiches), un orden de magnitud menor que los originales.

---

## 6. Checklist de integración

- [ ] `GET {API}/api/empresas/:id/paquete-app` devuelve `datos` con `version`, `revision`, `empresa`, `especies`, `relatos`, `afiches`.
- [ ] Primera visita sin red y sin paquete local → mensaje claro «Descárgalo con conexión para llevarlo contigo».
- [ ] Con red: botón **Descargar** guarda en SQLite (INSERT OR REPLACE).
- [ ] Sin red con paquete local: lee de SQLite, funciona completo (imágenes incluidas).
- [ ] Con red y `revision` remota mayor → aviso **"Hay una actualización"** + re-descarga.
- [ ] Las vistas de especies/relatos/afiches usan `imagen.datos` y la razón `ancho/alto`.

---

## 7. Notas de producción

- **`EXPO_PUBLIC_API_URL`**: en producción define esta variable (`src/constantes/ambiente.ts`
  la usa si existe; en desarrollo se auto-detecta la IP del PC). Nunca pongas
  secretos en la app: todo lo sensible vive en el backend.
- **Caché persistente del backend**: el paquete generado se archiva en
  Supabase Storage (bucket `trekko-paquetes`) con clave
  `{lugar-id}-v5-{revision}.json`. Así, en hosting serverless (Vercel) un
  request frío no vuelve a optimizar 30–40 imágenes: busca en Storage primero
  y solo regenera si la `revision` cambió.
- **APK**: `npx eas build --platform android --profile preview` genera un APK
  instalable para compartir con el equipo sin pasar por las tiendas.