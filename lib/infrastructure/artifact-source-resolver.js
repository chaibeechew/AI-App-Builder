import crypto from "node:crypto";
import { verifyPortableBuildBundle } from "./portable-build-bundle.js";

export const LANERIQ_ARTIFACT_SOURCE_RESOLVER_VERSION = "2026-09-04.1";

function required(value, name) {
  const normalized = String(value || "").trim();
  if (!normalized) throw new Error(`LANERIQ_ARTIFACT_SOURCE_${name}_REQUIRED`);
  return normalized;
}

function safePath(value) {
  const normalized = required(value, "PATH").replaceAll("\\", "/").replace(/^\.\//, "");
  if (normalized.startsWith("/") || normalized.split("/").includes("..")) {
    throw new Error(`LANERIQ_ARTIFACT_SOURCE_PATH_UNSAFE:${normalized}`);
  }
  return normalized;
}

function asBuffer(value) {
  if (Buffer.isBuffer(value)) return value;
  if (value instanceof Uint8Array) return Buffer.from(value);
  if (typeof value === "string") return Buffer.from(value);
  throw new Error("LANERIQ_ARTIFACT_SOURCE_BYTES_REQUIRED");
}

function sha256(bytes) {
  return `sha256:${crypto.createHash("sha256").update(bytes).digest("hex")}`;
}

export function assertArtifactSourceAdapter(adapter) {
  if (!adapter || typeof adapter !== "object") throw new Error("LANERIQ_ARTIFACT_SOURCE_ADAPTER_REQUIRED");
  if (typeof adapter.readByDigest !== "function") throw new Error("LANERIQ_ARTIFACT_SOURCE_ADAPTER_METHOD_REQUIRED:readByDigest");
  return true;
}

export function createArtifactSourceRequest({ bundle, artifactId, path } = {}) {
  const bundleVerification = verifyPortableBuildBundle(bundle);
  if (!bundleVerification.verified) throw new Error("LANERIQ_ARTIFACT_SOURCE_BUNDLE_INVALID");
  const id = required(artifactId, "ARTIFACT_ID");
  const sourcePath = safePath(path);
  const artifact = bundle.artifacts?.find((item) => item.id === id);
  if (!artifact) throw new Error(`LANERIQ_ARTIFACT_SOURCE_ARTIFACT_NOT_FOUND:${id}`);
  const file = bundle.files?.find((item) => item.artifactId === id && item.path === sourcePath);
  if (!file) throw new Error(`LANERIQ_ARTIFACT_SOURCE_FILE_NOT_FOUND:${id}:${sourcePath}`);
  return Object.freeze({
    schema: "laneriq.artifact-source-request",
    version: LANERIQ_ARTIFACT_SOURCE_RESOLVER_VERSION,
    projectId: bundle.projectId,
    versionId: bundle.versionId,
    sourceSha: bundle.sourceSha || null,
    bundleDigest: bundle.bundleDigest,
    artifactId: id,
    artifactDigest: artifact.digest,
    path: sourcePath,
    digest: file.digest,
    contentAddress: file.digest,
    sizeBytes: file.sizeBytes,
    providerOpaque: true,
    providerCredentialsRequired: false,
  });
}

export async function resolveArtifactSource({ bundle, request, adapter } = {}) {
  const bundleVerification = verifyPortableBuildBundle(bundle);
  if (!bundleVerification.verified) throw new Error("LANERIQ_ARTIFACT_SOURCE_BUNDLE_INVALID");
  if (!request || request.schema !== "laneriq.artifact-source-request") throw new Error("LANERIQ_ARTIFACT_SOURCE_REQUEST_REQUIRED");
  if (request.bundleDigest !== bundle.bundleDigest) throw new Error("LANERIQ_ARTIFACT_SOURCE_BUNDLE_DRIFT");
  const expected = createArtifactSourceRequest({ bundle, artifactId: request.artifactId, path: request.path });
  for (const key of ["artifactDigest", "digest", "sizeBytes"]) {
    if (request[key] !== expected[key]) throw new Error(`LANERIQ_ARTIFACT_SOURCE_REQUEST_EVIDENCE_MISMATCH:${key}`);
  }
  assertArtifactSourceAdapter(adapter);
  const raw = await adapter.readByDigest({
    digest: request.digest,
    artifactId: request.artifactId,
    path: request.path,
    projectId: request.projectId,
    versionId: request.versionId,
  });
  const bytes = asBuffer(raw);
  const observedDigest = sha256(bytes);
  if (observedDigest !== request.digest) throw new Error(`LANERIQ_ARTIFACT_SOURCE_DIGEST_MISMATCH:${request.path}`);
  if (bytes.byteLength !== request.sizeBytes) throw new Error(`LANERIQ_ARTIFACT_SOURCE_SIZE_MISMATCH:${request.path}`);
  return Object.freeze({
    schema: "laneriq.resolved-artifact-source",
    version: LANERIQ_ARTIFACT_SOURCE_RESOLVER_VERSION,
    artifactId: request.artifactId,
    path: request.path,
    digest: observedDigest,
    sizeBytes: bytes.byteLength,
    verified: true,
    bytes: Buffer.from(bytes),
    ephemeralBytesOnly: true,
    providerCredentialsEmbedded: false,
  });
}

export function publicArtifactSourceResolverPolicy() {
  return Object.freeze({
    version: LANERIQ_ARTIFACT_SOURCE_RESOLVER_VERSION,
    contentAddressedLookup: true,
    digestVerifiedAfterRead: true,
    sizeVerifiedAfterRead: true,
    bundleDriftRejected: true,
    pathTraversalRejected: true,
    providerOpaqueCore: true,
    providerCredentialsAllowed: false,
    durableArtifactStoreClaimed: false,
    localOrCiAdapterSupported: true,
    externalObjectStoreRequired: false,
    fixedInfrastructureCostRequired: false,
  });
}
