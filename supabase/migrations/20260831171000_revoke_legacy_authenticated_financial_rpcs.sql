-- Phase B: apply only after the consolidated Preview is verified with the server-only
-- financial runtime. This removes direct signed-in access to SECURITY DEFINER mutations.

revoke all on function public.consume_app_builder_entitlement(text,uuid,text) from public,anon,authenticated;
revoke all on function public.bind_app_builder_project_access(uuid,text) from public,anon,authenticated;
revoke all on function public.restore_failed_app_builder_create(text) from public,anon,authenticated;
revoke all on function public.consume_ai_credits(numeric,text,text,jsonb) from public,anon,authenticated;
revoke all on function public.refund_ai_credits(text,numeric,text,jsonb) from public,anon,authenticated;

-- Keep service_role access available for rollback/maintenance during the transition.
grant execute on function public.consume_app_builder_entitlement(text,uuid,text) to service_role;
grant execute on function public.bind_app_builder_project_access(uuid,text) to service_role;
grant execute on function public.restore_failed_app_builder_create(text) to service_role;
grant execute on function public.consume_ai_credits(numeric,text,text,jsonb) to service_role;
grant execute on function public.refund_ai_credits(text,numeric,text,jsonb) to service_role;
