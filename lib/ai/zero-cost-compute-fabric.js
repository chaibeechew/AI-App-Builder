import { getSoolenCostMode, providerMayCharge, zeroCostPolicy } from "../soolen/cost-policy.js";

export const ZERO_COST_COMPUTE_FABRIC_VERSION = "2026-09-05.1";
export const LOGICAL_WORKER_CAPACITY = 100;
export const MAX_ACTIVE_AGENT_FANOUT = 10;

const COMPLEXITY_BUDGET = Object.freeze({
  trivial: 1,
  standard: 3,
  complex: 5,
  critical: 10,
});

function normalizeMode(value) {
  const mode = String(value || getSoolenCostMode()).trim().toLowerCase();
  return ["zero", "free", "balanced", "paid"].includes(mode) ? mode : "zero";
}

function clampInt(value, min, max, fallback) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.max(min, Math.min(max, Math.floor(number)));
}

export function buildAgentComputeBudget({
  complexity = "standard",
  requestedAgents,
  requiresIndependentVerification = false,
  costMode,
} = {}) {
  const mode = normalizeMode(costMode);
  const level = Object.prototype.hasOwnProperty.call(COMPLEXITY_BUDGET, complexity) ? complexity : "standard";
  const base = COMPLEXITY_BUDGET[level];
  const requested = clampInt(requestedAgents, 1, LOGICAL_WORKER_CAPACITY, base);
  const verificationBoost = requiresIndependentVerification ? 2 : 0;
  const maxActiveAgents = Math.max(1, Math.min(MAX_ACTIVE_AGENT_FANOUT, Math.max(base, Math.min(requested, base + verificationBoost))));
  const noSpend = mode === "zero" || mode === "free";
  const maxMeteredAgentCalls = noSpend ? 0 : mode === "balanced" ? 1 : Math.min(3, maxActiveAgents);
  const maxTreeDepth = level === "critical" ? 3 : level === "complex" ? 2 : 1;
  const maxChildrenPerAgent = Math.max(1, Math.min(3, Math.ceil(maxActiveAgents / Math.max(1, maxTreeDepth))));

  return Object.freeze({
    fabricVersion: ZERO_COST_COMPUTE_FABRIC_VERSION,
    logicalWorkerCapacity: LOGICAL_WORKER_CAPACITY,
    complexity: level,
    requestedAgents: requested,
    maxActiveAgents,
    maxMeteredAgentCalls,
    maxTreeDepth,
    maxChildrenPerAgent,
    recursiveFanoutUnlimited: false,
    parallelMeteredCalls: false,
    stopWhenAccepted: true,
    zeroCostFirst: true,
    paidComputeLast: true,
  });
}

export function selectComputeRoute(input = {}) {
  const mode = normalizeMode(input.costMode);
  const policy = zeroCostPolicy({ ...process.env, SOOLEN_COST_MODE: mode });

  if (input.deterministicHit === true) {
    return Object.freeze({ route: "deterministic", zeroCost: true, reason: "deterministic_hit", paidBlocked: true });
  }
  if (input.cacheHit === true) {
    return Object.freeze({ route: "cache", zeroCost: true, reason: "cache_hit", paidBlocked: true });
  }
  if (input.localDeviceAvailable === true && input.localDeviceAllowed !== false) {
    return Object.freeze({ route: "local_device", zeroCost: true, reason: "eligible_local_device", paidBlocked: true });
  }
  if (input.ownDesktopAvailable === true && input.ownDesktopAllowed === true) {
    return Object.freeze({ route: "own_desktop", zeroCost: true, reason: "eligible_own_desktop", paidBlocked: true });
  }

  const freeTierEligible = input.freeProviderAvailable === true
    && mode === "free"
    && input.freeProviderHardStopVerified === true;
  if (freeTierEligible) {
    return Object.freeze({ route: "free_provider", zeroCost: true, reason: "free_tier_hard_stop_verified", paidBlocked: true });
  }

  if (input.queueAllowed === true && input.interactive !== true) {
    return Object.freeze({ route: "queue", zeroCost: true, reason: "defer_for_zero_cost_capacity", paidBlocked: true });
  }

  const paidAllowed = policy.meteredProvidersAllowed === true && input.paidFallbackAllowed === true;
  if (paidAllowed && input.paidProviderAvailable === true) {
    return Object.freeze({ route: "paid_provider", zeroCost: false, reason: "explicit_paid_fallback", paidBlocked: false });
  }

  return Object.freeze({
    route: "blocked_or_degraded",
    zeroCost: true,
    reason: mode === "free" && input.freeProviderAvailable === true && input.freeProviderHardStopVerified !== true
      ? "free_provider_hard_stop_not_verified"
      : "no_authorized_zero_cost_capacity",
    paidBlocked: true,
  });
}

export function assertPaidComputeAllowed({ provider, costMode, paidFallbackAllowed = false } = {}) {
  const mode = normalizeMode(costMode);
  const normalizedProvider = String(provider || "").trim().toLowerCase();
  if (!normalizedProvider) throw new Error("LANERIQ_COMPUTE_PROVIDER_REQUIRED");
  if (!providerMayCharge(normalizedProvider)) return true;
  if (mode === "zero" || mode === "free") throw new Error("LANERIQ_PAID_COMPUTE_FIREWALL_BLOCKED");
  if (!paidFallbackAllowed) throw new Error("LANERIQ_PAID_COMPUTE_REQUIRES_EXPLICIT_POLICY");
  return true;
}

export function createComputeTelemetry() {
  return {
    requests: 0,
    resolvedZeroCost: 0,
    resolvedPaid: 0,
    deterministic: 0,
    cache: 0,
    localDevice: 0,
    ownDesktop: 0,
    freeProvider: 0,
    queued: 0,
    blockedOrDegraded: 0,
    preventedMeteredFanout: 0,
  };
}

export function recordComputeResolution(telemetry, decision = {}) {
  const target = telemetry && typeof telemetry === "object" ? telemetry : createComputeTelemetry();
  const route = String(decision.route || "blocked_or_degraded");
  target.requests = Number(target.requests || 0) + 1;
  if (decision.zeroCost === true) target.resolvedZeroCost = Number(target.resolvedZeroCost || 0) + 1;
  else if (route === "paid_provider") target.resolvedPaid = Number(target.resolvedPaid || 0) + 1;
  const key = {
    deterministic: "deterministic",
    cache: "cache",
    local_device: "localDevice",
    own_desktop: "ownDesktop",
    free_provider: "freeProvider",
    queue: "queued",
    blocked_or_degraded: "blockedOrDegraded",
  }[route];
  if (key) target[key] = Number(target[key] || 0) + 1;
  return target;
}

export function summarizeComputeTelemetry(telemetry = {}) {
  const requests = Math.max(0, Number(telemetry.requests || 0));
  const resolvedZeroCost = Math.max(0, Number(telemetry.resolvedZeroCost || 0));
  const resolvedPaid = Math.max(0, Number(telemetry.resolvedPaid || 0));
  const zeroCostResolutionRate = requests > 0 ? Number((resolvedZeroCost / requests).toFixed(4)) : 0;
  return Object.freeze({
    fabricVersion: ZERO_COST_COMPUTE_FABRIC_VERSION,
    requests,
    resolvedZeroCost,
    resolvedPaid,
    zeroCostResolutionRate,
    paidResolutionRate: requests > 0 ? Number((resolvedPaid / requests).toFixed(4)) : 0,
    preventedMeteredFanout: Math.max(0, Number(telemetry.preventedMeteredFanout || 0)),
    evidenceBoundary: "Runtime counters describe routing outcomes only; they do not prove third-party billing, quota permanence, native-device inference, or unlimited capacity.",
  });
}

export const ZERO_COST_COMPUTE_FABRIC_POLICY = Object.freeze({
  version: ZERO_COST_COMPUTE_FABRIC_VERSION,
  logicalWorkerCapacity: LOGICAL_WORKER_CAPACITY,
  maxActiveAgentFanout: MAX_ACTIVE_AGENT_FANOUT,
  deterministicBeforeAI: true,
  cacheBeforeAI: true,
  localDeviceBeforeCloud: true,
  ownDesktopBeforeCloud: true,
  freeTierRequiresAccountHardStopVerification: true,
  recursiveFanoutUnlimited: false,
  paidComputeFirewall: true,
  zeroAndFreeModesAllowMeteredAgentCalls: false,
  crossUserComputeAllowed: false,
  zeroCostResolutionTelemetry: true,
});
