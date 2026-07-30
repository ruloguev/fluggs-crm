-- Tabla para enlaces externos (Google Drive, etc.)
create table if not exists public.drive_links (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  name text not null,
  url text not null,
  created_at timestamptz not null default now(),
  created_by uuid not null references public.profiles(id) on delete cascade
);

create index if not exists idx_drive_links_company on public.drive_links(company_id);

alter table public.drive_links enable row level security;

create policy "drive_links_select_company"
on public.drive_links for select
to authenticated
using (
  company_id in (
    select p.company_id from public.profiles p where p.id = auth.uid()
  )
);

create policy "drive_links_insert_company"
on public.drive_links for insert
to authenticated
with check (
  company_id in (
    select p.company_id from public.profiles p where p.id = auth.uid()
  )
  and created_by = auth.uid()
);

create policy "drive_links_delete_company"
on public.drive_links for delete
to authenticated
using (
  company_id in (
    select p.company_id from public.profiles p where p.id = auth.uid()
  )
);
