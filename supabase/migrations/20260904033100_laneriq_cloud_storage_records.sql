create table if not exists public.laneriq_cloud_records (
  tenant_id text not null,
  user_id text not null,
  project_id text not null,
  namespace text not null check (namespace in ('project','context','artifact')),
  record_key text not null default 'default',
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (tenant_id,user_id,project_id,namespace,record_key)
);

alter table public.laneriq_cloud_records enable row level security;
revoke all on table public.laneriq_cloud_records from anon, authenticated;
grant select, insert, update, delete on table public.laneriq_cloud_records to service_role;

create index if not exists laneriq_cloud_records_project_idx
  on public.laneriq_cloud_records (tenant_id,user_id,project_id,namespace);
