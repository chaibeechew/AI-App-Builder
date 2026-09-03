import assert from "node:assert/strict";
import fs from "node:fs";

import {
  TELEMETRY_SIGNAL,
  createTelemetryBus,
  aggregateTelemetry,
  publicTelemetryPolicy,
} from "../lib/infrastructure/provider-opaque-telemetry-bus.js";
import {
  CHANGE_DECISION,
  evaluateChangeFreeze,
  assertChangeAllowed,
  publicChangeFreezePolicy,
} from "../lib/infrastructure/change-freeze-controller.js";
import {
  createReplayEnvelope,
  simulateReplay,
  publicReplayChaosPolicy,
} from "../lib/infrastructure/replay-chaos-simulator.js";
import {
  ROUTE_PLAN_STATE,
  planCellRoute,
  assertRoutePlanSafe,
  publicCellRoutingPolicy,
} from "../lib/infrastructure/cell-routing-failover-planner.js";

const bus = createTelemetryBus({ maxEvents: 3, now: () => 1000 });
bus.emit({
  id: "evt-1",
  signal: TELEMETRY_SIGNAL.REQUEST,
  serviceId: "generate",
  cellId: "cell-my-1",
  routeClass: "ai-primary",
  durationMs: 100,
  success: true,
  statusCode: 200,
  metadata: { release: "a", provider: "must-not-leak", apiKey: "secret", prompt: "private", cached: true },
});
bus.emit({ id: "evt-2", signal: TELEMETRY_SIGNAL.LATENCY, serviceId: "generate", cellId: "cell-my-1", routeClass: "ai-primary", durationMs: 200, success: true });
bus.emit({ id: "evt-3", signal: TELEMETRY_SIGNAL.ERROR, serviceId: "generate", cellId: "cell-my-1", routeClass: "ai-primary", durationMs: 900, success: false, statusCode: 503 });
bus.emit({ id: "evt-4", signal: TELEMETRY_SIGNAL.REQUEST, serviceId: "publish", cellId: "cell-my-1", routeClass: "deploy-primary", durationMs: 50, success: true });
assert.equal(bus.size(), 3, "telemetry bus must be bounded");
const telemetry = bus.snapshot({ serviceId: "generate" });
assert.equal(telemetry.length, 2, "oldest event must be evicted and service filter must work");
assert.equal("provider" in telemetry[0].metadata, false, "provider identity metadata must be stripped");
assert.equal("apiKey" in telemetry[0].metadata, false, "secret metadata must be stripped");
const aggregate = aggregateTelemetry(telemetry);
assert.equal(aggregate.sampleCount, 2);
assert.equal(aggregate.errorCount, 1);
assert.equal(aggregate.latencyP95Ms, 900);
assert.equal(aggregate.providerIdentityExposed, false);

const allow = evaluateChangeFreeze({
  errorBudgetAssessments: [{ state: "healthy" }],
  blastRadiusAssessment: { radius: "cell" },
  complexityAssessment: { allowed: true, level: "low" },
  telemetryEvidence: { sampleCount: 100, fresh: true },
  rollbackReady: true,
});
assert.equal(allow.decision, CHANGE_DECISION.ALLOW);
assert.equal(assertChangeAllowed({
  errorBudgetAssessments: [{ state: "healthy" }],
  blastRadiusAssessment: { radius: "resource" },
  complexityAssessment: { allowed: true },
  telemetryEvidence: { sampleCount: 1, fresh: true },
}).allowed, true);

const hardFreeze = evaluateChangeFreeze({
  errorBudgetAssessments: [{ state: "freeze_changes" }],
  blastRadiusAssessment: { radius: "resource" },
  complexityAssessment: { allowed: true },
  telemetryEvidence: { sampleCount: 100, fresh: true },
  rollbackReady: true,
});
assert.equal(hardFreeze.decision, CHANGE_DECISION.FREEZE);
assert.ok(hardFreeze.reasons.includes("error_budget_freeze"));

const globalFreeze = evaluateChangeFreeze({
  errorBudgetAssessments: [{ state: "healthy" }],
  blastRadiusAssessment: { radius: "global" },
  complexityAssessment: { allowed: true, level: "medium" },
  telemetryEvidence: { sampleCount: 500, fresh: true },
  rollbackReady: false,
});
assert.equal(globalFreeze.frozen, true);
assert.ok(globalFreeze.reasons.includes("global_change_requires_rollback"));

const held = evaluateChangeFreeze({
  errorBudgetAssessments: [{ state: "slow_burn" }],
  blastRadiusAssessment: { radius: "multi_cell" },
  complexityAssessment: { allowed: true, level: "medium" },
  telemetryEvidence: { sampleCount: 50, fresh: true },
  rollbackReady: true,
});
assert.equal(held.decision, CHANGE_DECISION.HOLD);

const replayEvents = Array.from({ length: 20 }, (_, index) => createReplayEnvelope({
  id: `req-${index}`,
  serviceId: "generate",
  cellId: index < 10 ? "cell-my-1" : "cell-sg-1",
  requestClass: "interactive",
  latencyMs: 100 + index,
  success: true,
  statusCode: 200,
}));
const simulationA = simulateReplay({
  events: replayEvents,
  seed: "stable-seed",
  faultPlan: { addedLatencyMs: 500, failureRate: 0.25, dropRate: 0.1, requestClasses: ["interactive"] },
  thresholds: { maxAvailabilityDrop: 0.5, maxP95IncreaseMs: 600 },
});
const simulationB = simulateReplay({
  events: replayEvents,
  seed: "stable-seed",
  faultPlan: { addedLatencyMs: 500, failureRate: 0.25, dropRate: 0.1, requestClasses: ["interactive"] },
  thresholds: { maxAvailabilityDrop: 0.5, maxP95IncreaseMs: 600 },
});
assert.deepEqual(simulationA.outcomes, simulationB.outcomes, "chaos simulation must be deterministic by seed");
assert.equal(simulationA.productionMutationPerformed, false);
assert.equal(simulationA.externalNetworkUsed, false);
assert.equal(simulationA.replayedPayloadData, false);
assert.ok(simulationA.simulated.p95LatencyMs >= simulationA.baseline.p95LatencyMs + 500);

const localPlan = planCellRoute({
  requestId: "route-1",
  sourceCellId: "cell-my-1",
  candidates: [
    { id: "local-a", cellId: "cell-my-1", routeClass: "ai-primary", healthy: true, availableCapacity: 10, predictedLatencyMs: 300, incrementalCostUsd: 0 },
    { id: "remote-fast", cellId: "cell-sg-1", routeClass: "ai-secondary", healthy: true, availableCapacity: 10, predictedLatencyMs: 50, incrementalCostUsd: 0 },
  ],
  allowCrossCellFailover: true,
});
assert.equal(localPlan.state, ROUTE_PLAN_STATE.READY);
assert.equal(localPlan.primary.id, "local-a", "same-cell route must beat faster remote candidate");
assert.equal(assertRoutePlanSafe(localPlan).primary.id, "local-a");

const blockedCrossCell = planCellRoute({
  requestId: "route-2",
  sourceCellId: "cell-my-1",
  candidates: [{ id: "remote-a", cellId: "cell-sg-1", routeClass: "ai-secondary", healthy: true, availableCapacity: 10, predictedLatencyMs: 100, incrementalCostUsd: 0 }],
});
assert.equal(blockedCrossCell.state, ROUTE_PLAN_STATE.NO_SAFE_ROUTE);

const plannedCrossCell = planCellRoute({
  requestId: "route-3",
  sourceCellId: "cell-my-1",
  candidates: [{ id: "remote-a", cellId: "cell-sg-1", routeClass: "ai-secondary", healthy: true, availableCapacity: 10, predictedLatencyMs: 100, incrementalCostUsd: 0 }],
  allowCrossCellFailover: true,
});
assert.equal(plannedCrossCell.state, ROUTE_PLAN_STATE.DEGRADED);
assert.equal(plannedCrossCell.crossCellSelected, true);
assert.equal(plannedCrossCell.automaticLiveCutoverAllowed, false);
assert.throws(() => assertRoutePlanSafe(plannedCrossCell), /REQUIRES_APPROVAL/);
assert.throws(() => planCellRoute({
  requestId: "route-4",
  sourceCellId: "cell-my-1",
  candidates: [{ id: "bad", cellId: "cell-my-1", routeClass: "default", providerId: "vercel", healthy: true, availableCapacity: 10, predictedLatencyMs: 10 }],
}), /PROVIDER_IDENTITY_FORBIDDEN/);

for (const policy of [publicTelemetryPolicy(), publicChangeFreezePolicy(), publicReplayChaosPolicy(), publicCellRoutingPolicy()]) {
  assert.equal(policy.fixedInfrastructureRequired, false, "control-plane foundation must not require fixed infrastructure");
}
assert.equal(publicTelemetryPolicy().liveExternalIngestionClaimed, false);
assert.equal(publicChangeFreezePolicy().liveDeploymentIntegrationClaimed, false);
assert.equal(publicReplayChaosPolicy().liveTrafficInjectionClaimed, false);
assert.equal(publicCellRoutingPolicy().physicalCellsClaimedLive, false);

const sourceFiles = [
  "lib/infrastructure/provider-opaque-telemetry-bus.js",
  "lib/infrastructure/change-freeze-controller.js",
  "lib/infrastructure/replay-chaos-simulator.js",
  "lib/infrastructure/cell-routing-failover-planner.js",
];
for (const file of sourceFiles) {
  const source = fs.readFileSync(new URL(`../${file}`, import.meta.url), "utf8");
  assert.equal(/process\.env|fetch\(|axios|supabase|vercel|cloudflare|aws/i.test(source), false, `${file} must remain provider-opaque and zero-network`);
}

console.log("Adaptive control-plane infrastructure contracts passed.");
