-- ============================================================
-- MIGRACION 034: Codigo FLUGZZINDIE (trial 1 mes Agente Pro)
-- ============================================================

-- 1) Relajar el CHECK del code (antes solo FLUGZZ01..11)
alter table valid_promo_codes drop constraint if exists valid_promo_codes_code_check;
alter table valid_promo_codes add constraint valid_promo_codes_code_check
  check (code ~ '^FLUGZZ[A-Z0-9]+$');

-- 2) Columna plan_id (null = cualquier plan; codigos viejos no se ven afectados)
alter table valid_promo_codes add column if not exists plan_id text;

-- 3) Insertar el codigo: 100 usos, 1 vez por empresa, solo plan agente_pro
insert into valid_promo_codes (code, campaign, max_uses, notes, plan_id)
values (
  'FLUGZZINDIE',
  'agente_pro_launch',
  100,
  'Mes gratis (30 dias) del plan Agente Pro',
  'agente_pro'
)
on conflict (code) do nothing;

-- 4) check_promo_code: devolver plan_id (solo lectura, sin consumir)
create or replace function check_promo_code(p_code text) returns jsonb
language plpgsql security definer
as $$
declare
  v record;
  v_already integer;
begin
  select * into v from valid_promo_codes where code = upper(p_code);
  if not found then
    return jsonb_build_object('ok', false, 'error', 'Codigo no encontrado.');
  end if;
  if v.expires_at is not null and v.expires_at < now() then
    return jsonb_build_object('ok', false, 'error', 'Este codigo ha expirado.');
  end if;
  if v.current_uses >= v.max_uses then
    return jsonb_build_object('ok', false, 'error', 'Este codigo agoto sus usos disponibles.');
  end if;

  select count(*) into v_already from promo_code_redemptions
    where code = upper(p_code) and company_id is not null;

  return jsonb_build_object(
    'ok', true,
    'current_uses', v.current_uses,
    'max_uses', v.max_uses,
    'campaign', v.campaign,
    'expires_at', v.expires_at,
    'plan_id', v.plan_id
  );
end;
$$;

grant execute on function check_promo_code(text) to service_role;

-- 5) redeem_promo_code: validar que el plan coincida (solo estado agente_pro)
create or replace function redeem_promo_code(
  p_code text,
  p_company uuid,
  p_user uuid,
  p_plan text
) returns jsonb
language plpgsql security definer
as $$
declare
  v_valid record;
  v_already record;
  v_expires_at timestamptz;
begin
  v_expires_at := (now() + interval '30 days')::timestamptz;

  select * into v_valid from valid_promo_codes where code = upper(p_code) for update;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'Codigo invalido.');
  end if;
  if v_valid.expires_at is not null and v_valid.expires_at < now() then
    return jsonb_build_object('ok', false, 'error', 'Este codigo ha expirado.');
  end if;
  if v_valid.current_uses >= v_valid.max_uses then
    return jsonb_build_object('ok', false, 'error', 'Este codigo agoto sus usos disponibles.');
  end if;

  -- Vinculo del codigo al plan (FLUGZZINDIE => agente_pro)
  if v_valid.plan_id is not null and lower(coalesce(p_plan, '')) <> lower(v_valid.plan_id) then
    return jsonb_build_object(
      'ok', false,
      'error', 'Este codigo solo aplica al plan ' || v_valid.plan_id || '.',
      'planId', v_valid.plan_id
    );
  end if;

  select * into v_already from promo_code_redemptions
    where code = upper(p_code) and company_id = p_company;
  if found then
    return jsonb_build_object('ok', true, 'already', true, 'expires_at', v_expires_at);
  end if;

  insert into promo_code_redemptions (code, company_id, redeemed_by, plan_id)
    values (upper(p_code), p_company, p_user, p_plan);
  update valid_promo_codes set current_uses = current_uses + 1 where code = upper(p_code);

  return jsonb_build_object('ok', true, 'expires_at', v_expires_at);
end;
$$;

grant execute on function redeem_promo_code(text, uuid, uuid, text) to service_role;