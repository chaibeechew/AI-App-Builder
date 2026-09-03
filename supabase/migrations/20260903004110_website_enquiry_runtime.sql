create table if not exists public.website_enquiries (
  id uuid primary key default gen_random_uuid(),
  app_id uuid not null references public.apps(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  request_id text not null,
  source_hash text not null,
  name text not null,
  email text,
  phone text,
  message text not null,
  status text not null default 'new',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint website_enquiries_request_id_check check (request_id ~ '^[A-Za-z0-9._:-]{1,160}$'),
  constraint website_enquiries_source_hash_check check (source_hash ~ '^[0-9a-f]{64}$'),
  constraint website_enquiries_name_check check (char_length(name) between 1 and 120),
  constraint website_enquiries_email_check check (email is null or (char_length(email) between 3 and 254 and email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$')),
  constraint website_enquiries_phone_check check (phone is null or char_length(phone) between 6 and 50),
  constraint website_enquiries_contact_check check (email is not null or phone is not null),
  constraint website_enquiries_message_check check (char_length(message) between 1 and 2000),
  constraint website_enquiries_status_check check (status in ('new','contacted','archived')),
  unique(app_id, request_id)
);

create index if not exists website_enquiries_owner_created_idx on public.website_enquiries(owner_id, created_at desc);
create index if not exists website_enquiries_app_created_idx on public.website_enquiries(app_id, created_at desc);
create index if not exists website_enquiries_source_created_idx on public.website_enquiries(app_id, source_hash, created_at desc);

alter table public.website_enquiries enable row level security;
revoke all on table public.website_enquiries from public, anon, authenticated;
grant select, insert, update, delete on table public.website_enquiries to service_role;

create or replace function public.server_create_website_enquiry(
  p_app_id uuid,
  p_request_id text,
  p_source_hash text,
  p_name text,
  p_email text default null,
  p_phone text default null,
  p_message text default null
) returns jsonb
language plpgsql
security definer
set search_path=''
as $$
declare
  app_row public.apps;
  existing_id uuid;
  request_key text := trim(coalesce(p_request_id,''));
  source_key text := lower(trim(coalesce(p_source_hash,'')));
  clean_name text := trim(coalesce(p_name,''));
  clean_email text := nullif(lower(trim(coalesce(p_email,''))), '');
  clean_phone text := nullif(trim(coalesce(p_phone,'')), '');
  clean_message text := trim(coalesce(p_message,''));
  recent_count integer;
  daily_source_count integer;
  daily_app_count integer;
begin
  if p_app_id is null then raise exception 'WEBSITE_ENQUIRY_APP_REQUIRED'; end if;
  if request_key !~ '^[A-Za-z0-9._:-]{1,160}$' then raise exception 'WEBSITE_ENQUIRY_REQUEST_ID_INVALID'; end if;
  if source_key !~ '^[0-9a-f]{64}$' then raise exception 'WEBSITE_ENQUIRY_SOURCE_INVALID'; end if;
  if char_length(clean_name) < 1 or char_length(clean_name) > 120 then raise exception 'WEBSITE_ENQUIRY_NAME_INVALID'; end if;
  if clean_email is not null and (char_length(clean_email) > 254 or clean_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$') then raise exception 'WEBSITE_ENQUIRY_EMAIL_INVALID'; end if;
  if clean_phone is not null and (char_length(clean_phone) < 6 or char_length(clean_phone) > 50) then raise exception 'WEBSITE_ENQUIRY_PHONE_INVALID'; end if;
  if clean_email is null and clean_phone is null then raise exception 'WEBSITE_ENQUIRY_CONTACT_REQUIRED'; end if;
  if char_length(clean_message) < 1 or char_length(clean_message) > 2000 then raise exception 'WEBSITE_ENQUIRY_MESSAGE_INVALID'; end if;

  select * into app_row from public.apps where id=p_app_id;
  if not found or app_row.publish_status <> 'published' or app_row.visibility not in ('listed','public') then
    raise exception 'WEBSITE_ENQUIRY_SITE_NOT_PUBLISHED';
  end if;

  select id into existing_id from public.website_enquiries where app_id=p_app_id and request_id=request_key limit 1;
  if existing_id is not null then
    return jsonb_build_object('accepted',true,'replayed',true,'enquiry_id',existing_id);
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_app_id::text || ':' || source_key, 0));

  select id into existing_id from public.website_enquiries where app_id=p_app_id and request_id=request_key limit 1;
  if existing_id is not null then
    return jsonb_build_object('accepted',true,'replayed',true,'enquiry_id',existing_id);
  end if;

  select count(*) into recent_count from public.website_enquiries where app_id=p_app_id and source_hash=source_key and created_at > now()-interval '10 minutes';
  if recent_count >= 3 then raise exception 'WEBSITE_ENQUIRY_RATE_LIMITED'; end if;

  select count(*) into daily_source_count from public.website_enquiries where app_id=p_app_id and source_hash=source_key and created_at > now()-interval '24 hours';
  if daily_source_count >= 20 then raise exception 'WEBSITE_ENQUIRY_DAILY_LIMITED'; end if;

  select count(*) into daily_app_count from public.website_enquiries where app_id=p_app_id and created_at > now()-interval '24 hours';
  if daily_app_count >= 1000 then raise exception 'WEBSITE_ENQUIRY_SITE_LIMITED'; end if;

  insert into public.website_enquiries(app_id,owner_id,request_id,source_hash,name,email,phone,message)
  values(p_app_id,app_row.owner_id,request_key,source_key,clean_name,clean_email,clean_phone,clean_message)
  returning id into existing_id;

  return jsonb_build_object('accepted',true,'replayed',false,'enquiry_id',existing_id);
end;
$$;

revoke all on function public.server_create_website_enquiry(uuid,text,text,text,text,text,text) from public, anon, authenticated;
grant execute on function public.server_create_website_enquiry(uuid,text,text,text,text,text,text) to service_role;
