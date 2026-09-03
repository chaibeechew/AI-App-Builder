-- Keep the working current version separate from the exact version customers are allowed to see.
alter table public.apps add column if not exists published_version_id uuid;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname='apps_published_version_id_fkey' and conrelid='public.apps'::regclass
  ) then
    alter table public.apps
      add constraint apps_published_version_id_fkey
      foreign key (published_version_id)
      references public.app_versions(id)
      on delete set null;
  end if;
end $$;

update public.apps a
set published_version_id=a.current_version_id
where a.publish_status='published'
  and a.visibility in ('listed','public')
  and a.published_version_id is null
  and exists(select 1 from public.app_versions v where v.id=a.current_version_id and v.app_id=a.id);

create index if not exists apps_published_version_id_idx on public.apps(published_version_id) where published_version_id is not null;

create or replace function public.server_publish_web_project(
  p_user_id uuid,
  p_app_id uuid,
  p_expected_version_id uuid,
  p_request_id text,
  p_action text default 'publish'
) returns jsonb
language plpgsql security definer set search_path=''
as $$
declare
 uid uuid:=p_user_id;
 request_key text:=btrim(coalesce(p_request_id,''));
 clean_action text:=lower(btrim(coalesce(p_action,'publish')));
 app_row public.apps%rowtype;
 existing public.web_publish_requests%rowtype;
begin
 if uid is null or p_app_id is null or p_expected_version_id is null then raise exception 'User, app and expected version are required'; end if;
 if request_key='' or char_length(request_key)>160 or request_key !~ '^[A-Za-z0-9._:-]+$' then raise exception 'Invalid request id'; end if;
 if clean_action not in ('publish','unpublish') then raise exception 'Invalid publish action'; end if;

 select * into existing from public.web_publish_requests where user_id=uid and request_id=request_key;
 if found then
  if existing.app_id<>p_app_id or existing.version_id<>p_expected_version_id or existing.action<>clean_action then raise exception 'Request id already belongs to another publish operation'; end if;
  select * into app_row from public.apps where id=p_app_id and owner_id=uid;
  return jsonb_build_object(
    'success',true,'replayed',true,'app_id',p_app_id,'version_id',p_expected_version_id,
    'published_version_id',app_row.published_version_id,'action',clean_action,
    'visibility',app_row.visibility,'publish_status',app_row.publish_status
  );
 end if;

 select * into app_row from public.apps where id=p_app_id and owner_id=uid for update;
 if not found then raise exception 'Owned app not found'; end if;
 if app_row.current_version_id is distinct from p_expected_version_id then raise exception 'STALE_PUBLISH_VERSION'; end if;
 if not exists(select 1 from public.app_versions v where v.id=p_expected_version_id and v.app_id=p_app_id) then raise exception 'Expected version not found'; end if;

 if clean_action='publish' then
   update public.apps
   set visibility='public',publish_status='published',published_version_id=p_expected_version_id,updated_at=now()
   where id=p_app_id and owner_id=uid;
 else
   update public.apps
   set visibility='private',publish_status='draft',published_version_id=null,updated_at=now()
   where id=p_app_id and owner_id=uid;
 end if;

 insert into public.web_publish_requests(user_id,app_id,version_id,request_id,action,status)
 values(uid,p_app_id,p_expected_version_id,request_key,clean_action,'completed');
 select * into app_row from public.apps where id=p_app_id and owner_id=uid;
 return jsonb_build_object(
   'success',true,'replayed',false,'app_id',p_app_id,'version_id',p_expected_version_id,
   'published_version_id',app_row.published_version_id,'action',clean_action,
   'visibility',app_row.visibility,'publish_status',app_row.publish_status
 );
end;$$;

revoke all on function public.server_publish_web_project(uuid,uuid,uuid,text,text) from public,anon,authenticated;
grant execute on function public.server_publish_web_project(uuid,uuid,uuid,text,text) to service_role;
