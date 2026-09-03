import assert from "node:assert/strict";
import fs from "node:fs";

import {
  ERROR_BUDGET_STATE,
  createServiceSlo,
  evaluateServiceLevel,
  publicSloPolicy,
} from "../lib/infrastructure/slo-error-budget.js";
import {
  compareShadowOutcome,
  planShadowSchedule,
  publicShadowSchedulerPolicy,
} from "../lib/infrastructure/shadow-scheduler.js";
import {
  BLAST_RADIUS,
  assessBlastRadius,
  assertCellLocalWrite,
  createCellScopedId,
  parseCellScopedId,
  publicCellPolicy,
} from "../lib/infrastructure/cell-blast-radius.js";
import {
  COMPLEXITY_LEVEL,
  evaluateOperationalComplexity,
  publicComplexityGatePolicy,
} from "../lib/infrastructure/complexity-gate.js";

const appSlo = createServiceSlo({
  id: "app-generation-control-plane",
  availabilityTarget: 0.999,
  latencyP95Ms: 1500,
  minimumSamples: 100,
});

const healthySlo = evaluateServiceLevel({
  slo: appSlo,
  totalRequests: 1000,
  successfulRequests: 1000,
  latencySamplesMs: Array.from({ length: 1000 }, (_, index) => 250 + (index % 30)),
});
assert.equal(healthySlo.state, ERROR_BUDGET_STATE.HEALTHY);
assert.equal(healthySlo.deploymentChangesAllowed, true);
assert.equal(healthySlo.latencyHealthy, true);

const insufficientSlo = evaluateServiceLevel({
  slo: appSlo,
  totalRequests: 10,
  successfulRequests: 10,
  latencySamplesMs: Array(10).fill(200),
});
assert.equal(insufficientSlo.state, ERROR_BUDGET_STATE.INSUFFICIENT_EVIDENCE);

const burningSlo = evaluateServiceLevel({
  slo: appSlo,
  totalRequests: 1000,
  successfulRequests: 990,
  latencySamplesMs: Array(1000).fill(400),
});
assert.equal(burningSlo.state, ERROR_BUDGET_STATE.FREEZE_CHANGES);
assert.equal(burningSlo.deploymentChangesAllowed, false);
assert.equal(publicSloPolicy().liveTelemetryClaimed, false);

const shadowPlan = planShadowSchedule({
  taskId: "task-zero-cost-shadow-001",
  shadowSampleRate: 1,
  maxShadowIncrementalCostUsd: 0,
  candidates: [
    { id: "local-primary", healthy: true, eligible: true, predictedLatencyMs: 90, predictedErrorRate: 0.001, incrementalCostUsd: 0, capacityScore: 1 },
    { id: "shared-shadow", healthy: true, eligible: true, predictedLatencyMs: 120, predictedErrorRate: 0.001, incrementalCostUsd: 0, capacityScore: 0.95 },
    { id: "paid-shadow", healthy: true, eligible: true, predictedLatencyMs: 70, predictedErrorRate: 0.001, incrementalCostUsd: 0.02, capacityScore: 1 },
  ],
});
assert.equal(shadowPlan.primaryTargetId, "local-primary");
assert.equal(shadowPlan.shadowTargetId, "shared-shadow");
assert.equal(shadowPlan.shadowIncrementalCostUsd, 0);
assert.equal(shadowPlan.mutationAllowedForShadow, false);

const shadowComparison = compareShadowOutcome({
  primary: { success: true, latencyMs: 150 },
  shadow: { success: true, latencyMs: 80 },
});
assert.equal(shadowComparison.preferred, "shadow");
assert.equal(shadowComparison.advisoryOnly, true);
assert.equal(shadowComparison.automaticCutoverAllowed, false);
assert.equal(publicShadowSchedulerPolicy().liveShadowTrafficClaimed, false);

const projectA = createCellScopedId({ cellId: "sea-kul-c01", resourceType: "project", localId: "p001" });
const projectB = createCellScopedId({ cellId: "sea-kul-c01", resourceType: "project", localId: "p002" });
const projectC = createCellScopedId({ cellId: "sea-sin-c02", resourceType: "project", localId: "p003" });
assert.deepEqual(parseCellScopedId(projectA), { cellId: "sea-kul-c01", resourceType: "project", localId: "p001" });
assert.equal(assertCellLocalWrite({ sourceId: projectA, targetId: projectB }).allowed, true);
assert.throws(() => assertCellLocalWrite({ sourceId: projectA, targetId: projectC }), /CROSS_CELL_WRITE_BLOCKED/);
assert.equal(assessBlastRadius({ resourceIds: [projectA] }).radius, BLAST_RADIUS.RESOURCE);
assert.equal(assessBlastRadius({ resourceIds: [projectA, projectB] }).radius, BLAST_RADIUS.CELL);
assert.equal(assessBlastRadius({ resourceIds: [projectA, projectC] }).radius, BLAST_RADIUS.MULTI_CELL);
assert.equal(assessBlastRadius({ resourceIds: [projectA], globalDependencyAffected: true }).radius, BLAST_RADIUS.GLOBAL);
assert.equal(publicCellPolicy().physicalCellsClaimedLive, false);

const smallChange = evaluateOperationalComplexity({ filesChanged: 4, linesChanged: 300, domainsTouched: 1 });
assert.equal(smallChange.allowed, true);
assert.equal(smallChange.level, COMPLEXITY_LEVEL.LOW);
assert.equal(smallChange.zeroFixedCostPreserved, true);

const prematurePaidInfra = evaluateOperationalComplexity({
  filesChanged: 6,
  linesChanged: 600,
  domainsTouched: 2,
  fixedMonthlyCostUsd: 100,
  approvedFixedMonthlyCostUsd: 0,
  dedicatedServerCount: 1,
  currentMau: 1000,
});
assert.equal(prematurePaidInfra.allowed, false);
assert.ok(prematurePaidInfra.blockers.includes("fixed_monthly_cost_exceeds_approved_budget"));
assert.ok(prematurePaidInfra.blockers.includes("dedicated_server_before_scale_trigger"));

const globalWithoutRollback = evaluateOperationalComplexity({
  filesChanged: 10,
  linesChanged: 1500,
  domainsTouched: 4,
  globalDependenciesChanged: 1,
  rollbackTested: false,
});
assert.equal(globalWithoutRollback.allowed, false);
assert.ok(globalWithoutRollback.blockers.includes("global_change_requires_tested_rollback"));

const crossCellWithoutReview = evaluateOperationalComplexity({ crossCellWrites: 1 });
assert.equal(crossCellWithoutReview.allowed, false);
assert.ok(crossCellWithoutReview.blockers.includes("cross_cell_write_requires_review"));
assert.equal(publicComplexityGatePolicy().defaultApprovedFixedMonthlyCostUsd, 0);
assert.equal(publicComplexityGatePolicy().defaultMinimumDedicatedServerMau, 20000);

for (const path of [
  "lib/infrastructure/slo-error-budget.js",
  "lib/infrastructure/shadow-scheduler.js",
  "lib/infrastructure/cell-blast-radius.js",
  "lib/infrastructure/complexity-gate.js",
]) {
  const source = fs.readFileSync(path, "utf8");
  assert.doesNotMatch(
    source,
    /@supabase\/|@vercel\/|VERCEL_TOKEN|SUPABASE_SERVICE_ROLE_KEY|OPENAI_API_KEY|GEMINI_API_KEY|GROQ_API_KEY/,
    `${path} must remain provider-opaque and secret-free.`,
  );
}

console.log("✓ SLO/Error Budget requires evidence and can freeze risky changes during fast budget burn");
console.log("✓ Shadow Scheduler is deterministic, advisory-only and defaults to zero incremental spend");
console.log("✓ Cell-aware IDs fail closed on cross-cell writes and expose measurable blast radius");
console.log("✓ Complexity Gate blocks premature fixed cost, premature dedicated servers and unreviewed cross-cell/global changes");
console.log("✓ Operational resilience foundation remains provider-opaque, secret-free and zero-fixed-cost by default");
