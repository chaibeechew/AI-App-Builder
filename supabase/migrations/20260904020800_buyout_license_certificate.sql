-- Batch 46: electronic Buyout License certificate records.
-- Existing Buyout pricing remains Personal USD49 / Business USD199 / Enterprise USD499.
-- Game projects and the specific project that redeemed Encourage Creator support remain ineligible.
-- License issuance is Admin-only and requires a payment/receipt reference.

alter table public.app_licenses
  add column if not exists license_number text,
  add column if not exists license_tier text,
  add column if not exists certificate_version text not null default 'LANERIQ-BUYOUT-CERT-v1',
  add column if not exists issued_at timestamptz,
  add column if not exists issued_by uuid references auth.users(id),
  add column if not exists project_name_snapshot text,
  add column if not exists payment_reference text,
  add column if not exists email_delivery_status text not null default 'not_attempted',
  add column if not exists email_message_id text,
  add column if not exists email_last_attempt_at timestamptz;

update public.app_licenses
set license_number = coalesce(license_number, 'LQ-BUYOUT-' || upper(substr(replace(id::text, '-', ''), 1, 16))),
    license_tier = coalesce(license_tier,
      case
        when license_price >= 499 then 'enterprise'
        when license_price >= 199 then 'business'
        else 'personal'
      end),
    issued_at = coalesce(issued_at, accepted_at),
    project_name_snapshot = coalesce(project_name_snapshot, (select a.name from public.apps a where a.id = app_licenses.app_id))
where license_number is null or license_tier is null or issued_at is null or project_name_snapshot is null;

alter table public.app_licenses
  alter column license_number set not null,
  alter column license_tier set not null,
  alter column issued_at set not null;

alter table public.app_licenses
  drop constraint if exists app_licenses_license_tier_check;
alter table public.app_licenses
  add constraint app_licenses_license_tier_check check (license_tier in ('personal','business','enterprise'));

alter table public.app_licenses
  drop constraint if exists app_licenses_email_delivery_status_check;
alter table public.app_licenses
  add constraint app_licenses_email_delivery_status_check check (email_delivery_status in ('not_attempted','queued','sent','deferred','failed'));

create unique index if not exists app_licenses_license_number_unique_idx on public.app_licenses(license_number);
create index if not exists app_licenses_status_issued_idx on public.app_licenses(status, issued_at desc);

create or replace function public.admin_issue_buyout_license(
  p_app_id uuid,
  p_tier text,
  p_payment_reference text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  admin_id uuid := auth.uid();
  app_row public.apps;
  existing_row public.app_licenses;
  tier_value text := lower(trim(coalesce(p_tier,'')));
  price_value numeric(12,2);
  new_id uuid := gen_random_uuid();
  new_license_number text;
begin
  if admin_id is null or coalesce((select raw_app_meta_data->>'role' from auth.users where id=admin_id),'') <> 'admin' then
    raise exception 'Admin access required';
  end if;
  if tier_value not in ('personal','business','enterprise') then raise exception 'Invalid Buyout License tier'; end if;
  if p_payment_reference is null or char_length(trim(p_payment_reference)) < 3 or char_length(trim(p_payment_reference)) > 200 then
    raise exception 'Payment reference is required';
  end if;

  select * into app_row from public.apps where id=p_app_id for update;
  if not found then raise exception 'Project not found'; end if;
  if coalesce(app_row.publish_status,'draft')='published' then raise exception 'Buyout License must be selected before publish'; end if;

  -- Encourage Creator restriction is project-specific: only the project that actually redeemed support is excluded.
  if exists(
    select 1 from public.creator_support_requests r
    where r.unfinished_project_id=p_app_id and r.status='redeemed'
  ) then
    raise exception 'This project used Encourage Creator support and is not eligible for Buyout License';
  end if;

  -- Fail closed for explicit Game projects. Admin API performs the richer JS game classification too.
  if lower(coalesce(app_row.source_prompt,'')) ~ '(^|[^a-z])(game|gaming)([^a-z]|$)'
     or coalesce(app_row.source_prompt,'') ~ '(游戏|遊戲|手游)' then
    raise exception 'Game projects do not offer Buyout License';
  end if;

  select * into existing_row from public.app_licenses where app_id=p_app_id;
  if found then
    return jsonb_build_object(
      'success',true,'replayed',true,'licenseId',existing_row.id,'licenseNumber',existing_row.license_number,
      'projectId',existing_row.app_id,'tier',existing_row.license_tier,'priceUsd',existing_row.license_price,
      'status',existing_row.status,'issuedAt',existing_row.issued_at
    );
  end if;

  price_value := case tier_value when 'personal' then 49 when 'business' then 199 when 'enterprise' then 499 end;
  new_license_number := 'LQ-BUYOUT-' || upper(substr(replace(new_id::text,'-',''),1,16));

  insert into public.app_licenses(
    id,app_id,owner_id,license_price,currency,terms_version,status,
    license_number,license_tier,certificate_version,issued_at,issued_by,
    project_name_snapshot,payment_reference,email_delivery_status
  ) values(
    new_id,p_app_id,app_row.owner_id,price_value,'USD','LANERIQ-BUYOUT-LICENSE-v1-DRAFT','active',
    new_license_number,tier_value,'LANERIQ-BUYOUT-CERT-v1',now(),admin_id,
    app_row.name,trim(p_payment_reference),'not_attempted'
  );

  insert into public.admin_audit_log(admin_user_id,action,target_type,target_id,metadata)
  values(admin_id,'buyout_license.issue','app_license',new_id,jsonb_build_object(
    'appId',p_app_id,'tier',tier_value,'priceUsd',price_value,'licenseNumber',new_license_number,
    'paymentReferenceRecorded',true,'encourageCreatorExcluded',true,'gameExcluded',true
  ));

  return jsonb_build_object(
    'success',true,'replayed',false,'licenseId',new_id,'licenseNumber',new_license_number,
    'projectId',p_app_id,'tier',tier_value,'priceUsd',price_value,'currency','USD',
    'status','active','issuedAt',now(),'certificateVersion','LANERIQ-BUYOUT-CERT-v1',
    'termsVersion','LANERIQ-BUYOUT-LICENSE-v1-DRAFT','futureLaneriqRevenueSharePercent',0
  );
end;
$$;

revoke all on function public.admin_issue_buyout_license(uuid,text,text) from public,anon;
grant execute on function public.admin_issue_buyout_license(uuid,text,text) to authenticated;
