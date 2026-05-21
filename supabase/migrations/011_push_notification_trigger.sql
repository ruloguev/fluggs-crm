-- Trigger para enviar push notifications cuando se crea una notificación
-- Requiere: pg_net extension y app.settings configurados

-- 1. Habilitar pg_net (necesario para hacer HTTP requests desde SQL)
CREATE EXTENSION IF NOT EXISTS pg_net;

-- 2. Configurar app.settings (REEMPLAZA con tu service_role_key real)
-- ALTER DATABASE postgres SET "app.settings.supabase_url" TO 'https://wqxcolqvmecisyqloqts.supabase.co';
-- ALTER DATABASE postgres SET "app.settings.service_role_key" TO 'TU_SERVICE_ROLE_KEY_AQUI';

-- 3. Función que llama a la Edge Function
CREATE OR REPLACE FUNCTION send_push_on_notification()
RETURNS TRIGGER AS $$
DECLARE
  response record;
  base_url text;
  service_key text;
BEGIN
  -- Leer settings de la base de datos
  base_url := current_setting('app.settings.supabase_url', true);
  service_key := current_setting('app.settings.service_role_key', true);
  
  -- Si no hay settings configurados, no hacer nada
  IF base_url IS NULL OR service_key IS NULL THEN
    RAISE NOTICE 'Push notification skipped: app.settings not configured';
    RETURN NEW;
  END IF;

  -- Solo enviar push si la notificación es nueva (no leída)
  IF NEW.is_read = false THEN
    SELECT * FROM net.http_post(
      url := base_url || '/functions/v1/send-push',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'apikey', service_key
      )::text,
      body := jsonb_build_object(
        'notification_id', NEW.id,
        'user_id', NEW.user_id
      )::text
    ) INTO response;
    
    RAISE NOTICE 'Push notification triggered for user %', NEW.user_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. Crear trigger en la tabla notifications
DROP TRIGGER IF EXISTS on_notification_created ON notifications;
CREATE TRIGGER on_notification_created
  AFTER INSERT ON notifications
  FOR EACH ROW
  EXECUTE FUNCTION send_push_on_notification();
