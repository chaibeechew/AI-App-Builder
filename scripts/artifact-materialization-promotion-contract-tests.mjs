import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";

import { ARTIFACT_KIND, createLaneriqProjectManifest } from "../lib/infrastructure/project-manifest.js";
import { createArtifactRecord, createArtifactRegistrySnapshot } from "../lib/infrastructure/artifact-registry.js";
import { createPortableBuildBundle } from "../lib/infrastructure/portable-build-bundle.js";
import { createVercelPrebuiltPlan } from "../lib/infrastructure/adapters/vercel-prebuilt-adapter.js";
import {
  assertArtifactMaterializerAdapter,
  createArtifactMaterializationPlan,
  materializeArtifact,
  publicArtifactMaterializerPolicy,
} from "../lib/infrastructure/artifact-materializer.js";
import {
  publicMaterializationReceiptPolicy,
  verifyMaterializationReceipt,
} from "../lib/infrastructure/materialization-receipt.js";
import { createPrebuiltPreviewCanaryPlan, publicPrebuiltPreviewCanaryPolicy } from "../lib/infrastructure/prebuilt-preview-canary.js";
import { createDeploymentReceipt } from "../lib/infrastructure/deployment-receipt.js";
import { DEPLOYMENT_STATUS } from "../lib/infrastructure/deployment-provider-contract.js";
import { evaluateProductionPromotion, publicPromotionGatePolicy } from "../lib/infrastructure/promotion-gate.js";

function sha256(bytes) {
  return `sha256:${crypto.createHash("sha256").update(bytes).digest("hex")}`;
}

const indexBytes = Buffer.from("<!doctype html><html><title>LANERIQ Preview</title></html>");
const appBytes = Buffer.from("console.log('laneriq-preview');");
const artifactDigest = sha256(Buffer.concat([indexBytes, appBytes]));
const indexDigest = sha256(indexBytes);
const appDigest = sha256(appBytes);

const manifest = createLaneriqProjectManifest({
  projectId: "project-materialize",
  versionId: "version-1",
  sourceSha: "sha-materialize-test",
  capabilities: ["deployment"],
  artifacts: [{ id: "web", kind: ARTIFACT_KIND.STATIC, digest: artifactDigest }],
});
const registry = createArtifactRegistrySnapshot([
  createArtifactRecord({
    projectId: manifest.projectId,
    versionId: manifest.versionId,
    artifactId: "web",
    kind: ARTIFACT_KIND.STATIC,
    digest: artifactDigest,
    sizeBytes: indexBytes.byteLength + appBytes.byteLength,
    sourceSha: manifest.sourceSha,
  }),
]);
const bundle = createPortableBuildBundle({
  manifest,
  registrySnapshot: registry,
  artifactIds: ["web"],
  files: [
    { artifactId: "web", path: "index.html", digest: indexDigest, sizeBytes: indexBytes.byteLength },
    { artifactId: "web", path: "assets/app.js", digest: appDigest, sizeBytes: appBytes.byteLength },
  ],
  buildEngineVersion: "laneriq-materializer-contract",
});
const prebuilt = createVercelPrebuiltPlan({ bundle, artifactId: "web" });
const materializationPlan = createArtifactMaterializationPlan({
  bundle,
  artifactId: "web",
  targetRoot: prebuilt.outputRoot,
  fileMappings: prebuilt.fileCopies,
});
assert.equal(materializationPlan.targetRoot, ".vercel/output");
assert.equal(materializationPlan.networkAccessRequired, false);
assert.equal(materializationPlan.providerCredentialsRequired, false);

const sources = new Map([
  ["index.html", indexBytes],
  ["assets/app.js", appBytes],
]);
const writes = new Map();
const adapter = {
  async readFile({ path }) {
    if (!sources.has(path)) throw new Error(`SOURCE_MISSING:${path}`);
    return sources.get(path);
  },
  async writeFile({ targetPath, bytes }) {
    writes.set(targetPath, Buffer.from(bytes));
  },
};
assert.equal(assertArtifactMaterializerAdapter(adapter), true);
assert.throws(() => assertArtifactMaterializerAdapter({ readFile() {} }), /writeFile/);

const receipt = await materializeArtifact({
  bundle,
  plan: materializationPlan,
  adapter,
  createdAt: "2026-09-04T00:10:00Z",
});
assert.equal(receipt.allFilesVerified, true);
assert.equal(receipt.bytesWritten, indexBytes.byteLength + appBytes.byteLength);
assert.equal(writes.size, 2);
assert.ok(writes.has(".vercel/output/static/index.html"));
assert.ok(writes.has(".vercel/output/static/assets/app.js"));
assert.equal(verifyMaterializationReceipt(receipt, { bundleDigest: bundle.bundleDigest, artifactDigest }).verified, true);
assert.equal(verifyMaterializationReceipt({ ...receipt, targetRoot: ".tampered" }).verified, false);
assert.equal(publicMaterializationReceiptPolicy().externalDatabaseRequired, false);

await assert.rejects(
  () => materializeArtifact({
    bundle,
    plan: materializationPlan,
    adapter: {
      async readFile({ path }) {
        return path === "index.html" ? Buffer.from("tampered") : sources.get(path);
      },
      async writeFile() {},
    },
    createdAt: "2026-09-04T00:11:00Z",
  }),
  /DIGEST_MISMATCH:index\.html/,
);
assert.throws(
  () => createArtifactMaterializationPlan({ bundle, artifactId: "web", targetRoot: "../escape" }),
  /TARGET_ROOT_UNSAFE/,
);
assert.equal(publicArtifactMaterializerPolicy().verifiesEveryFileDigestBeforeWrite, true);
assert.equal(publicArtifactMaterializerPolicy().externalObjectStoreRequired, false);

const canary = createPrebuiltPreviewCanaryPlan({
  bundle,
  prebuiltPlan: prebuilt,
  materializationReceipt: receipt,
  maximumLifetimeMinutes: 30,
});
assert.equal(canary.deploymentTarget, "preview");
assert.equal(canary.productionTargetAllowed, false);
assert.equal(canary.customDomainMutationAllowed, false);
assert.equal(canary.dnsMutationAllowed, false);
assert.equal(canary.networkExecutionAllowedAtLevel0, false);
assert.equal(canary.livePreviewDeploymentClaimed, false);
assert.equal(publicPrebuiltPreviewCanaryPolicy().livePreviewClaimRequiresSeparateRuntimeEvidence, true);

const previewReceipt = createDeploymentReceipt({
  projectId: manifest.projectId,
  versionId: manifest.versionId,
  sourceSha: manifest.sourceSha,
  bundleDigest: bundle.bundleDigest,
  artifactId: "web",
  artifactDigest,
  providerId: "vercel-preview-adapter",
  deploymentId: "dep-preview-contract",
  deploymentUrl: "https://preview.invalid",
  target: "preview",
  status: DEPLOYMENT_STATUS.READY,
  createdAt: "2026-09-04T00:12:00Z",
  healthVerified: true,
  provenanceVerified: true,
});
const promotion = evaluateProductionPromotion({
  bundle,
  materializationReceipt: receipt,
  deploymentReceipt: previewReceipt,
  browserEvidence: {
    deploymentId: previewReceipt.deploymentId,
    crossEnginePassed: true,
    engines: ["chromium", "webkit"],
  },
  runtimeEvidence: {
    deploymentId: previewReceipt.deploymentId,
    errorFatalCount: 0,
    sampleWindowMinutes: 30,
  },
  manualApproval: true,
});
assert.equal(promotion.decision, "eligible_for_production_review");
assert.equal(promotion.evidenceReady, true);
assert.equal(promotion.manualApprovalRecorded, true);
assert.equal(promotion.productionMutationAllowed, false);
assert.equal(promotion.automaticPromotionAllowed, false);
assert.equal(promotion.separateLiveExecutorStillRequired, true);

const missingWebkit = evaluateProductionPromotion({
  bundle,
  materializationReceipt: receipt,
  deploymentReceipt: previewReceipt,
  browserEvidence: {
    deploymentId: previewReceipt.deploymentId,
    crossEnginePassed: true,
    engines: ["chromium"],
  },
  runtimeEvidence: {
    deploymentId: previewReceipt.deploymentId,
    errorFatalCount: 0,
    sampleWindowMinutes: 30,
  },
});
assert.equal(missingWebkit.decision, "blocked");
assert.equal(missingWebkit.checks.webkitPassed, false);

const runtimeError = evaluateProductionPromotion({
  bundle,
  materializationReceipt: receipt,
  deploymentReceipt: previewReceipt,
  browserEvidence: {
    deploymentId: previewReceipt.deploymentId,
    crossEnginePassed: true,
    engines: ["chromium", "webkit"],
  },
  runtimeEvidence: {
    deploymentId: previewReceipt.deploymentId,
    errorFatalCount: 1,
    sampleWindowMinutes: 30,
  },
});
assert.equal(runtimeError.decision, "blocked");
assert.equal(runtimeError.checks.runtimeNoErrorFatal, false);
assert.equal(publicPromotionGatePolicy().automaticPromotionAllowed, false);
assert.equal(publicPromotionGatePolicy().separateLiveExecutorRequired, true);

for (const path of [
  "lib/infrastructure/artifact-materializer.js",
  "lib/infrastructure/materialization-receipt.js",
  "lib/infrastructure/promotion-gate.js",
  "lib/infrastructure/prebuilt-preview-canary.js",
]) {
  const source = fs.readFileSync(path, "utf8");
  assert.doesNotMatch(source, /@vercel\/|@supabase\/|VERCEL_TOKEN|SUPABASE_SERVICE_ROLE_KEY|OPENAI_API_KEY|process\.env/,
    `${path} must remain provider-secret-free and require no paid provider SDK.`);
}

console.log("✓ Artifact Materializer verifies SHA-256 and byte size before every workspace write and rejects path traversal/tampering");
console.log("✓ Materialization Receipt is tamper-detectable and binds exact bundle/artifact/files without storing artifact bytes or provider credentials");
console.log("✓ Prebuilt Preview Canary is preview-only at Level-0 and forbids Production, custom-domain, DNS and live network execution claims");
console.log("✓ Promotion Gate requires exact preview receipt, Chromium+WebKit and zero-error runtime evidence, but still cannot mutate Production without a separate live executor");
console.log("✓ Batch 28 remains zero-fixed-cost, local/CI-workspace-first and does not activate Email, SMS, dedicated servers, or paid artifact storage");
