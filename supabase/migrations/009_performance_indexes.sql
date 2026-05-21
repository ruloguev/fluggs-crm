-- ── Índices de performance para queries frecuentes ──
-- Basados en los patrones de query del código actual

-- ════════════════════════════════════════════════════
-- LEADS (tabla más consultada)
-- ════════════════════════════════════════════════════

-- Pipeline: filtra por company_id + owner_id (scope del usuario)
CREATE INDEX IF NOT EXISTS idx_leads_company_owner
  ON leads(company_id, owner_id);

-- Pipeline: filtra por company_id + stage_id (para agrupar por etapa)
CREATE INDEX IF NOT EXISTS idx_leads_company_stage
  ON leads(company_id, stage_id);

-- Dashboard: filtra por company_id + last_activity_at (leads recientes)
CREATE INDEX IF NOT EXISTS idx_leads_company_activity
  ON leads(company_id, last_activity_at DESC);

-- Dashboard: filtra por company_id + source_id (filtrar por fuente)
CREATE INDEX IF NOT EXISTS idx_leads_company_source
  ON leads(company_id, source_id);

-- Dashboard: filtra por company_id + priority (filtrar por prioridad)
CREATE INDEX IF NOT EXISTS idx_leads_company_priority
  ON leads(company_id, priority);

-- Métricas: leads cerrados (won stages)
CREATE INDEX IF NOT EXISTS idx_leads_company_created
  ON leads(company_id, created_at DESC);

-- Búsqueda: leads por título (para búsqueda global)
CREATE INDEX IF NOT EXISTS idx_leads_title_search
  ON leads USING gin(to_tsvector('simple', coalesce(title, '')));

-- ════════════════════════════════════════════════════
-- ACTIVITIES (segunda tabla más consultada)
-- ════════════════════════════════════════════════════

-- Lead detail: filtra por lead_id + created_at (timeline del lead)
CREATE INDEX IF NOT EXISTS idx_activities_lead_created
  ON activities(lead_id, created_at DESC);

-- Dashboard: filtra por company_id + user_id (actividad por agente)
CREATE INDEX IF NOT EXISTS idx_activities_company_user
  ON activities(company_id, user_id);

-- Dashboard: filtra por company_id + created_at (actividad reciente)
CREATE INDEX IF NOT EXISTS idx_activities_company_created
  ON activities(company_id, created_at DESC);

-- Dashboard: filtra por user_id + created_at (actividad de un agente)
CREATE INDEX IF NOT EXISTS idx_activities_user_created
  ON activities(user_id, created_at DESC);

-- Stage changes: filtra por lead_id + type (historial de etapas)
CREATE INDEX IF NOT EXISTS idx_activities_lead_type
  ON activities(lead_id, type);

-- ════════════════════════════════════════════════════
-- CONTACTS
-- ════════════════════════════════════════════════════

-- Contactos: filtra por company_id + owner_id (scope)
CREATE INDEX IF NOT EXISTS idx_contacts_company_owner
  ON contacts(company_id, owner_id);

-- Contactos: filtra por company_id + is_active (lista de contactos)
CREATE INDEX IF NOT EXISTS idx_contacts_company_active
  ON contacts(company_id, is_active);

-- Búsqueda: contactos por nombre (para búsqueda global)
CREATE INDEX IF NOT EXISTS idx_contacts_name_search
  ON contacts USING gin(to_tsvector('simple', coalesce(full_name, '')));

-- ════════════════════════════════════════════════════
-- NOTIFICATIONS
-- ════════════════════════════════════════════════════

-- Layout: filtra por user_id + is_read (notificaciones no leídas)
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread
  ON notifications(user_id, is_read, created_at DESC);

-- ════════════════════════════════════════════════════
-- PROFILES
-- ════════════════════════════════════════════════════

-- Team: filtra por company_id + is_active (lista de miembros)
CREATE INDEX IF NOT EXISTS idx_profiles_company_active
  ON profiles(company_id, is_active);

-- Team: filtra por company_id + role_id (por rol)
CREATE INDEX IF NOT EXISTS idx_profiles_company_role
  ON profiles(company_id, role_id);

-- ════════════════════════════════════════════════════
-- PIPELINE STAGES
-- ════════════════════════════════════════════════════

-- Pipeline: filtra por company_id + position (orden de etapas)
CREATE INDEX IF NOT EXISTS idx_stages_company_position
  ON pipeline_stages(company_id, position);

-- ════════════════════════════════════════════════════
-- LEAD DOCUMENTS
-- ════════════════════════════════════════════════════

-- Expediente: filtra por lead_id (documentos de un lead)
CREATE INDEX IF NOT EXISTS idx_lead_documents_lead
  ON lead_documents(lead_id);

-- ════════════════════════════════════════════════════
-- KNOWLEDGE CHUNKS (para búsqueda del asistente IA)
-- ════════════════════════════════════════════════════

-- Chat: filtra por company_id + document_id (chunks de una empresa)
CREATE INDEX IF NOT EXISTS idx_chunks_company_doc
  ON knowledge_chunks(company_id, document_id);

-- Búsqueda full-text en contenido
CREATE INDEX IF NOT EXISTS idx_chunks_content_search
  ON knowledge_chunks USING gin(to_tsvector('simple', coalesce(content, '')));

-- ════════════════════════════════════════════════════
-- ROUND ROBIN
-- ════════════════════════════════════════════════════

-- Log: filtra por queue_id + facebook_lead_id (duplicados)
CREATE INDEX IF NOT EXISTS idx_rr_log_queue_fb
  ON round_robin_log(queue_id, facebook_lead_id);

-- Log: filtra por company_id + assigned_at (historial)
CREATE INDEX IF NOT EXISTS idx_rr_log_company_assigned
  ON round_robin_log(company_id, assigned_at DESC);

-- Members: filtra por queue_id + is_active + position (rotación)
CREATE INDEX IF NOT EXISTS idx_rr_members_queue_active
  ON round_robin_members(queue_id, is_active, position);

-- ════════════════════════════════════════════════════
-- FACEBOOK LEADS FAILED (nueva tabla)
-- ════════════════════════════════════════════════════

CREATE INDEX IF NOT EXISTS idx_fb_failed_company
  ON facebook_leads_failed(company_id);

CREATE INDEX IF NOT EXISTS idx_fb_failed_resolved
  ON facebook_leads_failed(is_resolved);

CREATE INDEX IF NOT EXISTS idx_fb_failed_lead_id
  ON facebook_leads_failed(facebook_lead_id);
