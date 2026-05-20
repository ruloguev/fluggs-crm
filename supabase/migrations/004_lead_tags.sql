-- ============================================================
-- MIGRACIÓN 004: Sistema de etiquetas en leads
-- ============================================================

-- 1. Agregar columna de etiquetas a la tabla leads
alter table leads
  add column if not exists lead_tags text[] default '{}';

-- 2. Habilitar RLS si no está habilitado
alter table leads enable row level security;

-- 3. Política existente permite ver leads de la company
-- (ya existe policy "leads: company members can read")
-- La política de edición ya existe, pero，我们可以 agregar una específica para etiquetas si es necesario

-- 4. Índices para rendimiento en búsquedas de etiquetas
create index if not exists idx_leads_company_tags on leads using gin (lead_tags) where lead_tags is not null;

-- ============================================================
-- PARA PROBAR EN SUPABASE SQL EDITOR:
--   select lead_tags from leads limit 10;
--   update leads set lead_tags = array['VIP', 'Referido'] where id = 'uuid-aqui';
-- ============================================================