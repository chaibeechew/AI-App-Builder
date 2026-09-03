import { verifyPortableBuildBundle } from "./portable-build-bundle.js";
import { verifyMaterializationReceipt } from "./materialization-receipt.js";

export const LANERIQ_PREBUILT_PREVIEW_CANARY_VERSION = "2026-09-04.1";

export function createPrebuiltPreviewCanaryPlan({
  bundle,
  prebuiltPlan,
  materializationReceipt,
  maximumLifetimeMinutes = 60,
} = {}) {
  const bundleVerification = verifyPortableBuildBundle(bundle);
  if (!bundleVerification.verified) throw new Error("LANERIQ_PREBUILT_CANARY_BUNDLE_INVALID");
  if (!prebuiltPlan || prebuiltPlan.deploymentMode !== "prebuilt") throw new Error("LANERIQ_PREBUILT_CANARY_PREBUILT_PLAN_REQUIRED");
  if (prebuiltPlan.bundleDigest !== bundle.bundleDigest) throw new Error("LANERIQ_PREBUILT_CANARY_BUNDLE_MISMATCH");

  const materializationVerification = verifyMaterializationReceipt(materializationReceipt, {
    bundleDigest: bundle.bundleDigest,
    artifactDigest: prebuiltPlan.artifactDigest,
  });
  if (!materializationVerification.verified) throw new Error("LANERIQ_PREBUILT_CANARY_MATERIALIZATION_EVIDENCE_REQUIRED");
  if (materializationReceipt.artifactId !== prebuiltPlan.artifactId) throw new Error("LANERIQ_PREBUILT_CANARY_ARTIFACT_MISMATCH");

  const expected = new Map((prebuiltPlan.fileCopies || []).map((copy) => [copy.targetPath, copy]));
  if (expected.size === 0) throw new Error("LANERIQ_PREBUILT_CANARY_FILES_REQUIRED");
  for (const file of materializationReceipt.files || []) {
    const copy = expected.get(file.targetPath);
    if (!copy || copy.digest !== file.digest || copy.sizeBytes !== file.sizeBytes) {
      throw new Error(`LANERIQ_PREBUILT_CANARY_MATERIALIZED_FILE_MISMATCH:${file.targetPath}`);
    }
  }
  if ((materializationReceipt.files || []).length !== expected.size) throw new Error("LANERIQ_PREBUILT_CANARY_FILE_COUNT_MISMATCH");
  if (!(materializationReceipt.files || []).every((file) => file.targetPath.startsWith(`${prebuiltPlan.outputRoot}/`))) {
    throw new Error("LANERIQ_PREBUILT_CANARY_OUTPUT_ROOT_MISMATCH");
  }

  const lifetime = Math.max(5, Math.min(1440, Math.floor(Number(maximumLifetimeMinutes) || 60)));
  return Object.freeze({
    version: LANERIQ_PREBUILT_PREVIEW_CANARY_VERSION,
    providerId: String(prebuiltPlan.providerId || "provider"),
    deploymentMode: "prebuilt",
    deploymentTarget: "preview",
    bundleDigest: bundle.bundleDigest,
    artifactId: prebuiltPlan.artifactId,
    artifactDigest: prebuiltPlan.artifactDigest,
    materializationReceiptDigest: materializationReceipt.receiptDigest,
    outputRoot: prebuiltPlan.outputRoot,
    commandHint: prebuiltPlan.commandHint || null,
    maximumLifetimeMinutes: lifetime,
    productionTargetAllowed: false,
    customDomainMutationAllowed: false,
    providerAliasMutationAllowed: false,
    dnsMutationAllowed: false,
    productionEnvironmentSecretsRequired: false,
    networkExecutionAllowedAtLevel0: false,
    livePreviewDeploymentClaimed: false,
    requiresSeparateProviderExecutor: true,
    requiresDeploymentReceiptAfterExecution: true,
  });
}

export function publicPrebuiltPreviewCanaryPolicy() {
  return Object.freeze({
    version: LANERIQ_PREBUILT_PREVIEW_CANARY_VERSION,
    previewOnlyAtLevel0: true,
    prebuiltArtifactRequired: true,
    verifiedMaterializationReceiptRequired: true,
    productionTargetAllowed: false,
    customDomainMutationAllowed: false,
    liveDnsMutationAllowed: false,
    networkExecutionAllowedAtLevel0: false,
    livePreviewClaimRequiresSeparateRuntimeEvidence: true,
    providerCredentialsStoredInPlan: false,
    fixedInfrastructureCostRequired: false,
  });
}
