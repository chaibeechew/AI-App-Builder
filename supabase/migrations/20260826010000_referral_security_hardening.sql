create or replace function public.verify_referral_for_current_user()
returns public.referrals
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  referral_row public.referrals;
  is_verified boolean := false;
begin
  if current_user_id is null then
    raise exception 'Authentication required';
  end if;

  select (
    au.confirmed_at is not null
    or au.email_confirmed_at is not null
    or au.phone_confirmed_at is not null
  )
  into is_verified
  from auth.users au
  where au.id = current_user_id;

  if not is_verified then
    raise exception 'Account verification is required';
  end if;

  select r.*
  into referral_row
  from public.referrals r
  where r.referred_user_id = current_user_id
  limit 1;

  if referral_row.id is null then
    return null;
  end if;

  if referral_row.referrer_user_id = current_user_id then
    update public.referrals
    set status = 'rejected'
    where id = referral_row.id;
    raise exception 'Self-referral is not allowed';
  end if;

  if referral_row.status = 'registered' then
    update public.referrals
    set status = 'verified', verified_at = coalesce(verified_at, now())
    where id = referral_row.id
      and referred_user_id = current_user_id
      and status = 'registered'
    returning * into referral_row;
  else
    select r.* into referral_row
    from public.referrals r
    where r.id = referral_row.id;
  end if;

  return referral_row;
end;
$$;

create or replace function public.record_first_app_referral_reward()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  referrer_id uuid;
  referral_row_id uuid;
  is_verified boolean := false;
  referral_status text;
begin
  if current_user_id is null then
    return;
  end if;

  select (
    au.confirmed_at is not null
    or au.email_confirmed_at is not null
    or au.phone_confirmed_at is not null
  )
  into is_verified
  from auth.users au
  where au.id = current_user_id;

  if not is_verified then
    return;
  end if;

  select r.id, r.referrer_user_id, r.status
  into referral_row_id, referrer_id, referral_status
  from public.referrals r
  where r.referred_user_id = current_user_id
  limit 1;

  if referral_row_id is null or referrer_id is null or referrer_id = current_user_id then
    return;
  end if;

  if referral_status not in ('verified', 'qualified') then
    return;
  end if;

  update public.referrals
  set status = 'qualified', qualified_at = coalesce(qualified_at, now())
  where id = referral_row_id
    and referred_user_id = current_user_id
    and referrer_user_id = referrer_id
    and status in ('verified', 'qualified');

  insert into public.referral_rewards (
    referrer_user_id,
    referred_user_id,
    referral_id,
    reward_type,
    amount,
    status,
    metadata
  )
  values (
    referrer_id,
    current_user_id,
    referral_row_id,
    'first_app_created',
    0,
    'pending',
    jsonb_build_object('condition', 'verified_user_created_first_app')
  )
  on conflict (referred_user_id, reward_type) do nothing;
end;
$$;

revoke execute on function public.verify_referral_for_current_user() from public, anon;
grant execute on function public.verify_referral_for_current_user() to authenticated;
revoke execute on function public.record_first_app_referral_reward() from public, anon;
grant execute on function public.record_first_app_referral_reward() to authenticated;
