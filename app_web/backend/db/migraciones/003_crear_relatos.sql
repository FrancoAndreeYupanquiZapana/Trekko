-- 003_crear_relatos.sql
-- Tabla de relatos locales: mitos, leyendas, datos curiosos y simbiosis.
-- Cada relato pertenece al usuario de Supabase Auth dueño del lugar (empresa_id)
-- y puede estar vinculado a una especie del mismo lugar (especie_id).

create table if not exists public.relatos (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references auth.users(id) on delete cascade,
  titulo text not null,
  tipo text not null check (tipo in ('MITO', 'LEYENDA', 'DATO_CURIOSO', 'SIMBIOSIS')),
  contenido text not null,
  especie_id uuid references public.especies(id) on delete set null,
  imagen_url text,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);

create index if not exists idx_relatos_empresa_id on public.relatos (empresa_id);
create index if not exists idx_relatos_especie_id on public.relatos (especie_id);

alter table public.relatos enable row level security;

-- El dueño (usuario autenticado) puede leer y modificar sus propios relatos.
drop policy if exists "relatos_acceso_dueño" on public.relatos;
create policy "relatos_acceso_dueño" on public.relatos
  for all
  using (auth.uid() = empresa_id)
  with check (auth.uid() = empresa_id);

-- Lectura pública de relatos (página pública del lugar y paquete descargable).
drop policy if exists "relatos_lectura_publica" on public.relatos;
create policy "relatos_lectura_publica" on public.relatos
  for select
  using (true);