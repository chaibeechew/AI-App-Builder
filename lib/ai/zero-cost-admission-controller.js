import { getSoolenCostMode } from "../soolen/cost-policy.js";

export const ZERO_COST_ADMISSION_VERSION = "2026-09-05.1";

const ZERO_MODES = new Set(["zero", "free"]);

function mode(value) {
  const normalized = String(value || getSoolenCostMode()).trim().toLowerCase();
  return ["zero", "free", "balanced", "paid"].includes(normalized) ? normalized : "zero";
}

function boundedInt(value, min, max, fallback = 0) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.max(min, Math.min(max, Math.floor(number)));
}

export function estimateAdmissionDemand({ promptChars = 0, attachmentCount = 0, requestedAgents = 1 } = {}) {
  const chars = boundedInt(promptChars, 0, 2_000_000, 0);
  const attachments = boundedInt(attachmentCount, 0, 100, 0);
  const agents = boundedInt(requestedAgents, 1, 100, 1);
  const estimatedTokens = Math.ceil(chars / 4);
  const weight = estimatedTokens + (attachments * 2_000) + ((agents - 1) * 4_000);
  const className = weight <= 8_000 ? "small" : weight <= 32_000 ? "medium" : weight <= 96_000 ? "large" : "very_large";
  return Object.freeze({ estimatedTokens, attachmentCount: attachments, requestedAgents: agents, weight, className });
}

export function decideZeroCostAdmission({
  costMode,
  reuseHit = false,
  deterministicHit = false,
  localEngineAvailable = true,
  freeProviderAvailable = false,
  freeProviderHardStopVerified = false,
  paidProviderAvailable = false,
  paidFallbackAllowed = false,
  interactive = true,
  queueAllowed = false,
  promptChars = 0,
  attachmentCount = 0,
  requestedAgents = 1,
} = {}) {
  const cost = mode(costMode);
  const demand = estimateAdmissionDemand({ promptChars, attachmentCount, requestedAgents });

  if (deterministicHit) {
    return Object.freeze({ admitted: true, route: "DETERMINISTIC", costRisk: 0, reason: "deterministic_hit", demand, paidBlocked: true });
  }
  if (reuseHit) {
    return Object.freeze({ admitted: true, route: "REUSE", costRisk: 0, reason: "scoped_reuse_hit", demand, paidBlocked: true });
  }
  if (localEngineAvailable) {
    return Object.freeze({ admitted: true, route: "LOCAL_ENGINE", costRisk: 0, reason: "local_engine_available", demand, paidBlocked: ZERO_MODES.has(cost) });
  }
  if (cost === "free" && freeProviderAvailable && freeProviderHardStopVerified) {
    return Object.freeze({ admitted: true, route: "FREE_PROVIDER", costRisk: 0, reason: "verified_free_provider_hard_stop", demand, paidBlocked: true });
  }
  if (!interactive && queueAllowed && ZERO_MODES.has(cost)) {
    return Object.freeze({ admitted: true, route: "QUEUE", costRisk: 0, reason: "defer_until_zero_cost_capacity", demand, paidBlocked: true });
  }
  if ((cost === "balanced" || cost === "paid") && paidProviderAvailable && paidFallbackAllowed) {
    return Object.freeze({ admitted: true, route: "PAID_PROVIDER", costRisk: 1, reason: "explicit_paid_policy", demand, paidBlocked: false });
  }

  const reason = cost === "free" && freeProviderAvailable && !freeProviderHardStopVerified
    ? "free_provider_hard_stop_not_verified"
    : ZERO_MODES.has(cost)
      ? "no_authorized_zero_cost_capacity"
      : "no_authorized_capacity";
  return Object.freeze({ admitted: false, route: "BLOCK", costRisk: 0, reason, demand, paidBlocked: ZERO_MODES.has(cost) });
}

export function assertAdmissionSafe(decision, { costMode } = {}) {
  const cost = mode(costMode);
  if (!decision || typeof decision !== "object") throw new Error("LANERIQ_ADMISSION_DECISION_REQUIRED");
  if (ZERO_MODES.has(cost) && decision.route === "PAID_PROVIDER") throw new Error("LANERIQ_ZERO_COST_ADMISSION_PAID_ROUTE_FORBIDDEN");
  if (ZERO_MODES.has(cost) && Number(decision.costRisk || 0) > 0) throw new Error("LANERIQ_ZERO_COST_ADMISSION_COST_RISK_FORBIDDEN");
  if (cost === "free" && decision.route === "FREE_PROVIDER" && decision.reason !== "verified_free_provider_hard_stop") {
    throw new Error("LANERIQ_FREE_PROVIDER_HARD_STOP_REQUIRED");
  }
  return true;
}

export const ZERO_COST_ADMISSION_POLICY = Object.freeze({
  version: ZERO_COST_ADMISSION_VERSION,
  zeroModePaidRouteAllowed: false,
  freeModePaidRouteAllowed: false,
  freeProviderRequiresVerifiedHardStop: true,
  reuseBeforeCompute: true,
  deterministicBeforeCompute: true,
  localBeforeRemote: true,
  queueBeforeSpendInZeroModes: true,
  paidRequiresExplicitPolicy: true,
  logicalWorkersDoNotCreatePhysicalCapacity: true,
});
