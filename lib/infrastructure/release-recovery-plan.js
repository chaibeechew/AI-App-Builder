import { DEPLOYMENT_STATUS } from "./deployment-provider-contract.js";
import { verifyDeploymentReceipt } from "./deployment-receipt.js";

export const LANERIQ_RELEASE_RECOVERY_VERSION = "2026-09-04.1";

function normalizedDomains(domains) {
  return [...new Set((Array.isArray(domains) ? domains : []).map((item) => String(item).trim().toLowerCase()).filter(Boolean))].sort();
}

function requireReadyReceipt(receipt, label) {
  const verification = verifyDeploymentReceipt(receipt);
  if (!verification.verified) throw new Error(`LANERIQ_RELEASE_RECOVERY_${label}_RECEIPT_INVALID`);
  if (receipt.status !== DEPLOYMENT_STATUS.READY || verification.readyEvidence !== true) {
    throw new Error(`LANERIQ_RELEASE_RECOVERY_${label}_READY_EVIDENCE_REQUIRED`);
  }
  return verification;
}

export function createReleaseRecoveryPlan({
  currentReceipt,
  targetReceipt,
  domains = [],
  targetHealth = null,
  dryRun = true,
  approvalGranted = false,
} = {}) {
  if (dryRun !== true) throw new Error("LANERIQ_RELEASE_RECOVERY_LEVEL0_DRY_RUN_REQUIRED");
  requireReadyReceipt(currentReceipt, "CURRENT");
  requireReadyReceipt(targetReceipt, "TARGET");
  if (currentReceipt.projectId !== targetReceipt.projectId) throw new Error("LANERIQ_RELEASE_RECOVERY_PROJECT_MISMATCH");
  if (currentReceipt.deploymentId === targetReceipt.deploymentId) throw new Error("LANERIQ_RELEASE_RECOVERY_TARGET_MUST_DIFFER");
  if (targetHealth !== null && targetHealth?.healthy !== true) throw new Error("LANERIQ_RELEASE_RECOVERY_TARGET_HEALTH_REQUIRED");

  const providerChange = currentReceipt.providerId !== targetReceipt.providerId;
  const artifactChange = currentReceipt.artifactDigest !== targetReceipt.artifactDigest;
  const normalized = normalizedDomains(domains);
  const steps = Object.freeze([
    "verify_current_receipt",
    "verify_target_receipt",
    "verify_target_health",
    "verify_target_artifact_digest",
    "stage_target_without_traffic",
    "run_canary_checks",
    "prepare_domain_or_alias_cutover",
    "record_operator_approval",
    "cutover_traffic_only_after_live_execution_is_separately_enabled",
    "observe_error_latency_and_integrity_signals",
    "retain_previous_target_for_fast_reversal",
  ]);

  return Object.freeze({
    version: LANERIQ_RELEASE_RECOVERY_VERSION,
    projectId: currentReceipt.projectId,
    mode: artifactChange ? "rollback_or_release_change" : providerChange ? "provider_migration" : "deployment_recovery",
    from: Object.freeze({ providerId: currentReceipt.providerId, deploymentId: currentReceipt.deploymentId, artifactDigest: currentReceipt.artifactDigest }),
    to: Object.freeze({ providerId: targetReceipt.providerId, deploymentId: targetReceipt.deploymentId, artifactDigest: targetReceipt.artifactDigest }),
    domains: Object.freeze(normalized),
    providerChange,
    artifactChange,
    dryRun: true,
    approvalRecordedForFutureLiveRun: Boolean(approvalGranted),
    productionMutationAllowed: false,
    dnsMutationAllowed: false,
    providerCutoverAllowed: false,
    destructiveCleanupAllowed: false,
    automaticRollbackAllowed: false,
    previousDeploymentRetained: true,
    steps,
  });
}

export function publicReleaseRecoveryPolicy() {
  return Object.freeze({
    version: LANERIQ_RELEASE_RECOVERY_VERSION,
    level0Mode: "evidence_gated_dry_run_only",
    exactReceiptRequired: true,
    targetHealthRequiredWhenObserved: true,
    providerMigrationPlanningSupported: true,
    rollbackPlanningSupported: true,
    liveDnsMutationAllowed: false,
    liveProviderCutoverAllowed: false,
    automaticRollbackAllowed: false,
    destructiveCleanupAllowed: false,
    fixedInfrastructureCostRequired: false,
  });
}
