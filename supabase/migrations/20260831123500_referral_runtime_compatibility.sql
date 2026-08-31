-- Restore the referral RPCs used by the current auth and first-project flow.
-- This migration deliberately does not invent a referral credit amount. It verifies
-- attribution and first-project qualification only; any credit award remains a separate
-- trusted server action governed by the product's referral-credit policy.

create unique index if not exists referrals_one_referred_user_idx
  on public.referrals(referred_user_id)
  where referred_user_id is not null;

create unique index if not exists profiles_referral_code_ci_unique_idx
  on public.profiles(upper(referral_code))
  where referral_code is not null and length(trim(referral_code)) > 0;

create or replace function public.verify_referral_for_current_user()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  code text;
  referral_row public.referrals;
  referrer uuid;
begin
  if uid is null then raise exception 'Authentication required'; end if;

  select nullif(trim(coalesce(
    u.raw_user_meta_data ->> 'referral_code',
    u.raw_user_meta_data ->> 'referralCode',
    ''
  )), '')
  into code
  from auth.users u
  where u.id = uid;

  if code is null then
    return jsonb_build_object('verified', false, 'reason', 'no_referral_code');
  end if;

  select * into referral_row
  from public.referrals r
  where upper(coalesce(r.referral_code,'')) = upper(code)
    and r.referrer_id <> uid
    and (r.referred_user_id is null or r.referred_user_id = uid)
  order by (r.referred_user_id = uid) desc, r.created_at desc
  limit 1
  for update;

  if found then
    if exists(select 1 from public.referrals x where x.referred_user_id = uid and x.id <> referral_row.id) then
      return jsonb_build_object('verified', false, 'reason', 'already_attributed');
    end if;
    update public.referrals
      set referred_user_id = uid,
          status = case when status in ('qualified_first_app','rewarded') then status else 'verified' end
      where id = referral_row.id;
    return jsonb_build_object('verified', true, 'referralId', referral_row.id, 'status', 'verified');
  end if;

  select p.id into referrer
  from public.profiles p
  where upper(coalesce(p.referral_code,'')) = upper(code)
    and p.id <> uid
  limit 1;

  if referrer is null then
    return jsonb_build_object('verified', false, 'reason', 'invalid_referral_code');
  end if;
  if exists(select 1 from public.referrals x where x.referred_user_id = uid) then
    return jsonb_build_object('verified', false, 'reason', 'already_attributed');
  end if;

  insert into public.referrals(referrer_id,referred_user_id,referral_code,status)
  values(referrer,uid,upper(code),'verified')
  returning * into referral_row;

  return jsonb_build_object('verified', true, 'referralId', referral_row.id, 'status', 'verified');
end;
$$;

revoke all on function public.verify_referral_for_current_user() from public, anon, authenticated;
grant execute on function public.verify_referral_for_current_user() to authenticated;

create or replace function public.record_first_app_referral_reward()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  referral_row public.referrals;
begin
  if uid is null then raise exception 'Authentication required'; end if;

  if not exists(select 1 from public.apps a where a.owner_id = uid) then
    return jsonb_build_object('qualified', false, 'reason', 'first_project_not_created');
  end if;

  select * into referral_row
  from public.referrals r
  where r.referred_user_id = uid
  order by r.created_at asc
  limit 1
  for update;

  if not found then
    return jsonb_build_object('qualified', false, 'reason', 'no_verified_referral');
  end if;

  if referral_row.referrer_id = uid then
    return jsonb_build_object('qualified', false, 'reason', 'self_referral_blocked');
  end if;

  if referral_row.status = 'qualified_first_app' or referral_row.status = 'rewarded' then
    return jsonb_build_object('qualified', true, 'replayed', true, 'status', referral_row.status);
  end if;

  if referral_row.status <> 'verified' then
    return jsonb_build_object('qualified', false, 'reason', 'referral_not_verified', 'status', referral_row.status);
  end if;

  update public.referrals
    set status = 'qualified_first_app'
    where id = referral_row.id;

  return jsonb_build_object(
    'qualified', true,
    'status', 'qualified_first_app',
    'rewardType', 'ai_app_credits',
    'cashPayout', false,
    'creditAwardPendingTrustedConfiguration', true
  );
end;
$$;

revoke all on function public.record_first_app_referral_reward() from public, anon, authenticated;
grant execute on function public.record_first_app_referral_reward() to authenticated;
