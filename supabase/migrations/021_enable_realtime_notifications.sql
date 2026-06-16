-- Habilitar realtime para la tabla notifications
-- Permite que postgres_changes escuche inserts y actualice la UI en vivo

ALTER PUBLICATION supabase_realtime ADD TABLE ONLY notifications;
