import crypto from "node:crypto";
import { verifyPortableBuildBundle } from "./portable-build-bundle.js";
import { createMaterializationReceipt } from "./materialization-receipt.js";

export const LANERIQ_ARTIFACT_MATERIALIZER_VERSION = "2026-09-04.1";

function required(value, name) {
  const normalized = String(value || "").trim();
  if (!normalized) throw new Error(`LANERIQ_ARTIFACT_MATERIALIZER_${name}_REQUIRED`);
  return normalized;
}

function safeRelativePath(value, name) {
  const normalized = required(value, name).replaceAll("\\", "/").replace(/^\.\//, "");
  if (normalized.startsWith("/") || normalized.split("/").includes("..")) {
    throw new Error(`LANERIQ_ARTIFACT_MATERIALIZER_${name}_UNSAFE:${normalized}`);
  }
  return normalized;
}

function sha256(bytes) {
  return `sha256:${crypto.createHash("sha256").update(bytes).digest("hex")}`;
}

function asBuffer(value) {
  if (Buffer.isBuffer(value)) return value;
  if (value instanceof Uint8Array) return Buffer.from(value);
  if (typeof value === "string") return Buffer.from(value);
  throw new Error("LANERIQ_ARTIFACT_MATERIALIZER_BYTES_REQUIRED");
}

export function assertArtifactMaterializerAdapter(adapter) {
  if (!adapter || typeof adapter !== "object") throw new Error("LANERIQ_ARTIFACT_MATERIALIZER_ADAPTER_REQUIRED");
  for (const method of ["readFile", "writeFile"]) {
    if (typeof adapter[method] !== "function") throw new Error(`LANERIQ_ARTIFACT_MATERIALIZER_ADAPTER_METHOD_REQUIRED:${method}`);
  }
  return true;
}

export function createArtifactMaterializationPlan({
  bundle,
  artifactId,
  targetRoot = ".laneriq/staging",
  fileMappings = null,
} = {}) {
  const bundleVerification = verifyPortableBuildBundle(bundle);
  if (!bundleVerification.verified) throw new Error("LANERIQ_ARTIFACT_MATERIALIZER_BUNDLE_INVALID");
  const id = required(artifactId, "ARTIFACT_ID");
  const artifact = bundle.artifacts?.find((item) => item.id === id);
  if (!artifact) throw new Error(`LANERIQ_ARTIFACT_MATERIALIZER_ARTIFACT_NOT_FOUND:${id}`);
  const files = (bundle.files || []).filter((entry) => entry.artifactId === id);
  if (files.length === 0) throw new Error("LANERIQ_ARTIFACT_MATERIALIZER_FILES_REQUIRED");
  const root = safeRelativePath(targetRoot, "TARGET_ROOT");

  let mappings;
  if (fileMappings === null) {
    mappings = files.map((entry) => ({
      sourcePath: entry.path,
      targetPath: `${root}/${id}/${entry.path}`,
      digest: entry.digest,
      sizeBytes: entry.sizeBytes,
    }));
  } else {
    const provided = Array.isArray(fileMappings) ? fileMappings : [];
    if (provided.length !== files.length) throw new Error("LANERIQ_ARTIFACT_MATERIALIZER_MAPPING_COUNT_MISMATCH");
    mappings = provided.map((mapping, index) => {
      const sourcePath = safeRelativePath(mapping?.sourcePath, `SOURCE_PATH_${index}`);
      const source = files.find((entry) => entry.path === sourcePath);
      if (!source) throw new Error(`LANERIQ_ARTIFACT_MATERIALIZER_MAPPING_SOURCE_UNKNOWN:${sourcePath}`);
      const targetPath = safeRelativePath(mapping?.targetPath, `TARGET_PATH_${index}`);
      const digest = String(mapping?.digest || "").toLowerCase();
      const sizeBytes = Number(mapping?.sizeBytes);
      if (digest !== source.digest || sizeBytes !== source.sizeBytes) {
        throw new Error(`LANERIQ_ARTIFACT_MATERIALIZER_MAPPING_EVIDENCE_MISMATCH:${sourcePath}`);
      }
      return { sourcePath, targetPath, digest, sizeBytes };
    });
  }

  mappings.sort((a, b) => a.targetPath.localeCompare(b.targetPath));
  const duplicateTarget = mappings.find((mapping, index) => mappings.findIndex((candidate) => candidate.targetPath === mapping.targetPath) !== index);
  if (duplicateTarget) throw new Error(`LANERIQ_ARTIFACT_MATERIALIZER_DUPLICATE_TARGET:${duplicateTarget.targetPath}`);

  return Object.freeze({
    schema: "laneriq.materialization-plan",
    version: LANERIQ_ARTIFACT_MATERIALIZER_VERSION,
    projectId: bundle.projectId,
    versionId: bundle.versionId,
    sourceSha: bundle.sourceSha || null,
    bundleDigest: bundle.bundleDigest,
    artifactId: id,
    artifactDigest: artifact.digest,
    artifactKind: artifact.kind,
    targetRoot: root,
    mappings: Object.freeze(mappings.map((mapping) => Object.freeze(mapping))),
    providerCredentialsRequired: false,
    externalObjectStoreRequired: false,
    networkAccessRequired: false,
  });
}

export async function materializeArtifact({ bundle, plan, adapter, createdAt = new Date().toISOString() } = {}) {
  const bundleVerification = verifyPortableBuildBundle(bundle);
  if (!bundleVerification.verified) throw new Error("LANERIQ_ARTIFACT_MATERIALIZER_BUNDLE_INVALID");
  if (!plan || plan.schema !== "laneriq.materialization-plan") throw new Error("LANERIQ_ARTIFACT_MATERIALIZER_PLAN_REQUIRED");
  if (plan.bundleDigest !== bundle.bundleDigest) throw new Error("LANERIQ_ARTIFACT_MATERIALIZER_PLAN_BUNDLE_MISMATCH");
  assertArtifactMaterializerAdapter(adapter);

  const materialized = [];
  for (const mapping of plan.mappings) {
    const raw = await adapter.readFile({ artifactId: plan.artifactId, path: mapping.sourcePath });
    const bytes = asBuffer(raw);
    const observedDigest = sha256(bytes);
    if (observedDigest !== mapping.digest) {
      throw new Error(`LANERIQ_ARTIFACT_MATERIALIZER_DIGEST_MISMATCH:${mapping.sourcePath}`);
    }
    if (bytes.byteLength !== mapping.sizeBytes) {
      throw new Error(`LANERIQ_ARTIFACT_MATERIALIZER_SIZE_MISMATCH:${mapping.sourcePath}`);
    }
    await adapter.writeFile({
      artifactId: plan.artifactId,
      sourcePath: mapping.sourcePath,
      targetPath: mapping.targetPath,
      bytes,
    });
    materialized.push({
      sourcePath: mapping.sourcePath,
      targetPath: mapping.targetPath,
      digest: observedDigest,
      sizeBytes: bytes.byteLength,
      verified: true,
    });
  }

  return createMaterializationReceipt({
    projectId: plan.projectId,
    versionId: plan.versionId,
    sourceSha: plan.sourceSha,
    bundleDigest: plan.bundleDigest,
    artifactId: plan.artifactId,
    artifactDigest: plan.artifactDigest,
    targetRoot: plan.targetRoot,
    files: materialized,
    createdAt,
  });
}

export function publicArtifactMaterializerPolicy() {
  return Object.freeze({
    version: LANERIQ_ARTIFACT_MATERIALIZER_VERSION,
    verifiesEveryFileDigestBeforeWrite: true,
    verifiesEveryFileSizeBeforeWrite: true,
    pathTraversalRejected: true,
    duplicateTargetsRejected: true,
    providerCredentialsRequired: false,
    externalObjectStoreRequired: false,
    networkAccessRequired: false,
    defaultMaterializationLocation: "local_or_ci_workspace",
    fixedInfrastructureCostRequired: false,
  });
}
