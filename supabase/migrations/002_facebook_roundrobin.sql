-- ============================================================
-- MIGRACIÓN 002: Facebook Lead Ads + Round Robin
-- Ejecutar en Supabase SQL Editor después del schema base
-- ============================================================


-- ── Integración de Facebook por company ─────────────────────
create table if not exists facebook_integrations (
  id                  uuid        primary key default uuid_generate_v4(),
  company_id          uuid        references companies(id) on delete cascade not null,
  page_id             text        not null,
  page_name           text,
  access_token        text        not null,   -- Page Access Token (encriptado en prod)
  verify_token        text        not null,   -- Token para verificar el webhook
  form_ids            text[]      default '{}', -- IDs de formularios de Lead Ads a escuchar
  is_active           boolean     default true,
  last_synced_at      timestamptz,
  created_by          uuid        references profiles(id) on delete set null,
  created_at          timestamptz default now(),
  updated_at          timestamptz default now(),
  unique(company_id, page_id)
);

-- ── Cola de Round Robin por company ─────────────────────────
-- Define qué agentes participan y en qué turno están
create table if not exists round_robin_queues (
  id                  uuid        primary key default uuid_generate_v4(),
  company_id          uuid        references companies(id) on delete cascade not null,
  name                text        not null default 'Cola principal',
  source              text        not null default 'facebook', -- 'facebook' | 'web' | 'manual'
  is_active           boolean     default true,
  created_at          timestamptz default now(),
  unique(company_id, source)
);

-- ── Agentes en cada cola ─────────────────────────────────────
create table if not exists round_robin_members (
  id                  uuid        primary key default uuid_generate_v4(),
  queue_id            uuid        references round_robin_queues(id) on delete cascade not null,
  company_id          uuid        references companies(id) on delete cascade not null,
  user_id             uuid        references profiles(id) on delete cascade not null,
  position            integer     not null,           -- orden en la rotación
  is_active           boolean     default true,        -- puede pausar un agente sin sacarlo
  leads_assigned      integer     default 0,           -- contador histórico
  last_assigned_at    timestamptz,                     -- para calcular el turno
  created_at          timestamptz default now(),
  unique(queue_id, user_id),
  unique(queue_id, position)
);

-- ── Puntero actual de la cola ────────────────────────────────
-- Guarda a quién le toca el PRÓXIMO lead
create table if not exists round_robin_state (
  id                  uuid        primary key default uuid_generate_v4(),
  queue_id            uuid        references round_robin_queues(id) on delete cascade not null unique,
  current_position    integer     default 1,           -- posición del próximo en turno
  total_assigned      integer     default 0,
  updated_at          timestamptz default now()
);

-- ── Log de asignaciones ─────────────────────────────────────
create table if not exists round_robin_log (
  id                  uuid        primary key default uuid_generate_v4(),
  queue_id            uuid        references round_robin_queues(id) on delete set null,
  company_id          uuid        references companies(id) on delete cascade not null,
  lead_id             uuid        references leads(id) on delete cascade,
  assigned_to         uuid        references profiles(id) on delete set null,
  source              text,        -- 'facebook', 'web', etc.
  facebook_lead_id    text,        -- ID del lead en Facebook
  raw_data            jsonb,       -- payload completo de Facebook
  assigned_at         timestamptz default now()
);


-- ── FUNCIÓN PRINCIPAL: Asignar siguiente agente ───────────────
-- Retorna el user_id del agente al que le toca el siguiente lead
-- y actualiza el puntero de la cola (transacción atómica)
create or replace function assign_next_agent(p_queue_id uuid)
returns uuid
language plpgsql security definer as $$
declare
  v_state         round_robin_state%rowtype;
  v_member        round_robin_members%rowtype;
  v_next_position integer;
  v_max_position  integer;
  v_assigned_user uuid;
  v_attempts      integer := 0;
begin
  -- Lock the state row to prevent race conditions
  select * into v_state
  from round_robin_state
  where queue_id = p_queue_id
  for update;

  if not found then
    -- Init state if doesn't exist
    insert into round_robin_state (queue_id, current_position)
    values (p_queue_id, 1)
    returning * into v_state;
  end if;

  -- Get max position among active members
  select max(position) into v_max_position
  from round_robin_members
  where queue_id = p_queue_id and is_active = true;

  if v_max_position is null then
    return null; -- No active members
  end if;

  v_next_position := v_state.current_position;

  -- Find next active member starting from current_position
  loop
    v_attempts := v_attempts + 1;
    if v_attempts > v_max_position + 1 then
      return null; -- Safety: no active members found
    end if;

    select * into v_member
    from round_robin_members
    where queue_id = p_queue_id
      and position = v_next_position
      and is_active = true;

    if found then
      v_assigned_user := v_member.user_id;
      exit;
    end if;

    -- Skip inactive positions
    v_next_position := (v_next_position % v_max_position) + 1;
  end loop;

  -- Advance the pointer
  v_next_position := (v_next_position % v_max_position) + 1;

  -- Update state
  update round_robin_state
  set current_position = v_next_position,
      total_assigned   = total_assigned + 1,
      updated_at       = now()
  where queue_id = p_queue_id;

  -- Update member stats
  update round_robin_members
  set leads_assigned  = leads_assigned + 1,
      last_assigned_at = now()
  where queue_id = p_queue_id and user_id = v_assigned_user;

  return v_assigned_user;
end;
$$;


-- ── RLS ─────────────────────────────────────────────────────
alter table facebook_integrations  enable row level security;
alter table round_robin_queues     enable row level security;
alter table round_robin_members    enable row level security;
alter table round_robin_state      enable row level security;
alter table round_robin_log        enable row level security;

-- Solo admins/mkt pueden ver y gestionar integraciones
create policy "fb_integration: company members can read" on facebook_integrations
  for select using (company_id = my_company_id());

create policy "fb_integration: manage if permission" on facebook_integrations
  for all using (
    company_id = my_company_id()
    and has_permission('can_manage_users')
  );

create policy "rr_queues: company members can read" on round_robin_queues
  for select using (company_id = my_company_id());

create policy "rr_queues: manage if permission" on round_robin_queues
  for all using (
    company_id = my_company_id()
    and has_permission('can_manage_users')
  );

create policy "rr_members: company members can read" on round_robin_members
  for select using (company_id = my_company_id());

create policy "rr_members: manage if permission" on round_robin_members
  for all using (
    company_id = my_company_id()
    and has_permission('can_manage_users')
  );

create policy "rr_log: company members can read" on round_robin_log
  for select using (company_id = my_company_id());
