create or replace function public.workflow_json_is_safe(p_value jsonb, p_depth integer default 0)
returns boolean
language plpgsql
immutable
set search_path = ''
as $$
declare
  entry record;
  item jsonb;
begin
  if p_value is null then return true; end if;
  if p_depth > 4 then return false; end if;
  case jsonb_typeof(p_value)
    when 'object' then
      if (select count(*) from jsonb_object_keys(p_value)) > 40 then return false; end if;
      for entry in select key,value from jsonb_each(p_value) loop
        if char_length(entry.key) > 100 or entry.key ~* '(token|secret|password|passwd|api.?key|credential|authorization|auth)' then return false; end if;
        if not public.workflow_json_is_safe(entry.value,p_depth+1) then return false; end if;
      end loop;
      return true;
    when 'array' then
      if jsonb_array_length(p_value) > 20 then return false; end if;
      for item in select value from jsonb_array_elements(p_value) loop
        if not public.workflow_json_is_safe(item,p_depth+1) then return false; end if;
      end loop;
      return true;
    when 'string' then return char_length(p_value #>> '{}') <= 2000;
    when 'number' then return true;
    when 'boolean' then return true;
    when 'null' then return true;
    else return false;
  end case;
end;
$$;

create or replace function public.workflow_actions_are_safe(p_actions jsonb)
returns boolean
language plpgsql
immutable
set search_path = ''
as $$
declare
  action jsonb;
  cfg jsonb;
  action_type text;
begin
  if p_actions is null or jsonb_typeof(p_actions) <> 'array' then return false; end if;
  if jsonb_array_length(p_actions) < 1 or jsonb_array_length(p_actions) > 12 then return false; end if;
  if octet_length(p_actions::text) > 65536 then return false; end if;
  for action in select value from jsonb_array_elements(p_actions) loop
    if jsonb_typeof(action) <> 'object' then return false; end if;
    if (action - 'type' - 'label' - 'config') <> '{}'::jsonb then return false; end if;
    action_type := coalesce(action->>'type','');
    if action_type not in ('save_crm','save_order','notify_team','send_email','send_sms','send_whatsapp','calendar') then return false; end if;
    if char_length(coalesce(action->>'label','')) > 180 then return false; end if;
    cfg := coalesce(action->'config','{}'::jsonb);
    if jsonb_typeof(cfg) <> 'object' or octet_length(cfg::text) > 32768 or not public.workflow_json_is_safe(cfg,0) then return false; end if;
    if cfg ? 'critical' and jsonb_typeof(cfg->'critical') <> 'boolean' then return false; end if;
  end loop;
  return true;
end;
$$;

create or replace function public.workflow_payload_is_safe(p_payload jsonb, p_allow_safe_test boolean default false)
returns boolean
language plpgsql
immutable
set search_path = ''
as $$
declare
  entry record;
  max_keys integer := case when p_allow_safe_test then 81 else 80 end;
begin
  if p_payload is null or jsonb_typeof(p_payload) <> 'object' then return false; end if;
  if octet_length(p_payload::text) > 131072 then return false; end if;
  if (select count(*) from jsonb_object_keys(p_payload)) > max_keys then return false; end if;
  for entry in select key,value from jsonb_each(p_payload) loop
    if p_allow_safe_test and entry.key = '_safe_test' then
      if jsonb_typeof(entry.value) <> 'boolean' then return false; end if;
      continue;
    end if;
    if char_length(entry.key) < 1 or char_length(entry.key) > 80 or entry.key ~* '(token|secret|password|passwd|api.?key|credential|authorization|auth)' then return false; end if;
    if jsonb_typeof(entry.value) = 'string' and char_length(entry.value #>> '{}') > 4000 then return false; end if;
    if jsonb_typeof(entry.value) not in ('string','number','boolean','null') then return false; end if;
  end loop;
  return true;
end;
$$;

alter table public.app_workflows drop constraint if exists app_workflows_name_check;
alter table public.app_workflows drop constraint if exists app_workflows_trigger_type_check;
alter table public.app_workflows drop constraint if exists app_workflows_trigger_config_check;
alter table public.app_workflows drop constraint if exists app_workflows_actions_check;
alter table public.app_workflows
  add constraint app_workflows_name_check check (char_length(btrim(name)) between 1 and 120),
  add constraint app_workflows_trigger_type_check check (trigger_type in ('form_submitted','appointment_created','order_created')),
  add constraint app_workflows_trigger_config_check check (jsonb_typeof(trigger_config)='object' and octet_length(trigger_config::text)<=32768 and public.workflow_json_is_safe(trigger_config,0)),
  add constraint app_workflows_actions_check check (public.workflow_actions_are_safe(actions));

alter table public.workflow_runs drop constraint if exists workflow_runs_idempotency_key_check;
alter table public.workflow_runs drop constraint if exists workflow_runs_trigger_payload_check;
alter table public.workflow_runs drop constraint if exists workflow_runs_action_results_check;
alter table public.workflow_runs
  add constraint workflow_runs_idempotency_key_check check (idempotency_key is null or (char_length(idempotency_key) between 1 and 160 and idempotency_key ~ '^[A-Za-z0-9._:-]+$')),
  add constraint workflow_runs_trigger_payload_check check (public.workflow_payload_is_safe(trigger_payload,true)),
  add constraint workflow_runs_action_results_check check (jsonb_typeof(action_results)='array' and jsonb_array_length(action_results)<=13 and octet_length(action_results::text)<=131072);

alter table public.workflow_records drop constraint if exists workflow_records_type_check;
alter table public.workflow_records drop constraint if exists workflow_records_payload_check;
alter table public.workflow_records
  add constraint workflow_records_type_check check (record_type in ('crm_contact','order')),
  add constraint workflow_records_payload_check check (public.workflow_payload_is_safe(payload,false));

drop policy if exists app_workflows_owner_all on public.app_workflows;
create policy app_workflows_owner_all on public.app_workflows for all to authenticated
using (owner_id=(select auth.uid()) and exists (select 1 from public.apps a where a.id=app_workflows.app_id and a.owner_id=(select auth.uid())))
with check (owner_id=(select auth.uid()) and exists (select 1 from public.apps a where a.id=app_workflows.app_id and a.owner_id=(select auth.uid())));

drop policy if exists workflow_runs_insert_own on public.workflow_runs;
drop policy if exists workflow_runs_select_own on public.workflow_runs;
drop policy if exists workflow_runs_update_own on public.workflow_runs;
create policy workflow_runs_select_own on public.workflow_runs for select to authenticated
using (owner_id=(select auth.uid()) and exists (select 1 from public.apps a where a.id=workflow_runs.app_id and a.owner_id=(select auth.uid())) and exists (select 1 from public.app_workflows w where w.id=workflow_runs.workflow_id and w.app_id=workflow_runs.app_id and w.owner_id=(select auth.uid())));
create policy workflow_runs_insert_own on public.workflow_runs for insert to authenticated
with check (owner_id=(select auth.uid()) and exists (select 1 from public.apps a where a.id=workflow_runs.app_id and a.owner_id=(select auth.uid())) and exists (select 1 from public.app_workflows w where w.id=workflow_runs.workflow_id and w.app_id=workflow_runs.app_id and w.owner_id=(select auth.uid())));
create policy workflow_runs_update_own on public.workflow_runs for update to authenticated
using (owner_id=(select auth.uid()) and exists (select 1 from public.apps a where a.id=workflow_runs.app_id and a.owner_id=(select auth.uid())) and exists (select 1 from public.app_workflows w where w.id=workflow_runs.workflow_id and w.app_id=workflow_runs.app_id and w.owner_id=(select auth.uid())))
with check (owner_id=(select auth.uid()) and exists (select 1 from public.apps a where a.id=workflow_runs.app_id and a.owner_id=(select auth.uid())) and exists (select 1 from public.app_workflows w where w.id=workflow_runs.workflow_id and w.app_id=workflow_runs.app_id and w.owner_id=(select auth.uid())));

drop policy if exists workflow_records_delete_own on public.workflow_records;
drop policy if exists workflow_records_insert_own on public.workflow_records;
drop policy if exists workflow_records_select_own on public.workflow_records;
drop policy if exists workflow_records_update_own on public.workflow_records;
create policy workflow_records_select_own on public.workflow_records for select to authenticated
using (owner_id=(select auth.uid()) and exists (select 1 from public.apps a where a.id=workflow_records.app_id and a.owner_id=(select auth.uid())));
create policy workflow_records_insert_own on public.workflow_records for insert to authenticated
with check (owner_id=(select auth.uid()) and exists (select 1 from public.apps a where a.id=workflow_records.app_id and a.owner_id=(select auth.uid())));

revoke all on public.app_workflows, public.workflow_runs, public.workflow_records from anon;
revoke truncate, references, trigger on public.app_workflows, public.workflow_runs, public.workflow_records from authenticated;
revoke delete on public.workflow_runs from authenticated;
revoke update, delete on public.workflow_records from authenticated;
grant select, insert, update, delete on public.app_workflows to authenticated;
grant select, insert, update on public.workflow_runs to authenticated;
grant select, insert on public.workflow_records to authenticated;

revoke all on function public.workflow_json_is_safe(jsonb,integer) from public,anon;
revoke all on function public.workflow_actions_are_safe(jsonb) from public,anon;
revoke all on function public.workflow_payload_is_safe(jsonb,boolean) from public,anon;
grant execute on function public.workflow_json_is_safe(jsonb,integer) to authenticated,service_role;
grant execute on function public.workflow_actions_are_safe(jsonb) to authenticated,service_role;
grant execute on function public.workflow_payload_is_safe(jsonb,boolean) to authenticated,service_role;
