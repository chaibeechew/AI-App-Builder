import crypto from "node:crypto";

export const LANERIQ_MATERIALIZATION_RECEIPT_VERSION = "2026-09-04.1";

function required(value, name) {
  const normalized = String(value || "").trim();
  if (!normalized) throw new Error(`LANERIQ_MATERIALIZATION_RECEIPT_${name}_REQUIRED`);
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
  if (!Number.isFinite(date.getTime())) throw new Error("LANERIQ_MATERIALIZATION_RECEIPT_TIMESTAMP_INVALID");
  return date.toISOString();
}

function normalizeFile(file, index) {
  const sourcePath = required(file?.sourcePath, `SOURCE_PATH_${index}`);
  const targetPath = required(file?.targetPath, `TARGET_PATH_${index}`);
  const fileDigest = required(file?.digest, `DIGEST_${index}`).toLowerCase();
  if (!/^sha256:[a-f0-9]{64}$/.test(fileDigest)) throw new Error(`LANERIQ_MATERIALIZATION_RECEIPT_DIGEST_INVALID:${index}`);
  const sizeBytes = Number(file?.sizeBytes);
  if (!Number.isInteger(sizeBytes) || sizeBytes < 0) throw new Error(`LANERIQ_MATERIALIZATION_RECEIPT_SIZE_INVALID:${index}`);
  return Object.freeze({ sourcePath, targetPath, digest: fileDigest, sizeBytes, verified: file?.verified === true });
}

export function createMaterializationReceipt({
  projectId,
  versionId,
  sourceSha = null,
  bundleDigest,
  artifactId,
  artifactDigest,
  targetRoot,
  files = [],
  createdAt,
} = {}) {
  const normalizedFiles = (Array.isArray(files) ? files : []).map(normalizeFile).sort((a, b) => a.targetPath.localeCompare(b.targetPath));
  if (normalizedFiles.length === 0) throw new Error("LANERIQ_MATERIALIZATION_RECEIPT_FILES_REQUIRED");
  const payload = Object.freeze({
    schema: "laneriq.materialization-receipt",
    version: LANERIQ_MATERIALIZATION_RECEIPT_VERSION,
    projectId: required(projectId, "PROJECT_ID"),
    versionId: required(versionId, "VERSION_ID"),
    sourceSha: sourceSha ? String(sourceSha) : null,
    bundleDigest: required(bundleDigest, "BUNDLE_DIGEST").toLowerCase(),
    artifactId: required(artifactId, "ARTIFACT_ID"),
    artifactDigest: required(artifactDigest, "ARTIFACT_DIGEST").toLowerCase(),
    targetRoot: required(targetRoot, "TARGET_ROOT"),
    files: Object.freeze(normalizedFiles),
    createdAt: iso(createdAt),
  });
  const allFilesVerified = normalizedFiles.every((file) => file.verified === true);
  return Object.freeze({
    ...payload,
    bytesWritten: normalizedFiles.reduce((sum, file) => sum + file.sizeBytes, 0),
    allFilesVerified,
    receiptDigest: digest(payload),
    artifactBytesEmbedded: false,
    providerCredentialsEmbedded: false,
  });
}

export function verifyMaterializationReceipt(receipt, { bundleDigest = null, artifactDigest = null } = {}) {
  if (!receipt || receipt.schema !== "laneriq.materialization-receipt") return Object.freeze({ verified: false, reason: "receipt_invalid" });
  const payload = {
    schema: receipt.schema,
    version: receipt.version,
    projectId: receipt.projectId,
    versionId: receipt.versionId,
    sourceSha: receipt.sourceSha || null,
    bundleDigest: receipt.bundleDigest,
    artifactId: receipt.artifactId,
    artifactDigest: receipt.artifactDigest,
    targetRoot: receipt.targetRoot,
    files: receipt.files,
    createdAt: receipt.createdAt,
  };
  const observedReceiptDigest = digest(payload);
  const checks = Object.freeze({
    receiptDigest: observedReceiptDigest === receipt.receiptDigest,
    allFilesVerified: Array.isArray(receipt.files) && receipt.files.length > 0 && receipt.files.every((file) => file.verified === true),
    bundleDigest: bundleDigest === null || String(bundleDigest).toLowerCase() === receipt.bundleDigest,
    artifactDigest: artifactDigest === null || String(artifactDigest).toLowerCase() === receipt.artifactDigest,
  });
  return Object.freeze({
    verified: Object.values(checks).every(Boolean),
    checks,
    observedReceiptDigest,
    expectedReceiptDigest: receipt.receiptDigest,
  });
}

export function publicMaterializationReceiptPolicy() {
  return Object.freeze({
    version: LANERIQ_MATERIALIZATION_RECEIPT_VERSION,
    tamperDetectable: true,
    everyFileMustBeVerified: true,
    recordsBundleAndArtifactDigest: true,
    recordsMaterializedPaths: true,
    artifactBytesEmbedded: false,
    providerCredentialsAllowed: false,
    externalDatabaseRequired: false,
    fixedInfrastructureCostRequired: false,
  });
}
