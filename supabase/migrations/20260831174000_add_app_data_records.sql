-- Durable preview/runtime records for generated Apps.
-- Production promotion remains held. Anonymous public writes are intentionally disabled.

create table if not exists public.app_data_records (
  id uuid primary key default gen_random_uuid(),
  app_id uuid not null references public.apps(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  entity_name text not null,
  record_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (char_length(entity_name) between 1 and 120),
  check (jsonb_typeof(record_json) = 'object'),
  check (octet_length(record_json::text) <= 65536)
);

create index if not exists app_data_records_app_entity_created_idx
  on public.app_data_records(app_id, entity_name, created_at desc);
create index if not exists app_data_records_owner_id_idx
  on public.app_data_records(owner_id);

alter table public.app_data_records enable row level security;

revoke all on public.app_data_records from public, anon, authenticated;
grant select, insert, update, delete on public.app_data_records to authenticated;

drop policy if exists app_data_records_select_own on public.app_data_records;
create policy app_data_records_select_own on public.app_data_records
for select to authenticated
using (
  owner_id = (select auth.uid())
  and exists (
    select 1 from public.apps a
    where a.id = app_data_records.app_id
      and a.owner_id = (select auth.uid())
  )
);

drop policy if exists app_data_records_insert_own on public.app_data_records;
create policy app_data_records_insert_own on public.app_data_records
for insert to authenticated
with check (
  owner_id = (select auth.uid())
  and exists (
    select 1 from public.apps a
    where a.id = app_data_records.app_id
      and a.owner_id = (select auth.uid())
  )
);

drop policy if exists app_data_records_update_own on public.app_data_records;
create policy app_data_records_update_own on public.app_data_records
for update to authenticated
using (owner_id = (select auth.uid()))
with check (
  owner_id = (select auth.uid())
  and exists (
    select 1 from public.apps a
    where a.id = app_data_records.app_id
      and a.owner_id = (select auth.uid())
  )
);

drop policy if exists app_data_records_delete_own on public.app_data_records;
create policy app_data_records_delete_own on public.app_data_records
for delete to authenticated
using (owner_id = (select auth.uid()));
