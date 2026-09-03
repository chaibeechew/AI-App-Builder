import crypto from "node:crypto";
import { verifyPortableBuildBundle } from "./portable-build-bundle.js";
import { verifyMaterializationReceipt } from "./materialization-receipt.js";
import { verifyDeploymentReceipt } from "./deployment-receipt.js";
import { evaluateProductionPromotion } from "./promotion-gate.js";

export const LANERIQ_RELEASE_EVIDENCE_BUNDLE_VERSION = "2026-09-04.1";

function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(([key, nested]) => [key, canonical(nested)]));
}

function digest(value) {
  return `sha256:${crypto.createHash("sha256").update(JSON.stringify(canonical(value))).digest("hex")}`;
}

function iso(value) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) throw new Error("LANERIQ_RELEASE_EVIDENCE_TIMESTAMP_INVALID");
  return date.toISOString();
}

function normalizeBrowserEvidence(value = {}) {
  const engines = [...new Set((Array.isArray(value.engines) ? value.engines : []).map((item) => String(item).trim().toLowerCase()).filter(Boolean))].sort();
  return Object.freeze({
    deploymentId: String(value.deploymentId || ""),
    engines: Object.freeze(engines),
    crossEnginePassed: value.crossEnginePassed === true,
    performanceRecorded: value.performanceRecorded === true,
  });
}

function normalizeRuntimeEvidence(value = {}) {
  return Object.freeze({
    deploymentId: String(value.deploymentId || ""),
    errorFatalCount: Number(value.errorFatalCount),
    sampleWindowMinutes: Number(value.sampleWindowMinutes),
  });
}

export function createReleaseEvidenceBundle({
  bundle,
  materializationReceipt,
  deploymentReceipt,
  browserEvidence = {},
  runtimeEvidence = {},
  createdAt,
} = {}) {
  const bundleVerification = verifyPortableBuildBundle(bundle);
  if (!bundleVerification.verified) throw new Error("LANERIQ_RELEASE_EVIDENCE_BUNDLE_INVALID");
  const materializationVerification = verifyMaterializationReceipt(materializationReceipt, {
    bundleDigest: bundle.bundleDigest,
    artifactDigest: deploymentReceipt?.artifactDigest || null,
  });
  if (!materializationVerification.verified) throw new Error("LANERIQ_RELEASE_EVIDENCE_MATERIALIZATION_INVALID");
  const deploymentVerification = verifyDeploymentReceipt(deploymentReceipt, {
    sourceSha: bundle.sourceSha || null,
    bundleDigest: bundle.bundleDigest,
    artifactDigest: materializationReceipt.artifactDigest,
  });
  if (!deploymentVerification.verified) throw new Error("LANERIQ_RELEASE_EVIDENCE_DEPLOYMENT_INVALID");

  const normalizedBrowser = normalizeBrowserEvidence(browserEvidence);
  const normalizedRuntime = normalizeRuntimeEvidence(runtimeEvidence);
  const promotion = evaluateProductionPromotion({
    bundle,
    materializationReceipt,
    deploymentReceipt,
    browserEvidence: normalizedBrowser,
    runtimeEvidence: normalizedRuntime,
    manualApproval: false,
  });

  const payload = Object.freeze({
    schema: "laneriq.release-evidence-bundle",
    version: LANERIQ_RELEASE_EVIDENCE_BUNDLE_VERSION,
    projectId: bundle.projectId,
    versionId: bundle.versionId,
    sourceSha: bundle.sourceSha || null,
    bundleDigest: bundle.bundleDigest,
    materializationReceiptDigest: materializationReceipt.receiptDigest,
    deploymentReceiptDigest: deploymentReceipt.receiptDigest,
    artifactId: deploymentReceipt.artifactId,
    artifactDigest: deploymentReceipt.artifactDigest,
    preview: Object.freeze({
      providerId: deploymentReceipt.providerId,
      deploymentId: deploymentReceipt.deploymentId,
      target: deploymentReceipt.target,
      status: deploymentReceipt.status,
    }),
    browserEvidence: normalizedBrowser,
    runtimeEvidence: normalizedRuntime,
    promotionGate: Object.freeze({
      decision: promotion.decision,
      evidenceReady: promotion.evidenceReady,
      checks: promotion.checks,
    }),
    createdAt: iso(createdAt),
  });

  return Object.freeze({
    ...payload,
    evidenceDigest: digest(payload),
    productionMutationAllowed: false,
    dnsMutationAllowed: false,
    providerCredentialsEmbedded: false,
  });
}

export function verifyReleaseEvidenceBundle(evidence, {
  bundle = null,
  materializationReceipt = null,
  deploymentReceipt = null,
} = {}) {
  if (!evidence || evidence.schema !== "laneriq.release-evidence-bundle") return Object.freeze({ verified: false, reason: "evidence_invalid" });
  const payload = {
    schema: evidence.schema,
    version: evidence.version,
    projectId: evidence.projectId,
    versionId: evidence.versionId,
    sourceSha: evidence.sourceSha || null,
    bundleDigest: evidence.bundleDigest,
    materializationReceiptDigest: evidence.materializationReceiptDigest,
    deploymentReceiptDigest: evidence.deploymentReceiptDigest,
    artifactId: evidence.artifactId,
    artifactDigest: evidence.artifactDigest,
    preview: evidence.preview,
    browserEvidence: evidence.browserEvidence,
    runtimeEvidence: evidence.runtimeEvidence,
    promotionGate: evidence.promotionGate,
    createdAt: evidence.createdAt,
  };
  const observedEvidenceDigest = digest(payload);
  const checks = {
    evidenceDigest: observedEvidenceDigest === evidence.evidenceDigest,
    evidenceReadyBoolean: typeof evidence.promotionGate?.evidenceReady === "boolean",
    productionMutationBlocked: evidence.productionMutationAllowed === false,
    dnsMutationBlocked: evidence.dnsMutationAllowed === false,
  };
  if (bundle) {
    checks.bundle = verifyPortableBuildBundle(bundle).verified === true && bundle.bundleDigest === evidence.bundleDigest && (bundle.sourceSha || null) === (evidence.sourceSha || null);
  }
  if (materializationReceipt) {
    checks.materializationReceipt = verifyMaterializationReceipt(materializationReceipt, { bundleDigest: evidence.bundleDigest, artifactDigest: evidence.artifactDigest }).verified === true
      && materializationReceipt.receiptDigest === evidence.materializationReceiptDigest;
  }
  if (deploymentReceipt) {
    checks.deploymentReceipt = verifyDeploymentReceipt(deploymentReceipt, { sourceSha: evidence.sourceSha, bundleDigest: evidence.bundleDigest, artifactDigest: evidence.artifactDigest }).verified === true
      && deploymentReceipt.receiptDigest === evidence.deploymentReceiptDigest
      && deploymentReceipt.deploymentId === evidence.preview?.deploymentId;
  }
  return Object.freeze({
    verified: Object.values(checks).every(Boolean),
    checks: Object.freeze(checks),
    expectedEvidenceDigest: evidence.evidenceDigest,
    observedEvidenceDigest,
  });
}

export function publicReleaseEvidenceBundlePolicy() {
  return Object.freeze({
    version: LANERIQ_RELEASE_EVIDENCE_BUNDLE_VERSION,
    bindsSourceBundleMaterializationAndDeployment: true,
    bindsBrowserAndRuntimeEvidence: true,
    deterministicSha256EvidenceDigest: true,
    exactPreviewDeploymentRecorded: true,
    productionMutationAllowed: false,
    dnsMutationAllowed: false,
    providerCredentialsAllowed: false,
    externalEvidenceDatabaseRequired: false,
    fixedInfrastructureCostRequired: false,
  });
}
