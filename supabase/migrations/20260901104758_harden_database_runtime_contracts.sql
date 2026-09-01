create or replace function public.app_backend_schema_is_safe(p_schema jsonb)
returns boolean
language plpgsql
immutable
set search_path = ''
as $$
declare
  ent jsonb;
  field_text text;
  relationship_value jsonb;
  history_value jsonb;
  entity_count integer;
begin
  if p_schema is null or jsonb_typeof(p_schema) <> 'object' then return false; end if;
  if octet_length(p_schema::text) > 2097152 then return false; end if;
  if coalesce(p_schema->>'providerHidden','') <> 'true' then return false; end if;
  if jsonb_typeof(p_schema->'entities') <> 'array' then return false; end if;
  entity_count := jsonb_array_length(p_schema->'entities');
  if entity_count < 1 or entity_count > 30 then return false; end if;
  if jsonb_typeof(p_schema->'relationships') <> 'array' or jsonb_array_length(p_schema->'relationships') > 100 then return false; end if;
  if jsonb_typeof(p_schema->'policies') <> 'array' then return false; end if;
  if not ((p_schema->'policies') @> '["Private by default","Signed-in users can access only rows they own unless a feature explicitly requires sharing","Sensitive writes require server-side validation","No API keys, passwords or payment credentials in generated business tables","Deletion/export paths should exist for personal data where relevant"]'::jsonb) then return false; end if;
  if p_schema ? '_history' then
    if jsonb_typeof(p_schema->'_history') <> 'array' or jsonb_array_length(p_schema->'_history') > 8 then return false; end if;
    for history_value in select value from jsonb_array_elements(p_schema->'_history') loop
      if jsonb_typeof(history_value) <> 'object' or jsonb_typeof(history_value->'schema') <> 'object' then return false; end if;
    end loop;
  end if;

  for ent in select value from jsonb_array_elements(p_schema->'entities') loop
    if jsonb_typeof(ent) <> 'object' then return false; end if;
    if coalesce(ent->>'name','') !~ '^[a-z][a-z0-9_]{0,62}$' then return false; end if;
    if coalesce(ent->>'access','') <> 'owner-scoped by default' then return false; end if;
    if char_length(coalesce(ent->>'note','')) > 500 then return false; end if;
    if jsonb_typeof(ent->'fields') <> 'array' then return false; end if;
    if jsonb_array_length(ent->'fields') < 1 or jsonb_array_length(ent->'fields') > 80 then return false; end if;
    for field_text in select value from jsonb_array_elements_text(ent->'fields') loop
      if char_length(field_text) > 90 then return false; end if;
      if field_text !~* '^[a-z][a-z0-9_]{0,62}[[:space:]]*:[[:space:]]*(uuid|text|numeric|integer|bigint|boolean|timestamptz|date|jsonb)\??$' then return false; end if;
      if split_part(lower(field_text),':',1) ~ '(password|passwd|secret|token|api[_-]?key|credential|private[_-]?key|auth[_-]?key)' then return false; end if;
    end loop;
  end loop;

  for relationship_value in select value from jsonb_array_elements(p_schema->'relationships') loop
    if jsonb_typeof(relationship_value) <> 'string' or char_length(relationship_value #>> '{}') > 300 then return false; end if;
  end loop;
  return true;
exception when others then
  return false;
end;
$$;

create or replace function public.app_record_json_is_bounded(p_record jsonb)
returns boolean
language plpgsql
immutable
set search_path = ''
as $$
declare
  pair record;
  field_count integer := 0;
  value_type text;
begin
  if p_record is null or jsonb_typeof(p_record) <> 'object' then return false; end if;
  if octet_length(p_record::text) > 65536 then return false; end if;
  for pair in select key,value from jsonb_each(p_record) loop
    field_count := field_count + 1;
    if field_count > 24 then return false; end if;
    if char_length(pair.key) < 1 or char_length(pair.key) > 80 or pair.key !~ '^[a-zA-Z0-9_ -]+$' then return false; end if;
    value_type := jsonb_typeof(pair.value);
    if value_type not in ('string','number','boolean') then return false; end if;
    if value_type = 'string' and char_length(pair.value #>> '{}') > 2000 then return false; end if;
  end loop;
  return field_count > 0;
exception when others then
  return false;
end;
$$;

alter table public.app_backend_models
  drop constraint if exists app_backend_models_schema_safe_check;
alter table public.app_backend_models
  add constraint app_backend_models_schema_safe_check
  check (public.app_backend_schema_is_safe(schema_json)) not valid;
alter table public.app_backend_models validate constraint app_backend_models_schema_safe_check;

alter table public.app_data_records
  drop constraint if exists app_data_records_bounded_json_check;
alter table public.app_data_records
  add constraint app_data_records_bounded_json_check
  check (public.app_record_json_is_bounded(record_json)) not valid;
alter table public.app_data_records validate constraint app_data_records_bounded_json_check;

do $$
declare r record;
begin
  for r in
    select c.relname
    from pg_class c
    join pg_namespace n on n.oid=c.relnamespace
    where n.nspname='public' and c.relkind in ('r','p')
  loop
    execute format('revoke truncate, references, trigger on table public.%I from anon, authenticated', r.relname);
  end loop;
end $$;

revoke all on public.app_backend_models from anon;
grant select, insert, update, delete on public.app_backend_models to authenticated;
revoke truncate, references, trigger on public.app_backend_models from authenticated;

revoke all on public.app_data_records from anon;
grant select, insert, update, delete on public.app_data_records to authenticated;
revoke truncate, references, trigger on public.app_data_records from authenticated;
