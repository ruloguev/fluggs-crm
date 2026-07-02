-- Columna para identificar al super admin global de la plataforma
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_super_admin BOOLEAN NOT NULL DEFAULT FALSE;

-- Nadie más puede leer esto por RLS
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'profiles' AND policyname = 'Solo super admin puede leer is_super_admin'
  ) THEN
    CREATE POLICY "Solo super admin puede leer is_super_admin"
      ON profiles FOR SELECT
      USING (auth.uid() = id OR is_super_admin = true);
  END IF;
END $$;
