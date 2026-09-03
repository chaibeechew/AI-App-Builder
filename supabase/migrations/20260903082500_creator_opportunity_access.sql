-- Creator Opportunity Access: individual creators can request Admin-approved Full Access
-- with no upfront LANERIQ AI access fee in exchange for an additional 5 percentage-point
-- platform sales share on projects using this access.

alter table public.app_builder_account_access
  add column if not exists creator_opportunity_active boolean not null default false,
  add column if not exists creator_opportunity_bonus_share_percent numeric(5,2) not null default 0,
  add column if not exists creator_opportunity_approved_at timestamptz,
  add column if not exists creator_opportunity_approved_by uuid references auth.users(id) on delete set null;

alter table public.app_builder_account_access
  drop constraint if exists app_builder_creator_opportunity_bonus_share_check,
  add constraint app_builder_creator_opportunity_bonus_share_check
    check (creator_opportunity_bonus_share_percent in (0,5));

create table if not exists public.creator_opportunity_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  applicant_type text not null default 'individual' check (applicant_type='individual'),
  idea_summary text not null check (char_length(btrim(idea_summary)) between 40 and 4000),
  commercial_potential text not null check (char_length(btrim(commercial_potential)) between 20 and 4000),
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  extra_platform_sales_share_percent numeric(5,2) not null default 5 check (extra_platform_sales_share_percent=5),
  confirms_individual boolean not null check (confirms_individual=true),
  accepts_extra_revenue_share boolean not null check (accepts_extra_revenue_share=true),
  submitted_at timestamptz not null default now(),
  decided_at timestamptz,
  decided_by uuid references auth.users(id) on delete set null,
  admin_note text check (admin_note is null or char_length(admin_note)<=2000)
);

create unique index if not exists creator_opportunity_one_pending_per_user
  on public.creator_opportunity_requests(user_id)
  where status='pending';
create index if not exists creator_opportunity_admin_queue_idx
  on public.creator_opportunity_requests(status,submitted_at desc);

alter table public.creator_opportunity_requests enable row level security;

grant select, insert on public.creator_opportunity_requests to authenticated;
revoke update, delete, truncate on public.creator_opportunity_requests from anon, authenticated;

 drop policy if exists creator_opportunity_owner_select on public.creator_opportunity_requests;
create policy creator_opportunity_owner_select
  on public.creator_opportunity_requests for select
  to authenticated
  using ((select auth.uid())=user_id);

 drop policy if exists creator_opportunity_owner_insert on public.creator_opportunity_requests;
create policy creator_opportunity_owner_insert
  on public.creator_opportunity_requests for insert
  to authenticated
  with check (
    (select auth.uid())=user_id
    and applicant_type='individual'
    and status='pending'
    and extra_platform_sales_share_percent=5
    and confirms_individual=true
    and accepts_extra_revenue_share=true
    and decided_at is null
    and decided_by is null
  );

comment on table public.creator_opportunity_requests is
  'Individual-only requests for Admin-approved no-upfront-cost Full Access with an additional 5 percentage-point platform sales share.';
