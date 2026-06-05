-- ============================================================
-- MIGRACION 018: Schema cleanup + promo codes multi-uso
-- ============================================================

-- 1) Cambiar PK de promo_code_redemptions a compuesto (code, company_id)
--    para permitir que un mismo codigo sea redimido hasta N veces
--    por diferentes empresas (donde N = valid_promo_codes.max_uses).
alter table promo_code_redemptions drop constraint if exists promo_code_redemptions_pkey;
alter table promo_code_redemptions add constraint promo_code_redemptions_pkey
  primary key (code, company_id);

-- Quitar UNIQUE(company_id) legacy si existiera (de la migracion 014)
drop index if exists idx_promo_code_redemptions_company;

-- 2) Actualizar max_uses de los 11 codigos FLUGZZ a 2 (segun requerimiento)
update valid_promo_codes
  set max_uses = 2
  where code ~ '^FLUGZZ(0[1-9]|1[01])$';

-- 3) Funcion check_promo_code: valida sin consumir (solo lectura)
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

  -- Contar redenciones de ESTA empresa
  select count(*) into v_already from promo_code_redemptions
    where code = upper(p_code) and company_id is not null;
  -- (el company_id se pasara en otra variante; aqui solo validamos el codigo)

  return jsonb_build_object(
    'ok', true,
    'current_uses', v.current_uses,
    'max_uses', v.max_uses,
    'campaign', v.campaign,
    'expires_at', v.expires_at
  );
end;
$$;

grant execute on function check_promo_code(text) to service_role;

-- 4) FK cleanup: ON DELETE SET NULL en columnas nullable referenciando
--    tablas donde puede haber deletes (no rompes el registro, solo lo desligas)
do $$
begin
  if exists (select 1 from information_schema.table_constraints
             where constraint_name = 'leads_stage_id_fkey'
               and table_name = 'leads') then
    alter table leads drop constraint leads_stage_id_fkey;
  end if;
  alter table leads add constraint leads_stage_id_fkey
    foreign key (stage_id) references pipeline_stages(id) on delete set null;

  if exists (select 1 from information_schema.table_constraints
             where constraint_name = 'leads_owner_id_fkey'
               and table_name = 'leads') then
    alter table leads drop constraint leads_owner_id_fkey;
  end if;
  alter table leads add constraint leads_owner_id_fkey
    foreign key (owner_id) references profiles(id) on delete set null;

  if exists (select 1 from information_schema.table_constraints
             where constraint_name = 'leads_template_id_fkey'
               and table_name = 'leads') then
    alter table leads drop constraint leads_template_id_fkey;
  end if;
  alter table leads add constraint leads_template_id_fkey
    foreign key (template_id) references document_templates(id) on delete set null;

  if exists (select 1 from information_schema.table_constraints
             where constraint_name = 'activities_from_stage_id_fkey'
               and table_name = 'activities') then
    alter table activities drop constraint activities_from_stage_id_fkey;
  end if;
  alter table activities add constraint activities_from_stage_id_fkey
    foreign key (from_stage_id) references pipeline_stages(id) on delete set null;

  if exists (select 1 from information_schema.table_constraints
             where constraint_name = 'activities_to_stage_id_fkey'
               and table_name = 'activities') then
    alter table activities drop constraint activities_to_stage_id_fkey;
  end if;
  alter table activities add constraint activities_to_stage_id_fkey
    foreign key (to_stage_id) references pipeline_stages(id) on delete set null;
end $$;

-- 5) CHECK constraints logicos
alter table pipeline_stages drop constraint if exists won_implies_closed;
alter table pipeline_stages add constraint won_implies_closed
  check (not is_won or is_closed);

-- deal_type: valores permitidos para el contexto inmobiliario
alter table leads drop constraint if exists leads_deal_type_check;
alter table leads add constraint leads_deal_type_check
  check (deal_type in ('sale', 'rent', 'sale_rent'));

-- 6) Actualizar la funcion redeem_promo_code para que use el nuevo PK compuesto
--    y reporte amablemente si la empresa ya redimio este codigo.
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

  -- Verificar que la empresa no lo haya usado antes
  select * into v_already from promo_code_redemptions
    where code = upper(p_code) and company_id = p_company;
  if found then
    return jsonb_build_object('ok', true, 'already', true, 'expires_at', v_expires_at);
  end if;

  -- Redimir: insert + increment atomico
  insert into promo_code_redemptions (code, company_id, redeemed_by, plan_id)
    values (upper(p_code), p_company, p_user, p_plan);
  update valid_promo_codes set current_uses = current_uses + 1 where code = upper(p_code);

  return jsonb_build_object('ok', true, 'expires_at', v_expires_at);
end;
$$;

grant execute on function redeem_promo_code(text, uuid, uuid, text) to service_role;
