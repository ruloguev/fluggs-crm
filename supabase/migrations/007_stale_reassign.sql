-- ── Reasignación cronometrada de leads estancados ──
-- Solo aplica a leads en la PRIMERA etapa sin actividad
-- Después del primer movimiento, el lead ya no se reasigna automáticamente

-- 1. Agregar columna reassign_after_hours a round_robin_queues
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'round_robin_queues' AND column_name = 'reassign_after_hours'
  ) THEN
    ALTER TABLE round_robin_queues ADD COLUMN reassign_after_hours integer DEFAULT 6;
  END IF;
END $$;

-- 2. Función principal: reasignar leads estancados en primera etapa
CREATE OR REPLACE FUNCTION reassign_stale_leads()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_queue RECORD;
  v_stale_lead RECORD;
  v_first_stage_id uuid;
  v_next_agent uuid;
  v_hours integer;
BEGIN
  -- Iterar por cada cola activa con reassign_after_hours configurado
  FOR v_queue IN
    SELECT * FROM round_robin_queues
    WHERE is_active = true
      AND reassign_after_hours IS NOT NULL
      AND reassign_after_hours > 0
  LOOP
    v_hours := v_queue.reassign_after_hours;

    -- Obtener la primera etapa del pipeline de esta empresa
    SELECT id INTO v_first_stage_id
    FROM pipeline_stages
    WHERE company_id = v_queue.company_id
      AND is_closed = false
    ORDER BY position
    LIMIT 1;

    -- Si no hay primera etapa, saltar
    CONTINUE WHEN v_first_stage_id IS NULL;

    -- Buscar leads estancados en primera etapa asignados por esta cola
    FOR v_stale_lead IN
      SELECT l.id AS lead_id, l.owner_id, l.company_id, l.contact_id
      FROM leads l
      INNER JOIN round_robin_log rrl ON rrl.lead_id = l.id AND rrl.queue_id = v_queue.id
      WHERE l.company_id = v_queue.company_id
        AND l.stage_id = v_first_stage_id
        AND l.owner_id IS NOT NULL
        AND (
          l.last_activity_at IS NULL
          OR l.last_activity_at < NOW() - (v_hours || ' hours')::interval
        )
        -- Solo si no se ha reasignado ya en las últimas X horas (evitar loop)
        AND NOT EXISTS (
          SELECT 1 FROM round_robin_log rrl2
          WHERE rrl2.lead_id = l.id
            AND rrl2.queue_id = v_queue.id
            AND rrl2.assigned_at > NOW() - (v_hours || ' hours')::interval
        )
    LOOP
      -- Obtener siguiente agente de la cola
      SELECT assign_next_agent(v_queue.id) INTO v_next_agent;

      -- Si hay agente disponible, reasignar
      IF v_next_agent IS NOT NULL THEN
        -- Actualizar owner del lead
        UPDATE leads
        SET owner_id = v_next_agent,
            last_activity_at = NOW()
        WHERE id = v_stale_lead.lead_id;

        -- Registrar actividad de reasignación
        INSERT INTO activities (
          company_id, lead_id, contact_id, user_id,
          type, title, body
        ) VALUES (
          v_stale_lead.company_id,
          v_stale_lead.lead_id,
          v_stale_lead.contact_id,
          v_next_agent,
          'system',
          'Lead reasignado automáticamente',
          'Reasignado por inactividad de ' || v_hours || ' horas en primera etapa'
        );

        -- Registrar en log de Round Robin
        INSERT INTO round_robin_log (
          queue_id, company_id, lead_id, assigned_to, source
        ) VALUES (
          v_queue.id,
          v_stale_lead.company_id,
          v_stale_lead.lead_id,
          v_next_agent,
          'stale_reassign'
        );

        -- Notificación al nuevo agente
        INSERT INTO notifications (
          company_id, user_id, lead_id, type, title, body
        ) VALUES (
          v_stale_lead.company_id,
          v_next_agent,
          v_stale_lead.lead_id,
          'lead_assigned',
          '🔄 Lead reasignado por inactividad',
          'Un lead de primera etapa fue reasignado a ti por falta de actividad'
        );
      END IF;
    END LOOP;
  END LOOP;
END;
$$;

-- 3. Configurar pg_cron para ejecutar cada hora
-- Primero verificar que la extensión existe
DO $$
BEGIN
  -- Cancelar job existente si ya fue creado
  PERFORM cron.unschedule('reassign-stale-leads');
  
  -- Crear el job programado (cada hora en minuto 0)
  PERFORM cron.schedule(
    'reassign-stale-leads',
    '0 * * * *',
    'SELECT reassign_stale_leads()'
  );
EXCEPTION WHEN OTHERS THEN
  -- Si pg_cron no está disponible, solo loguear
  RAISE NOTICE 'pg_cron no está disponible. Ejecutar manualmente: SELECT reassign_stale_leads();';
END $$;
