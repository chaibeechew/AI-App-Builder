import assert from "node:assert/strict";
import fs from "node:fs";

import {
  ARTIFACT_KIND,
  createLaneriqProjectManifest,
  publicProjectManifestPolicy,
} from "../lib/infrastructure/project-manifest.js";
import {
  COST_GUARD_STATE,
  createResourceUsageEntry,
  evaluateExternalSpendBudget,
  summarizeResourceUsage,
} from "../lib/infrastructure/resource-ledger.js";
import {
  OPERATIONAL_MODE,
  publicSafetyControlPolicy,
  resolveCapabilityAccess,
  resolveOperationalMode,
} from "../lib/infrastructure/safety-controls.js";
import {
  assertExitAdapter,
  assessExitReadiness,
  publicExitPolicy,
} from "../lib/infrastructure/exit-readiness.js";
import {
  ROUTE_CLASS,
  planCostRoute,
  publicCostGovernorPolicy,
} from "../lib/infrastructure/cost-governor.js";
import {
  DEPLOYMENT_STATUS,
  assertDeploymentProvider,
  createDeploymentProviderDescriptor,
  normalizeDeploymentStatus,
  publicDeploymentProviderContract,
} from "../lib/infrastructure/deployment-provider-contract.js";
import {
  executeDeploymentPlan,
  planDeployment,
  publicDeploymentRouterPolicy,
} from "../lib/infrastructure/deployment-router.js";
import {
  createArtifactRecord,
  createArtifactRegistrySnapshot,
  publicArtifactRegistryPolicy,
  resolveArtifact,
  verifyArtifactDigest,
} from "../lib/infrastructure/artifact-registry.js";

const manifest = createLaneriqProjectManifest({
  projectId: "project-1",
  versionId: "version-1",
  sourceSha: "abc123",
  capabilities: ["deployment", "database", "deployment"],
  artifacts: [
    { id: "web", kind: ARTIFACT_KIND.STATIC, digest: "sha256:web" },
    { id: "worker", kind: ARTIFACT_KIND.WASM, digest: "sha256:worker" },
  ],
  workloads: [{ id: "api", capability: "functions", privacy: "private" }],
});
assert.equal(manifest.providerOpaque, true);
assert.deepEqual(manifest.capabilities, ["deployment", "database"]);
assert.deepEqual(manifest.artifacts.map((item) => item.kind), ["static", "wasm"]);
assert.equal(publicProjectManifestPolicy().deploymentProviderEmbeddedInManifest, false);
assert.throws(
  () => createLaneriqProjectManifest({ projectId: "p", versionId: "v", metadata: { vercelProjectId: "prj_locked" } }),
  /PROVIDER_FIELD_FORBIDDEN/,
  "Portable project manifests must reject provider-specific infrastructure identifiers.",
);

const localUsage = createResourceUsageEntry({
  taskId: "task-local",
  capability: "ai",
  executionTarget: "local_device",
  latencyMs: 120,
});
const cloudUsage = createResourceUsageEntry({
  taskId: "task-cloud",
  capability: "deployment",
  executionTarget: "shared_cloud",
  computeUsd: 0.002,
  bandwidthUsd: 0.001,
  retries: 1,
});
const usageSummary = summarizeResourceUsage([localUsage, cloudUsage]);
assert.equal(localUsage.totalUsd, 0);
assert.equal(usageSummary.tasks, 2);
assert.equal(usageSummary.totalUsd, 0.003);
assert.equal(evaluateExternalSpendBudget({ spentUsd: 0, softLimitUsd: 0, hardLimitUsd: 0 }).state, COST_GUARD_STATE.BLOCK_NONESSENTIAL_PAID);
assert.equal(evaluateExternalSpendBudget({ spentUsd: 91, softLimitUsd: 70, hardLimitUsd: 100 }).state, COST_GUARD_STATE.SURVIVAL);
assert.equal(evaluateExternalSpendBudget({ spentUsd: 100, softLimitUsd: 70, hardLimitUsd: 100 }).paidRoutingAllowed, false);

const zeroSpendRoute = planCostRoute({
  hardLimitUsd: 0,
  allowPaid: false,
  candidates: [
    { id: "local-npu", routeClass: ROUTE_CLASS.LOCAL_DEVICE, thermalFit: 0.85, latencyMs: 20 },
    { id: "edge-free", routeClass: ROUTE_CLASS.EDGE_FREE, freeQuotaRemainingRatio: 0.8, latencyMs: 45 },
    { id: "cloud-paid", routeClass: ROUTE_CLASS.CLOUD_PAID, estimatedCostUsd: 0.01, latencyMs: 25 },
  ],
});
assert.equal(zeroSpendRoute.decision, "route");
assert.equal(zeroSpendRoute.selected.id, "local-npu");
assert.equal(zeroSpendRoute.silentPaidEscalation, false);
assert.ok(zeroSpendRoute.rejected.some((item) => item.id === "cloud-paid" && item.reason === "paid_route_not_authorized"));
const localUnavailableRoute = planCostRoute({
  hardLimitUsd: 0,
  localDeviceEligible: false,
  candidates: [
    { id: "local-npu", routeClass: ROUTE_CLASS.LOCAL_DEVICE, thermalFit: 0.9 },
    { id: "edge-free", routeClass: ROUTE_CLASS.EDGE_FREE, freeQuotaRemainingRatio: 0.6 },
  ],
});
assert.equal(localUnavailableRoute.selected.id, "edge-free");
const noSilentPaidRoute = planCostRoute({
  hardLimitUsd: 0,
  candidates: [{ id: "paid-only", routeClass: ROUTE_CLASS.CLOUD_PAID, estimatedCostUsd: 0.001 }],
});
assert.equal(noSilentPaidRoute.decision, "defer");
assert.equal(publicCostGovernorPolicy().defaultExternalSpendCapUsd, 0);
assert.equal(publicCostGovernorPolicy().silentPaidEscalationAllowed, false);

const digestA = `sha256:${"a".repeat(64)}`;
const artifactRecord = createArtifactRecord({
  projectId: "project-1",
  versionId: "version-1",
  artifactId: "web",
  kind: ARTIFACT_KIND.STATIC,
  digest: digestA,
  sizeBytes: 4096,
  sourceSha: "abc123",
});
const registry = createArtifactRegistrySnapshot([artifactRecord]);
assert.equal(registry.recordCount, 1);
assert.equal(registry.uniqueDigestCount, 1);
assert.equal(registry.uniqueBytes, 4096);
assert.equal(resolveArtifact(registry, { projectId: "project-1", versionId: "version-1", artifactId: "web" }).digest, digestA);
assert.equal(verifyArtifactDigest(artifactRecord, digestA).verified, true);
assert.equal(verifyArtifactDigest(artifactRecord, `sha256:${"b".repeat(64)}`).verified, false);
assert.throws(
  () => createArtifactRecord({ projectId: "p", versionId: "v", artifactId: "a", kind: "static", digest: "sha256:not-a-real-digest" }),
  /SHA256_DIGEST_REQUIRED/,
);
assert.throws(
  () => createArtifactRecord({ projectId: "p", versionId: "v", artifactId: "a", kind: "static", digest: digestA, metadata: { vercelProjectId: "locked" } }),
  /PROVIDER_FIELD_FORBIDDEN/,
);
assert.equal(publicArtifactRegistryPolicy().durableArtifactBytesClaimed, false);
assert.equal(publicArtifactRegistryPolicy().externalObjectStoreRequired, false);

const freeDeployment = createDeploymentProviderDescriptor({
  id: "provider-free-a",
  supportedArtifactKinds: [ARTIFACT_KIND.STATIC],
  regions: ["global"],
  fixedCostUsd: 0,
  estimatedDeploymentCostUsd: 0,
  freeQuotaRemainingRatio: 0.7,
  latencyMs: 60,
  buildTimeMs: 5000,
  exitReadinessScore: 90,
});
const paidDeployment = createDeploymentProviderDescriptor({
  id: "provider-paid-b",
  supportedArtifactKinds: [ARTIFACT_KIND.STATIC],
  regions: ["global"],
  fixedCostUsd: 5,
  estimatedDeploymentCostUsd: 0.02,
  exitReadinessScore: 100,
});
const deploymentPlan = planDeployment({
  manifest,
  artifactId: "web",
  providers: [paidDeployment, freeDeployment],
  requiredRegion: "global",
  zeroFixedCostMode: true,
  paidRoutingAllowed: false,
  maximumEstimatedCostUsd: 0,
});
assert.equal(deploymentPlan.decision, "deploy");
assert.equal(deploymentPlan.providerId, "provider-free-a");
assert.ok(deploymentPlan.rejected.some((item) => item.providerId === "provider-paid-b" && item.reason === "fixed_cost_forbidden"));
assert.equal(publicDeploymentRouterPolicy().coreDirectProviderApiCallsAllowed, false);
assert.equal(normalizeDeploymentStatus("READY"), DEPLOYMENT_STATUS.READY);

const fakeProvider = {
  id: "provider-free-a",
  async prepareArtifact({ artifactId }) { return { artifactId, prepared: true }; },
  async deploy({ artifact }) { return { deploymentId: "dep-test", status: DEPLOYMENT_STATUS.READY, artifact }; },
  async getStatus() { return DEPLOYMENT_STATUS.READY; },
  async getLogs() { return []; },
  async rollback() { return { status: DEPLOYMENT_STATUS.READY }; },
  async addDomain() { return true; },
  async removeDomain() { return true; },
  async setEnv() { return true; },
  async healthCheck() { return { healthy: true }; },
};
assert.equal(assertDeploymentProvider(fakeProvider), true);
assert.throws(() => assertDeploymentProvider({ id: "broken" }), /METHOD_REQUIRED:prepareArtifact/);
const deploymentResult = await executeDeploymentPlan({ plan: deploymentPlan, provider: fakeProvider, manifest });
assert.equal(deploymentResult.status, DEPLOYMENT_STATUS.READY);
assert.equal(deploymentResult.artifact.artifactId, "web");
assert.equal(publicDeploymentProviderContract().providerCredentialsOwnedByAdapter, true);
assert.equal(publicDeploymentProviderContract().coreDirectProviderApiAllowed, false);

assert.equal(resolveOperationalMode({ providerHealthy: true, errorRate: 0.01, spendRatio: 0.2 }), OPERATIONAL_MODE.NORMAL);
assert.equal(resolveOperationalMode({ providerHealthy: false }), OPERATIONAL_MODE.DEGRADED);
assert.equal(resolveOperationalMode({ spendRatio: 1 }), OPERATIONAL_MODE.SURVIVAL);
assert.equal(resolveOperationalMode({ recovering: true }), OPERATIONAL_MODE.RECOVERY);
assert.equal(resolveCapabilityAccess({ capability: "project.read", mode: OPERATIONAL_MODE.SURVIVAL }).allowed, true);
assert.equal(resolveCapabilityAccess({ capability: "generation.heavy.app", mode: OPERATIONAL_MODE.SURVIVAL }).allowed, false);
assert.equal(resolveCapabilityAccess({ capability: "deployment", killSwitches: { deployment: true } }).reason, "emergency_kill_switch");
assert.equal(resolveCapabilityAccess({ capability: "image", featureFlags: { image: false } }).reason, "feature_flag_disabled");
assert.equal(publicSafetyControlPolicy().killSwitchIndependentOfDeploy, true);

assert.throws(() => assertExitAdapter({ exportState() {}, importState() {} }), /verifyState/);
assert.doesNotThrow(() => assertExitAdapter({ exportState() {}, importState() {}, verifyState() {} }));
const notReadyExit = assessExitReadiness({
  exportSupported: true,
  importSupported: true,
  checksumsVerified: true,
  restoreTested: false,
  providerIndependentFormat: true,
});
assert.equal(notReadyExit.ready, false, "Export support alone must not be called exit-ready without a tested restore path.");
const readyExit = assessExitReadiness({
  exportSupported: true,
  importSupported: true,
  checksumsVerified: true,
  restoreTested: true,
  providerIndependentFormat: true,
  lastRestoreTestAgeDays: 7,
});
assert.equal(readyExit.score, 100);
assert.equal(readyExit.ready, true);
assert.equal(publicExitPolicy().userCountTriggersExit, false);

for (const path of [
  "lib/infrastructure/project-manifest.js",
  "lib/infrastructure/resource-ledger.js",
  "lib/infrastructure/safety-controls.js",
  "lib/infrastructure/exit-readiness.js",
  "lib/infrastructure/cost-governor.js",
  "lib/infrastructure/deployment-provider-contract.js",
  "lib/infrastructure/deployment-router.js",
  "lib/infrastructure/artifact-registry.js",
]) {
  const source = fs.readFileSync(path, "utf8");
  assert.doesNotMatch(source, /@supabase\/|lib\/supabase\/|@vercel\/|VERCEL_TOKEN|SUPABASE_SERVICE_ROLE_KEY|OPENAI_API_KEY/,
    `${path} must stay provider-opaque and contain no provider secrets or SDK imports.`);
}

console.log("✓ Portable LANERIQ Project Manifest is artifact-first and rejects provider-specific identifiers");
console.log("✓ Resource Ledger records true workload cost and zero-spend mode blocks non-essential paid routing");
console.log("✓ Dynamic Cost Governor prefers safe local/free routes and never silently escalates zero-spend work to paid providers");
console.log("✓ Content-addressed Artifact Registry preserves immutable provider-opaque artifact metadata without claiming paid durable storage");
console.log("✓ Deployment Router selects policy-compliant providers through a replaceable adapter contract with no direct provider API calls in core");
console.log("✓ Safety Control Plane supports feature flags, independent kill switches and graceful Survival/Recovery modes");
console.log("✓ Provider Exit Readiness requires export + import + checksum + fresh restore-test evidence before 100");
console.log("✓ Level-0 infrastructure modules remain provider-opaque, secret-free and zero-fixed-cost by construction");
