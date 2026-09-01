alter table public.publish_requests add column if not exists source_request_id text;
alter table public.publish_requests drop constraint if exists publish_requests_source_request_id_check;
alter table public.publish_requests add constraint publish_requests_source_request_id_check check(source_request_id is null or (char_length(source_request_id) between 1 and 160 and source_request_id ~ '^[A-Za-z0-9._:-]+$'));
create unique index if not exists publish_requests_user_source_request_unique on public.publish_requests(requested_by,source_request_id) where source_request_id is not null;
alter table public.publish_requests drop constraint if exists publish_requests_provider_state_check;
alter table public.publish_requests add constraint publish_requests_provider_state_check check((status not in ('submitted','published') or (provider_reference is not null and char_length(provider_reference) between 1 and 500 and submitted_at is not null)) and (status<>'published' or published_at is not null) and (failure_reason is null or char_length(failure_reason)<=2000) and pg_column_size(metadata)<=65536);
revoke insert,update,delete on table public.publish_requests from anon,authenticated;
create or replace function public.server_create_store_publish_request(p_user_id uuid,p_app_id uuid,p_version_id uuid,p_listing_id uuid,p_platform text,p_request_id text) returns jsonb
language plpgsql security definer set search_path=''
as $$
declare uid uuid:=p_user_id; platform_name text:=lower(btrim(coalesce(p_platform,''))); request_key text:=btrim(coalesce(p_request_id,'')); app_row public.apps%rowtype; listing_row public.store_listings%rowtype; existing public.publish_requests%rowtype; created public.publish_requests%rowtype;
begin
 if uid is null or p_app_id is null or p_version_id is null or p_listing_id is null then raise exception 'User, app, version and listing are required'; end if;
 if platform_name not in ('apple','google_play') then raise exception 'Invalid platform'; end if;
 if request_key='' or char_length(request_key)>160 or request_key !~ '^[A-Za-z0-9._:-]+$' then raise exception 'Invalid request id'; end if;
 perform pg_advisory_xact_lock(hashtextextended(uid::text||':'||p_app_id::text||':'||platform_name,99317));
 select * into existing from public.publish_requests where requested_by=uid and source_request_id=request_key for update;
 if found then
  if existing.app_id<>p_app_id or existing.version_id is distinct from p_version_id or existing.store_listing_id is distinct from p_listing_id or existing.platform<>platform_name then raise exception 'Request id already belongs to another store publish operation'; end if;
  return jsonb_build_object('success',true,'replayed',true,'id',existing.id,'app_id',existing.app_id,'version_id',existing.version_id,'platform',existing.platform,'status',existing.status,'created_at',existing.created_at);
 end if;
 select * into app_row from public.apps where id=p_app_id and owner_id=uid for update;
 if not found then raise exception 'Owned app not found'; end if;
 if app_row.current_version_id is distinct from p_version_id then raise exception 'STALE_STORE_VERSION'; end if;
 if not exists(select 1 from public.app_versions v where v.id=p_version_id and v.app_id=p_app_id) then raise exception 'Store version not found'; end if;
 select * into listing_row from public.store_listings where id=p_listing_id and app_id=p_app_id for update;
 if not found then raise exception 'Store listing not found'; end if;
 if listing_row.version_id is distinct from p_version_id then raise exception 'Store listing version mismatch'; end if;
 if listing_row.customer_approved_at is null then raise exception 'Customer approval required'; end if;
 insert into public.publish_requests(app_id,version_id,store_listing_id,platform,status,requested_by,customer_approved_at,source_request_id,metadata) values(p_app_id,p_version_id,p_listing_id,platform_name,'customer_approved',uid,listing_row.customer_approved_at,request_key,jsonb_build_object('preparationOnly',true,'officialSubmissionConfirmed',false)) returning * into created;
 return jsonb_build_object('success',true,'replayed',false,'id',created.id,'app_id',created.app_id,'version_id',created.version_id,'platform',created.platform,'status',created.status,'created_at',created.created_at);
end;$$;
revoke all on function public.server_create_store_publish_request(uuid,uuid,uuid,uuid,text,text) from public,anon,authenticated;
grant execute on function public.server_create_store_publish_request(uuid,uuid,uuid,uuid,text,text) to service_role;