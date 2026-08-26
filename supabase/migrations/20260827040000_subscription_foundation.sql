-- Provider-agnostic subscription foundation.
-- Payment state is server-controlled; clients cannot create or mutate financial state.

create table if not exists public.subscription_plans (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  description text,
  price_minor bigint not null default 0 check (price_minor >= 0),
  currency text not null default 'USD' check (currency ~ '^[A-Z]{3}$'),
  interval_unit text not null default 'year' check (interval_unit in ('month','year','one_time')),
  interval_count integer not null default 1 check (interval_count > 0 and interval_count <= 120),
  included_credits bigint not null default 0 check (included_credits >= 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id),
  plan_id uuid not null references public.subscription_plans(id),
  provider text not null,
  provider_customer_id text,
  provider_subscription_id text,
  status text not null default 'pending' check (status in ('pending','active','trialing','past_due','canceled','expired','incomplete')),
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (provider, provider_subscription_id)
);

create unique index if not exists subscriptions_one_active_per_user
  on public.subscriptions(user_id)
  where status in ('active','trialing','past_due');

create index if not exists subscriptions_user_idx on public.subscriptions(user_id, updated_at desc);

create table if not exists public.payment_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  provider_event_id text not null,
  event_type text not null,
  user_id uuid references auth.users(id),
  subscription_id uuid references public.subscriptions(id),
  amount_minor bigint check (amount_minor is null or amount_minor >= 0),
  currency text,
  status text not null default 'received' check (status in ('received','processed','ignored','failed')),
  payload_hash text,
  processed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (provider, provider_event_id)
);

create index if not exists payment_events_user_idx on public.payment_events(user_id, created_at desc);

-- Subscription benefits are represented by the existing entitlement system.
-- Source IDs point to subscriptions; no client can create an entitlement directly.

alter table public.subscription_plans enable row level security;
alter table public.subscriptions enable row level security;
alter table public.payment_events enable row level security;

-- Plans may be read by authenticated users, but never changed by them.
revoke all on public.subscription_plans from anon, authenticated;
revoke all on public.subscriptions from anon, authenticated;
revoke all on public.payment_events from anon, authenticated;

grant select on public.subscription_plans to authenticated;

create policy "authenticated users can read active plans"
  on public.subscription_plans
  for select to authenticated
  using (is_active = true);

-- Users can read only their own subscription status.
create policy "users can read own subscriptions"
  on public.subscriptions
  for select to authenticated
  using ((select auth.uid()) = user_id);

-- Payment events are server-only: no SELECT/INSERT/UPDATE/DELETE grants to clients.

-- Generic entitlement helper. It never trusts client-supplied balance or status.
create or replace function public.has_active_entitlement(p_user_id uuid, p_source_type text default null)
returns boolean
language sql
stable
set search_path = ''
as $$
  select exists (
    select 1
    from public.user_entitlements ue
    where ue.user_id = p_user_id
      and ue.valid_from <= now()
      and (ue.valid_until is null or ue.valid_until > now())
      and (p_source_type is null or ue.source_type = p_source_type)
  );
$$;

revoke all on function public.has_active_entitlement(uuid, text) from public, anon;
grant execute on function public.has_active_entitlement(uuid, text) to authenticated;

-- Server-side webhook processing will use a privileged service role / private path.
-- This migration deliberately does not expose a client-callable payment-success function.
