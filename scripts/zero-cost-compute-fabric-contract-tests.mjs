import assert from "node:assert/strict";
import fs from "node:fs";

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
import {
  GENERATION_CANDIDATE_ORCHESTRATOR_POLICY,
  buildGenerationCandidateBudget,
} from "../lib/ai/generation-candidate-orchestrator.js";
import {
  PROVIDER_COMPUTE_TELEMETRY_POLICY,
  deriveProviderComputeTelemetry,
} from "../lib/ai/provider-compute-telemetry.js";
import {
  filterProvidersByCost,
  freeTierHardStopProviders,
  isFreeTierProviderHardStopVerified,
} from "../lib/soolen/cost-policy.js";
import { generateWithFallback } from "../engine/ai-provider.js";
import { providerRouterProductionTruth } from "../lib/ai/provider-router-truth.js";

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

const candidateBudget = buildGenerationCandidateBudget({ costMode: "free", requestedCandidates: 3 });
assert.equal(candidateBudget.computeFabricV2, true);
assert.equal(candidateBudget.logicalWorkerCapacity, 100);
assert.equal(candidateBudget.maxActiveAgents, 3);
assert.equal(candidateBudget.recursiveFanoutUnlimited, false);
assert.equal(candidateBudget.maxMeteredRemoteCalls, 1, "Existing free-tier candidate path remains bounded to one remote success path.");
assert.equal(GENERATION_CANDIDATE_ORCHESTRATOR_POLICY.computeFabricV2Required, true);
assert.equal(GENERATION_CANDIDATE_ORCHESTRATOR_POLICY.recursiveFanoutUnlimited, false);

const freeWithoutHardStop = {
  SOOLEN_COST_MODE: "free",
  SOOLEN_FREE_TIER_PROVIDERS: "groq,soolen-local",
};
assert.deepEqual(filterProvidersByCost(["groq", "soolen-local"], freeWithoutHardStop), ["soolen-local"]);
assert.equal(isFreeTierProviderHardStopVerified("groq", freeWithoutHardStop), false);

const freeWithHardStop = {
  ...freeWithoutHardStop,
  SOOLEN_FREE_TIER_HARD_STOP_PROVIDERS: "groq",
};
assert.deepEqual(freeTierHardStopProviders(freeWithHardStop), ["groq"]);
assert.equal(isFreeTierProviderHardStopVerified("groq", freeWithHardStop), true);
assert.deepEqual(filterProvidersByCost(["groq", "soolen-local"], freeWithHardStop), ["groq", "soolen-local"]);

const providerRuntimeSample = {
  runtimeRequests: 10,
  runtimeSuccesses: 9,
  localSuccessesObservedInInstance: 4,
  remoteSuccessesObservedInInstance: 5,
  blockedByCost: 7,
  runtimeFailovers: 2,
  proactiveQuotaSwitches: 1,
};
const freeRuntimeTelemetry = deriveProviderComputeTelemetry(providerRuntimeSample, { SOOLEN_COST_MODE: "free" });
assert.equal(freeRuntimeTelemetry.confirmedZeroCostResolutions, 9);
assert.equal(freeRuntimeTelemetry.confirmedZeroCostResolutionRate, 0.9);
assert.equal(freeRuntimeTelemetry.exactZeroCostRateKnown, true);
assert.equal(freeRuntimeTelemetry.unclassifiedRemoteResolutions, 0);
assert.equal(freeRuntimeTelemetry.blockedByCost, 7);
assert.equal(freeRuntimeTelemetry.logicalWorkerCapacity, 100);
assert.equal(freeRuntimeTelemetry.maxActiveAgentFanout, 10);

const balancedRuntimeTelemetry = deriveProviderComputeTelemetry(providerRuntimeSample, { SOOLEN_COST_MODE: "balanced" });
assert.equal(balancedRuntimeTelemetry.confirmedZeroCostResolutions, 4);
assert.equal(balancedRuntimeTelemetry.confirmedZeroCostResolutionRate, 0.4);
assert.equal(balancedRuntimeTelemetry.exactZeroCostRateKnown, false);
assert.equal(balancedRuntimeTelemetry.unclassifiedRemoteResolutions, 5, "Remote balanced/paid results must not be mislabeled zero-cost without provider-level cost evidence.");

const hostileZeroRuntimeTelemetry = deriveProviderComputeTelemetry(providerRuntimeSample, { SOOLEN_COST_MODE: "zero" });
assert.equal(hostileZeroRuntimeTelemetry.zeroModeRemotePolicyViolationObserved, true, "Zero mode must flag any observed remote success as a policy violation instead of counting it as zero-cost.");
assert.equal(hostileZeroRuntimeTelemetry.confirmedZeroCostResolutions, 4);
assert.equal(hostileZeroRuntimeTelemetry.exactZeroCostRateKnown, false, "A zero-mode remote observation must invalidate an exact zero-cost rate claim.");
assert.equal(PROVIDER_COMPUTE_TELEMETRY_POLICY.freeModeRemoteSuccessRequiresVerifiedHardStop, true);
assert.equal(PROVIDER_COMPUTE_TELEMETRY_POLICY.balancedAndPaidRemoteCostClassMustRemainUnclassifiedWithoutProviderLevelEvidence, true);
assert.equal(PROVIDER_COMPUTE_TELEMETRY_POLICY.zeroModeRemoteObservationInvalidatesExactRate, true);

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
assert.match(summary.evidenceBoundary, /do not prove third-party billing/i);

const previousCostMode = process.env.SOOLEN_COST_MODE;
process.env.SOOLEN_COST_MODE = "zero";
try {
  const truthBefore = providerRouterProductionTruth();
  const localRuntimeResult = await generateWithFallback(
    "LANERIQ Compute Fabric runtime telemetry integration canary",
    { providers: ["soolen-local"] },
  );
  assert.equal(localRuntimeResult.provider, "soolen-local");
  const truthAfter = providerRouterProductionTruth();
  assert.equal(truthAfter.codeCapabilities.computeFabricRuntimeTelemetry, true);
  assert.equal(truthAfter.computeFabricTelemetry.fabricVersion, ZERO_COST_COMPUTE_FABRIC_POLICY.version);
  assert.ok(truthAfter.runtimeRequests >= truthBefore.runtimeRequests + 1);
  assert.ok(truthAfter.computeFabricTelemetry.confirmedZeroCostResolutions >= 1);
  assert.equal(truthAfter.computeFabricTelemetry.zeroModeRemotePolicyViolationObserved, false);
  assert.equal(truthAfter.computeFabricTelemetry.exactZeroCostRateKnown, true);
  assert.equal(truthAfter.computeFabricTelemetry.runtimeEphemeral, true);

  const statusRoute = fs.readFileSync("app/api/ai/provider-router/status/route.js", "utf8");
  assert.match(statusRoute, /computeFabricTelemetry:\s*truth\.computeFabricTelemetry/);
  assert.match(statusRoute, /localSuccessesObservedInInstance:\s*truth\.localSuccessesObservedInInstance/);
  assert.match(statusRoute, /remoteSuccessesObservedInInstance:\s*truth\.remoteSuccessesObservedInInstance/);
  assert.doesNotMatch(statusRoute, /OPENAI_API_KEY|GROQ_API_KEY|GEMINI_API_KEY|CLOUDFLARE_AI_API_TOKEN|HF_TOKEN/);
} finally {
  if (previousCostMode === undefined) delete process.env.SOOLEN_COST_MODE;
  else process.env.SOOLEN_COST_MODE = previousCostMode;
}

console.log("✓ LANERIQ Compute Fabric exposes 100 logical workers without allowing unbounded active fan-out");
console.log("✓ Agent budgets cap active workers at 1/3/5/10-class envelopes and block metered agent calls in zero/free modes");
console.log("✓ Generation candidate orchestration is now bound to the shared Compute Fabric fan-out envelope");
console.log("✓ Free-tier remote providers fail closed unless their account hard stop is explicitly verified and allowlisted");
console.log("✓ Provider Router runtime counters now produce truthful confirmed zero-cost resolution telemetry without misclassifying balanced/paid remote traffic");
console.log("✓ Provider Router Production truth and public status are wired to sanitized Compute Fabric runtime telemetry");
console.log("✓ Compute routing prefers deterministic/cache/local/own-Desktop/free-hard-stop capacity before paid providers");
console.log("✓ Paid Compute Firewall fails closed in zero/free modes and requires explicit paid policy in balanced/paid operation");
console.log("✓ Zero-Cost Resolution Rate telemetry records routing outcomes without claiming unlimited or billing-verified capacity");
