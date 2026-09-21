-- 004_crear_afiches.sql
-- Tabla de afiches informativos: reglas, seguridad y especies protegidas.
-- Cada afiche pertenece al usuario de Supabase Auth dueño del lugar (empresa_id).

create table if not exists public.afiches (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references auth.users(id) on delete cascade,
  titulo text not null,
  descripcion text,
  imagen_url text not null,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);

create index if not exists idx_afiches_empresa_id on public.afiches (empresa_id);

alter table public.afiches enable row level security;

-- El dueño (usuario autenticado) puede leer y modificar sus propios afiches.
drop policy if exists "afiches_acceso_dueño" on public.afiches;
create policy "afiches_acceso_dueño" on public.afiches
  for all
  using (auth.uid() = empresa_id)
  with check (auth.uid() = empresa_id);

-- Lectura pública de afiches (página pública del lugar y paquete descargable).
drop policy if exists "afiches_lectura_publica" on public.afiches;
create policy "afiches_lectura_publica" on public.afiches
  for select
  using (true);