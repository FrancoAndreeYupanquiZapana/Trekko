-- =====================================================================
-- Trekko · Migración 005 · Tabla `paseos`
-- ---------------------------------------------------------------------
-- "El viaje de {nombre} en {lugar}": cada envío de la galería móvil
-- (las mejores fotos del día + el track GPS completo de la caminata).
--
-- Se identifica por DNI para que la página pública se REUTILICE: si el
-- turista vuelve a subir fotos de otro lugar, se agregan a la MISMA
-- página sin borrar lo anterior (acumula lugares y fechas).
--
-- CÓMO EJECUTAR: Supabase Dashboard -> SQL Editor -> pegar -> Run.
-- =====================================================================

create table if not exists public.paseos (
  id                uuid primary key default gen_random_uuid(),
  -- Documento del turista: agrupa todos sus viajes en una sola página.
  dni               text not null,
  nombre            text not null,
  -- Lugar visitado (id del paquete/empresa y su nombre legible).
  lugar_id          text,
  lugar_nombre      text,
  -- Fecha de la experiencia (inicio del recorrido).
  fecha_experiencia timestamptz,
  -- Track GPS completo: [{ lat, lng, timestamp }].
  track             jsonb not null default '[]'::jsonb,
  -- Mejores fotos: [{ url, lat, lng, timestamp, descripcion }].
  fotos             jsonb not null default '[]'::jsonb,
  creado_en         timestamptz not null default now()
);

comment on table public.paseos is
  'Envíos de la galería móvil: mejores fotos + track GPS, página pública por DNI.';

create index if not exists idx_paseos_dni on public.paseos (dni);
create index if not exists idx_paseos_creado_en on public.paseos (creado_en desc);

-- Row Level Security: lectura pública total (la página la ve cualquiera).
-- Las inserciones las hace SOLO la API con la clave service_role, que
-- salta RLS; por eso no hay política de insert/update/delete.
alter table public.paseos enable row level security;

drop policy if exists "paseos_lectura_publica" on public.paseos;
create policy "paseos_lectura_publica" on public.paseos
  for select
  using (true);
