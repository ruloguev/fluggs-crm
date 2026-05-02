-- Bucket privado para Drive por empresa (prefijo: {company_id}/...)
insert into storage.buckets (id, name, public, file_size_limit)
values ('company-drive', 'company-drive', false, 52428800)
on conflict (id) do update set file_size_limit = excluded.file_size_limit;

drop policy if exists "drive_select_company" on storage.objects;
drop policy if exists "drive_insert_company" on storage.objects;
drop policy if exists "drive_update_company" on storage.objects;
drop policy if exists "drive_delete_company" on storage.objects;

-- Lectura: solo objetos cuya primera carpeta coincide con company_id del perfil
create policy "drive_select_company"
on storage.objects for select
to authenticated
using (
  bucket_id = 'company-drive'
  and exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.company_id is not null
      and split_part(storage.objects.name, '/', 1) = p.company_id::text
  )
);

-- Subida / actualización / borrado: mismo prefijo de empresa
create policy "drive_insert_company"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'company-drive'
  and exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.company_id is not null
      and split_part(name, '/', 1) = p.company_id::text
  )
);

create policy "drive_update_company"
on storage.objects for update
to authenticated
using (
  bucket_id = 'company-drive'
  and exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.company_id is not null
      and split_part(storage.objects.name, '/', 1) = p.company_id::text
  )
)
with check (
  bucket_id = 'company-drive'
  and exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.company_id is not null
      and split_part(name, '/', 1) = p.company_id::text
  )
);

create policy "drive_delete_company"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'company-drive'
  and exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.company_id is not null
      and split_part(storage.objects.name, '/', 1) = p.company_id::text
  )
);
