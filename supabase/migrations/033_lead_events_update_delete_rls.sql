-- 033_lead_events_update_delete_rls.sql
-- lead_events solo tenia politicas SELECT e INSERT (024).
-- Sin politicas UPDATE/DELETE, el borrado/edicion de eventos fallaba con
-- "row-level security" cuando la peticion corre con el JWT del usuario
-- (por ejemplo si el API usa la anon key): el evento desaparecia de Google
-- Calendar pero la fila seguia en la BD y seguia apareciendo en el front.

CREATE POLICY "Usuarios actualizan eventos de su compañía"
  ON lead_events FOR UPDATE
  USING (
    company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid())
  )
  WITH CHECK (
    company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "Usuarios eliminan eventos de su compañía"
  ON lead_events FOR DELETE
  USING (
    company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid())
  );