alter table public.video_versions add column if not exists source_request_id text;

create unique index if not exists video_versions_owner_project_request_unique_idx
  on public.video_versions(owner_id, project_id, source_request_id)
  where source_request_id is not null;

alter table public.video_projects drop constraint if exists video_projects_runtime_safe_check;
alter table public.video_projects add constraint video_projects_runtime_safe_check check (
  length(name) between 1 and 160
  and max_duration_seconds between 4 and 120
  and jsonb_typeof(edit_json) = 'object'
  and pg_column_size(edit_json) <= 262144
) not valid;
alter table public.video_projects validate constraint video_projects_runtime_safe_check;

alter table public.video_versions drop constraint if exists video_versions_runtime_safe_check;
alter table public.video_versions add constraint video_versions_runtime_safe_check check (
  version_no > 0
  and duration_seconds > 0 and duration_seconds <= 120
  and jsonb_typeof(edit_json) = 'object'
  and pg_column_size(edit_json) <= 524288
  and (output_path is null or length(output_path) <= 4000)
  and (source_request_id is null or source_request_id ~ '^[a-zA-Z0-9._:-]{1,160}$')
) not valid;
alter table public.video_versions validate constraint video_versions_runtime_safe_check;

alter table public.video_projects enable row level security;
alter table public.video_versions enable row level security;
alter table public.video_clips enable row level security;

revoke insert, update, delete, select on table public.video_projects from anon;
revoke insert, update, delete, select on table public.video_versions from anon;
revoke insert, update, delete, select on table public.video_clips from anon;

drop policy if exists video_projects_own_all on public.video_projects;
create policy video_projects_select_own on public.video_projects for select to authenticated using ((select auth.uid()) = owner_id);
create policy video_projects_insert_own on public.video_projects for insert to authenticated with check (
  (select auth.uid()) = owner_id
  and (app_id is null or exists (select 1 from public.apps a where a.id = video_projects.app_id and a.owner_id = (select auth.uid())))
);
create policy video_projects_update_own on public.video_projects for update to authenticated using ((select auth.uid()) = owner_id) with check (
  (select auth.uid()) = owner_id
  and (app_id is null or exists (select 1 from public.apps a where a.id = video_projects.app_id and a.owner_id = (select auth.uid())))
);
create policy video_projects_delete_own on public.video_projects for delete to authenticated using ((select auth.uid()) = owner_id);

drop policy if exists video_versions_own_all on public.video_versions;
create policy video_versions_select_own on public.video_versions for select to authenticated using (
  (select auth.uid()) = owner_id
  and exists (select 1 from public.video_projects p where p.id = video_versions.project_id and p.owner_id = (select auth.uid()))
);
create policy video_versions_insert_own on public.video_versions for insert to authenticated with check (
  (select auth.uid()) = owner_id
  and exists (select 1 from public.video_projects p where p.id = video_versions.project_id and p.owner_id = (select auth.uid()))
);
create policy video_versions_update_own on public.video_versions for update to authenticated using (
  (select auth.uid()) = owner_id
  and exists (select 1 from public.video_projects p where p.id = video_versions.project_id and p.owner_id = (select auth.uid()))
) with check (
  (select auth.uid()) = owner_id
  and exists (select 1 from public.video_projects p where p.id = video_versions.project_id and p.owner_id = (select auth.uid()))
);
create policy video_versions_delete_own on public.video_versions for delete to authenticated using (
  (select auth.uid()) = owner_id
  and exists (select 1 from public.video_projects p where p.id = video_versions.project_id and p.owner_id = (select auth.uid()))
);

drop policy if exists video_clips_own_all on public.video_clips;
create policy video_clips_select_own on public.video_clips for select to authenticated using (
  (select auth.uid()) = owner_id
  and exists (select 1 from public.video_projects p where p.id = video_clips.project_id and p.owner_id = (select auth.uid()))
);
create policy video_clips_insert_own on public.video_clips for insert to authenticated with check (
  (select auth.uid()) = owner_id
  and exists (select 1 from public.video_projects p where p.id = video_clips.project_id and p.owner_id = (select auth.uid()))
  and (asset_id is null or exists (select 1 from public.asset_library a where a.id = video_clips.asset_id and a.user_id = (select auth.uid())))
);
create policy video_clips_update_own on public.video_clips for update to authenticated using (
  (select auth.uid()) = owner_id
  and exists (select 1 from public.video_projects p where p.id = video_clips.project_id and p.owner_id = (select auth.uid()))
) with check (
  (select auth.uid()) = owner_id
  and exists (select 1 from public.video_projects p where p.id = video_clips.project_id and p.owner_id = (select auth.uid()))
  and (asset_id is null or exists (select 1 from public.asset_library a where a.id = video_clips.asset_id and a.user_id = (select auth.uid())))
);
create policy video_clips_delete_own on public.video_clips for delete to authenticated using (
  (select auth.uid()) = owner_id
  and exists (select 1 from public.video_projects p where p.id = video_clips.project_id and p.owner_id = (select auth.uid()))
);

create or replace function public.server_create_video_version(
  p_user_id uuid,
  p_project_id uuid,
  p_request_id text,
  p_edit_json jsonb,
  p_duration_seconds numeric,
  p_render_status text default 'draft'
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_existing public.video_versions%rowtype;
  v_version public.video_versions%rowtype;
  v_next integer;
begin
  if p_user_id is null or p_project_id is null then raise exception 'video_identity_required'; end if;
  if p_request_id is null or p_request_id !~ '^[a-zA-Z0-9._:-]{1,160}$' then raise exception 'video_request_id_invalid'; end if;
  if p_edit_json is null or jsonb_typeof(p_edit_json) <> 'object' or pg_column_size(p_edit_json) > 524288 then raise exception 'video_edit_invalid'; end if;
  if p_duration_seconds <= 0 or p_duration_seconds > 120 then raise exception 'video_duration_invalid'; end if;
  if p_render_status not in ('draft','queued','rendering','completed','failed') then raise exception 'video_render_status_invalid'; end if;

  perform 1 from public.video_projects p where p.id = p_project_id and p.owner_id = p_user_id for update;
  if not found then raise exception 'video_project_not_found'; end if;

  select * into v_existing from public.video_versions v
   where v.owner_id = p_user_id and v.project_id = p_project_id and v.source_request_id = p_request_id
   limit 1;
  if found then
    return to_jsonb(v_existing) || jsonb_build_object('replayed', true);
  end if;

  select coalesce(max(v.version_no),0)+1 into v_next from public.video_versions v where v.project_id = p_project_id;
  insert into public.video_versions(project_id,owner_id,version_no,edit_json,duration_seconds,render_status,source_request_id)
  values(p_project_id,p_user_id,v_next,p_edit_json,p_duration_seconds,p_render_status,p_request_id)
  returning * into v_version;
  return to_jsonb(v_version) || jsonb_build_object('replayed', false);
end;
$$;

revoke all on function public.server_create_video_version(uuid,uuid,text,jsonb,numeric,text) from public, anon, authenticated;
grant execute on function public.server_create_video_version(uuid,uuid,text,jsonb,numeric,text) to service_role;
