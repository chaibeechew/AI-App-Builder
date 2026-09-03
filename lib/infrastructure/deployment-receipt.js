import crypto from "node:crypto";
import { DEPLOYMENT_STATUS, normalizeDeploymentStatus } from "./deployment-provider-contract.js";

export const LANERIQ_DEPLOYMENT_RECEIPT_VERSION = "2026-09-04.1";

function required(value, name) {
  const normalized = String(value || "").trim();
  if (!normalized) throw new Error(`LANERIQ_DEPLOYMENT_RECEIPT_${name}_REQUIRED`);
  return normalized;
}

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
  if (!Number.isFinite(date.getTime())) throw new Error("LANERIQ_DEPLOYMENT_RECEIPT_TIMESTAMP_INVALID");
  return date.toISOString();
}

export function createDeploymentReceipt({
  projectId,
  versionId,
  sourceSha,
  bundleDigest,
  artifactId,
  artifactDigest,
  providerId,
  deploymentId,
  deploymentUrl = null,
  target = "preview",
  status,
  createdAt,
  healthVerified = false,
  provenanceVerified = false,
} = {}) {
  const normalizedStatus = normalizeDeploymentStatus(status);
  const payload = Object.freeze({
    schema: "laneriq.deployment-receipt",
    version: LANERIQ_DEPLOYMENT_RECEIPT_VERSION,
    projectId: required(projectId, "PROJECT_ID"),
    versionId: required(versionId, "VERSION_ID"),
    sourceSha: required(sourceSha, "SOURCE_SHA"),
    bundleDigest: required(bundleDigest, "BUNDLE_DIGEST").toLowerCase(),
    artifactId: required(artifactId, "ARTIFACT_ID"),
    artifactDigest: required(artifactDigest, "ARTIFACT_DIGEST").toLowerCase(),
    providerId: required(providerId, "PROVIDER_ID"),
    deploymentId: required(deploymentId, "DEPLOYMENT_ID"),
    deploymentUrl: deploymentUrl ? String(deploymentUrl) : null,
    target: String(target || "preview").trim().toLowerCase(),
    status: normalizedStatus,
    createdAt: iso(createdAt),
    healthVerified: Boolean(healthVerified),
    provenanceVerified: Boolean(provenanceVerified),
  });
  return Object.freeze({
    ...payload,
    receiptDigest: digest(payload),
    readyEvidence: normalizedStatus === DEPLOYMENT_STATUS.READY && Boolean(healthVerified) && Boolean(provenanceVerified),
    containsProviderCredentials: false,
  });
}

export function verifyDeploymentReceipt(receipt, { sourceSha = null, bundleDigest = null, artifactDigest = null } = {}) {
  if (!receipt || receipt.schema !== "laneriq.deployment-receipt") return Object.freeze({ verified: false, reason: "receipt_invalid" });
  const payload = {
    schema: receipt.schema,
    version: receipt.version,
    projectId: receipt.projectId,
    versionId: receipt.versionId,
    sourceSha: receipt.sourceSha,
    bundleDigest: receipt.bundleDigest,
    artifactId: receipt.artifactId,
    artifactDigest: receipt.artifactDigest,
    providerId: receipt.providerId,
    deploymentId: receipt.deploymentId,
    deploymentUrl: receipt.deploymentUrl || null,
    target: receipt.target,
    status: receipt.status,
    createdAt: receipt.createdAt,
    healthVerified: Boolean(receipt.healthVerified),
    provenanceVerified: Boolean(receipt.provenanceVerified),
  };
  const observed = digest(payload);
  const checks = Object.freeze({
    receiptDigest: observed === receipt.receiptDigest,
    sourceSha: sourceSha === null || String(sourceSha) === receipt.sourceSha,
    bundleDigest: bundleDigest === null || String(bundleDigest).toLowerCase() === receipt.bundleDigest,
    artifactDigest: artifactDigest === null || String(artifactDigest).toLowerCase() === receipt.artifactDigest,
  });
  return Object.freeze({
    verified: Object.values(checks).every(Boolean),
    checks,
    expectedReceiptDigest: receipt.receiptDigest,
    observedReceiptDigest: observed,
    readyEvidence: receipt.status === DEPLOYMENT_STATUS.READY && receipt.healthVerified === true && receipt.provenanceVerified === true,
  });
}

export function publicDeploymentReceiptPolicy() {
  return Object.freeze({
    version: LANERIQ_DEPLOYMENT_RECEIPT_VERSION,
    contentAddressedReceipt: true,
    recordsSourceSha: true,
    recordsBundleAndArtifactDigest: true,
    recordsProviderAsEvidenceData: true,
    providerCredentialsAllowed: false,
    readyEvidenceRequiresHealthAndProvenance: true,
    providerSpecificApiRequired: false,
    fixedInfrastructureCostRequired: false,
  });
}
