-- Tabla para almacenar tokens OAuth de Google Calendar por usuario
CREATE TABLE IF NOT EXISTS user_google_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES profiles(id) ON DELETE CASCADE,
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  token_expires_at TIMESTAMPTZ NOT NULL,
  google_email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabla para rastrear eventos creados desde leads
CREATE TABLE IF NOT EXISTS lead_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  google_event_id TEXT,
  meet_link TEXT,
  title TEXT NOT NULL,
  description TEXT,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS para user_google_tokens
ALTER TABLE user_google_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuarios pueden ver sus propios tokens"
  ON user_google_tokens FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Servicio puede insertar tokens"
  ON user_google_tokens FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Usuarios pueden actualizar sus propios tokens"
  ON user_google_tokens FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Usuarios pueden eliminar sus propios tokens"
  ON user_google_tokens FOR DELETE
  USING (auth.uid() = user_id);

-- RLS para lead_events
ALTER TABLE lead_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuarios ven eventos de su compañía"
  ON lead_events FOR SELECT
  USING (
    company_id IN (
      SELECT company_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Servicio puede insertar eventos"
  ON lead_events FOR INSERT
  WITH CHECK (true);

-- Index para consultas rápidas
CREATE INDEX IF NOT EXISTS idx_lead_events_lead ON lead_events(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_events_user ON lead_events(user_id);
CREATE INDEX IF NOT EXISTS idx_lead_events_company ON lead_events(company_id);
