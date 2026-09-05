-- Batch 115: LANERIQ AI Legal Runtime Architecture.
-- Zero-new-cost foundation for immutable legal versions, acceptance evidence,
-- Malaysian PDPA incident clocks, and marketplace transaction truth gates.
--
-- IMPORTANT RELEASE BOUNDARY:
-- This migration creates runtime controls only. It does not seed or activate any
-- legal document. DRAFT documents remain non-binding until separately reviewed,
-- approved, versioned, and activated through the Production Legal Approval Gate.

create schema if not exists private;

-- ---------------------------------------------------------------------------
-- 1. Legal Version Registry
-- ---------------------------------------------------------------------------

create table if not exists public.legal_document_versions (
  id uuid primary key default gen_random_uuid(),
  document_key text not null check (document_key ~ '^[a-z0-9][a-z0-9_]{1,79}$'),
  version text not null check (char_length(version) between 3 and 120),
  status text not null default 'draft'
    check (status in ('draft','legal_approved','active','superseded','retired')),
  document_hash text not null check (document_hash ~ '^[0-9a-f]{64}$'),
  source_path text not null check (char_length(source_path) between 3 and 500),
  source_commit_sha text check (source_commit_sha is null or source_commit_sha ~ '^[0-9a-f]{40}$'),
  acceptance_level text not null
    check (acceptance_level in ('notice','clickwrap','strong','bilateral')),
  effective_at timestamptz,
  approved_at timestamptz,
  activated_at timestamptz,
  superseded_at timestamptz,
  retired_at timestamptz,
  approved_by uuid references auth.users(id) on delete set null,
  approval_reference text,
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(document_key, version),
  check (
    status = 'draft'
    or (approved_at is not null and nullif(trim(coalesce(approval_reference,'')),'') is not null)
  ),
  check (
    status <> 'active'
    or (effective_at is not null and activated_at is not null)
  ),
  check (superseded_at is null or status in ('superseded','retired')),
  check (retired_at is null or status = 'retired')
);

create unique index if not exists legal_document_versions_one_active_per_key
  on public.legal_document_versions(document_key)
  where status = 'active';

create index if not exists legal_document_versions_status_idx
  on public.legal_document_versions(status, document_key, effective_at desc);

create or replace function private.enforce_legal_document_version_integrity()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'UPDATE' then
    if old.status <> 'draft' and (
      new.document_key is distinct from old.document_key
      or new.version is distinct from old.version
      or new.document_hash is distinct from old.document_hash
      or new.source_path is distinct from old.source_path
      or new.acceptance_level is distinct from old.acceptance_level
    ) then
      raise exception 'Approved legal document identity and hash are immutable';
    end if;

    if old.status = 'legal_approved' and new.status = 'draft' then
      raise exception 'Legal approval status cannot regress to draft';
    end if;

    if old.status = 'active' and new.status not in ('active','superseded','retired') then
      raise exception 'Active legal documents may only remain active, be superseded, or be retired';
    end if;

    if old.status in ('superseded','retired') and new.status <> old.status then
      raise exception 'Superseded or retired legal versions cannot be reactivated';
    end if;

    new.updated_at := now();
  end if;

  return new;
end;
$$;

revoke all on function private.enforce_legal_document_version_integrity() from public, anon, authenticated;

drop trigger if exists legal_document_versions_integrity on public.legal_document_versions;
create trigger legal_document_versions_integrity
before update on public.legal_document_versions
for each row execute function private.enforce_legal_document_version_integrity();

-- ---------------------------------------------------------------------------
-- 2. Consent / Signature Ledger
-- ---------------------------------------------------------------------------

create table if not exists public.legal_acceptance_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete restrict,
  document_version_id uuid not null references public.legal_document_versions(id) on delete restrict,
  document_key_snapshot text not null,
  version_snapshot text not null,
  document_hash_snapshot text not null check (document_hash_snapshot ~ '^[0-9a-f]{64}$'),
  acceptance_level text not null
    check (acceptance_level in ('notice','clickwrap','strong','bilateral')),
  actor_role text not null
    check (actor_role in ('account_holder','seller','buyer','operator','enterprise_signer')),
  app_id uuid references public.apps(id) on delete set null,
  transaction_id uuid,
  acceptance_scope text not null check (char_length(acceptance_scope) between 1 and 300),
  reauth_method text not null default 'session'
    check (reauth_method in ('none','session','reauth','mfa','otp')),
  terms_presented_at timestamptz not null,
  accepted_at timestamptz not null default now(),
  evidence jsonb not null default '{}'::jsonb check (jsonb_typeof(evidence) = 'object'),
  retention_until timestamptz,
  redacted_at timestamptz,
  redaction_reason text,
  created_at timestamptz not null default now(),
  check (terms_presented_at <= accepted_at + interval '5 minutes'),
  check (redacted_at is null or nullif(trim(coalesce(redaction_reason,'')),'') is not null)
);

create index if not exists legal_acceptance_events_user_idx
  on public.legal_acceptance_events(user_id, accepted_at desc);
create index if not exists legal_acceptance_events_transaction_idx
  on public.legal_acceptance_events(transaction_id, accepted_at desc)
  where transaction_id is not null;
create index if not exists legal_acceptance_events_document_idx
  on public.legal_acceptance_events(document_version_id, accepted_at desc);

create or replace function private.validate_legal_acceptance_event()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  doc public.legal_document_versions;
  unsafe_key text;
begin
  select * into doc
  from public.legal_document_versions
  where id = new.document_version_id;

  if not found then
    raise exception 'Legal document version not found';
  end if;

  if doc.status <> 'active' then
    raise exception 'Only ACTIVE legal document versions may create binding acceptance evidence';
  end if;

  if new.document_key_snapshot <> doc.document_key
    or new.version_snapshot <> doc.version
    or new.document_hash_snapshot <> doc.document_hash
    or new.acceptance_level <> doc.acceptance_level then
    raise exception 'Legal acceptance snapshot does not match the ACTIVE legal document';
  end if;

  if doc.acceptance_level in ('strong','bilateral') then
    if new.reauth_method not in ('reauth','mfa','otp') then
      raise exception 'Strong or bilateral acceptance requires high-assurance reauthentication';
    end if;
    if coalesce((new.evidence->>'high_assurance_verified')::boolean,false) is not true then
      raise exception 'Strong or bilateral acceptance requires verified high-assurance evidence';
    end if;
  end if;

  if doc.acceptance_level = 'bilateral'
    and new.actor_role not in ('seller','buyer','operator','enterprise_signer') then
    raise exception 'Bilateral acceptance requires a material transaction actor role';
  end if;

  select k.key into unsafe_key
  from jsonb_object_keys(new.evidence) as k(key)
  where k.key not in (
    'request_id',
    'ui_surface',
    'locale',
    'user_agent_hash',
    'assurance_level',
    'high_assurance_verified',
    'session_user_id'
  )
  limit 1;

  if unsafe_key is not null then
    raise exception 'Unsupported or unsafe legal evidence field: %', unsafe_key;
  end if;

  if new.accepted_at < now() - interval '10 minutes'
    or new.accepted_at > now() + interval '5 minutes' then
    raise exception 'Acceptance timestamp must be server-current';
  end if;

  if new.terms_presented_at < now() - interval '24 hours' then
    raise exception 'Presented legal terms are stale and must be presented again';
  end if;

  return new;
end;
$$;

revoke all on function private.validate_legal_acceptance_event() from public, anon, authenticated;

drop trigger if exists legal_acceptance_events_validate on public.legal_acceptance_events;
create trigger legal_acceptance_events_validate
before insert on public.legal_acceptance_events
for each row execute function private.validate_legal_acceptance_event();

create or replace function private.protect_legal_acceptance_evidence()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.user_id is distinct from old.user_id
    or new.document_version_id is distinct from old.document_version_id
    or new.document_key_snapshot is distinct from old.document_key_snapshot
    or new.version_snapshot is distinct from old.version_snapshot
    or new.document_hash_snapshot is distinct from old.document_hash_snapshot
    or new.acceptance_level is distinct from old.acceptance_level
    or new.actor_role is distinct from old.actor_role
    or new.app_id is distinct from old.app_id
    or new.transaction_id is distinct from old.transaction_id
    or new.acceptance_scope is distinct from old.acceptance_scope
    or new.reauth_method is distinct from old.reauth_method
    or new.terms_presented_at is distinct from old.terms_presented_at
    or new.accepted_at is distinct from old.accepted_at
    or new.evidence is distinct from old.evidence
    or new.created_at is distinct from old.created_at then
    raise exception 'Legal acceptance evidence is append-only and immutable';
  end if;
  return new;
end;
$$;

revoke all on function private.protect_legal_acceptance_evidence() from public, anon, authenticated;

drop trigger if exists legal_acceptance_events_immutable on public.legal_acceptance_events;
create trigger legal_acceptance_events_immutable
before update on public.legal_acceptance_events
for each row execute function private.protect_legal_acceptance_evidence();

-- ---------------------------------------------------------------------------
-- 3. Malaysian PDPA Privacy Incident Clock
-- ---------------------------------------------------------------------------

create table if not exists public.privacy_incidents (
  id uuid primary key default gen_random_uuid(),
  app_id uuid references public.apps(id) on delete set null,
  source_event_id uuid references public.ai_ops_events(id) on delete set null,
  jurisdiction text not null default 'MY' check (char_length(jurisdiction) between 2 and 12),
  legal_regime text not null default 'PDPA_MY' check (char_length(legal_regime) between 3 and 40),
  incident_status text not null default 'investigating'
    check (incident_status in ('investigating','contained','confirmed_breach','closed')),
  regulatory_assessment_status text not null default 'not_started'
    check (regulatory_assessment_status in ('not_started','in_progress','reportable','not_reportable')),
  severity text not null default 'unknown'
    check (severity in ('unknown','low','medium','high','critical')),
  occurred_at timestamptz,
  detected_at timestamptz not null default now(),
  confirmed_breach_at timestamptz,
  clock_anchor_at timestamptz,
  clock_basis text
    check (clock_basis is null or clock_basis in ('occurrence','detection','reported','confirmation','legal_assessment')),
  notification_window_hours smallint not null default 72
    check (notification_window_hours between 1 and 720),
  notification_deadline_at timestamptz,
  reportability_assessed_at timestamptz,
  commissioner_notified_at timestamptz,
  data_subjects_notified_at timestamptz,
  affected_data_subjects_estimate bigint check (affected_data_subjects_estimate is null or affected_data_subjects_estimate >= 0),
  data_categories jsonb not null default '[]'::jsonb check (jsonb_typeof(data_categories) = 'array'),
  assessment_summary jsonb not null default '{}'::jsonb check (jsonb_typeof(assessment_summary) = 'object'),
  notification_reference text,
  owner_team text not null default 'privacy-security' check (char_length(owner_team) between 2 and 80),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((clock_anchor_at is null and clock_basis is null) or (clock_anchor_at is not null and clock_basis is not null)),
  check (
    regulatory_assessment_status <> 'reportable'
    or (clock_anchor_at is not null and notification_deadline_at is not null)
  ),
  check (commissioner_notified_at is null or nullif(trim(coalesce(notification_reference,'')),'') is not null)
);

create index if not exists privacy_incidents_open_deadline_idx
  on public.privacy_incidents(notification_deadline_at)
  where incident_status <> 'closed' and regulatory_assessment_status = 'reportable';
create index if not exists privacy_incidents_app_idx
  on public.privacy_incidents(app_id, detected_at desc)
  where app_id is not null;

create table if not exists public.privacy_incident_audit (
  id uuid primary key default gen_random_uuid(),
  incident_id uuid not null references public.privacy_incidents(id) on delete restrict,
  actor_user_id uuid references auth.users(id) on delete set null,
  event_type text not null check (char_length(event_type) between 3 and 80),
  state_snapshot jsonb not null default '{}'::jsonb check (jsonb_typeof(state_snapshot) = 'object'),
  created_at timestamptz not null default now()
);

create index if not exists privacy_incident_audit_incident_idx
  on public.privacy_incident_audit(incident_id, created_at asc);

create or replace function private.maintain_privacy_incident_clock()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.clock_anchor_at is not null then
    new.notification_deadline_at := new.clock_anchor_at + make_interval(hours => new.notification_window_hours);
  else
    new.notification_deadline_at := null;
  end if;

  if new.regulatory_assessment_status in ('reportable','not_reportable')
    and new.reportability_assessed_at is null then
    new.reportability_assessed_at := now();
  end if;

  new.updated_at := now();
  return new;
end;
$$;

revoke all on function private.maintain_privacy_incident_clock() from public, anon, authenticated;

drop trigger if exists privacy_incident_clock_maintain on public.privacy_incidents;
create trigger privacy_incident_clock_maintain
before insert or update on public.privacy_incidents
for each row execute function private.maintain_privacy_incident_clock();

create or replace function private.audit_privacy_incident_state()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.privacy_incident_audit(
    incident_id,
    actor_user_id,
    event_type,
    state_snapshot
  ) values (
    new.id,
    auth.uid(),
    case when tg_op = 'INSERT' then 'incident.created' else 'incident.state_changed' end,
    jsonb_build_object(
      'incidentStatus', new.incident_status,
      'regulatoryAssessmentStatus', new.regulatory_assessment_status,
      'severity', new.severity,
      'clockBasis', new.clock_basis,
      'clockAnchorAt', new.clock_anchor_at,
      'notificationWindowHours', new.notification_window_hours,
      'notificationDeadlineAt', new.notification_deadline_at,
      'commissionerNotifiedAt', new.commissioner_notified_at,
      'dataSubjectsNotifiedAt', new.data_subjects_notified_at
    )
  );
  return new;
end;
$$;

revoke all on function private.audit_privacy_incident_state() from public, anon, authenticated;

drop trigger if exists privacy_incident_state_audit on public.privacy_incidents;
create trigger privacy_incident_state_audit
after insert or update on public.privacy_incidents
for each row execute function private.audit_privacy_incident_state();

-- ---------------------------------------------------------------------------
-- 4. Marketplace Transaction Truth Gate
-- ---------------------------------------------------------------------------

create table if not exists public.app_sale_transactions (
  id uuid primary key default gen_random_uuid(),
  app_id uuid not null references public.apps(id) on delete restrict,
  seller_user_id uuid not null references auth.users(id) on delete restrict,
  buyer_user_id uuid not null references auth.users(id) on delete restrict,
  status text not null default 'draft'
    check (status in ('draft','gated','ready_for_transfer','completed','blocked','cancelled')),
  price numeric(18,2) check (price is null or price >= 0),
  currency text check (currency is null or currency ~ '^[A-Z]{3}$'),
  sale_document_key text not null default 'app_sale_ip_assignment',
  data_addendum_document_key text not null default 'app_sale_data_transfer_addendum',
  asset_schedule_hash text check (asset_schedule_hash is null or asset_schedule_hash ~ '^[0-9a-f]{64}$'),
  seller_acceptance_event_id uuid references public.legal_acceptance_events(id) on delete restrict,
  buyer_acceptance_event_id uuid references public.legal_acceptance_events(id) on delete restrict,
  seller_data_acceptance_event_id uuid references public.legal_acceptance_events(id) on delete restrict,
  buyer_data_acceptance_event_id uuid references public.legal_acceptance_events(id) on delete restrict,
  data_transfer_mode text not null default 'undecided'
    check (data_transfer_mode in ('undecided','none','excluded','addendum_required')),
  data_transfer_addendum_hash text
    check (data_transfer_addendum_hash is null or data_transfer_addendum_hash ~ '^[0-9a-f]{64}$'),
  seller_verification_status text not null default 'pending'
    check (seller_verification_status in ('pending','verified','enhanced_review','blocked')),
  payment_status text not null default 'pending'
    check (payment_status in ('pending','authorized','paid','refunded','chargeback','failed')),
  ip_status text not null default 'pending'
    check (ip_status in ('pending','clear','disclosed_exception','blocked')),
  malware_status text not null default 'pending'
    check (malware_status in ('pending','clear','blocked')),
  third_party_disclosure_status text not null default 'pending'
    check (third_party_disclosure_status in ('pending','complete','not_applicable')),
  handover_status text not null default 'pending'
    check (handover_status in ('pending','ready','accepted')),
  credential_rotation_status text not null default 'pending'
    check (credential_rotation_status in ('pending','complete','not_applicable')),
  tax_review_status text not null default 'not_assessed'
    check (tax_review_status in ('not_assessed','not_required','obligation_identified','completed')),
  transaction_hold boolean not null default false,
  hold_reason text,
  ready_for_transfer_at timestamptz,
  ownership_transfer_status text not null default 'not_started'
    check (ownership_transfer_status in ('not_started','in_progress','completed')),
  ownership_transfer_reference text,
  effective_transfer_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (seller_user_id <> buyer_user_id),
  check (not transaction_hold or nullif(trim(coalesce(hold_reason,'')),'') is not null),
  check (status <> 'completed' or ownership_transfer_status = 'completed')
);

create index if not exists app_sale_transactions_app_idx
  on public.app_sale_transactions(app_id, created_at desc);
create index if not exists app_sale_transactions_seller_idx
  on public.app_sale_transactions(seller_user_id, created_at desc);
create index if not exists app_sale_transactions_buyer_idx
  on public.app_sale_transactions(buyer_user_id, created_at desc);
create index if not exists app_sale_transactions_status_idx
  on public.app_sale_transactions(status, updated_at desc);

create or replace function private.app_sale_missing_requirements(p_tx public.app_sale_transactions)
returns text[]
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  missing text[] := array[]::text[];
  seller_event public.legal_acceptance_events;
  buyer_event public.legal_acceptance_events;
  seller_data_event public.legal_acceptance_events;
  buyer_data_event public.legal_acceptance_events;
begin
  if p_tx.seller_verification_status <> 'verified' then
    missing := array_append(missing,'seller_verification');
  end if;

  if p_tx.asset_schedule_hash is null or p_tx.asset_schedule_hash !~ '^[0-9a-f]{64}$' then
    missing := array_append(missing,'asset_schedule');
  end if;

  if p_tx.payment_status <> 'paid' then
    missing := array_append(missing,'payment');
  end if;

  if p_tx.ip_status not in ('clear','disclosed_exception') then
    missing := array_append(missing,'ip_review');
  end if;

  if p_tx.malware_status <> 'clear' then
    missing := array_append(missing,'malware_review');
  end if;

  if p_tx.third_party_disclosure_status not in ('complete','not_applicable') then
    missing := array_append(missing,'third_party_disclosure');
  end if;

  if p_tx.handover_status <> 'accepted' then
    missing := array_append(missing,'handover_acceptance');
  end if;

  if p_tx.credential_rotation_status not in ('complete','not_applicable') then
    missing := array_append(missing,'credential_rotation');
  end if;

  if p_tx.tax_review_status = 'not_assessed' then
    missing := array_append(missing,'tax_stamp_review');
  end if;

  if p_tx.transaction_hold then
    missing := array_append(missing,'transaction_hold');
  end if;

  if p_tx.data_transfer_mode = 'undecided' then
    missing := array_append(missing,'data_transfer_decision');
  end if;

  if p_tx.seller_acceptance_event_id is null then
    missing := array_append(missing,'seller_bilateral_acceptance');
  else
    select * into seller_event from public.legal_acceptance_events where id = p_tx.seller_acceptance_event_id;
    if not found
      or seller_event.user_id is distinct from p_tx.seller_user_id
      or seller_event.actor_role is distinct from 'seller'
      or seller_event.transaction_id is distinct from p_tx.id
      or seller_event.document_key_snapshot is distinct from p_tx.sale_document_key
      or seller_event.acceptance_level is distinct from 'bilateral' then
      missing := array_append(missing,'seller_bilateral_acceptance');
    end if;
  end if;

  if p_tx.buyer_acceptance_event_id is null then
    missing := array_append(missing,'buyer_bilateral_acceptance');
  else
    select * into buyer_event from public.legal_acceptance_events where id = p_tx.buyer_acceptance_event_id;
    if not found
      or buyer_event.user_id is distinct from p_tx.buyer_user_id
      or buyer_event.actor_role is distinct from 'buyer'
      or buyer_event.transaction_id is distinct from p_tx.id
      or buyer_event.document_key_snapshot is distinct from p_tx.sale_document_key
      or buyer_event.acceptance_level is distinct from 'bilateral' then
      missing := array_append(missing,'buyer_bilateral_acceptance');
    end if;
  end if;

  if p_tx.data_transfer_mode = 'addendum_required' then
    if p_tx.data_transfer_addendum_hash is null or p_tx.data_transfer_addendum_hash !~ '^[0-9a-f]{64}$' then
      missing := array_append(missing,'data_transfer_addendum');
    end if;

    if p_tx.seller_data_acceptance_event_id is null then
      missing := array_append(missing,'seller_data_addendum_acceptance');
    else
      select * into seller_data_event from public.legal_acceptance_events where id = p_tx.seller_data_acceptance_event_id;
      if not found
        or seller_data_event.user_id is distinct from p_tx.seller_user_id
        or seller_data_event.actor_role is distinct from 'seller'
        or seller_data_event.transaction_id is distinct from p_tx.id
        or seller_data_event.document_key_snapshot is distinct from p_tx.data_addendum_document_key
        or seller_data_event.acceptance_level is distinct from 'bilateral' then
        missing := array_append(missing,'seller_data_addendum_acceptance');
      end if;
    end if;

    if p_tx.buyer_data_acceptance_event_id is null then
      missing := array_append(missing,'buyer_data_addendum_acceptance');
    else
      select * into buyer_data_event from public.legal_acceptance_events where id = p_tx.buyer_data_acceptance_event_id;
      if not found
        or buyer_data_event.user_id is distinct from p_tx.buyer_user_id
        or buyer_data_event.actor_role is distinct from 'buyer'
        or buyer_data_event.transaction_id is distinct from p_tx.id
        or buyer_data_event.document_key_snapshot is distinct from p_tx.data_addendum_document_key
        or buyer_data_event.acceptance_level is distinct from 'bilateral' then
        missing := array_append(missing,'buyer_data_addendum_acceptance');
      end if;
    end if;
  end if;

  return missing;
end;
$$;

revoke all on function private.app_sale_missing_requirements(public.app_sale_transactions) from public, anon, authenticated;

create or replace function private.enforce_app_sale_truth_gate()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_owner uuid;
  missing text[];
begin
  select owner_id into current_owner from public.apps where id = new.app_id;
  if current_owner is null then
    raise exception 'App does not exist';
  end if;

  if tg_op = 'INSERT' then
    if current_owner <> new.seller_user_id then
      raise exception 'Seller must be the current app owner when a sale transaction is created';
    end if;
  end if;

  if tg_op = 'UPDATE' then
    if old.status <> 'draft' and (
      new.app_id is distinct from old.app_id
      or new.seller_user_id is distinct from old.seller_user_id
      or new.buyer_user_id is distinct from old.buyer_user_id
      or new.sale_document_key is distinct from old.sale_document_key
      or new.data_addendum_document_key is distinct from old.data_addendum_document_key
    ) then
      raise exception 'Material transaction identity is immutable after draft';
    end if;
  end if;

  missing := private.app_sale_missing_requirements(new);

  if new.status = 'ready_for_transfer' then
    if cardinality(missing) > 0 then
      raise exception 'Transaction truth gate is not satisfied: %', array_to_string(missing, ',');
    end if;
    if new.ready_for_transfer_at is null then
      new.ready_for_transfer_at := now();
    end if;
  end if;

  if new.ownership_transfer_status = 'completed' then
    if cardinality(missing) > 0 then
      raise exception 'Ownership transfer cannot be marked complete while truth-gate requirements are missing: %', array_to_string(missing, ',');
    end if;
    if current_owner <> new.buyer_user_id then
      raise exception 'Platform app ownership has not actually transferred to the buyer';
    end if;
    if nullif(trim(coalesce(new.ownership_transfer_reference,'')),'') is null then
      raise exception 'Ownership transfer completion requires an immutable transfer reference';
    end if;
    if new.effective_transfer_at is null then
      raise exception 'Ownership transfer completion requires an effective transfer timestamp';
    end if;
    new.status := 'completed';
    if new.completed_at is null then new.completed_at := now(); end if;
  end if;

  if tg_op = 'UPDATE' then
    if old.status = 'completed' then
      if new.status <> 'completed'
        or new.ownership_transfer_status <> old.ownership_transfer_status
        or new.ownership_transfer_reference is distinct from old.ownership_transfer_reference
        or new.effective_transfer_at is distinct from old.effective_transfer_at
        or new.completed_at is distinct from old.completed_at then
        raise exception 'Completed transaction ownership evidence is immutable; disputes and chargebacks must be recorded separately';
      end if;
    end if;
  end if;

  new.updated_at := now();
  return new;
end;
$$;

revoke all on function private.enforce_app_sale_truth_gate() from public, anon, authenticated;

drop trigger if exists app_sale_transactions_truth_gate on public.app_sale_transactions;
create trigger app_sale_transactions_truth_gate
before insert or update on public.app_sale_transactions
for each row execute function private.enforce_app_sale_truth_gate();

-- ---------------------------------------------------------------------------
-- Exposure model: service-side only. No direct customer writes to evidence tables.
-- ---------------------------------------------------------------------------

alter table public.legal_document_versions enable row level security;
alter table public.legal_acceptance_events enable row level security;
alter table public.privacy_incidents enable row level security;
alter table public.privacy_incident_audit enable row level security;
alter table public.app_sale_transactions enable row level security;

revoke all on public.legal_document_versions from anon, authenticated;
revoke all on public.legal_acceptance_events from anon, authenticated;
revoke all on public.privacy_incidents from anon, authenticated;
revoke all on public.privacy_incident_audit from anon, authenticated;
revoke all on public.app_sale_transactions from anon, authenticated;

grant select, insert, update, delete on public.legal_document_versions to service_role;
grant select, insert, update, delete on public.legal_acceptance_events to service_role;
grant select, insert, update, delete on public.privacy_incidents to service_role;
grant select, insert, update, delete on public.privacy_incident_audit to service_role;
grant select, insert, update, delete on public.app_sale_transactions to service_role;

-- Intentionally no ACTIVE legal rows are seeded here.
-- Activation is a separate lawyer/release-controlled event and must happen only
-- after PR #237 + PR #244 legal documents are merged, approved, hashed, and the
-- then-current Production runtime is reconciled to exact SHA/version evidence.
