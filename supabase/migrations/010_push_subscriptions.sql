-- Tabla para almacenar las subscriptions de push notifications del navegador

CREATE TABLE IF NOT EXISTS push_subscriptions (
  id                  uuid        PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id             uuid        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  company_id          uuid        NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  endpoint            text        NOT NULL,
  subscription        jsonb       NOT NULL,
  created_at          timestamptz DEFAULT now(),
  UNIQUE(user_id, endpoint)
);

-- Index para busqueda rapida por usuario
CREATE INDEX IF NOT EXISTS idx_push_sub_user ON push_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_push_sub_company ON push_subscriptions(company_id);

-- RLS
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Los usuarios pueden ver y gestionar sus propias subscriptions
CREATE POLICY "push_sub: users manage own" ON push_subscriptions
  FOR ALL USING (user_id = auth.uid());
