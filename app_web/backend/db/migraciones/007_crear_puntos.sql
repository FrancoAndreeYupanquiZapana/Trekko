-- =====================================================================
-- Trekko · Migración 007 · Tabla `puntos`
-- ---------------------------------------------------------------------
-- Puntos de interés geolocalizados. La empresa (o concesión / área
-- reservada) marca un lugar sobre el mapa y lo vincula a:
--   · un AFICHE informativo del lugar,
--   · una ESPECIE (con su imagen informativa), o
--   · una NOTA / advertencia con texto e imagen propios.
-- Cuando el turista se acerca al punto, la app le muestra el contenido
-- automáticamente (sin que tenga que buscarlo).
--
-- CÓMO EJECUTAR: Supabase Dashboard -> SQL Editor -> pegar -> Run.
-- =====================================================================

create table if not exists public.puntos (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references auth.users(id) on delete cascade,
  lat double precision not null check (lat between -90 and 90),
  lng double precision not null check (lng between -180 and 180),
  -- Radio (en metros) dentro del cual salta el aviso en el celular.
  radio_m integer not null default 60 check (radio_m between 10 and 2000),
  tipo text not null default 'NOTA' check (tipo in ('AFICHE', 'ESPECIE', 'NOTA')),
  afiche_id uuid references public.afiches(id) on delete cascade,
  especie_id uuid references public.especies(id) on delete cascade,
  titulo text,
  descripcion text,
  imagen_url text,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);

create index if not exists idx_puntos_empresa_id on public.puntos (empresa_id);
create index if not exists idx_puntos_afiche_id on public.puntos (afiche_id);
create index if not exists idx_puntos_especie_id on public.puntos (especie_id);

comment on table public.puntos is
  'Puntos geolocalizados del lugar que muestran un afiche, una especie o una nota al acercarse.';

alter table public.puntos enable row level security;

-- El dueño (usuario autenticado) puede leer y modificar sus propios puntos.
drop policy if exists "puntos_acceso_dueño" on public.puntos;
create policy "puntos_acceso_dueño" on public.puntos
  for all
  using (auth.uid() = empresa_id)
  with check (auth.uid() = empresa_id);

-- Lectura pública de puntos (página pública del lugar y paquete descargable).
drop policy if exists "puntos_lectura_publica" on public.puntos;
create policy "puntos_lectura_publica" on public.puntos
  for select
  using (true);
