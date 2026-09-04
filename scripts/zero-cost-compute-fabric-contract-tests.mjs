import assert from "node:assert/strict";

import {
  LOGICAL_WORKER_CAPACITY,
  MAX_ACTIVE_AGENT_FANOUT,
  ZERO_COST_COMPUTE_FABRIC_POLICY,
  assertPaidComputeAllowed,
  buildAgentComputeBudget,
  createComputeTelemetry,
  recordComputeResolution,
  selectComputeRoute,
  summarizeComputeTelemetry,
} from "../lib/ai/zero-cost-compute-fabric.js";

assert.equal(LOGICAL_WORKER_CAPACITY, 100);
assert.equal(MAX_ACTIVE_AGENT_FANOUT, 10);
assert.equal(ZERO_COST_COMPUTE_FABRIC_POLICY.paidComputeFirewall, true);
assert.equal(ZERO_COST_COMPUTE_FABRIC_POLICY.recursiveFanoutUnlimited, false);
assert.equal(ZERO_COST_COMPUTE_FABRIC_POLICY.crossUserComputeAllowed, false);

const standard = buildAgentComputeBudget({ complexity: "standard", requestedAgents: 100, costMode: "zero" });
assert.equal(standard.logicalWorkerCapacity, 100);
assert.equal(standard.maxActiveAgents, 3);
assert.equal(standard.maxMeteredAgentCalls, 0);
assert.equal(standard.recursiveFanoutUnlimited, false);

const critical = buildAgentComputeBudget({ complexity: "critical", requestedAgents: 100, costMode: "paid", requiresIndependentVerification: true });
assert.equal(critical.maxActiveAgents, 10);
assert.equal(critical.maxMeteredAgentCalls, 3);
assert.ok(critical.maxTreeDepth <= 3);
assert.ok(critical.maxChildrenPerAgent <= 3);

assert.deepEqual(selectComputeRoute({ deterministicHit: true, costMode: "zero" }), {
  route: "deterministic",
  zeroCost: true,
  reason: "deterministic_hit",
  paidBlocked: true,
});
assert.equal(selectComputeRoute({ cacheHit: true, costMode: "zero" }).route, "cache");
assert.equal(selectComputeRoute({ localDeviceAvailable: true, costMode: "zero" }).route, "local_device");
assert.equal(selectComputeRoute({ ownDesktopAvailable: true, ownDesktopAllowed: true, costMode: "zero" }).route, "own_desktop");
assert.equal(selectComputeRoute({ freeProviderAvailable: true, freeProviderHardStopVerified: true, costMode: "free" }).route, "free_provider");
assert.equal(selectComputeRoute({ freeProviderAvailable: true, freeProviderHardStopVerified: false, costMode: "free" }).reason, "free_provider_hard_stop_not_verified");
assert.equal(selectComputeRoute({ queueAllowed: true, interactive: false, costMode: "zero" }).route, "queue");
assert.equal(selectComputeRoute({ paidProviderAvailable: true, paidFallbackAllowed: false, costMode: "balanced" }).route, "blocked_or_degraded");
assert.equal(selectComputeRoute({ paidProviderAvailable: true, paidFallbackAllowed: true, costMode: "balanced" }).route, "paid_provider");

assert.throws(() => assertPaidComputeAllowed({ provider: "openai", costMode: "zero", paidFallbackAllowed: true }), /PAID_COMPUTE_FIREWALL_BLOCKED/);
assert.throws(() => assertPaidComputeAllowed({ provider: "openai", costMode: "free", paidFallbackAllowed: true }), /PAID_COMPUTE_FIREWALL_BLOCKED/);
assert.throws(() => assertPaidComputeAllowed({ provider: "openai", costMode: "balanced", paidFallbackAllowed: false }), /REQUIRES_EXPLICIT_POLICY/);
assert.equal(assertPaidComputeAllowed({ provider: "openai", costMode: "balanced", paidFallbackAllowed: true }), true);
assert.equal(assertPaidComputeAllowed({ provider: "ollama", costMode: "zero" }), true);

const telemetry = createComputeTelemetry();
recordComputeResolution(telemetry, selectComputeRoute({ cacheHit: true, costMode: "zero" }));
recordComputeResolution(telemetry, selectComputeRoute({ localDeviceAvailable: true, costMode: "zero" }));
recordComputeResolution(telemetry, selectComputeRoute({ paidProviderAvailable: true, paidFallbackAllowed: true, costMode: "balanced" }));
const summary = summarizeComputeTelemetry(telemetry);
assert.equal(summary.requests, 3);
assert.equal(summary.resolvedZeroCost, 2);
assert.equal(summary.resolvedPaid, 1);
assert.equal(summary.zeroCostResolutionRate, 0.6667);
assert.equal(summary.paidResolutionRate, 0.3333);
assert.match(summary.evidenceBoundary, /does not prove third-party billing/i);

console.log("✓ LANERIQ Compute Fabric exposes 100 logical workers without allowing unbounded active fan-out");
console.log("✓ Agent budgets cap active workers at 1/3/5/10-class envelopes and block metered agent calls in zero/free modes");
console.log("✓ Compute routing prefers deterministic/cache/local/own-Desktop/free-hard-stop capacity before paid providers");
console.log("✓ Free-tier cloud requires explicit account hard-stop verification before being counted as zero-cost capacity");
console.log("✓ Paid Compute Firewall fails closed in zero/free modes and requires explicit paid policy in balanced/paid operation");
console.log("✓ Zero-Cost Resolution Rate telemetry records routing outcomes without claiming unlimited or billing-verified capacity");
