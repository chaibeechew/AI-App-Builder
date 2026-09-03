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
]) {
  const source = fs.readFileSync(path, "utf8");
  assert.doesNotMatch(source, /@supabase\/|lib\/supabase\/|@vercel\/|VERCEL_TOKEN|SUPABASE_SERVICE_ROLE_KEY|OPENAI_API_KEY/,
    `${path} must stay provider-opaque and contain no provider secrets or SDK imports.`);
}

console.log("✓ Portable LANERIQ Project Manifest is artifact-first and rejects provider-specific identifiers");
console.log("✓ Resource Ledger records true workload cost and zero-spend mode blocks non-essential paid routing");
console.log("✓ Safety Control Plane supports feature flags, independent kill switches and graceful Survival/Recovery modes");
console.log("✓ Provider Exit Readiness requires export + import + checksum + fresh restore-test evidence before 100");
console.log("✓ Level-0 infrastructure modules remain provider-opaque, secret-free and zero-fixed-cost by construction");
