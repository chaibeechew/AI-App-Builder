-- Batch 115 service-only legal runtime RPC.
-- Keeps marketplace truth evaluation centralized in PostgreSQL while preventing
-- browsers or ordinary authenticated users from invoking SECURITY DEFINER logic.

create or replace function public.server_evaluate_app_sale_truth_gate(p_transaction_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  tx public.app_sale_transactions;
  missing text[];
begin
  select * into tx
  from public.app_sale_transactions
  where id = p_transaction_id;

  if not found then
    return jsonb_build_object(
      'found', false,
      'transactionId', p_transaction_id
    );
  end if;

  missing := private.app_sale_missing_requirements(tx);

  return jsonb_build_object(
    'found', true,
    'transactionId', tx.id,
    'appId', tx.app_id,
    'status', tx.status,
    'ownershipTransferStatus', tx.ownership_transfer_status,
    'readyForTransfer', cardinality(missing) = 0,
    'missingRequirements', to_jsonb(missing),
    'transactionHold', tx.transaction_hold,
    'dataTransferMode', tx.data_transfer_mode,
    'sellerVerificationStatus', tx.seller_verification_status,
    'paymentStatus', tx.payment_status,
    'ipStatus', tx.ip_status,
    'malwareStatus', tx.malware_status,
    'handoverStatus', tx.handover_status,
    'credentialRotationStatus', tx.credential_rotation_status,
    'taxReviewStatus', tx.tax_review_status,
    'readyForTransferAt', tx.ready_for_transfer_at,
    'effectiveTransferAt', tx.effective_transfer_at,
    'completedAt', tx.completed_at
  );
end;
$$;

revoke all on function public.server_evaluate_app_sale_truth_gate(uuid) from public, anon, authenticated;
grant execute on function public.server_evaluate_app_sale_truth_gate(uuid) to service_role;
