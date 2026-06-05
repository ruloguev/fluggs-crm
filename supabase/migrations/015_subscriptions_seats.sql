-- ============================================================
-- MIGRACION 015: Suscripciones de empresa (Stripe)
-- ============================================================

create table if not exists company_subscriptions (
  company_id                  uuid primary key references companies(id) on delete cascade,
  stripe_customer_id          text unique,
  stripe_subscription_id      text unique,
  stripe_subscription_item_id text,
  plan_id                     text not null check (plan_id in ('fundacion','expansion','imperio')),
  seats                       integer not null default 1 check (seats >= 1),
  status                      text not null check (status in ('trial','active','past_due','cancelled','expired')),
  current_period_start        timestamptz,
  current_period_end          timestamptz,
  setup_fee_paid              boolean not null default false,
  cancel_at_period_end        boolean not null default false,
  created_at                  timestamptz not null default now(),
  updated_at                  timestamptz not null default now()
);

create index if not exists idx_company_subscriptions_stripe_sub
  on company_subscriptions(stripe_subscription_id);
create index if not exists idx_company_subscriptions_status
  on company_subscriptions(status);

create table if not exists webhook_events (
  id              uuid primary key default gen_random_uuid(),
  stripe_event_id text unique not null,
  type            text not null,
  processed       boolean not null default false,
  payload         jsonb,
  created_at      timestamptz not null default now()
);

create index if not exists idx_webhook_events_unprocessed
  on webhook_events(processed, created_at)
  where processed = false;

alter table company_subscriptions enable row level security;
alter table webhook_events enable row level security;

-- Lectura: cualquier miembro de la empresa
drop policy if exists "company_subscriptions: company members can read" on company_subscriptions;
create policy "company_subscriptions: company members can read"
  on company_subscriptions for select
  using (
    company_id in (
      select company_id from profiles where id = auth.uid()
    )
  );

-- Update: solo directores (level <= 1)
drop policy if exists "company_subscriptions: directors can update" on company_subscriptions;
create policy "company_subscriptions: directors can update"
  on company_subscriptions for update
  using (
    company_id in (
      select p.company_id from profiles p
      join roles r on r.id = p.role_id
      where p.id = auth.uid() and r.level <= 1
    )
  )
  with check (
    company_id in (
      select p.company_id from profiles p
      join roles r on r.id = p.role_id
      where p.id = auth.uid() and r.level <= 1
    )
  );

-- webhook_events: service_role only (sin policies)
