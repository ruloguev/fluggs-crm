-- ============================================================
-- MIGRACION 014: Seleccion de plan + codigos promo unicos
-- ============================================================

create table if not exists promo_code_redemptions (
  code        text primary key check (code ~ '^FLUGZZ(0[1-9]|1[01])$'),
  company_id  uuid not null references companies(id) on delete cascade,
  redeemed_by uuid references profiles(id) on delete set null,
  plan_id     text not null check (plan_id in ('fundacion', 'expansion', 'imperio')),
  redeemed_at timestamptz not null default now()
);

create unique index if not exists idx_promo_code_redemptions_company
  on promo_code_redemptions(company_id);

alter table promo_code_redemptions enable row level security;

drop policy if exists "promo_codes: company members can read own" on promo_code_redemptions;
create policy "promo_codes: company members can read own"
  on promo_code_redemptions for select
  using (company_id = my_company_id());
