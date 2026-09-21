-- Trekko · Migración 006 — Evaluación con IA de los paseos
-- ----------------------------------------------------------
-- Añade a public.paseos el registro de evaluación con IA:
--   · evaluacion (jsonb)      → puntajes 0-10 por foto + validación de zona
--   · puntaje_promedio (numeric) → promedio del puntaje IA (0-10)
--
-- Ejecutar a mano en: Supabase Dashboard → SQL Editor.
-- Es idempotente (ADD COLUMN IF NOT EXISTS).

alter table public.paseos add column if not exists evaluacion jsonb;

alter table public.paseos add column if not exists puntaje_promedio numeric(4, 2);

-- Índice para ordenar el muro por mejor puntaje cuando haya muchos paseos.
create index if not exists idx_paseos_puntaje_promedio
  on public.paseos (puntaje_promedio desc nulls last);