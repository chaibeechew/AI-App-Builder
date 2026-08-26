-- Admin-only promo code generation. Admin identity is controlled by Supabase user metadata.
-- Set app_metadata.role = 'admin' for trusted administrator accounts; never trust user-editable metadata.

create table if not exists public.admin_audit_log (
  id uuid primary key default gen_random_uuid(),
  admin_user_id uuid not null references auth.users(id),
  action text not null,
  target_type text,
  target_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.admin_audit_log enable row level security;
revoke all on public.admin_audit_log from anon, authenticated;

create or replace function public.generate_promo_code(
  p_description text default null,
  p_free_days integer default 0,
  p_bonus_credits bigint default 0,
  p_max_redemptions integer default 1,
  p_starts_at timestamptz default null,
  p_expires_at timestamptz default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  code text;
  promo_id uuid;
begin
  if uid is null or coalesce((select raw_app_meta_data->>'role' from auth.users where id = uid), '') <> 'admin' then
    raise exception 'Admin access required';
  end if;
  if p_free_days < 0 or p_free_days > 3650 then raise exception 'Invalid free days'; end if;
  if p_bonus_credits < 0 or p_bonus_credits > 1000000000 then raise exception 'Invalid bonus credits'; end if;
  if p_max_redemptions < 1 or p_max_redemptions > 10000000 then raise exception 'Invalid redemption limit'; end if;
  if p_expires_at is not null and p_starts_at is not null and p_expires_at <= p_starts_at then raise exception 'Invalid promo dates'; end if;

  code := 'PROMO-' || upper(encode(gen_random_bytes(6), 'hex'));
  insert into public.promo_codes(code, description, free_days, bonus_credits, max_redemptions, starts_at, expires_at, created_by)
  values (code, nullif(left(coalesce(p_description, ''), 500), ''), p_free_days, p_bonus_credits, p_max_redemptions, p_starts_at, p_expires_at, uid)
  returning id into promo_id;

  insert into public.admin_audit_log(admin_user_id, action, target_type, target_id, metadata)
  values (uid, 'promo_code.create', 'promo_code', promo_id,
    jsonb_build_object('freeDays', p_free_days, 'bonusCredits', p_bonus_credits, 'maxRedemptions', p_max_redemptions));

  return jsonb_build_object('id', promo_id, 'code', code, 'freeDays', p_free_days, 'bonusCredits', p_bonus_credits, 'maxRedemptions', p_max_redemptions, 'startsAt', p_starts_at, 'expiresAt', p_expires_at);
end;
$$;

revoke all on function public.generate_promo_code(text, integer, bigint, integer, timestamptz, timestamptz) from public, anon;
grant execute on function public.generate_promo_code(text, integer, bigint, integer, timestamptz, timestamptz) to authenticated;
