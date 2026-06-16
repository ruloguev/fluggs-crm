-- Normaliza columnas faltantes en round_robin_queues (existían solo en la DB, no en migraciones)
-- y cambia la config UI de minutos a horas (1-24)

-- 1. Agregar columnas faltantes
ALTER TABLE round_robin_queues
  ADD COLUMN IF NOT EXISTS auto_reassign_enabled boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS auto_reassign_cron text DEFAULT '*/15 * * * *',
  ADD COLUMN IF NOT EXISTS scheduler_job_name text,
  ADD COLUMN IF NOT EXISTS last_reassignment_run_at timestamptz;

-- 2. RPC: configurar reasignación automática (ahora recibe horas en lugar de minutos)
CREATE OR REPLACE FUNCTION configure_round_robin_reassignment(
  p_queue_id uuid,
  p_enabled boolean,
  p_after_hours integer
)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE round_robin_queues
  SET auto_reassign_enabled = p_enabled,
      reassign_after_hours  = p_after_hours
  WHERE id = p_queue_id;
END $$;

-- 3. RPC: ejecutar reasignación manual para una cola específica
CREATE OR REPLACE FUNCTION reassign_stale_round_robin_leads(p_queue_id uuid)
RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_queue        record;
  v_stale_lead   record;
  v_first_stage_id uuid;
  v_next_agent   uuid;
  v_hours        integer;
  v_reassigned   integer := 0;
BEGIN
  SELECT * INTO v_queue FROM round_robin_queues WHERE id = p_queue_id;
  IF NOT FOUND THEN RETURN 0; END IF;

  v_hours := v_queue.reassign_after_hours;
  IF v_hours IS NULL OR v_hours <= 0 THEN RETURN 0; END IF;

  SELECT id INTO v_first_stage_id
  FROM pipeline_stages
  WHERE company_id = v_queue.company_id AND is_closed = false
  ORDER BY position LIMIT 1;

  IF v_first_stage_id IS NULL THEN RETURN 0; END IF;

  FOR v_stale_lead IN
    SELECT l.id AS lead_id, l.owner_id, l.company_id, l.contact_id
    FROM leads l
    INNER JOIN round_robin_log rrl ON rrl.lead_id = l.id AND rrl.queue_id = v_queue.id
    WHERE l.company_id = v_queue.company_id
      AND l.stage_id = v_first_stage_id
      AND l.owner_id IS NOT NULL
      AND (l.last_activity_at IS NULL OR l.last_activity_at < NOW() - (v_hours || ' hours')::interval)
      AND NOT EXISTS (
        SELECT 1 FROM round_robin_log rrl2
        WHERE rrl2.lead_id = l.id AND rrl2.queue_id = v_queue.id
          AND rrl2.assigned_at > NOW() - (v_hours || ' hours')::interval
      )
  LOOP
    SELECT assign_next_agent(v_queue.id) INTO v_next_agent;
    CONTINUE WHEN v_next_agent IS NULL;

    UPDATE leads SET owner_id = v_next_agent, last_activity_at = NOW()
    WHERE id = v_stale_lead.lead_id;

    INSERT INTO activities (company_id, lead_id, contact_id, user_id, type, title, body)
    VALUES (v_stale_lead.company_id, v_stale_lead.lead_id, v_stale_lead.contact_id,
            v_next_agent, 'system', 'Lead reasignado automáticamente',
            'Reasignado por inactividad de ' || v_hours || ' horas en primera etapa');

    INSERT INTO round_robin_log (queue_id, company_id, lead_id, assigned_to, source)
    VALUES (v_queue.id, v_stale_lead.company_id, v_stale_lead.lead_id, v_next_agent, 'stale_reassign');

    INSERT INTO notifications (company_id, user_id, lead_id, type, title, body)
    VALUES (v_stale_lead.company_id, v_next_agent, v_stale_lead.lead_id, 'lead_assigned',
            'Lead reasignado por inactividad',
            'Un lead de primera etapa fue reasignado a ti por falta de actividad');

    v_reassigned := v_reassigned + 1;
  END LOOP;

  UPDATE round_robin_queues SET last_reassignment_run_at = NOW() WHERE id = p_queue_id;

  RETURN v_reassigned;
END $$;
