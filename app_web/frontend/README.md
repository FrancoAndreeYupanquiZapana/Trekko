# Trekko — Frontend (Portal Web)

Portal web de **Trekko**: Next.js 16 + TypeScript + Tailwind CSS v4.

Cubre las interfaces de **agencias**, **administradores** y **turistas** (web).
El frontend se comunica **solo** con la API del backend; nunca toca Supabase.

## Rutas

| Ruta              | Descripción                          |
| ----------------- | ------------------------------------ |
| `/`               | Home público con catálogo de lugares |
| `/lugar/:id`      | Página pública de un lugar + descarga para la app |
| `/registro`       | Registro de agencia o lugar turístico (solo rol EMPRESA) |
| `/iniciar-sesion` | Inicio de sesión                     |
| `/admin/panel`    | Panel de administración (rol ADMIN)  |
| `/empresa`        | Panel de la agencia (rol EMPRESA)    |
| `/empresa/perfil` | Mi perfil — datos públicos de la agencia (rol EMPRESA) |
| `/empresa/especies` | Flora y fauna — registrar especies con imagen (rol EMPRESA) |
| `/turista`        | Mi Trekko — portal del turista (rol TURISTA) |

## Estructura centralizada

```
src/
├── app/                  # Páginas y layouts (Next.js App Router)
│   ├── (publico)/        # Zona pública (Home, Registro, Iniciar sesión)
│   ├── admin/            # Panel de administración (protegido)
│   ├── empresa/          # Panel de la agencia (protegido)
│   └── turista/          # Mi Trekko (protegido)
├── componentes/
│   ├── ui/               # Primitivas: Boton, CampoEntrada, Alerta, Icono
│   ├── layout/           # BarraNavegacion, EncabezadoPortal
│   ├── autenticacion/    # Formularios de login/registro, BotonCerrarSesion
│   ├── publico/          # BotonDescargarTrekko
│   └── empresa/          # NavegacionEmpresa, FormularioPerfilEmpresa, GestionEspecies
├── servicios/            # Llamadas a la API del backend (auth, empresas, especies)
├── hooks/                # useAutenticacion
├── tipos/                # Tipos compartidos
├── utilidades/           # roles.ts, mapeadores.ts
└── config/               # Variables de entorno centralizadas
```

## Reglas

- Todo en español: carpetas, archivos, funciones y variables.
- Una sola fuente de verdad por concepto (auth, entorno, respuestas de la API).
- Archivos cortos (máx. 700–800 líneas); si algo crece, se extrae.
- Las páginas protegidas se validan en el servidor con `verificarSesion(rol)` en
  `src/servicios/autenticacionServidor.ts`, y cada rol redirige a su portal
  mediante `rutaInicioSegunRol()` en `src/utilidades/roles.ts`.

## Cómo arrancar

Desde la raíz del monorepo (pnpm):

```bash
pnpm install
cp .env.local.example .env.local      # ajusta NEXT_PUBLIC_API_URL si hace falta
pnpm --filter trekko-frontend dev     # http://localhost:3000
```

La URL de la API por defecto es `http://localhost:4000/api`.