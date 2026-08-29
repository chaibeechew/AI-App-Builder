drop policy if exists app_source_files_select on public.app_source_files;
create policy app_source_files_select on public.app_source_files
for select to authenticated
using (
  owner_id = (select auth.uid())
  and public.has_active_buyout(app_id, (select auth.uid()))
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
  and public.has_active_buyout(app_id, (select auth.uid()))
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
using (
  owner_id = (select auth.uid())
  and public.has_active_buyout(app_id, (select auth.uid()))
)
with check (
  owner_id = (select auth.uid())
  and public.has_active_buyout(app_id, (select auth.uid()))
  and exists (
    select 1 from public.app_folder_nodes f
    where f.id = app_source_files.folder_id
      and f.app_id = app_source_files.app_id
      and f.owner_id = (select auth.uid())
      and f.is_hidden = true
      and f.folder_type = 'source_code'
  )
);
