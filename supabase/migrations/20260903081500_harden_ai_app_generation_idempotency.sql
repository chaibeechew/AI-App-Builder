-- Durable project-level idempotency for AI App Generation.
-- The request ID is written when the app row is first persisted. A unique owner/request
-- pair prevents duplicate projects during retries, concurrent requests or lost responses.

alter table public.apps
  add column if not exists generation_request_id text;

comment on column public.apps.generation_request_id is
  'Stable server-validated AI generation request ID used to recover/replay a persisted project without creating a duplicate.';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'apps_generation_request_id_format_check'
      and conrelid = 'public.apps'::regclass
  ) then
    alter table public.apps
      add constraint apps_generation_request_id_format_check
      check (
        generation_request_id is null
        or generation_request_id ~ '^[A-Za-z0-9._:-]{1,160}$'
      );
  end if;
end
$$;

create unique index if not exists apps_owner_generation_request_uidx
  on public.apps(owner_id, generation_request_id)
  where generation_request_id is not null;

create index if not exists apps_generation_request_lookup_idx
  on public.apps(owner_id, generation_request_id, current_version_id)
  where generation_request_id is not null;
