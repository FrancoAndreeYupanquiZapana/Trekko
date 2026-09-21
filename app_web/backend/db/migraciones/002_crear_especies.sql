-- 002_crear_especies.sql
-- Tabla de especies (flora y fauna) de cada lugar turístico.
-- Una especie pertenece al usuario de Supabase Auth dueño del lugar (empresa_id).

create table if not exists public.especies (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references auth.users(id) on delete cascade,
  nombre_comun text not null,
  nombre_cientifico text,
  familia text,
  tipo text not null default 'FLORA' check (tipo in ('FLORA', 'FAUNA')),
  descripcion text,
  estado_conservacion text,
  imagen_url text,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);

create index if not exists idx_especies_empresa_id on public.especies (empresa_id);

alter table public.especies enable row level security;

-- El dueño (usuario autenticado) puede leer y modificar sus propias especies.
drop policy if exists "especies_acceso_dueño" on public.especies;
create policy "especies_acceso_dueño" on public.especies
  for all
  using (auth.uid() = empresa_id)
  with check (auth.uid() = empresa_id);

-- Lectura pública de especies (página pública del lugar y catálogo).
drop policy if exists "especies_lectura_publica" on public.especies;
create policy "especies_lectura_publica" on public.especies
  for select
  using (true);

-------------------------------------------------------------------------------
-- Bucket público "imagenes" para las fotos (especies, portadas, etc.).
-- Se crea aquí con el rol admin porque la API no siempre puede crear buckets
-- (RLS sobre storage.buckets puede bloquearlo en algunos proyectos).
-------------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('imagenes', 'imagenes', true, 5242880, null)
on conflict (id) do update set public = true;

-- Lectura pública de las imágenes (se descargan sin autenticación).
drop policy if exists "lectura_publica_imagenes" on storage.objects;
create policy "lectura_publica_imagenes" on storage.objects
  for select
  using (bucket_id = 'imagenes');

-- Escritura de imágenes (usada por el backend con service_role y por el portal).
drop policy if exists "escritura_imagenes" on storage.objects;
create policy "escritura_imagenes" on storage.objects
  for insert
  to anon, authenticated
  with check (bucket_id = 'imagenes');