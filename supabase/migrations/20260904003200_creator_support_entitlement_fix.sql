-- Correct the Creator Support entitlement ledger write and keep redemption idempotent.
create or replace function public.redeem_creator_support_code(p_code text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare
  uid uuid:=auth.uid();
  code_row public.creator_support_codes;
  settings_row public.creator_support_settings;
  support_from timestamptz:=now();
  support_until timestamptz;
begin
  if uid is null then raise exception 'Authentication required'; end if;
  if p_code is null or char_length(trim(p_code))<10 or char_length(trim(p_code))>64 then raise exception 'Invalid Creator Support code'; end if;

  select * into code_row
  from public.creator_support_codes
  where code=upper(trim(p_code)) and user_id=uid
  for update;

  if not found then raise exception 'Code is invalid for this account'; end if;
  if code_row.revoked_at is not null then raise exception 'Code has been revoked'; end if;
  if code_row.redeemed_at is not null then raise exception 'Code has already been redeemed'; end if;
  if code_row.valid_until<=now() then
    update public.creator_support_requests set status='expired' where id=code_row.request_id and status='approved';
    raise exception 'Code has expired';
  end if;

  select * into settings_row from public.creator_support_settings where singleton_id=1;
  support_until:=support_from+make_interval(months=>settings_row.extension_months);

  insert into public.app_builder_account_access(
    user_id,creator_support_valid_from,creator_support_valid_until,
    creator_support_extension_count,creator_support_last_request_id,
    pro_valid_from,pro_valid_until,game_access_plan,updated_at
  ) values(
    uid,support_from,support_until,1,code_row.request_id,
    support_from,support_until,'full',now()
  )
  on conflict(user_id) do update set
    creator_support_valid_from=support_from,
    creator_support_valid_until=support_until,
    creator_support_extension_count=public.app_builder_account_access.creator_support_extension_count+1,
    creator_support_last_request_id=code_row.request_id,
    pro_valid_from=coalesce(public.app_builder_account_access.pro_valid_from,support_from),
    pro_valid_until=case
      when public.app_builder_account_access.pro_valid_until is null then support_until
      else greatest(public.app_builder_account_access.pro_valid_until,support_until)
    end,
    game_access_plan='full',
    updated_at=now();

  insert into public.user_entitlements(
    user_id,source_type,source_id,entitlement_type,amount,valid_from,valid_until,metadata
  ) values(
    uid,'admin',code_row.request_id,'creator_support_all_features',1,support_from,support_until,
    jsonb_build_object('program','creator_encouragement','individualOnly',true,'allFeatures',true,'extensionMonths',settings_row.extension_months)
  )
  on conflict(source_type,source_id,entitlement_type)
  where source_id is not null
  do update set amount=excluded.amount,valid_from=excluded.valid_from,valid_until=excluded.valid_until,metadata=excluded.metadata;

  update public.creator_support_codes set redeemed_at=now() where id=code_row.id;
  update public.creator_support_requests set status='redeemed',redeemed_at=now() where id=code_row.request_id;
  insert into public.creator_support_audit(user_id,request_id,actor_type,actor_user_id,action,metadata)
  values(uid,code_row.request_id,'user',uid,'creator_support.redeem',jsonb_build_object('validUntil',support_until,'allFeatures',true,'individualOnly',true));

  return jsonb_build_object(
    'success',true,'allFeatures',true,'individualOnly',true,
    'validFrom',support_from,'validUntil',support_until,
    'extensionMonths',settings_row.extension_months
  );
end;$$;

revoke all on function public.redeem_creator_support_code(text) from public,anon;
grant execute on function public.redeem_creator_support_code(text) to authenticated;
