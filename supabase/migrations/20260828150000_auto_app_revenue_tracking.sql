-- Automatic App identity + license + qualifying revenue tracking foundation.
-- Revenue is classified by the server; clients cannot write financial records.
-- This does not bypass Apple/Google billing rules; store reports/webhooks must be used by trusted server integrations.

alter table public.apps
  add column if not exists app_code text;

update public.apps
set app_code = 'AAB-' || upper(substr(replace(id::text, '-', ''), 1, 10))
where app_code is null;

alter table public.apps
  alter column app_code set default ('AAB-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10)));
alter table public.apps
  alter column app_code set not null;
create unique index if not exists apps_app_code_unique_idx on public.apps(app_code);

create table if not exists public.app_store_links (
  id uuid primary key default gen_random_uuid(),
  app_id uuid not null references public.apps(id) on delete cascade,
  platform text not null check (platform in ('apple','google','web')),
  store_app_id text,
  bundle_or_package_id text,
  status text not null default 'pending' check (status in ('pending','linked','unlinked','suspended')),
  last_verified_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (platform, store_app_id),
  unique (platform, bundle_or_package_id)
);
create index if not exists app_store_links_app_idx on public.app_store_links(app_id, platform);

create table if not exists public.app_licenses (
  id uuid primary key default gen_random_uuid(),
  app_id uuid not null references public.apps(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  license_price numeric(12,2) not null default 10 check (license_price >= 0),
  currency text not null default 'USD' check (currency ~ '^[A-Z]{3}$'),
  terms_version text not null,
  accepted_at timestamptz not null default now(),
  status text not null default 'active' check (status in ('active','suspended','terminated')),
  created_at timestamptz not null default now(),
  unique (app_id)
);
create index if not exists app_licenses_owner_idx on public.app_licenses(owner_id, created_at desc);

create table if not exists public.app_revenue_events (
  id uuid primary key default gen_random_uuid(),
  app_id uuid not null references public.apps(id) on delete cascade,
  store_link_id uuid references public.app_store_links(id) on delete set null,
  source text not null check (source in ('apple','google','web','other')),
  external_transaction_id text,
  revenue_type text not null check (revenue_type in ('app_sale','subscription','digital_purchase','digital_membership','other_digital')),
  gross_amount numeric(18,2) not null check (gross_amount >= 0),
  currency text not null check (currency ~ '^[A-Z]{3}$'),
  qualifying boolean not null default false,
  exclusion_reason text,
  period_start timestamptz,
  period_end timestamptz,
  reported_at timestamptz not null default now(),
  source_report_ref text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (source, external_transaction_id)
);
create index if not exists app_revenue_events_app_idx on public.app_revenue_events(app_id, reported_at desc);
create index if not exists app_revenue_events_qualifying_idx on public.app_revenue_events(qualifying, reported_at desc);

create table if not exists public.app_commission_ledger (
  id uuid primary key default gen_random_uuid(),
  app_id uuid not null references public.apps(id) on delete cascade,
  revenue_event_id uuid not null references public.app_revenue_events(id) on delete restrict,
  rate numeric(8,6) not null default 0.05 check (rate >= 0 and rate <= 1),
  qualifying_amount numeric(18,2) not null check (qualifying_amount >= 0),
  commission_amount numeric(18,2) not null check (commission_amount >= 0),
  currency text not null check (currency ~ '^[A-Z]{3}$'),
  status text not null default 'pending' check (status in ('pending','invoiced','paid','disputed','void')),
  created_at timestamptz not null default now(),
  unique (revenue_event_id)
);
create index if not exists app_commission_ledger_app_idx on public.app_commission_ledger(app_id, created_at desc);

create table if not exists public.app_revenue_reconciliations (
  id uuid primary key default gen_random_uuid(),
  app_id uuid not null references public.apps(id) on delete cascade,
  source text not null check (source in ('apple','google','web','other')),
  period_start timestamptz not null,
  period_end timestamptz not null,
  reported_gross numeric(18,2) not null default 0 check (reported_gross >= 0),
  qualifying_gross numeric(18,2) not null default 0 check (qualifying_gross >= 0),
  commission_due numeric(18,2) not null default 0 check (commission_due >= 0),
  status text not null default 'pending' check (status in ('pending','matched','mismatch','manual_review')),
  discrepancy_amount numeric(18,2) not null default 0,
  report_reference text,
  notes text,
  created_at timestamptz not null default now(),
  unique (app_id, source, period_start, period_end)
);

-- Customer-visible access is read-only and owner-scoped. Financial ingestion is server-only.
alter table public.app_store_links enable row level security;
alter table public.app_licenses enable row level security;
alter table public.app_revenue_events enable row level security;
alter table public.app_commission_ledger enable row level security;
alter table public.app_revenue_reconciliations enable row level security;

revoke all on public.app_store_links from anon, authenticated;
revoke all on public.app_licenses from anon, authenticated;
revoke all on public.app_revenue_events from anon, authenticated;
revoke all on public.app_commission_ledger from anon, authenticated;
revoke all on public.app_revenue_reconciliations from anon, authenticated;

grant select on public.app_store_links, public.app_licenses, public.app_revenue_events, public.app_commission_ledger, public.app_revenue_reconciliations to authenticated;

create policy "owners can read app store links" on public.app_store_links
for select to authenticated using (exists (select 1 from public.apps a where a.id = app_store_links.app_id and a.owner_id = (select auth.uid())));
create policy "owners can read app licenses" on public.app_licenses
for select to authenticated using (owner_id = (select auth.uid()));
create policy "owners can read app revenue" on public.app_revenue_events
for select to authenticated using (exists (select 1 from public.apps a where a.id = app_revenue_events.app_id and a.owner_id = (select auth.uid())));
create policy "owners can read commission ledger" on public.app_commission_ledger
for select to authenticated using (exists (select 1 from public.apps a where a.id = app_commission_ledger.app_id and a.owner_id = (select auth.uid())));
create policy "owners can read reconciliations" on public.app_revenue_reconciliations
for select to authenticated using (exists (select 1 from public.apps a where a.id = app_revenue_reconciliations.app_id and a.owner_id = (select auth.uid())));

create or replace function public.classify_app_revenue(
  p_revenue_type text,
  p_customer_business_revenue boolean default false
)
returns boolean
language sql
immutable
as $$
  select coalesce(p_customer_business_revenue, false) = false
    and p_revenue_type in ('app_sale','subscription','digital_purchase','digital_membership','other_digital');
$$;
revoke all on function public.classify_app_revenue(text, boolean) from public, anon, authenticated;

create or replace function public.calculate_app_commission(p_revenue_event_id uuid)
returns public.app_commission_ledger
language plpgsql
security definer
set search_path = ''
as $$
declare
  r public.app_revenue_events;
  result public.app_commission_ledger;
  q_amount numeric(18,2);
begin
  select * into r from public.app_revenue_events where id = p_revenue_event_id for update;
  if not found then raise exception 'Revenue event not found'; end if;
  q_amount := case when r.qualifying then r.gross_amount else 0 end;

  insert into public.app_commission_ledger(app_id, revenue_event_id, rate, qualifying_amount, commission_amount, currency)
  values (r.app_id, r.id, 0.05, q_amount, round(q_amount * 0.05, 2), r.currency)
  on conflict (revenue_event_id) do update set
    qualifying_amount = excluded.qualifying_amount,
    commission_amount = excluded.commission_amount,
    currency = excluded.currency
  returning * into result;
  return result;
end;
$$;
revoke all on function public.calculate_app_commission(uuid) from public, anon, authenticated;

-- Dashboard-friendly view: one row per App with current license/store/revenue status.
create or replace view public.app_revenue_dashboard as
select
  a.id as app_id,
  a.app_code,
  a.name,
  a.owner_id,
  exists (select 1 from public.app_licenses l where l.app_id = a.id and l.status = 'active') as license_active,
  (select count(*) from public.app_store_links s where s.app_id = a.id and s.status = 'linked') as linked_store_count,
  coalesce((select sum(e.gross_amount) from public.app_revenue_events e where e.app_id = a.id and e.qualifying), 0) as qualifying_gross_revenue,
  coalesce((select sum(c.commission_amount) from public.app_commission_ledger c where c.app_id = a.id and c.status <> 'void'), 0) as commission_due
from public.apps a;

revoke all on public.app_revenue_dashboard from anon;
grant select on public.app_revenue_dashboard to authenticated;
