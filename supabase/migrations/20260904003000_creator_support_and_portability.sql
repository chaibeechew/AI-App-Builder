-- Batch 43: Creator Encouragement Program + post-publish portability agreement.
-- Creator Support is individual-only, one-time-code based, 3 months per approved redemption.
-- Admin may choose automatic or manual approval. External migration remains allowed after
-- a post-publish 10% revenue-share agreement is signed for that project.

alter table public.app_builder_account_access
  add column if not exists creator_support_valid_from timestamptz,
  add column if not exists creator_support_valid_until timestamptz,
  add column if not exists creator_support_extension_count integer not null default 0,
  add column if not exists creator_support_last_request_id uuid;

create table if not exists public.creator_support_settings (
  singleton_id smallint primary key default 1 check (singleton_id = 1),
  approval_mode text not null default 'manual' check (approval_mode in ('auto','manual')),
  extension_months integer not null default 3 check (extension_months between 1 and 12),
  code_valid_days integer not null default 7 check (code_valid_days between 1 and 30),
  updated_by uuid references auth.users(id),
  updated_at timestamptz not null default now()
);
insert into public.creator_support_settings(singleton_id) values(1) on conflict(singleton_id) do nothing;

create table if not exists public.creator_support_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  unfinished_project_id uuid references public.apps(id) on delete set null,
  reason text,
  individual_attested boolean not null default false,
  status text not null default 'pending' check (status in ('pending','approved','rejected','redeemed','expired','cancelled')),
  approval_mode text check (approval_mode in ('auto','manual')),
  decision_reason text,
  requested_at timestamptz not null default now(),
  decided_at timestamptz,
  decided_by uuid references auth.users(id),
  redeemed_at timestamptz
);
create unique index if not exists creator_support_one_open_request_per_user
  on public.creator_support_requests(user_id) where status in ('pending','approved');
create index if not exists creator_support_requests_queue_idx
  on public.creator_support_requests(status, requested_at desc);

create table if not exists public.creator_support_codes (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null unique references public.creator_support_requests(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  code text not null unique,
  issued_mode text not null check (issued_mode in ('auto','manual')),
  issued_by uuid references auth.users(id),
  issued_at timestamptz not null default now(),
  valid_until timestamptz not null,
  redeemed_at timestamptz,
  revoked_at timestamptz,
  revoked_by uuid references auth.users(id)
);
create index if not exists creator_support_codes_user_idx
  on public.creator_support_codes(user_id, issued_at desc);

create table if not exists public.creator_support_audit (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  request_id uuid references public.creator_support_requests(id) on delete set null,
  actor_type text not null check (actor_type in ('user','admin','system')),
  actor_user_id uuid references auth.users(id) on delete set null,
  action text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists creator_support_audit_user_idx
  on public.creator_support_audit(user_id, created_at desc);

create table if not exists public.project_migration_agreements (
  id uuid primary key default gen_random_uuid(),
  app_id uuid not null unique references public.apps(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  terms_version text not null,
  revenue_share_percent numeric(5,2) not null default 10.00 check (revenue_share_percent = 10.00),
  scope text not null default 'project_software_revenue',
  signed_at timestamptz not null default now(),
  acknowledged_customer_ownership boolean not null default true,
  acknowledged_no_platform_lock_in boolean not null default true,
  acknowledged_continuing_share_after_migration boolean not null default true,
  revoked_at timestamptz
);
create index if not exists project_migration_agreements_user_idx
  on public.project_migration_agreements(user_id, signed_at desc);

alter table public.creator_support_settings enable row level security;
alter table public.creator_support_requests enable row level security;
alter table public.creator_support_codes enable row level security;
alter table public.creator_support_audit enable row level security;
alter table public.project_migration_agreements enable row level security;
revoke all on public.creator_support_settings from anon,authenticated;
revoke all on public.creator_support_requests from anon,authenticated;
revoke all on public.creator_support_codes from anon,authenticated;
revoke all on public.creator_support_audit from anon,authenticated;
revoke all on public.project_migration_agreements from anon,authenticated;

create or replace function public.get_creator_support_status()
returns jsonb language plpgsql security definer set search_path='' as $$
declare
  uid uuid:=auth.uid();
  access_row public.app_builder_account_access;
  request_row public.creator_support_requests;
  code_row public.creator_support_codes;
  free_used boolean:=false;
  has_unfinished boolean:=false;
  active boolean:=false;
begin
  if uid is null then return jsonb_build_object('authenticated',false); end if;
  select * into access_row from public.app_builder_account_access where user_id=uid;
  active:=access_row.creator_support_valid_until is not null and access_row.creator_support_valid_until>now();
  select coalesce(free_first_project_claimed,false) into free_used from public.app_builder_usage where user_id=uid;
  select exists(select 1 from public.apps a where a.owner_id=uid and coalesce(a.publish_status,'draft')<>'published') into has_unfinished;
  select * into request_row from public.creator_support_requests where user_id=uid order by requested_at desc limit 1;
  if request_row.id is not null then select * into code_row from public.creator_support_codes where request_id=request_row.id; end if;
  return jsonb_build_object(
    'authenticated',true,'individualOnly',true,'active',active,
    'validFrom',access_row.creator_support_valid_from,'validUntil',access_row.creator_support_valid_until,
    'extensionCount',coalesce(access_row.creator_support_extension_count,0),
    'eligible',free_used and has_unfinished and not active and coalesce(request_row.status,'') not in ('pending','approved'),
    'freeAccessUsed',free_used,'hasUnfinishedProject',has_unfinished,
    'request',case when request_row.id is null then null else jsonb_build_object('id',request_row.id,'status',request_row.status,'approvalMode',request_row.approval_mode,'requestedAt',request_row.requested_at,'decidedAt',request_row.decided_at,'decisionReason',request_row.decision_reason) end,
    'verifyCode',case when code_row.id is not null and code_row.redeemed_at is null and code_row.revoked_at is null and code_row.valid_until>now() then code_row.code else null end,
    'verifyCodeValidUntil',case when code_row.id is not null then code_row.valid_until else null end
  );
end;$$;

create or replace function public.request_creator_support(p_reason text default null,p_individual_attested boolean default false)
returns jsonb language plpgsql security definer set search_path='' as $$
declare
  uid uuid:=auth.uid(); settings_row public.creator_support_settings; request_id uuid; project_id uuid;
  code_value text; code_until timestamptz; free_used boolean:=false; current_support timestamptz; account_type text;
begin
  if uid is null then raise exception 'Authentication required'; end if;
  if not p_individual_attested then raise exception 'Individual Creator confirmation is required'; end if;
  select coalesce(raw_app_meta_data->>'account_type','individual') into account_type from auth.users where id=uid;
  if lower(coalesce(account_type,'individual')) in ('business','team','enterprise','organization') then raise exception 'Creator Support is for individual Creator accounts only'; end if;
  select coalesce(free_first_project_claimed,false) into free_used from public.app_builder_usage where user_id=uid;
  if not free_used then raise exception 'Creator Support becomes available after the first free access has been used'; end if;
  insert into public.app_builder_account_access(user_id) values(uid) on conflict(user_id) do nothing;
  select creator_support_valid_until into current_support from public.app_builder_account_access where user_id=uid for update;
  if current_support is not null and current_support>now() then raise exception 'Creator Support is already active'; end if;
  if exists(select 1 from public.creator_support_requests where user_id=uid and status in ('pending','approved')) then raise exception 'A Creator Support request is already open'; end if;
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

create or replace function public.admin_review_creator_support(p_request_id uuid,p_decision text,p_reason text default null)
returns jsonb language plpgsql security definer set search_path='' as $$
declare admin_id uuid:=auth.uid(); req public.creator_support_requests; settings_row public.creator_support_settings; code_value text; code_until timestamptz;
begin
  if admin_id is null or coalesce((select raw_app_meta_data->>'role' from auth.users where id=admin_id),'')<>'admin' then raise exception 'Admin access required'; end if;
  if p_decision not in ('approve','reject') then raise exception 'Invalid decision'; end if;
  select * into req from public.creator_support_requests where id=p_request_id for update;
  if not found or req.status<>'pending' then raise exception 'Request is not pending'; end if;
  if p_decision='reject' then
    update public.creator_support_requests set status='rejected',decided_at=now(),decided_by=admin_id,decision_reason=nullif(left(trim(coalesce(p_reason,'')),500),'') where id=req.id;
    insert into public.creator_support_audit(user_id,request_id,actor_type,actor_user_id,action,metadata) values(req.user_id,req.id,'admin',admin_id,'creator_support.reject',jsonb_build_object('reason',p_reason));
    return jsonb_build_object('success',true,'status','rejected');
  end if;
  select * into settings_row from public.creator_support_settings where singleton_id=1;
  code_value:='CREATOR-'||upper(encode(gen_random_bytes(6),'hex')); code_until:=now()+make_interval(days=>settings_row.code_valid_days);
  update public.creator_support_requests set status='approved',approval_mode='manual',decided_at=now(),decided_by=admin_id,decision_reason=nullif(left(trim(coalesce(p_reason,'Approved by Admin')),500),'') where id=req.id;
  insert into public.creator_support_codes(request_id,user_id,code,issued_mode,issued_by,valid_until) values(req.id,req.user_id,code_value,'manual',admin_id,code_until);
  insert into public.creator_support_audit(user_id,request_id,actor_type,actor_user_id,action,metadata) values(req.user_id,req.id,'admin',admin_id,'creator_support.approve',jsonb_build_object('codeValidUntil',code_until));
  return jsonb_build_object('success',true,'status','approved','verifyCode',code_value,'verifyCodeValidUntil',code_until,'userId',req.user_id);
end;$$;

create or replace function public.redeem_creator_support_code(p_code text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid(); code_row public.creator_support_codes; settings_row public.creator_support_settings; support_from timestamptz:=now(); support_until timestamptz;
begin
  if uid is null then raise exception 'Authentication required'; end if;
  if p_code is null or char_length(trim(p_code))<10 or char_length(trim(p_code))>64 then raise exception 'Invalid Creator Support code'; end if;
  select * into code_row from public.creator_support_codes where code=upper(trim(p_code)) and user_id=uid for update;
  if not found then raise exception 'Code is invalid for this account'; end if;
  if code_row.revoked_at is not null then raise exception 'Code has been revoked'; end if;
  if code_row.redeemed_at is not null then raise exception 'Code has already been redeemed'; end if;
  if code_row.valid_until<=now() then update public.creator_support_requests set status='expired' where id=code_row.request_id and status='approved'; raise exception 'Code has expired'; end if;
  select * into settings_row from public.creator_support_settings where singleton_id=1;
  support_until:=support_from+make_interval(months=>settings_row.extension_months);
  insert into public.app_builder_account_access(user_id,creator_support_valid_from,creator_support_valid_until,creator_support_extension_count,creator_support_last_request_id,pro_valid_from,pro_valid_until,game_access_plan,updated_at)
  values(uid,support_from,support_until,1,code_row.request_id,support_from,support_until,'full',now())
  on conflict(user_id) do update set creator_support_valid_from=support_from,creator_support_valid_until=support_until,creator_support_extension_count=public.app_builder_account_access.creator_support_extension_count+1,creator_support_last_request_id=code_row.request_id,pro_valid_from=coalesce(public.app_builder_account_access.pro_valid_from,support_from),pro_valid_until=case when public.app_builder_account_access.pro_valid_until is null then support_until else greatest(public.app_builder_account_access.pro_valid_until,support_until) end,game_access_plan='full',updated_at=now();
  update public.creator_support_codes set redeemed_at=now() where id=code_row.id;
  update public.creator_support_requests set status='redeemed',redeemed_at=now() where id=code_row.request_id;
  insert into public.user_entitlements(user_id,source_type,source_id,valid_from,valid_until) values(uid,'admin',code_row.request_id,support_from,support_until);
  insert into public.creator_support_audit(user_id,request_id,actor_type,actor_user_id,action,metadata) values(uid,code_row.request_id,'user',uid,'creator_support.redeem',jsonb_build_object('validUntil',support_until,'allFeatures',true,'individualOnly',true));
  return jsonb_build_object('success',true,'allFeatures',true,'individualOnly',true,'validFrom',support_from,'validUntil',support_until,'extensionMonths',settings_row.extension_months);
end;$$;

create or replace function public.admin_set_creator_support_mode(p_mode text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare admin_id uuid:=auth.uid();
begin
  if admin_id is null or coalesce((select raw_app_meta_data->>'role' from auth.users where id=admin_id),'')<>'admin' then raise exception 'Admin access required'; end if;
  if p_mode not in ('auto','manual') then raise exception 'Invalid approval mode'; end if;
  update public.creator_support_settings set approval_mode=p_mode,updated_by=admin_id,updated_at=now() where singleton_id=1;
  insert into public.admin_audit_log(admin_user_id,action,target_type,metadata) values(admin_id,'creator_support.mode_change','creator_support_settings',jsonb_build_object('approvalMode',p_mode));
  return jsonb_build_object('success',true,'approvalMode',p_mode);
end;$$;

create or replace function public.get_project_migration_agreement(p_app_id uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid(); app_row public.apps; agreement public.project_migration_agreements;
begin
  if uid is null then raise exception 'Authentication required'; end if;
  select * into app_row from public.apps where id=p_app_id and owner_id=uid;
  if not found then raise exception 'Project not found'; end if;
  select * into agreement from public.project_migration_agreements where app_id=p_app_id and user_id=uid and revoked_at is null;
  return jsonb_build_object('projectId',p_app_id,'published',coalesce(app_row.publish_status,'draft')='published','migrationAllowed',agreement.id is not null,'agreement',case when agreement.id is null then null else jsonb_build_object('termsVersion',agreement.terms_version,'revenueSharePercent',agreement.revenue_share_percent,'scope',agreement.scope,'signedAt',agreement.signed_at,'customerOwnership',agreement.acknowledged_customer_ownership,'noPlatformLockIn',agreement.acknowledged_no_platform_lock_in) end);
end;$$;

create or replace function public.sign_project_migration_agreement(p_app_id uuid,p_terms_version text,p_acknowledge_10_percent boolean default false)
returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid(); app_row public.apps; agreement_id uuid;
begin
  if uid is null then raise exception 'Authentication required'; end if;
  if not p_acknowledge_10_percent then raise exception '10 percent revenue share acknowledgement is required'; end if;
  if p_terms_version is null or char_length(trim(p_terms_version))<3 or char_length(trim(p_terms_version))>80 then raise exception 'Invalid terms version'; end if;
  select * into app_row from public.apps where id=p_app_id and owner_id=uid;
  if not found then raise exception 'Project not found'; end if;
  if coalesce(app_row.publish_status,'draft')<>'published' then raise exception 'Migration agreement becomes available after publish'; end if;
  insert into public.project_migration_agreements(app_id,user_id,terms_version,revenue_share_percent,scope,acknowledged_customer_ownership,acknowledged_no_platform_lock_in,acknowledged_continuing_share_after_migration)
  values(p_app_id,uid,trim(p_terms_version),10.00,'project_software_revenue',true,true,true)
  on conflict(app_id) do update set terms_version=excluded.terms_version,revenue_share_percent=10.00,scope=excluded.scope,signed_at=now(),acknowledged_customer_ownership=true,acknowledged_no_platform_lock_in=true,acknowledged_continuing_share_after_migration=true,revoked_at=null
  returning id into agreement_id;
  return jsonb_build_object('success',true,'agreementId',agreement_id,'projectId',p_app_id,'migrationAllowed',true,'revenueSharePercent',10,'customerOwnership','customer','platformLockIn',false,'migrationFee',false);
end;$$;

revoke all on function public.get_creator_support_status() from public,anon;
revoke all on function public.request_creator_support(text,boolean) from public,anon;
revoke all on function public.admin_review_creator_support(uuid,text,text) from public,anon;
revoke all on function public.redeem_creator_support_code(text) from public,anon;
revoke all on function public.admin_set_creator_support_mode(text) from public,anon;
revoke all on function public.get_project_migration_agreement(uuid) from public,anon;
revoke all on function public.sign_project_migration_agreement(uuid,text,boolean) from public,anon;
grant execute on function public.get_creator_support_status() to authenticated;
grant execute on function public.request_creator_support(text,boolean) to authenticated;
grant execute on function public.admin_review_creator_support(uuid,text,text) to authenticated;
grant execute on function public.redeem_creator_support_code(text) to authenticated;
grant execute on function public.admin_set_creator_support_mode(text) to authenticated;
grant execute on function public.get_project_migration_agreement(uuid) to authenticated;
grant execute on function public.sign_project_migration_agreement(uuid,text,boolean) to authenticated;
