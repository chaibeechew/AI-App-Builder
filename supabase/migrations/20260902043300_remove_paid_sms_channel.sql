-- Retire traditional paid SMS from LANERIQ AI.
-- Existing SMS workflow actions are migrated to WhatsApp so user intent is preserved.
-- New workflow and integration records cannot use SMS after this migration.

update public.app_workflows w
set actions = migrated.actions
from lateral (
  select jsonb_agg(
    case
      when action.value->>'type' = 'send_sms' then
        jsonb_set(
          jsonb_set(action.value, '{type}', to_jsonb('send_whatsapp'::text), true),
          '{label}',
          to_jsonb(
            replace(
              replace(coalesce(action.value->>'label', 'Send WhatsApp'), 'SMS', 'WhatsApp'),
              'sms',
              'WhatsApp'
            )
          ),
          true
        )
      else action.value
    end
    order by action.ordinality
  ) as actions
  from jsonb_array_elements(coalesce(w.actions, '[]'::jsonb)) with ordinality as action(value, ordinality)
) migrated
where exists (
  select 1
  from jsonb_array_elements(coalesce(w.actions, '[]'::jsonb)) action
  where action->>'type' = 'send_sms'
);

delete from public.project_integrations
where integration_type = 'sms';

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
    if action_type not in ('save_crm','save_order','notify_team','send_email','send_whatsapp','calendar') then return false; end if;
    if char_length(coalesce(action->>'label','')) > 180 then return false; end if;
    cfg := coalesce(action->'config','{}'::jsonb);
    if jsonb_typeof(cfg) <> 'object' or octet_length(cfg::text) > 32768 or not public.workflow_json_is_safe(cfg,0) then return false; end if;
    if cfg ? 'critical' and jsonb_typeof(cfg->'critical') <> 'boolean' then return false; end if;
  end loop;
  return true;
end;
$$;

alter table public.app_workflows drop constraint if exists app_workflows_actions_check;
alter table public.app_workflows
  add constraint app_workflows_actions_check check (public.workflow_actions_are_safe(actions));

alter table public.project_integrations drop constraint if exists project_integrations_no_sms_check;
alter table public.project_integrations
  add constraint project_integrations_no_sms_check check (integration_type <> 'sms');

revoke all on function public.workflow_actions_are_safe(jsonb) from public,anon;
grant execute on function public.workflow_actions_are_safe(jsonb) to authenticated,service_role;