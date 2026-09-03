import assert from "node:assert/strict";
import crypto from "node:crypto";
import { ARTIFACT_KIND, createLaneriqProjectManifest } from "../lib/infrastructure/project-manifest.js";
import { createArtifactRecord, createArtifactRegistrySnapshot } from "../lib/infrastructure/artifact-registry.js";
import { createPortableBuildBundle } from "../lib/infrastructure/portable-build-bundle.js";
import { createMaterializationReceipt } from "../lib/infrastructure/materialization-receipt.js";
import { createDeploymentReceipt } from "../lib/infrastructure/deployment-receipt.js";
import {
  createArtifactSourceRequest,
  resolveArtifactSource,
  publicArtifactSourceResolverPolicy,
} from "../lib/infrastructure/artifact-source-resolver.js";
import {
  createReleaseEvidenceBundle,
  verifyReleaseEvidenceBundle,
  publicReleaseEvidenceBundlePolicy,
} from "../lib/infrastructure/release-evidence-bundle.js";
import {
  PROMOTION_DECISION,
  createPromotionDecisionLedger,
  appendPromotionDecision,
  verifyPromotionDecisionLedger,
  publicPromotionDecisionLedgerPolicy,
} from "../lib/infrastructure/promotion-decision-ledger.js";
import {
  createReleaseCandidateLock,
  verifyReleaseCandidateLock,
  publicReleaseCandidateLockPolicy,
} from "../lib/infrastructure/release-candidate-lock.js";

function sha256(bytes) {
  return `sha256:${crypto.createHash("sha256").update(bytes).digest("hex")}`;
}

const bytes = Buffer.from("LANERIQ release integrity\n");
const fileDigest = sha256(bytes);
const sourceSha = "4c9140e7dbb2dd2b570a4bbce117f3f71c0fed27";
const projectId = "release-integrity-project";
const versionId = "v29";
const artifactId = "web";

const manifest = createLaneriqProjectManifest({
  projectId,
  versionId,
  sourceSha,
  capabilities: ["compute.http"],
  artifacts: [{ id: artifactId, kind: ARTIFACT_KIND.STATIC, digest: fileDigest }],
});
const registrySnapshot = createArtifactRegistrySnapshot([
  createArtifactRecord({
    projectId,
    versionId,
    artifactId,
    kind: ARTIFACT_KIND.STATIC,
    digest: fileDigest,
    sizeBytes: bytes.byteLength,
    sourceSha,
  }),
]);
const bundle = createPortableBuildBundle({
  manifest,
  registrySnapshot,
  files: [{ artifactId, path: "index.html", digest: fileDigest, sizeBytes: bytes.byteLength }],
});

const request = createArtifactSourceRequest({ bundle, artifactId, path: "index.html" });
const resolved = await resolveArtifactSource({
  bundle,
  request,
  adapter: {
    async readByDigest({ digest }) {
      assert.equal(digest, fileDigest);
      return bytes;
    },
  },
});
assert.equal(resolved.verified, true);
assert.equal(resolved.digest, fileDigest);
assert.equal(resolved.sizeBytes, bytes.byteLength);
assert.deepEqual(resolved.bytes, bytes);

await assert.rejects(
  resolveArtifactSource({
    bundle,
    request,
    adapter: { async readByDigest() { return Buffer.from("tampered"); } },
  }),
  /DIGEST_MISMATCH/,
);
assert.throws(
  () => createArtifactSourceRequest({ bundle, artifactId, path: "../secret" }),
  /PATH_UNSAFE|FILE_NOT_FOUND/,
);
const driftedRequest = { ...request, bundleDigest: `sha256:${"0".repeat(64)}` };
await assert.rejects(
  resolveArtifactSource({ bundle, request: driftedRequest, adapter: { async readByDigest() { return bytes; } } }),
  /BUNDLE_DRIFT/,
);

const createdAt = "2026-09-04T00:00:00.000Z";
const materializationReceipt = createMaterializationReceipt({
  projectId,
  versionId,
  sourceSha,
  bundleDigest: bundle.bundleDigest,
  artifactId,
  artifactDigest: fileDigest,
  targetRoot: ".laneriq/staging",
  files: [{
    sourcePath: "index.html",
    targetPath: ".laneriq/staging/web/index.html",
    digest: fileDigest,
    sizeBytes: bytes.byteLength,
    verified: true,
  }],
  createdAt,
});
const deploymentReceipt = createDeploymentReceipt({
  projectId,
  versionId,
  sourceSha,
  bundleDigest: bundle.bundleDigest,
  artifactId,
  artifactDigest: fileDigest,
  providerId: "fake-preview",
  deploymentId: "dep-preview-29",
  deploymentUrl: "https://preview.invalid",
  target: "preview",
  status: "ready",
  createdAt,
  healthVerified: true,
  provenanceVerified: true,
});
const browserEvidence = {
  deploymentId: "dep-preview-29",
  engines: ["webkit", "chromium"],
  crossEnginePassed: true,
  performanceRecorded: true,
};
const runtimeEvidence = {
  deploymentId: "dep-preview-29",
  errorFatalCount: 0,
  sampleWindowMinutes: 30,
};

const evidence = createReleaseEvidenceBundle({
  bundle,
  materializationReceipt,
  deploymentReceipt,
  browserEvidence,
  runtimeEvidence,
  createdAt: "2026-09-04T00:05:00.000Z",
});
assert.equal(evidence.promotionGate.evidenceReady, true);
assert.equal(evidence.promotionGate.decision, PROMOTION_DECISION.ELIGIBLE_FOR_PRODUCTION_REVIEW);
assert.equal(verifyReleaseEvidenceBundle(evidence, { bundle, materializationReceipt, deploymentReceipt }).verified, true);

const tamperedEvidence = {
  ...evidence,
  preview: { ...evidence.preview, deploymentId: "dep-swapped" },
};
assert.equal(verifyReleaseEvidenceBundle(tamperedEvidence).verified, false);

const incompleteEvidence = createReleaseEvidenceBundle({
  bundle,
  materializationReceipt,
  deploymentReceipt,
  browserEvidence: {
    deploymentId: "dep-preview-29",
    engines: ["chromium"],
    crossEnginePassed: true,
    performanceRecorded: true,
  },
  runtimeEvidence: {
    deploymentId: "dep-preview-29",
    errorFatalCount: 1,
    sampleWindowMinutes: 30,
  },
  createdAt: "2026-09-04T00:06:00.000Z",
});
assert.equal(incompleteEvidence.promotionGate.evidenceReady, false);
assert.equal(incompleteEvidence.promotionGate.decision, PROMOTION_DECISION.BLOCKED);

let ledger = createPromotionDecisionLedger();
assert.equal(verifyPromotionDecisionLedger(ledger).verified, true);
ledger = appendPromotionDecision({
  ledger,
  evidenceBundle: evidence,
  decision: PROMOTION_DECISION.ELIGIBLE_FOR_PRODUCTION_REVIEW,
  recordedAt: "2026-09-04T00:07:00.000Z",
});
assert.equal(verifyPromotionDecisionLedger(ledger).verified, true);
ledger = appendPromotionDecision({
  ledger,
  evidenceBundle: evidence,
  decision: PROMOTION_DECISION.APPROVED_FOR_LIVE_EXECUTOR_REVIEW,
  manualApproval: true,
  actor: "authorized-release-reviewer",
  recordedAt: "2026-09-04T00:08:00.000Z",
});
assert.equal(verifyPromotionDecisionLedger(ledger).verified, true);
assert.equal(ledger.recordCount, 2);

assert.throws(
  () => appendPromotionDecision({
    ledger: createPromotionDecisionLedger(),
    evidenceBundle: incompleteEvidence,
    decision: PROMOTION_DECISION.ELIGIBLE_FOR_PRODUCTION_REVIEW,
    recordedAt: "2026-09-04T00:09:00.000Z",
  }),
  /CANNOT_APPROVE_INCOMPLETE_EVIDENCE/,
);
assert.throws(
  () => appendPromotionDecision({
    ledger: createPromotionDecisionLedger(),
    evidenceBundle: evidence,
    decision: PROMOTION_DECISION.APPROVED_FOR_LIVE_EXECUTOR_REVIEW,
    manualApproval: false,
    recordedAt: "2026-09-04T00:09:00.000Z",
  }),
  /MANUAL_APPROVAL_REQUIRED/,
);
const tamperedLedger = JSON.parse(JSON.stringify(ledger));
tamperedLedger.records[0].actor = "tampered-actor";
assert.equal(verifyPromotionDecisionLedger(tamperedLedger).verified, false);

const lock = createReleaseCandidateLock({
  evidenceBundle: evidence,
  decisionLedger: ledger,
  lockedAt: "2026-09-04T00:10:00.000Z",
});
assert.equal(verifyReleaseCandidateLock(lock, { evidenceBundle: evidence, decisionLedger: ledger }).verified, true);
assert.equal(lock.productionMutationAllowed, false);
assert.equal(lock.dnsMutationAllowed, false);
assert.equal(lock.separateLiveExecutorRequired, true);

const swappedArtifactLock = { ...lock, artifactDigest: `sha256:${"f".repeat(64)}` };
assert.equal(verifyReleaseCandidateLock(swappedArtifactLock, { evidenceBundle: evidence, decisionLedger: ledger }).verified, false);
const swappedDeploymentLock = { ...lock, deploymentId: "dep-swapped" };
assert.equal(verifyReleaseCandidateLock(swappedDeploymentLock, { evidenceBundle: evidence, decisionLedger: ledger }).verified, false);
const olderLedger = { ...ledger, records: ledger.records.slice(0, 1), recordCount: 1, headDigest: ledger.records[0].recordDigest };
assert.equal(verifyReleaseCandidateLock(lock, { evidenceBundle: evidence, decisionLedger: olderLedger }).verified, false);

const sourcePolicy = publicArtifactSourceResolverPolicy();
const evidencePolicy = publicReleaseEvidenceBundlePolicy();
const ledgerPolicy = publicPromotionDecisionLedgerPolicy();
const lockPolicy = publicReleaseCandidateLockPolicy();
assert.equal(sourcePolicy.fixedInfrastructureCostRequired, false);
assert.equal(sourcePolicy.externalObjectStoreRequired, false);
assert.equal(evidencePolicy.productionMutationAllowed, false);
assert.equal(evidencePolicy.dnsMutationAllowed, false);
assert.equal(ledgerPolicy.productionMutationAllowed, false);
assert.equal(ledgerPolicy.dnsMutationAllowed, false);
assert.equal(lockPolicy.productionMutationAllowed, false);
assert.equal(lockPolicy.dnsMutationAllowed, false);
assert.equal(lockPolicy.protectsAgainstTimeOfCheckTimeOfUseDrift, true);

console.log("✓ Content-addressed Artifact Source Resolver verifies digest/size after read and rejects path/bundle drift");
console.log("✓ Release Evidence Bundle binds source, bundle, materialization, preview deployment, Chromium/WebKit and runtime evidence");
console.log("✓ Promotion Decision Ledger is append-only, tamper-detectable and cannot approve incomplete evidence");
console.log("✓ Release Candidate Lock rejects artifact/deployment/decision drift and prevents Level-0 Production or DNS mutation");
