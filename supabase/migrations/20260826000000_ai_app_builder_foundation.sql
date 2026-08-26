create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  phone text,
  referral_code text not null unique,
  referred_by_user_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.apps (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  description text,
  source_prompt text not null,
  current_version_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.app_versions (
  id uuid primary key default gen_random_uuid(),
  app_id uuid not null references public.apps(id) on delete cascade,
  version_no integer not null,
  specification jsonb not null,
  change_summary text,
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (app_id, version_no)
);

alter table public.apps
  drop constraint if exists apps_current_version_id_fkey;

alter table public.apps
  add constraint apps_current_version_id_fkey
  foreign key (current_version_id)
  references public.app_versions(id)
  on delete set null;

create table if not exists public.referrals (
  id uuid primary key default gen_random_uuid(),
  referrer_user_id uuid not null references auth.users(id) on delete cascade,
  referred_user_id uuid not null unique references auth.users(id) on delete cascade,
  referral_code text not null,
  status text not null default 'registered'
    check (status in ('registered', 'verified', 'qualified', 'rejected')),
  created_at timestamptz not null default now(),
  verified_at timestamptz,
  qualified_at timestamptz,
  check (referrer_user_id <> referred_user_id)
);

create table if not exists public.referral_rewards (
  id uuid primary key default gen_random_uuid(),
  referrer_user_id uuid not null references auth.users(id) on delete cascade,
  referred_user_id uuid not null references auth.users(id) on delete cascade,
  referral_id uuid references public.referrals(id) on delete set null,
  reward_type text not null,
  amount numeric(12,2) not null default 0,
  currency text not null default 'USD',
  status text not null default 'pending'
    check (status in ('pending', 'available', 'paid', 'reversed', 'cancelled')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  available_at timestamptz,
  paid_at timestamptz,
  unique (referred_user_id, reward_type)
);

create index if not exists profiles_referred_by_user_id_idx
  on public.profiles(referred_by_user_id);
create index if not exists apps_owner_id_idx
  on public.apps(owner_id);
create index if not exists app_versions_app_id_idx
  on public.app_versions(app_id);
create index if not exists app_versions_created_by_idx
  on public.app_versions(created_by);
create index if not exists referrals_referrer_user_id_idx
  on public.referrals(referrer_user_id);
create index if not exists referral_rewards_referrer_user_id_idx
  on public.referral_rewards(referrer_user_id);

create or replace function public.generate_referral_code()
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  candidate text;
begin
  loop
    candidate := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10));
    exit when not exists (
      select 1 from public.profiles where referral_code = candidate
    );
  end loop;
  return candidate;
end;
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  requested_code text;
  referrer uuid;
  generated_code text;
begin
  requested_code := upper(nullif(trim(new.raw_user_meta_data ->> 'referral_code'), ''));

  if requested_code is not null then
    select p.id into referrer
    from public.profiles p
    where p.referral_code = requested_code
      and p.id <> new.id
    limit 1;
  end if;

  generated_code := public.generate_referral_code();

  insert into public.profiles (
    id,
    email,
    phone,
    referral_code,
    referred_by_user_id
  )
  values (
    new.id,
    new.email,
    new.phone,
    generated_code,
    referrer
  )
  on conflict (id) do update set
    email = excluded.email,
    phone = excluded.phone,
    updated_at = now();

  if referrer is not null then
    insert into public.referrals (
      referrer_user_id,
      referred_user_id,
      referral_code,
      status
    )
    values (
      referrer,
      new.id,
      requested_code,
      'registered'
    )
    on conflict (referred_user_id) do nothing;
  end if;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_touch_updated_at on public.profiles;
create trigger profiles_touch_updated_at
before update on public.profiles
for each row execute function public.touch_updated_at();

drop trigger if exists apps_touch_updated_at on public.apps;
create trigger apps_touch_updated_at
before update on public.apps
for each row execute function public.touch_updated_at();

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
  verified boolean := false;
begin
  if current_user_id is null then
    return;
  end if;

  select (
    au.confirmed_at is not null
    or au.email_confirmed_at is not null
    or au.phone_confirmed_at is not null
  ), p.referred_by_user_id
  into verified, referrer_id
  from auth.users au
  left join public.profiles p on p.id = au.id
  where au.id = current_user_id;

  if not verified or referrer_id is null or referrer_id = current_user_id then
    return;
  end if;

  select r.id into referral_row_id
  from public.referrals r
  where r.referred_user_id = current_user_id
    and r.referrer_user_id = referrer_id
  limit 1;

  update public.referrals
  set status = 'qualified', qualified_at = coalesce(qualified_at, now())
  where referred_user_id = current_user_id
    and referrer_user_id = referrer_id;

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

revoke execute on function public.generate_referral_code() from public, anon, authenticated;
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.touch_updated_at() from public, anon, authenticated;
revoke execute on function public.record_first_app_referral_reward() from public, anon;
grant execute on function public.record_first_app_referral_reward() to authenticated;

alter table public.profiles enable row level security;
alter table public.apps enable row level security;
alter table public.app_versions enable row level security;
alter table public.referrals enable row level security;
alter table public.referral_rewards enable row level security;

revoke all on public.profiles from anon, authenticated;
revoke all on public.apps from anon, authenticated;
revoke all on public.app_versions from anon, authenticated;
revoke all on public.referrals from anon, authenticated;
revoke all on public.referral_rewards from anon, authenticated;

grant select, insert, update, delete on public.profiles to authenticated;
grant select, insert, update, delete on public.apps to authenticated;
grant select, insert, update, delete on public.app_versions to authenticated;
grant select on public.referrals to authenticated;
grant select on public.referral_rewards to authenticated;

create policy "Users can view their own profile"
on public.profiles for select
to authenticated
using ((select auth.uid()) = id);

create policy "Users can update their own profile"
on public.profiles for update
to authenticated
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);

create policy "Users can create their own profile"
on public.profiles for insert
to authenticated
with check ((select auth.uid()) = id);

create policy "Users can delete their own profile"
on public.profiles for delete
to authenticated
using ((select auth.uid()) = id);

create policy "Users can view their own apps"
on public.apps for select
to authenticated
using ((select auth.uid()) = owner_id);

create policy "Users can create their own apps"
on public.apps for insert
to authenticated
with check ((select auth.uid()) = owner_id);

create policy "Users can update their own apps"
on public.apps for update
to authenticated
using ((select auth.uid()) = owner_id)
with check ((select auth.uid()) = owner_id);

create policy "Users can delete their own apps"
on public.apps for delete
to authenticated
using ((select auth.uid()) = owner_id);

create policy "Users can view versions of their apps"
on public.app_versions for select
to authenticated
using (
  exists (
    select 1
    from public.apps a
    where a.id = app_versions.app_id
      and a.owner_id = (select auth.uid())
  )
);

create policy "Users can create versions for their apps"
on public.app_versions for insert
to authenticated
with check (
  (select auth.uid()) = created_by
  and exists (
    select 1
    from public.apps a
    where a.id = app_versions.app_id
      and a.owner_id = (select auth.uid())
  )
);

create policy "Users can update versions of their apps"
on public.app_versions for update
to authenticated
using (
  exists (
    select 1
    from public.apps a
    where a.id = app_versions.app_id
      and a.owner_id = (select auth.uid())
  )
)
with check (
  exists (
    select 1
    from public.apps a
    where a.id = app_versions.app_id
      and a.owner_id = (select auth.uid())
  )
);

create policy "Users can delete versions of their apps"
on public.app_versions for delete
to authenticated
using (
  exists (
    select 1
    from public.apps a
    where a.id = app_versions.app_id
      and a.owner_id = (select auth.uid())
  )
);

create policy "Users can view referrals they own or belong to"
on public.referrals for select
to authenticated
using (
  (select auth.uid()) = referrer_user_id
  or (select auth.uid()) = referred_user_id
);

create policy "Users can view referral rewards they own"
on public.referral_rewards for select
to authenticated
using ((select auth.uid()) = referrer_user_id);
