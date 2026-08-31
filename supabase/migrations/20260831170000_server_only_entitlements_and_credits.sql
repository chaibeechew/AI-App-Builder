-- Server-only financial/access RPCs. Phase A keeps legacy authenticated RPC grants temporarily
-- so the currently deployed Preview keeps working until the single consolidated code deployment.
-- After Preview is verified, the cleanup migration revokes legacy authenticated execution.

insert into public.app_builder_project_access(app_id,user_id,access_tier,valid_until,source_request_id,updated_at)
select first_app.id,u.user_id,'promotion',null,null,now()
from public.app_builder_usage u
cross join lateral (
  select a.id,a.publish_status from public.apps a
  where a.owner_id=u.user_id
  order by a.created_at asc,a.id asc limit 1
) first_app
where u.free_first_project_claimed=true
  and coalesce(first_app.publish_status,'draft') <> 'published'
  and not exists(select 1 from public.app_builder_project_access pa where pa.user_id=u.user_id)
on conflict (app_id) do nothing;

create or replace function public.server_consume_app_builder_entitlement(
  p_user_id uuid,p_operation text,p_app_id uuid default null,p_request_id text default null
) returns jsonb language plpgsql security definer set search_path='' as $$
declare
  uid uuid:=p_user_id;
  request_key text:=left(coalesce(nullif(trim(p_request_id),''),gen_random_uuid()::text),160);
  usage_row public.app_builder_usage;
  account_row public.app_builder_account_access;
  project_row public.app_builder_project_access;
begin
  if uid is null then raise exception 'User id is required'; end if;
  if p_operation not in ('create','modify') then raise exception 'Unsupported entitlement operation'; end if;
  insert into public.app_builder_usage(user_id) values(uid) on conflict(user_id) do nothing;
  insert into public.app_builder_account_access(user_id) values(uid) on conflict(user_id) do nothing;
  select * into usage_row from public.app_builder_usage where user_id=uid for update;
  select * into account_row from public.app_builder_account_access where user_id=uid for update;

  if p_operation='create' then
    if usage_row.create_source is not null then
      if usage_row.create_request_id=request_key then
        return jsonb_build_object('allowed',true,'source',usage_row.create_source,'replayed',true);
      end if;
      raise exception 'Another creation request is already in progress';
    end if;
    if not usage_row.free_first_project_claimed and not exists(select 1 from public.apps a where a.owner_id=uid) then
      update public.app_builder_usage set free_first_project_claimed=true,create_request_id=request_key,create_source='free_first_project_create',create_claimed_at=now(),updated_at=now() where user_id=uid;
      return jsonb_build_object('allowed',true,'source','free_first_project_create','promotion','free_first_project_until_publish');
    end if;
    if account_row.pro_valid_until is not null and account_row.pro_valid_until>now() then
      update public.app_builder_usage set create_request_id=request_key,create_source='pro_access',create_claimed_at=now(),updated_at=now() where user_id=uid;
      return jsonb_build_object('allowed',true,'source','pro_access','valid_until',account_row.pro_valid_until);
    end if;
    if account_row.standard_project_credits>0 then
      update public.app_builder_account_access set standard_project_credits=standard_project_credits-1,updated_at=now() where user_id=uid;
      update public.app_builder_usage set create_request_id=request_key,create_source='standard_project_create',create_claimed_at=now(),updated_at=now() where user_id=uid;
      return jsonb_build_object('allowed',true,'source','standard_project_create');
    end if;
    return jsonb_build_object('allowed',false,'source',null);
  end if;

  if p_app_id is null then return jsonb_build_object('allowed',false,'source',null); end if;
  if not exists(select 1 from public.apps a where a.id=p_app_id and a.owner_id=uid) then raise exception 'App access denied'; end if;
  select * into project_row from public.app_builder_project_access pa where pa.app_id=p_app_id and pa.user_id=uid;
  if found then
    if project_row.access_tier='promotion' and exists(select 1 from public.apps a where a.id=p_app_id and a.owner_id=uid and a.publish_status<>'published') then return jsonb_build_object('allowed',true,'source','free_first_project_modify','ends_at','project_publish'); end if;
    if project_row.access_tier='standard' then return jsonb_build_object('allowed',true,'source','standard_project_modify'); end if;
    if project_row.access_tier='professional' and project_row.valid_until is not null and project_row.valid_until>now() then return jsonb_build_object('allowed',true,'source','pro_access','valid_until',project_row.valid_until); end if;
  end if;
  if account_row.pro_valid_until is not null and account_row.pro_valid_until>now() then return jsonb_build_object('allowed',true,'source','pro_access','valid_until',account_row.pro_valid_until); end if;
  return jsonb_build_object('allowed',false,'source',null);
end;$$;

create or replace function public.server_bind_app_builder_project_access(p_user_id uuid,p_app_id uuid,p_request_id text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare
  uid uuid:=p_user_id;request_key text:=left(coalesce(nullif(trim(p_request_id),''),''),160);usage_row public.app_builder_usage;account_row public.app_builder_account_access;tier text;expiry timestamptz;
begin
  if uid is null or request_key='' then raise exception 'User id and request id are required'; end if;
  if not exists(select 1 from public.apps a where a.id=p_app_id and a.owner_id=uid) then raise exception 'App access denied'; end if;
  if exists(select 1 from public.app_builder_project_access pa where pa.app_id=p_app_id and pa.user_id=uid and pa.source_request_id=request_key) then return jsonb_build_object('bound',false,'replayed',true); end if;
  select * into usage_row from public.app_builder_usage where user_id=uid for update;
  if not found or usage_row.create_request_id is distinct from request_key or usage_row.create_source is null then raise exception 'No matching creation entitlement reservation'; end if;
  select * into account_row from public.app_builder_account_access where user_id=uid;
  if usage_row.create_source='free_first_project_create' then tier:='promotion';
  elsif usage_row.create_source='standard_project_create' then tier:='standard';
  elsif usage_row.create_source='pro_access' then tier:='professional';expiry:=account_row.pro_valid_until;if expiry is null or expiry<=now() then raise exception 'Professional access expired before project binding'; end if;
  else raise exception 'Unsupported entitlement source'; end if;
  insert into public.app_builder_project_access(app_id,user_id,access_tier,valid_until,source_request_id,updated_at) values(p_app_id,uid,tier,expiry,request_key,now())
  on conflict(app_id) do update set user_id=excluded.user_id,access_tier=excluded.access_tier,valid_until=excluded.valid_until,source_request_id=excluded.source_request_id,updated_at=now();
  update public.app_builder_usage set create_request_id=null,create_source=null,create_claimed_at=null,updated_at=now() where user_id=uid;
  return jsonb_build_object('bound',true,'tier',tier,'valid_until',expiry);
end;$$;

create or replace function public.server_restore_failed_app_builder_create(p_user_id uuid,p_request_id text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid:=p_user_id;request_key text:=left(coalesce(nullif(trim(p_request_id),''),''),160);usage_row public.app_builder_usage;
begin
  if uid is null or request_key='' then return jsonb_build_object('restored',false); end if;
  select * into usage_row from public.app_builder_usage where user_id=uid for update;
  if not found or usage_row.create_request_id is distinct from request_key or usage_row.create_source is null then return jsonb_build_object('restored',false); end if;
  if exists(select 1 from public.app_builder_project_access pa where pa.user_id=uid and pa.source_request_id=request_key) then return jsonb_build_object('restored',false,'reason','already_bound'); end if;
  if usage_row.create_source='free_first_project_create' then
    if exists(select 1 from public.apps a where a.owner_id=uid) then return jsonb_build_object('restored',false,'reason','project_exists'); end if;
    update public.app_builder_usage set free_first_project_claimed=false where user_id=uid;
  elsif usage_row.create_source='standard_project_create' then
    update public.app_builder_account_access set standard_project_credits=standard_project_credits+1,updated_at=now() where user_id=uid;
  end if;
  update public.app_builder_usage set create_request_id=null,create_source=null,create_claimed_at=null,updated_at=now() where user_id=uid;
  return jsonb_build_object('restored',true,'source',usage_row.create_source);
end;$$;

create or replace function public.server_consume_ai_credits(p_user_id uuid,p_amount numeric,p_request_id text,p_description text default null,p_metadata jsonb default '{}'::jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid:=p_user_id;request_key text:=left(coalesce(nullif(trim(p_request_id),''),''),160);current_balance numeric;existing_id uuid;
begin
  if uid is null then raise exception 'User id is required'; end if;
  if p_amount is null or p_amount<=0 or p_amount>100000 then raise exception 'Invalid credit amount'; end if;
  if request_key='' then raise exception 'Request id is required'; end if;
  insert into public.credit_accounts(user_id,balance) values(uid,0) on conflict(user_id) do nothing;
  select balance into current_balance from public.credit_accounts where user_id=uid for update;
  select id into existing_id from public.credit_transactions where user_id=uid and request_id=request_key and type='ai_usage' limit 1;
  if existing_id is not null then return jsonb_build_object('charged',false,'balance',current_balance,'replayed',true); end if;
  if current_balance<p_amount then raise exception 'Insufficient credits'; end if;
  update public.credit_accounts set balance=balance-p_amount,updated_at=now() where user_id=uid returning balance into current_balance;
  insert into public.credit_transactions(user_id,amount,type,description,request_id,metadata) values(uid,-p_amount,'ai_usage',left(coalesce(p_description,'AI usage'),500),request_key,coalesce(p_metadata,'{}'::jsonb));
  return jsonb_build_object('charged',true,'balance',current_balance);
end;$$;

create or replace function public.server_refund_ai_credits(p_user_id uuid,p_request_id text,p_amount numeric,p_description text default null,p_metadata jsonb default '{}'::jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid:=p_user_id;request_key text:=left(coalesce(nullif(trim(p_request_id),''),''),160);current_balance numeric;charge_amount numeric;existing_refund uuid;
begin
  if uid is null then raise exception 'User id is required'; end if;
  if p_amount is null or p_amount<=0 or request_key='' then raise exception 'Invalid refund request'; end if;
  insert into public.credit_accounts(user_id,balance) values(uid,0) on conflict(user_id) do nothing;
  select balance into current_balance from public.credit_accounts where user_id=uid for update;
  select amount into charge_amount from public.credit_transactions where user_id=uid and request_id=request_key and type='ai_usage' limit 1;
  if charge_amount is null then return jsonb_build_object('refunded',false,'balance',current_balance,'reason','charge_not_found'); end if;
  if abs(charge_amount)<>p_amount then raise exception 'Refund amount does not match original charge'; end if;
  select id into existing_refund from public.credit_transactions where user_id=uid and request_id=request_key and type='ai_refund' limit 1;
  if existing_refund is not null then return jsonb_build_object('refunded',false,'balance',current_balance,'replayed',true); end if;
  update public.credit_accounts set balance=balance+p_amount,updated_at=now() where user_id=uid returning balance into current_balance;
  insert into public.credit_transactions(user_id,amount,type,description,request_id,metadata) values(uid,p_amount,'ai_refund',left(coalesce(p_description,'AI usage refund'),500),request_key,coalesce(p_metadata,'{}'::jsonb));
  return jsonb_build_object('refunded',true,'balance',current_balance);
end;$$;

revoke all on function public.server_consume_app_builder_entitlement(uuid,text,uuid,text) from public,anon,authenticated;
revoke all on function public.server_bind_app_builder_project_access(uuid,uuid,text) from public,anon,authenticated;
revoke all on function public.server_restore_failed_app_builder_create(uuid,text) from public,anon,authenticated;
revoke all on function public.server_consume_ai_credits(uuid,numeric,text,text,jsonb) from public,anon,authenticated;
revoke all on function public.server_refund_ai_credits(uuid,text,numeric,text,jsonb) from public,anon,authenticated;
grant execute on function public.server_consume_app_builder_entitlement(uuid,text,uuid,text) to service_role;
grant execute on function public.server_bind_app_builder_project_access(uuid,uuid,text) to service_role;
grant execute on function public.server_restore_failed_app_builder_create(uuid,text) to service_role;
grant execute on function public.server_consume_ai_credits(uuid,numeric,text,text,jsonb) to service_role;
grant execute on function public.server_refund_ai_credits(uuid,text,numeric,text,jsonb) to service_role;
