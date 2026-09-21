-- =====================================================================
-- Trekko · Migración 001 · Tabla `empresas`
-- ---------------------------------------------------------------------
-- Perfil público de las agencias y lugares turísticos.
-- Cada fila pertenece a un usuario de Supabase Auth (auth.users).
-- La API (service_role) lee/escribe esta tabla sin pasar por RLS;
-- las políticas protegen accesos directos futuros de los propios
-- usuarios (cada empresa solo ve/edita su propio perfil).
--
-- CÓMO EJECUTAR: Supabase Dashboard -> SQL Editor -> pegar -> Run.
-- =====================================================================

create table if not exists public.empresas (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null unique references auth.users(id) on delete cascade,
  nombre text not null,
  descripcion text,
  telefono text,
  logo_url text,
  web text,
  redes_sociales text,
  ubicacion text,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);

comment on table public.empresas is
  'Perfil de agencias y lugares turísticos publicado en el portal web.';

-- Row Level Security: cada empresa solo accede a su propio perfil.
alter table public.empresas enable row level security;

create policy "empresas_select_propias" on public.empresas
  for select using (auth.uid() = usuario_id);

create policy "empresas_insert_propias" on public.empresas
  for insert with check (auth.uid() = usuario_id);

create policy "empresas_update_propias" on public.empresas
  for update using (auth.uid() = usuario_id) with check (auth.uid() = usuario_id);

create policy "empresas_delete_propias" on public.empresas
  for delete using (auth.uid() = usuario_id);