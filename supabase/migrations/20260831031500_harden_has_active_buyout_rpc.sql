-- Harden the buyout helper without breaking dependent RLS policies during migration.
-- The legacy helper has a second parameter with DEFAULT auth.uid(), so a one-argument
-- overload would be ambiguous. Rename the legacy function first; dependencies follow
-- its OID safely, then move policies to the new auth-bound function and drop legacy.

alter function public.has_active_buyout(uuid, uuid) rename to has_active_buyout_legacy;
revoke all on function public.has_active_buyout_legacy(uuid, uuid) from public, anon, authenticated;

create or replace function public.has_active_buyout(p_app_id uuid)
returns boolean
language sql
security invoker
stable
set search_path = ''
as $$
  select (select auth.uid()) is not null
    and exists (
      select 1
      from public.apps a
      join public.app_licenses l on l.app_id = a.id
      where a.id = p_app_id
        and a.owner_id = (select auth.uid())
        and l.owner_id = (select auth.uid())
        and l.status = 'active'
    );
$$;

revoke all on function public.has_active_buyout(uuid) from public, anon, authenticated;
grant execute on function public.has_active_buyout(uuid) to authenticated;

drop policy if exists app_folder_nodes_select on public.app_folder_nodes;
create policy app_folder_nodes_select on public.app_folder_nodes
for select to authenticated
using (owner_id = (select auth.uid()) and (is_hidden = false or public.has_active_buyout(app_id)));

drop policy if exists app_folder_nodes_insert on public.app_folder_nodes;
create policy app_folder_nodes_insert on public.app_folder_nodes
for insert to authenticated
with check (
  owner_id = (select auth.uid())
  and exists (select 1 from public.apps a where a.id = app_id and a.owner_id = (select auth.uid()))
  and (is_hidden = false or (is_hidden = true and folder_type = 'source_code' and public.has_active_buyout(app_id)))
);

drop policy if exists app_folder_nodes_update on public.app_folder_nodes;
create policy app_folder_nodes_update on public.app_folder_nodes
for update to authenticated
using (owner_id = (select auth.uid()) and (is_hidden = false or public.has_active_buyout(app_id)))
with check (
  owner_id = (select auth.uid())
  and exists (select 1 from public.apps a where a.id = app_id and a.owner_id = (select auth.uid()))
  and (is_hidden = false or (is_hidden = true and folder_type = 'source_code' and public.has_active_buyout(app_id)))
);

drop policy if exists app_folder_nodes_delete on public.app_folder_nodes;
create policy app_folder_nodes_delete on public.app_folder_nodes
for delete to authenticated
using (owner_id = (select auth.uid()) and (is_hidden = false or public.has_active_buyout(app_id)));

drop policy if exists app_source_files_select on public.app_source_files;
create policy app_source_files_select on public.app_source_files
for select to authenticated
using (
  owner_id = (select auth.uid())
  and public.has_active_buyout(app_id)
  and exists (
    select 1 from public.app_folder_nodes f
    where f.id = app_source_files.folder_id
      and f.app_id = app_source_files.app_id
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
  and public.has_active_buyout(app_id)
  and exists (
    select 1 from public.app_folder_nodes f
    where f.id = app_source_files.folder_id
      and f.app_id = app_source_files.app_id
      and f.owner_id = (select auth.uid())
      and f.is_hidden = true
      and f.folder_type = 'source_code'
  )
);

drop policy if exists app_source_files_update on public.app_source_files;
create policy app_source_files_update on public.app_source_files
for update to authenticated
using (owner_id = (select auth.uid()) and public.has_active_buyout(app_id))
with check (
  owner_id = (select auth.uid())
  and public.has_active_buyout(app_id)
  and exists (
    select 1 from public.app_folder_nodes f
    where f.id = app_source_files.folder_id
      and f.app_id = app_source_files.app_id
      and f.owner_id = (select auth.uid())
      and f.is_hidden = true
      and f.folder_type = 'source_code'
  )
);

drop policy if exists app_source_files_delete on public.app_source_files;
create policy app_source_files_delete on public.app_source_files
for delete to authenticated
using (owner_id = (select auth.uid()) and public.has_active_buyout(app_id));

drop function public.has_active_buyout_legacy(uuid, uuid);
