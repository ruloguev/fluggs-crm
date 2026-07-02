-- Columna para identificar al super admin global de la plataforma
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_super_admin BOOLEAN NOT NULL DEFAULT FALSE;

-- Nadie más puede leer esto por RLS
CREATE POLICY IF NOT EXISTS "Solo super admin puede leer is_super_admin"
  ON profiles FOR SELECT
  USING (auth.uid() = id OR is_super_admin = true);
