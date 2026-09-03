-- calculate_app_commission is SECURITY DEFINER and must be server-only.
revoke all on function public.calculate_app_commission(uuid) from public, anon, authenticated;
grant execute on function public.calculate_app_commission(uuid) to service_role;
