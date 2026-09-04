-- Harden Creator Support eligibility without weakening repeat-after-expiry behavior.

create or replace function public.get_creator_support_status()
returns jsonb language plpgsql security definer set search_path='' as $$
declare
  uid uuid:=auth.uid();
  access_row public.app_builder_account_access;
  request_row public.creator_support_requests;
  code_row public.creator_support_codes;
  free_used boolean:=false;
  has_unfinished boolean:=false;
  support_active boolean:=false;
  paid_active boolean:=false;
begin
  if uid is null then return jsonb_build_object('authenticated',false); end if;
  select * into access_row from public.app_builder_account_access where user_id=uid;
  support_active:=coalesce(access_row.creator_support_valid_until>now(),false);
  paid_active:=coalesce(access_row.pro_valid_until>now(),false) and not support_active;
  select coalesce((select free_first_project_claimed from public.app_builder_usage where user_id=uid),false) into free_used;
  select exists(select 1 from public.apps a where a.owner_id=uid and coalesce(a.publish_status,'draft')<>'published') into has_unfinished;
  select * into request_row from public.creator_support_requests where user_id=uid order by requested_at desc limit 1;
  if request_row.id is not null then select * into code_row from public.creator_support_codes where request_id=request_row.id; end if;
  return jsonb_build_object(
    'authenticated',true,'individualOnly',true,'active',support_active,
    'validFrom',access_row.creator_support_valid_from,'validUntil',access_row.creator_support_valid_until,
    'extensionCount',coalesce(access_row.creator_support_extension_count,0),
    'eligible',free_used and has_unfinished and not support_active and not paid_active and coalesce(request_row.status,'') not in ('pending','approved'),
    'freeAccessUsed',free_used,'hasUnfinishedProject',has_unfinished,'paidAccessActive',paid_active,
    'request',case when request_row.id is null then null else jsonb_build_object('id',request_row.id,'status',request_row.status,'approvalMode',request_row.approval_mode,'requestedAt',request_row.requested_at,'decidedAt',request_row.decided_at,'decisionReason',request_row.decision_reason) end,
    'verifyCode',case when code_row.id is not null and code_row.redeemed_at is null and code_row.revoked_at is null and code_row.valid_until>now() then code_row.code else null end,
    'verifyCodeValidUntil',case when code_row.id is not null then code_row.valid_until else null end
  );
end;$$;

create or replace function public.request_creator_support(p_reason text default null,p_individual_attested boolean default false)
returns jsonb language plpgsql security definer set search_path='' as $$
declare
  uid uuid:=auth.uid(); settings_row public.creator_support_settings; request_id uuid; project_id uuid;
  code_value text; code_until timestamptz; free_used boolean:=false; current_support timestamptz; current_paid timestamptz; account_type text;
begin
  if uid is null then raise exception 'Authentication required'; end if;
  if not p_individual_attested then raise exception 'Individual Creator confirmation is required'; end if;
  select coalesce(raw_app_meta_data->>'account_type','individual') into account_type from auth.users where id=uid;
  if lower(coalesce(account_type,'individual')) in ('business','team','enterprise','organization') then raise exception 'Creator Support is for individual Creator accounts only'; end if;
  select coalesce((select free_first_project_claimed from public.app_builder_usage where user_id=uid),false) into free_used;
  if not free_used then raise exception 'Creator Support becomes available after the first free access has been used'; end if;
  insert into public.app_builder_account_access(user_id) values(uid) on conflict(user_id) do nothing;
  select creator_support_valid_until,pro_valid_until into current_support,current_paid from public.app_builder_account_access where user_id=uid for update;
  if current_support is not null and current_support>now() then raise exception 'Creator Support is already active'; end if;
  if current_paid is not null and current_paid>now() and (current_support is null or current_support<=now()) then raise exception 'Paid access is already active'; end if;
  if exists(select 1 from public.creator_support_requests where user_id=uid and status in ('pending','approved')) then raise exception 'A Creator Support request is already open'; end if;
  if exists(select 1 from public.creator_support_requests where user_id=uid and requested_at>now()-interval '24 hours') then raise exception 'Please wait before submitting another Creator Support request'; end if;
  select a.id into project_id from public.apps a where a.owner_id=uid and coalesce(a.publish_status,'draft')<>'published' order by a.updated_at desc nulls last,a.created_at desc limit 1;
  if project_id is null then raise exception 'An unfinished project is required'; end if;
  select * into settings_row from public.creator_support_settings where singleton_id=1;
  insert into public.creator_support_requests(user_id,unfinished_project_id,reason,individual_attested,status,approval_mode)
  values(uid,project_id,nullif(left(trim(coalesce(p_reason,'')),800),''),true,case when settings_row.approval_mode='auto' then 'approved' else 'pending' end,settings_row.approval_mode)
  returning id into request_id;
  insert into public.creator_support_audit(user_id,request_id,actor_type,actor_user_id,action,metadata)
  values(uid,request_id,'user',uid,'creator_support.request',jsonb_build_object('approvalMode',settings_row.approval_mode,'individualOnly',true));
  if settings_row.approval_mode='auto' then
    code_value:='CREATOR-'||upper(encode(gen_random_bytes(6),'hex')); code_until:=now()+make_interval(days=>settings_row.code_valid_days);
    update public.creator_support_requests set decided_at=now(),decision_reason='Auto-approved by Creator Encouragement policy' where id=request_id;
    insert into public.creator_support_codes(request_id,user_id,code,issued_mode,valid_until) values(request_id,uid,code_value,'auto',code_until);
    insert into public.creator_support_audit(user_id,request_id,actor_type,action,metadata) values(uid,request_id,'system','creator_support.auto_approve',jsonb_build_object('codeValidUntil',code_until));
    return jsonb_build_object('success',true,'status','approved','approvalMode','auto','requestId',request_id,'verifyCode',code_value,'verifyCodeValidUntil',code_until);
  end if;
  return jsonb_build_object('success',true,'status','pending','approvalMode','manual','requestId',request_id);
end;$$;
