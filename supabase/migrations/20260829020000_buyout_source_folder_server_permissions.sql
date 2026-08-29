create or replace function public.has_active_buyout(p_app_id uuid, p_user_id uuid default auth.uid())
returns boolean
language sql
security definer
stable
set search_path = ''
as $$
  select exists (
    select 1
    from public.apps a
    join public.app_licenses l on l.app_id = a.id
    where a.id = p_app_id
      and a.owner_id = p_user_id
      and l.owner_id = p_user_id
      and l.status = 'active'
  );
$$;

revoke all on function public.has_active_buyout(uuid, uuid) from public, anon, authenticated;
grant execute on function public.has_active_buyout(uuid, uuid) to authenticated;

create table if not exists public.app_folder_nodes (
  id uuid primary key default gen_random_uuid(),
  app_id uuid not null references public.apps(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  parent_id uuid references public.app_folder_nodes(id) on delete cascade,
  name text not null,
  path text not null,
  is_hidden boolean not null default false,
  folder_type text not null default 'customer'
    check (folder_type in ('customer','system','source_code')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (app_id, path),
  check (name <> ''),
  check (path <> ''),
  check ((is_hidden = true and folder_type = 'source_code') or is_hidden = false)
);

create index if not exists app_folder_nodes_app_path_idx on public.app_folder_nodes(app_id, path);
create index if not exists app_folder_nodes_owner_idx on public.app_folder_nodes(owner_id, app_id);

create table if not exists public.app_source_files (
  id uuid primary key default gen_random_uuid(),
  app_id uuid not null references public.apps(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  folder_id uuid not null references public.app_folder_nodes(id) on delete cascade,
  file_path text not null,
  content text not null,
  content_hash text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (app_id, file_path),
  check (file_path like '.source/%')
);

create index if not exists app_source_files_app_idx on public.app_source_files(app_id, updated_at desc);
create index if not exists app_source_files_owner_idx on public.app_source_files(owner_id, app_id);

alter table public.app_folder_nodes enable row level security;
alter table public.app_source_files enable row level security;

revoke all on public.app_folder_nodes from anon, authenticated;
revoke all on public.app_source_files from anon, authenticated;
grant select, insert, update, delete on public.app_folder_nodes to authenticated;
grant select, insert, update, delete on public.app_source_files to authenticated;

drop policy if exists app_folder_nodes_select on public.app_folder_nodes;
create policy app_folder_nodes_select on public.app_folder_nodes
for select to authenticated
using (
  owner_id = (select auth.uid())
  and (is_hidden = false or public.has_active_buyout(app_id, (select auth.uid())))
);

drop policy if exists app_folder_nodes_insert on public.app_folder_nodes;
create policy app_folder_nodes_insert on public.app_folder_nodes
for insert to authenticated
with check (
  owner_id = (select auth.uid())
  and exists (select 1 from public.apps a where a.id = app_id and a.owner_id = (select auth.uid()))
  and (is_hidden = false or (is_hidden = true and folder_type = 'source_code' and public.has_active_buyout(app_id, (select auth.uid()))))
);

drop policy if exists app_folder_nodes_update on public.app_folder_nodes;
create policy app_folder_nodes_update on public.app_folder_nodes
for update to authenticated
using (
  owner_id = (select auth.uid())
  and (is_hidden = false or public.has_active_buyout(app_id, (select auth.uid())))
)
with check (
  owner_id = (select auth.uid())
  and exists (select 1 from public.apps a where a.id = app_id and a.owner_id = (select auth.uid()))
  and (is_hidden = false or (is_hidden = true and folder_type = 'source_code' and public.has_active_buyout(app_id, (select auth.uid()))))
);

drop policy if exists app_folder_nodes_delete on public.app_folder_nodes;
create policy app_folder_nodes_delete on public.app_folder_nodes
for delete to authenticated
using (
  owner_id = (select auth.uid())
  and (is_hidden = false or public.has_active_buyout(app_id, (select auth.uid())))
);

drop policy if exists app_source_files_select on public.app_source_files;
create policy app_source_files_select on public.app_source_files
for select to authenticated
using (
  owner_id = (select auth.uid())
  and public.has_active_buyout(app_id, (select auth.uid()))
  and exists (
    select 1 from public.app_folder_nodes f
    where f.id = folder_id
      and f.app_id = app_id
      and f.owner_id = (select auth.uid())
      and f.is_hidden = true
      and f.folder_type = 'source_code'
  )
);

drop policy if exists app_source_files_insert on public.app_source_files;
create policy app_source_files_insert on public.app_source_files
for insert to authenticated
with check (
  owner_id = (select auth.uid())
  and public.has_active_buyout(app_id, (select auth.uid()))
  and exists (
    select 1 from public.app_folder_nodes f
    where f.id = folder_id
      and f.app_id = app_id
      and f.owner_id = (select auth.uid())
      and f.is_hidden = true
      and f.folder_type = 'source_code'
  )
);

drop policy if exists app_source_files_update on public.app_source_files;
create policy app_source_files_update on public.app_source_files
for update to authenticated
using (
  owner_id = (select auth.uid())
  and public.has_active_buyout(app_id, (select auth.uid()))
)
with check (
  owner_id = (select auth.uid())
  and public.has_active_buyout(app_id, (select auth.uid()))
  and exists (
    select 1 from public.app_folder_nodes f
    where f.id = folder_id
      and f.app_id = app_id
      and f.owner_id = (select auth.uid())
      and f.is_hidden = true
      and f.folder_type = 'source_code'
  )
);

drop policy if exists app_source_files_delete on public.app_source_files;
create policy app_source_files_delete on public.app_source_files
for delete to authenticated
using (
  owner_id = (select auth.uid())
  and public.has_active_buyout(app_id, (select auth.uid()))
);

create or replace function public.ensure_app_folders()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  root_id uuid;
begin
  insert into public.app_folder_nodes(app_id, owner_id, parent_id, name, path, is_hidden, folder_type)
  values (new.id, new.owner_id, null, new.name, '/', false, 'customer')
  on conflict (app_id, path) do update set name = excluded.name, updated_at = now()
  returning id into root_id;

  insert into public.app_folder_nodes(app_id, owner_id, parent_id, name, path, is_hidden, folder_type)
  values (new.id, new.owner_id, root_id, '.source', '.source', true, 'source_code')
  on conflict (app_id, path) do nothing;

  return new;
end;
$$;

revoke all on function public.ensure_app_folders() from public, anon, authenticated;

drop trigger if exists apps_ensure_folders on public.apps;
create trigger apps_ensure_folders
after insert on public.apps
for each row execute function public.ensure_app_folders();

insert into public.app_folder_nodes(app_id, owner_id, parent_id, name, path, is_hidden, folder_type)
select a.id, a.owner_id, null, a.name, '/', false, 'customer'
from public.apps a
where not exists (select 1 from public.app_folder_nodes f where f.app_id = a.id and f.path = '/');

insert into public.app_folder_nodes(app_id, owner_id, parent_id, name, path, is_hidden, folder_type)
select a.id, a.owner_id, r.id, '.source', '.source', true, 'source_code'
from public.apps a
join public.app_folder_nodes r on r.app_id = a.id and r.path = '/'
where not exists (select 1 from public.app_folder_nodes f where f.app_id = a.id and f.path = '.source');
