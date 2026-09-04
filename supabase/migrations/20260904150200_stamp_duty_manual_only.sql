-- Batch 115 follow-up: owner-directed stamp-duty safety boundary.
-- LANERIQ AI must not automatically calculate, file, submit, stamp or pay Malaysian stamp duty.
-- This migration records and enforces manual-review-only handling at the transaction layer.

alter table if exists public.app_sale_transactions
  add column if not exists stamp_duty_handling_mode text not null default 'manual_review_only';

alter table if exists public.app_sale_transactions
  drop constraint if exists app_sale_transactions_stamp_duty_handling_mode_check;

alter table if exists public.app_sale_transactions
  add constraint app_sale_transactions_stamp_duty_handling_mode_check
  check (stamp_duty_handling_mode = 'manual_review_only');

comment on column public.app_sale_transactions.stamp_duty_handling_mode is
  'Owner policy: manual review only. No automatic calculation, assessment, filing, submission, stamping, payment or payment authorization. Any future automation requires a separate explicit owner decision and separately reviewed Production change.';
