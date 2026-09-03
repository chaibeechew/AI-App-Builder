import { verifyPortableBuildBundle } from "./portable-build-bundle.js";
import { verifyMaterializationReceipt } from "./materialization-receipt.js";
import { verifyDeploymentReceipt } from "./deployment-receipt.js";
import { DEPLOYMENT_STATUS } from "./deployment-provider-contract.js";

export const LANERIQ_PROMOTION_GATE_VERSION = "2026-09-04.1";

function browserEngines(evidence) {
  return new Set((Array.isArray(evidence?.engines) ? evidence.engines : []).map((item) => String(item).trim().toLowerCase()));
}

export function evaluateProductionPromotion({
  bundle,
  materializationReceipt,
  deploymentReceipt,
  browserEvidence = {},
  runtimeEvidence = {},
  manualApproval = false,
} = {}) {
  const bundleVerification = verifyPortableBuildBundle(bundle);
  const materializationVerification = verifyMaterializationReceipt(materializationReceipt, {
    bundleDigest: bundle?.bundleDigest,
    artifactDigest: deploymentReceipt?.artifactDigest || null,
  });
  const deploymentVerification = verifyDeploymentReceipt(deploymentReceipt, {
    sourceSha: bundle?.sourceSha || null,
    bundleDigest: bundle?.bundleDigest || null,
    artifactDigest: materializationReceipt?.artifactDigest || null,
  });
  const engines = browserEngines(browserEvidence);
  const exactDeploymentId = String(deploymentReceipt?.deploymentId || "");
  const runtimeErrors = Number(runtimeEvidence?.errorFatalCount);
  const runtimeWindowMinutes = Number(runtimeEvidence?.sampleWindowMinutes);

  const checks = Object.freeze({
    bundleVerified: bundleVerification.verified === true,
    materializationVerified: materializationVerification.verified === true,
    deploymentReceiptVerified: deploymentVerification.verified === true,
    previewReadyEvidence: deploymentReceipt?.target === "preview"
      && deploymentReceipt?.status === DEPLOYMENT_STATUS.READY
      && deploymentVerification.readyEvidence === true,
    browserExactDeployment: String(browserEvidence?.deploymentId || "") === exactDeploymentId,
    chromiumPassed: browserEvidence?.crossEnginePassed === true && engines.has("chromium"),
    webkitPassed: browserEvidence?.crossEnginePassed === true && engines.has("webkit"),
    runtimeExactDeployment: String(runtimeEvidence?.deploymentId || "") === exactDeploymentId,
    runtimeNoErrorFatal: Number.isFinite(runtimeErrors) && runtimeErrors === 0,
    runtimeWindowRecorded: Number.isFinite(runtimeWindowMinutes) && runtimeWindowMinutes > 0,
  });
  const evidenceReady = Object.values(checks).every(Boolean);

  return Object.freeze({
    version: LANERIQ_PROMOTION_GATE_VERSION,
    decision: evidenceReady ? "eligible_for_production_review" : "blocked",
    evidenceReady,
    checks,
    manualApprovalRecorded: Boolean(manualApproval),
    separateLiveExecutorStillRequired: true,
    productionMutationAllowed: false,
    automaticPromotionAllowed: false,
    dnsMutationAllowed: false,
    providerAliasMutationAllowed: false,
    nativeStoreLiveEvidenceClaimed: false,
    reason: evidenceReady ? "preview_evidence_complete" : "promotion_evidence_incomplete",
  });
}

export function publicPromotionGatePolicy() {
  return Object.freeze({
    version: LANERIQ_PROMOTION_GATE_VERSION,
    verifiedBundleRequired: true,
    verifiedMaterializationRequired: true,
    verifiedPreviewDeploymentReceiptRequired: true,
    chromiumAndWebkitRequired: true,
    exactDeploymentRuntimeEvidenceRequired: true,
    zeroErrorFatalWindowRequired: true,
    manualApprovalDoesNotMutateProductionAtLevel0: true,
    separateLiveExecutorRequired: true,
    automaticPromotionAllowed: false,
    liveDnsMutationAllowed: false,
    fixedInfrastructureCostRequired: false,
  });
}
