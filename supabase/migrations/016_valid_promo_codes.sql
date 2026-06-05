-- ============================================================
-- MIGRACION 016: Codigos promo validos (auditable)
-- ============================================================

create table if not exists valid_promo_codes (
  code              text primary key check (code ~ '^FLUGZZ(0[1-9]|1[01])$'),
  campaign          text,
  max_uses          int not null default 1 check (max_uses > 0),
  current_uses      int not null default 0 check (current_uses >= 0),
  expires_at        timestamptz,
  notes             text,
  created_at        timestamptz not null default now()
);

insert into valid_promo_codes (code, campaign) values
  ('FLUGZZ01','lanzamiento'),
  ('FLUGZZ02','lanzamiento'),
  ('FLUGZZ03','lanzamiento'),
  ('FLUGZZ04','lanzamiento'),
  ('FLUGZZ05','lanzamiento'),
  ('FLUGZZ06','lanzamiento'),
  ('FLUGZZ07','lanzamiento'),
  ('FLUGZZ08','lanzamiento'),
  ('FLUGZZ09','lanzamiento'),
  ('FLUGZZ10','lanzamiento'),
  ('FLUGZZ11','lanzamiento')
on conflict (code) do nothing;

alter table valid_promo_codes enable row level security;
drop policy if exists "valid_promo_codes: no public read" on valid_promo_codes;
create policy "valid_promo_codes: no public read"
  on valid_promo_codes for select
  using (false);

-- Funcion atomica de redencion (transaccional, anti race-condition)
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

  -- Lock al row del codigo
  select * into v_valid from valid_promo_codes where code = p_code for update;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'Codigo invalido.');
  end if;
  if v_valid.expires_at is not null and v_valid.expires_at < now() then
    return jsonb_build_object('ok', false, 'error', 'Este codigo ha expirado.');
  end if;
  if v_valid.current_uses >= v_valid.max_uses then
    return jsonb_build_object('ok', false, 'error', 'Este codigo agoto sus usos disponibles.');
  end if;

  -- Verificar que la empresa no lo haya usado antes
  select * into v_already from promo_code_redemptions
    where code = p_code and company_id = p_company;
  if found then
    return jsonb_build_object('ok', true, 'already', true, 'expires_at', v_expires_at);
  end if;

  -- Redimir: insert + increment atomico
  insert into promo_code_redemptions (code, company_id, redeemed_by, plan_id)
    values (p_code, p_company, p_user, p_plan);
  update valid_promo_codes set current_uses = current_uses + 1 where code = p_code;

  return jsonb_build_object('ok', true, 'expires_at', v_expires_at);
end;
$$;

grant execute on function redeem_promo_code(text, uuid, uuid, text) to service_role;
