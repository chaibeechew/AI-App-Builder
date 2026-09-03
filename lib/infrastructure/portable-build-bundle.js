import crypto from "node:crypto";

export const LANERIQ_PORTABLE_BUILD_BUNDLE_VERSION = "2026-09-04.1";

function required(value, name) {
  const normalized = String(value || "").trim();
  if (!normalized) throw new Error(`LANERIQ_BUILD_BUNDLE_${name}_REQUIRED`);
  return normalized;
}

function normalizePath(value) {
  const path = required(value, "FILE_PATH").replaceAll("\\", "/").replace(/^\.\//, "");
  if (path.startsWith("/") || path.split("/").includes("..")) throw new Error(`LANERIQ_BUILD_BUNDLE_FILE_PATH_UNSAFE:${path}`);
  return path;
}

function sha256(value) {
  return `sha256:${crypto.createHash("sha256").update(value).digest("hex")}`;
}

function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(([key, nested]) => [key, stable(nested)]));
}

export function createPortableBuildBundle({
  manifest,
  registrySnapshot,
  artifactIds = null,
  files = [],
  buildEngineVersion = "laneriq-build-level0",
} = {}) {
  if (!manifest || manifest.schema !== "laneriq.project") throw new Error("LANERIQ_BUILD_BUNDLE_MANIFEST_REQUIRED");
  if (!registrySnapshot || !Array.isArray(registrySnapshot.records)) throw new Error("LANERIQ_BUILD_BUNDLE_REGISTRY_REQUIRED");

  const requested = artifactIds === null
    ? manifest.artifacts.map((item) => item.id)
    : [...new Set((Array.isArray(artifactIds) ? artifactIds : []).map((item) => String(item).trim()).filter(Boolean))];
  if (requested.length === 0) throw new Error("LANERIQ_BUILD_BUNDLE_ARTIFACTS_REQUIRED");

  const artifacts = requested.map((artifactId) => {
    const manifestArtifact = manifest.artifacts.find((item) => item.id === artifactId);
    if (!manifestArtifact) throw new Error(`LANERIQ_BUILD_BUNDLE_MANIFEST_ARTIFACT_NOT_FOUND:${artifactId}`);
    const registryArtifact = registrySnapshot.records.find((item) =>
      item.projectId === manifest.projectId
      && item.versionId === manifest.versionId
      && item.artifactId === artifactId
    );
    if (!registryArtifact) throw new Error(`LANERIQ_BUILD_BUNDLE_REGISTRY_ARTIFACT_NOT_FOUND:${artifactId}`);
    if (registryArtifact.kind !== manifestArtifact.kind) throw new Error(`LANERIQ_BUILD_BUNDLE_KIND_MISMATCH:${artifactId}`);
    return Object.freeze({
      id: artifactId,
      kind: manifestArtifact.kind,
      digest: registryArtifact.digest,
      sizeBytes: registryArtifact.sizeBytes,
    });
  }).sort((a, b) => a.id.localeCompare(b.id));

  const normalizedFiles = (Array.isArray(files) ? files : []).map((entry, index) => {
    const artifactId = required(entry?.artifactId, `FILE_ARTIFACT_ID_${index}`);
    if (!artifacts.some((artifact) => artifact.id === artifactId)) throw new Error(`LANERIQ_BUILD_BUNDLE_FILE_ARTIFACT_UNKNOWN:${artifactId}`);
    const digest = required(entry?.digest, `FILE_DIGEST_${index}`).toLowerCase();
    if (!/^sha256:[a-f0-9]{64}$/.test(digest)) throw new Error(`LANERIQ_BUILD_BUNDLE_FILE_DIGEST_INVALID:${index}`);
    const sizeBytes = Number(entry?.sizeBytes || 0);
    if (!Number.isInteger(sizeBytes) || sizeBytes < 0) throw new Error(`LANERIQ_BUILD_BUNDLE_FILE_SIZE_INVALID:${index}`);
    return Object.freeze({ artifactId, path: normalizePath(entry?.path), digest, sizeBytes });
  }).sort((a, b) => a.artifactId.localeCompare(b.artifactId) || a.path.localeCompare(b.path));

  const duplicatePath = normalizedFiles.find((entry, index) =>
    normalizedFiles.findIndex((candidate) => candidate.artifactId === entry.artifactId && candidate.path === entry.path) !== index
  );
  if (duplicatePath) throw new Error(`LANERIQ_BUILD_BUNDLE_DUPLICATE_FILE:${duplicatePath.artifactId}:${duplicatePath.path}`);

  const canonicalPayload = stable({
    schema: "laneriq.build-bundle",
    version: LANERIQ_PORTABLE_BUILD_BUNDLE_VERSION,
    projectId: manifest.projectId,
    versionId: manifest.versionId,
    sourceSha: manifest.sourceSha || null,
    buildEngineVersion: String(buildEngineVersion),
    artifacts,
    files: normalizedFiles,
  });
  const bundleDigest = sha256(JSON.stringify(canonicalPayload));

  return Object.freeze({
    ...canonicalPayload,
    bundleDigest,
    providerOpaque: true,
    containsProviderCredentials: false,
    sourceCodeTransferRequiredByBundleContract: false,
    artifactBytesEmbedded: false,
  });
}

export function verifyPortableBuildBundle(bundle) {
  if (!bundle || bundle.schema !== "laneriq.build-bundle") return Object.freeze({ verified: false, reason: "bundle_invalid" });
  const canonicalPayload = stable({
    schema: bundle.schema,
    version: bundle.version,
    projectId: bundle.projectId,
    versionId: bundle.versionId,
    sourceSha: bundle.sourceSha || null,
    buildEngineVersion: bundle.buildEngineVersion,
    artifacts: bundle.artifacts,
    files: bundle.files,
  });
  const observed = sha256(JSON.stringify(canonicalPayload));
  return Object.freeze({ expectedDigest: bundle.bundleDigest, observedDigest: observed, verified: observed === bundle.bundleDigest });
}

export function publicPortableBuildBundlePolicy() {
  return Object.freeze({
    version: LANERIQ_PORTABLE_BUILD_BUNDLE_VERSION,
    artifactFirst: true,
    deterministicMetadataDigest: true,
    providerOpaque: true,
    providerCredentialsAllowed: false,
    sourceCodeTransferRequiredByContract: false,
    artifactBytesEmbeddedAtLevel0: false,
    externalBuildServiceRequired: false,
    fixedInfrastructureCostRequired: false,
  });
}
