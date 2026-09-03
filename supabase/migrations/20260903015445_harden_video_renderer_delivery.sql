alter table public.video_projects add column if not exists source_request_id text;
alter table public.video_projects add column if not exists source_request_hash text;

create unique index if not exists video_projects_owner_request_unique_idx
  on public.video_projects(owner_id, source_request_id)
  where source_request_id is not null;

alter table public.video_versions add column if not exists source_request_hash text;
alter table public.video_versions add column if not exists render_claim_token uuid;
alter table public.video_versions add column if not exists render_claimed_at timestamptz;
alter table public.video_versions add column if not exists output_asset_id uuid references public.asset_library(id) on delete set null;

create index if not exists video_versions_output_asset_idx on public.video_versions(output_asset_id) where output_asset_id is not null;

alter table public.video_projects drop constraint if exists video_projects_runtime_safe_check;
alter table public.video_projects add constraint video_projects_runtime_safe_check check (
  length(name) between 1 and 160
  and max_duration_seconds between 4 and 120
  and jsonb_typeof(edit_json) = 'object'
  and pg_column_size(edit_json) <= 262144
  and (source_request_id is null or source_request_id ~ '^[a-zA-Z0-9._:-]{1,160}$')
  and (source_request_hash is null or source_request_hash ~ '^[0-9a-f]{64}$')
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
  and (source_request_hash is null or source_request_hash ~ '^[0-9a-f]{64}$')
  and ((render_claim_token is null and render_claimed_at is null) or (render_claim_token is not null and render_claimed_at is not null))
  and (output_asset_id is null or output_path = ('/api/video/assets/' || output_asset_id::text))
) not valid;
alter table public.video_versions validate constraint video_versions_runtime_safe_check;

create table if not exists public.video_storyboard_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  request_id text not null check (request_id ~ '^[a-zA-Z0-9._:-]{1,160}$'),
  request_hash text not null check (request_hash ~ '^[0-9a-f]{64}$'),
  status text not null default 'pending' check (status in ('pending','succeeded','failed')),
  result jsonb,
  error_code text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, request_id)
);

create index if not exists video_storyboard_requests_user_updated_idx on public.video_storyboard_requests(user_id, updated_at desc);
alter table public.video_storyboard_requests enable row level security;
revoke all on table public.video_storyboard_requests from public, anon, authenticated;
grant select, insert, update, delete on table public.video_storyboard_requests to service_role;

create or replace function public.server_create_video_project_v2(
  p_user_id uuid,
  p_request_id text,
  p_request_hash text,
  p_app_id uuid,
  p_name text,
  p_style text,
  p_device_class text,
  p_max_duration_seconds integer,
  p_edit_json jsonb
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_existing public.video_projects%rowtype;
  v_project public.video_projects%rowtype;
begin
  if p_user_id is null then raise exception 'video_identity_required'; end if;
  if p_request_id is null or p_request_id !~ '^[a-zA-Z0-9._:-]{1,160}$' then raise exception 'video_request_id_invalid'; end if;
  if p_request_hash is null or p_request_hash !~ '^[0-9a-f]{64}$' then raise exception 'video_request_hash_invalid'; end if;
  if p_name is null or length(p_name) not between 1 and 160 then raise exception 'video_name_invalid'; end if;
  if p_style not in ('realistic','cartoon','mixed') then raise exception 'video_style_invalid'; end if;
  if p_device_class not in ('mobile','desktop','high_performance_desktop') then raise exception 'video_device_class_invalid'; end if;
  if p_max_duration_seconds not between 4 and 120 then raise exception 'video_duration_invalid'; end if;
  if p_edit_json is null or jsonb_typeof(p_edit_json) <> 'object' or pg_column_size(p_edit_json) > 262144 then raise exception 'video_edit_invalid'; end if;
  if p_app_id is not null and not exists(select 1 from public.apps a where a.id=p_app_id and a.owner_id=p_user_id) then raise exception 'video_app_not_owned'; end if;

  select * into v_existing from public.video_projects p where p.owner_id=p_user_id and p.source_request_id=p_request_id limit 1;
  if found then
    if v_existing.source_request_hash is distinct from p_request_hash then raise exception 'video_project_request_conflict'; end if;
    return to_jsonb(v_existing) || jsonb_build_object('replayed',true);
  end if;

  begin
    insert into public.video_projects(owner_id,app_id,name,style,device_class,max_duration_seconds,edit_json,status,source_request_id,source_request_hash)
    values(p_user_id,p_app_id,p_name,p_style,p_device_class,p_max_duration_seconds,p_edit_json,'draft',p_request_id,p_request_hash)
    returning * into v_project;
  exception when unique_violation then
    select * into v_existing from public.video_projects p where p.owner_id=p_user_id and p.source_request_id=p_request_id limit 1;
    if not found or v_existing.source_request_hash is distinct from p_request_hash then raise exception 'video_project_request_conflict'; end if;
    return to_jsonb(v_existing) || jsonb_build_object('replayed',true);
  end;
  return to_jsonb(v_project) || jsonb_build_object('replayed',false);
end;
$$;

revoke all on function public.server_create_video_project_v2(uuid,text,text,uuid,text,text,text,integer,jsonb) from public,anon,authenticated;
grant execute on function public.server_create_video_project_v2(uuid,text,text,uuid,text,text,text,integer,jsonb) to service_role;

create or replace function public.server_create_video_version_v2(
  p_user_id uuid,
  p_project_id uuid,
  p_request_id text,
  p_request_hash text,
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
  if p_request_hash is null or p_request_hash !~ '^[0-9a-f]{64}$' then raise exception 'video_request_hash_invalid'; end if;
  if p_edit_json is null or jsonb_typeof(p_edit_json) <> 'object' or pg_column_size(p_edit_json) > 524288 then raise exception 'video_edit_invalid'; end if;
  if p_duration_seconds <= 0 or p_duration_seconds > 120 then raise exception 'video_duration_invalid'; end if;
  if p_render_status not in ('draft','queued','rendering','completed','failed') then raise exception 'video_render_status_invalid'; end if;

  perform 1 from public.video_projects p where p.id=p_project_id and p.owner_id=p_user_id for update;
  if not found then raise exception 'video_project_not_found'; end if;

  select * into v_existing from public.video_versions v where v.owner_id=p_user_id and v.project_id=p_project_id and v.source_request_id=p_request_id limit 1;
  if found then
    if v_existing.source_request_hash is distinct from p_request_hash then raise exception 'video_version_request_conflict'; end if;
    return to_jsonb(v_existing) || jsonb_build_object('replayed',true);
  end if;

  select coalesce(max(v.version_no),0)+1 into v_next from public.video_versions v where v.project_id=p_project_id;
  insert into public.video_versions(project_id,owner_id,version_no,edit_json,duration_seconds,render_status,source_request_id,source_request_hash)
  values(p_project_id,p_user_id,v_next,p_edit_json,p_duration_seconds,p_render_status,p_request_id,p_request_hash)
  returning * into v_version;
  return to_jsonb(v_version) || jsonb_build_object('replayed',false);
end;
$$;

revoke all on function public.server_create_video_version_v2(uuid,uuid,text,text,jsonb,numeric,text) from public,anon,authenticated;
grant execute on function public.server_create_video_version_v2(uuid,uuid,text,text,jsonb,numeric,text) to service_role;

create or replace function public.server_claim_video_render_v2(
  p_user_id uuid,
  p_project_id uuid,
  p_version_id uuid,
  p_request_id text
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_version public.video_versions%rowtype;
  v_token uuid;
  v_json jsonb;
begin
  select * into v_version from public.video_versions v
   where v.id=p_version_id and v.project_id=p_project_id and v.owner_id=p_user_id
   for update;
  if not found then raise exception 'video_version_not_found'; end if;
  if v_version.source_request_id is distinct from p_request_id then raise exception 'video_request_mismatch'; end if;
  if v_version.render_status <> 'queued' or v_version.render_claim_token is not null then
    return to_jsonb(v_version) || jsonb_build_object('claimed',false);
  end if;
  v_token:=gen_random_uuid();
  v_json:=jsonb_set(v_version.edit_json,'{render,status}',to_jsonb('rendering'::text),true);
  v_json:=jsonb_set(v_json,'{render,submissionClaimedAt}',to_jsonb(now()),true);
  update public.video_versions
    set render_claim_token=v_token,render_claimed_at=now(),render_status='rendering',edit_json=v_json
    where id=v_version.id
    returning * into v_version;
  return to_jsonb(v_version) || jsonb_build_object('claimed',true,'claimToken',v_token);
end;
$$;

revoke all on function public.server_claim_video_render_v2(uuid,uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.server_claim_video_render_v2(uuid,uuid,uuid,text) to service_role;

create or replace function public.server_finalize_video_render_v2(
  p_user_id uuid,
  p_project_id uuid,
  p_version_id uuid,
  p_claim_token uuid,
  p_edit_json jsonb,
  p_render_status text,
  p_output_path text,
  p_output_asset_id uuid
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_version public.video_versions%rowtype;
begin
  if p_edit_json is null or jsonb_typeof(p_edit_json)<>'object' or pg_column_size(p_edit_json)>524288 then raise exception 'video_edit_invalid'; end if;
  if p_render_status not in ('rendering','completed','failed') then raise exception 'video_render_status_invalid'; end if;
  select * into v_version from public.video_versions v
   where v.id=p_version_id and v.project_id=p_project_id and v.owner_id=p_user_id
   for update;
  if not found then raise exception 'video_version_not_found'; end if;
  if v_version.render_claim_token is distinct from p_claim_token then raise exception 'video_render_claim_mismatch'; end if;
  if p_output_asset_id is not null then
    if not exists(select 1 from public.asset_library a where a.id=p_output_asset_id and a.user_id=p_user_id) then raise exception 'video_output_asset_not_owned'; end if;
    if p_output_path is distinct from ('/api/video/assets/'||p_output_asset_id::text) then raise exception 'video_output_path_invalid'; end if;
  elsif p_render_status='completed' then
    raise exception 'video_completed_output_must_be_durable';
  end if;
  update public.video_versions
    set edit_json=p_edit_json,render_status=p_render_status,output_path=p_output_path,output_asset_id=p_output_asset_id
    where id=v_version.id
    returning * into v_version;
  return to_jsonb(v_version);
end;
$$;

revoke all on function public.server_finalize_video_render_v2(uuid,uuid,uuid,uuid,jsonb,text,text,uuid) from public,anon,authenticated;
grant execute on function public.server_finalize_video_render_v2(uuid,uuid,uuid,uuid,jsonb,text,text,uuid) to service_role;
