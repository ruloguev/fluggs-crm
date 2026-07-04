-- 030_event_reminders_and_types.sql
-- Agrega tipo de reunion, ubicacion y recordatorios a lead_events
-- + cron para notificaciones 1h antes

ALTER TABLE lead_events ADD COLUMN IF NOT EXISTS meeting_type TEXT NOT NULL DEFAULT 'meet'
  CHECK (meeting_type IN ('call', 'meet', 'in_person'));

ALTER TABLE lead_events ADD COLUMN IF NOT EXISTS location TEXT;

ALTER TABLE lead_events ADD COLUMN IF NOT EXISTS reminder_sent BOOLEAN NOT NULL DEFAULT FALSE;

-- Funcion que envia notificaciones para eventos que empiezan en ~1 hora
CREATE OR REPLACE FUNCTION send_event_reminders()
RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_event RECORD;
  v_count integer := 0;
BEGIN
  FOR v_event IN
    SELECT le.id, le.lead_id, le.user_id, le.company_id,
           le.title, le.start_time, le.meeting_type, le.meet_link,
           c.full_name AS contact_name
    FROM lead_events le
    LEFT JOIN leads l ON l.id = le.lead_id
    LEFT JOIN contacts c ON c.id = l.contact_id
    WHERE le.reminder_sent = false
      AND le.start_time BETWEEN NOW() AND NOW() + INTERVAL '1 hour'
  LOOP
    INSERT INTO notifications (company_id, user_id, lead_id, type, title, body)
    VALUES (
      v_event.company_id,
      v_event.user_id,
      v_event.lead_id,
      'event_reminder',
      'Recordatorio: ' || v_event.title,
      CASE v_event.meeting_type
        WHEN 'meet' THEN 'Reunion por Meet en 1 hora' || COALESCE(E'\nEnlace: ' || v_event.meet_link, '')
        WHEN 'call' THEN 'Llamada programada en 1 hora'
        WHEN 'in_person' THEN 'Reunion presencial en 1 hora'
      END
    );

    UPDATE lead_events SET reminder_sent = true WHERE id = v_event.id;
    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$$;

-- Agendar cron cada 5 minutos
SELECT cron.schedule(
  'send-event-reminders',
  '*/5 * * * *',
  $$SELECT send_event_reminders()$$
);
