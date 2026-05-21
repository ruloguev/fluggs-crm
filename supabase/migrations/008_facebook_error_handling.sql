-- Tabla para registrar leads de Facebook que fallaron al procesarse
-- Permite retry manual y debugging

CREATE TABLE IF NOT EXISTS facebook_leads_failed (
  id                  uuid        PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id          uuid        NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  facebook_lead_id    text        NOT NULL,
  page_id             text,
  form_id             text,
  error_message       text        NOT NULL,
  error_details       jsonb       DEFAULT '{}'::jsonb,
  raw_payload         jsonb       NOT NULL DEFAULT '{}'::jsonb,
  retry_count         integer     DEFAULT 0,
  last_retry_at       timestamptz,
  is_resolved         boolean     DEFAULT false,
  resolved_by         uuid        REFERENCES profiles(id) ON DELETE SET NULL,
  resolved_at         timestamptz,
  created_at          timestamptz DEFAULT now()
);

-- Index para busqueda rapida
CREATE INDEX IF NOT EXISTS idx_fb_failed_company ON facebook_leads_failed(company_id);
CREATE INDEX IF NOT EXISTS idx_fb_failed_resolved ON facebook_leads_failed(is_resolved);
CREATE INDEX IF NOT EXISTS idx_fb_failed_lead_id ON facebook_leads_failed(facebook_lead_id);

-- RLS
ALTER TABLE facebook_leads_failed ENABLE ROW LEVEL SECURITY;

CREATE POLICY "fb_failed: company members can read" ON facebook_leads_failed
  FOR SELECT USING (company_id = my_company_id());

CREATE POLICY "fb_failed: manage if permission" ON facebook_leads_failed
  FOR ALL USING (
    company_id = my_company_id()
    AND has_permission('can_manage_users')
  );
