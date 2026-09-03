export const LANERIQ_ARTIFACT_REGISTRY_VERSION = "2026-09-04.1";

const SHA256_PATTERN = /^sha256:[a-f0-9]{64}$/;
const PROVIDER_SPECIFIC_KEYS = new Set([
  "vercelProjectId",
  "vercelDeploymentId",
  "vercelToken",
  "supabaseProjectId",
  "awsAccountId",
  "cloudflareAccountId",
]);

function required(value, name) {
  const normalized = String(value || "").trim();
  if (!normalized) throw new Error(`LANERIQ_ARTIFACT_REGISTRY_${name}_REQUIRED`);
  return normalized;
}

function nonNegativeInteger(value, name) {
  const number = Number(value || 0);
  if (!Number.isFinite(number) || number < 0 || !Number.isInteger(number)) {
    throw new Error(`LANERIQ_ARTIFACT_REGISTRY_${name}_INVALID`);
  }
  return number;
}

function assertProviderOpaque(value, path = "metadata") {
  if (!value || typeof value !== "object") return;
  for (const [key, nested] of Object.entries(value)) {
    if (PROVIDER_SPECIFIC_KEYS.has(key)) throw new Error(`LANERIQ_ARTIFACT_REGISTRY_PROVIDER_FIELD_FORBIDDEN:${path}.${key}`);
    assertProviderOpaque(nested, `${path}.${key}`);
  }
}

export function createArtifactRecord({
  projectId,
  versionId,
  artifactId,
  kind,
  digest,
  sizeBytes = 0,
  sourceSha = null,
  rebuildable = true,
  metadata = {},
} = {}) {
  const normalizedDigest = String(digest || "").trim().toLowerCase();
  if (!SHA256_PATTERN.test(normalizedDigest)) throw new Error("LANERIQ_ARTIFACT_REGISTRY_SHA256_DIGEST_REQUIRED");
  assertProviderOpaque(metadata);
  return Object.freeze({
    registryVersion: LANERIQ_ARTIFACT_REGISTRY_VERSION,
    projectId: required(projectId, "PROJECT_ID"),
    versionId: required(versionId, "VERSION_ID"),
    artifactId: required(artifactId, "ARTIFACT_ID"),
    kind: required(kind, "KIND").toLowerCase(),
    digest: normalizedDigest,
    contentAddress: normalizedDigest,
    sizeBytes: nonNegativeInteger(sizeBytes, "SIZE_BYTES"),
    sourceSha: sourceSha ? String(sourceSha) : null,
    rebuildable: rebuildable !== false,
    metadata: Object.freeze({ ...(metadata || {}) }),
    providerOpaque: true,
  });
}

export function createArtifactRegistrySnapshot(records = []) {
  const normalized = Array.isArray(records) ? [...records] : [];
  const byKey = new Map();
  const digestSizes = new Map();

  for (const record of normalized) {
    if (!record || !SHA256_PATTERN.test(String(record.digest || ""))) throw new Error("LANERIQ_ARTIFACT_REGISTRY_RECORD_INVALID");
    assertProviderOpaque(record.metadata || {});
    const key = `${record.projectId}:${record.versionId}:${record.artifactId}`;
    const existing = byKey.get(key);
    if (existing && existing.digest !== record.digest) throw new Error(`LANERIQ_ARTIFACT_REGISTRY_IMMUTABILITY_CONFLICT:${key}`);
    byKey.set(key, record);

    const size = nonNegativeInteger(record.sizeBytes, "SIZE_BYTES");
    if (digestSizes.has(record.digest) && digestSizes.get(record.digest) !== size) {
      throw new Error(`LANERIQ_ARTIFACT_REGISTRY_DIGEST_SIZE_CONFLICT:${record.digest}`);
    }
    digestSizes.set(record.digest, size);
  }

  const sorted = [...byKey.values()].sort((a, b) =>
    String(a.projectId).localeCompare(String(b.projectId))
    || String(a.versionId).localeCompare(String(b.versionId))
    || String(a.artifactId).localeCompare(String(b.artifactId))
  );

  return Object.freeze({
    version: LANERIQ_ARTIFACT_REGISTRY_VERSION,
    records: Object.freeze(sorted),
    recordCount: sorted.length,
    uniqueDigestCount: digestSizes.size,
    uniqueBytes: [...digestSizes.values()].reduce((sum, value) => sum + value, 0),
    providerOpaque: true,
    durableArtifactBytesClaimed: false,
  });
}

export function resolveArtifact(snapshot, { projectId, versionId, artifactId } = {}) {
  const project = required(projectId, "PROJECT_ID");
  const version = required(versionId, "VERSION_ID");
  const artifact = required(artifactId, "ARTIFACT_ID");
  return snapshot?.records?.find((item) => item.projectId === project && item.versionId === version && item.artifactId === artifact) || null;
}

export function verifyArtifactDigest(record, observedDigest) {
  if (!record?.digest) throw new Error("LANERIQ_ARTIFACT_REGISTRY_RECORD_REQUIRED");
  const observed = String(observedDigest || "").trim().toLowerCase();
  return Object.freeze({
    expectedDigest: record.digest,
    observedDigest: observed,
    verified: SHA256_PATTERN.test(observed) && observed === record.digest,
  });
}

export function publicArtifactRegistryPolicy() {
  return Object.freeze({
    version: LANERIQ_ARTIFACT_REGISTRY_VERSION,
    contentAddressed: true,
    digestAlgorithm: "sha256",
    immutableByProjectVersionArtifactId: true,
    providerOpaque: true,
    metadataRegistryOnlyAtLevel0: true,
    durableArtifactBytesClaimed: false,
    externalObjectStoreRequired: false,
    fixedInfrastructureCostRequired: false,
  });
}
