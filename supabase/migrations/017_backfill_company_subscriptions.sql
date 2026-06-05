-- ============================================================
-- MIGRACION 017: Backfill de demos a company_subscriptions
-- ============================================================
-- Para empresas con plan activo guardado en companies.settings
-- (sin fila en company_subscriptions), crear fila de "active"
-- con setup_fee_paid=true. Asi no quedan atrapadas en el bloqueo
-- duro del layout.

insert into company_subscriptions (
  company_id, plan_id, seats, status, setup_fee_paid, cancel_at_period_end
)
select
  c.id,
  coalesce(c.settings->'subscription'->>'plan_id', 'fundacion'),
  1,
  case
    when c.settings->'subscription'->>'status' in ('active','trial','past_due')
      then c.settings->'subscription'->>'status'
    else 'active'
  end,
  true,
  false
from companies c
where c.settings->'subscription'->>'plan_id' is not null
on conflict (company_id) do nothing;

-- Asegurar current_period_end + current_period_start para que
-- el layout no las marque como expiradas
update company_subscriptions cs
set current_period_end = (now() + interval '1 year')::timestamptz,
    current_period_start = now(),
    updated_at = now()
where cs.current_period_end is null
  and cs.status in ('active','trial','past_due');
