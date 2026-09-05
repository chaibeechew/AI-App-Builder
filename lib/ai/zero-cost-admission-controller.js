import { getSoolenCostMode } from "../soolen/cost-policy.js";
import { connectivityCapabilities, normalizeConnectivityState } from "../offline/billion-scale-free-ai.js";

export const ZERO_COST_ADMISSION_VERSION = "2026-09-05.2";

const ZERO_MODES = new Set(["zero", "free"]);
const REMOTE_ROUTES = new Set(["FREE_PROVIDER", "SPONSORED_COMPUTE", "BYO_COMPUTE", "PAID_PROVIDER"]);

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
  connectivityState = "online_fast",
  reuseHit = false,
  deterministicHit = false,
  localCacheHit = false,
  localEngineAvailable = true,
  ownDeviceMeshAvailable = false,
  freeProviderAvailable = false,
  freeProviderHardStopVerified = false,
  sponsoredComputeAvailable = false,
  sponsoredHardStopVerified = false,
  byoComputeAvailable = false,
  byoUserApproved = false,
  paidProviderAvailable = false,
  paidFallbackAllowed = false,
  interactive = true,
  queueAllowed = false,
  promptChars = 0,
  attachmentCount = 0,
  requestedAgents = 1,
} = {}) {
  const cost = mode(costMode);
  const connectivity = connectivityCapabilities(normalizeConnectivityState(connectivityState));
  const demand = estimateAdmissionDemand({ promptChars, attachmentCount, requestedAgents });
  const base = { demand, connectivityState: connectivity.state, crossUserComputeAllowed: false };

  if (deterministicHit) {
    return Object.freeze({ ...base, admitted: true, route: "DETERMINISTIC", costRisk: 0, reason: "deterministic_hit", paidBlocked: true });
  }
  if (reuseHit) {
    return Object.freeze({ ...base, admitted: true, route: "REUSE", costRisk: 0, reason: "scoped_reuse_hit", paidBlocked: true });
  }
  if (localCacheHit) {
    return Object.freeze({ ...base, admitted: true, route: "LOCAL_CACHE", costRisk: 0, reason: "local_cache_hit", paidBlocked: true });
  }
  if (localEngineAvailable) {
    return Object.freeze({ ...base, admitted: true, route: "LOCAL_ENGINE", costRisk: 0, reason: "local_engine_available", paidBlocked: ZERO_MODES.has(cost) });
  }
  if (ownDeviceMeshAvailable && connectivity.localNetworkAvailable) {
    return Object.freeze({ ...base, admitted: true, route: "OWN_DEVICE_MESH", costRisk: 0, reason: "same_user_device_available", paidBlocked: ZERO_MODES.has(cost) });
  }
  if (connectivity.internetAvailable && cost === "free" && freeProviderAvailable && freeProviderHardStopVerified) {
    return Object.freeze({ ...base, admitted: true, route: "FREE_PROVIDER", costRisk: 0, reason: "verified_free_provider_hard_stop", paidBlocked: true });
  }
  if (connectivity.internetAvailable && cost === "free" && sponsoredComputeAvailable && sponsoredHardStopVerified) {
    return Object.freeze({ ...base, admitted: true, route: "SPONSORED_COMPUTE", costRisk: 0, reason: "verified_sponsored_capacity", paidBlocked: true });
  }
  if (connectivity.internetAvailable && cost !== "zero" && byoComputeAvailable && byoUserApproved) {
    return Object.freeze({ ...base, admitted: true, route: "BYO_COMPUTE", costRisk: 0, reason: "user_approved_byo_compute", paidBlocked: ZERO_MODES.has(cost), userProviderCostMayApply: true });
  }
  if (!interactive && queueAllowed && ZERO_MODES.has(cost)) {
    return Object.freeze({ ...base, admitted: true, route: "QUEUE", costRisk: 0, reason: connectivity.internetAvailable ? "defer_until_zero_cost_capacity" : "offline_store_and_forward", paidBlocked: true });
  }
  if (connectivity.internetAvailable && (cost === "balanced" || cost === "paid") && paidProviderAvailable && paidFallbackAllowed) {
    return Object.freeze({ ...base, admitted: true, route: "PAID_PROVIDER", costRisk: 1, reason: "explicit_paid_policy", paidBlocked: false });
  }

  const reason = !connectivity.internetAvailable
    ? "offline_no_authorized_local_capacity"
    : cost === "free" && freeProviderAvailable && !freeProviderHardStopVerified
      ? "free_provider_hard_stop_not_verified"
      : cost === "free" && sponsoredComputeAvailable && !sponsoredHardStopVerified
        ? "sponsored_compute_hard_stop_not_verified"
        : ZERO_MODES.has(cost)
          ? "no_authorized_zero_cost_capacity"
          : "no_authorized_capacity";
  return Object.freeze({ ...base, admitted: false, route: "BLOCK", costRisk: 0, reason, paidBlocked: ZERO_MODES.has(cost) });
}

export function assertAdmissionSafe(decision, { costMode } = {}) {
  const cost = mode(costMode);
  if (!decision || typeof decision !== "object") throw new Error("LANERIQ_ADMISSION_DECISION_REQUIRED");
  if (ZERO_MODES.has(cost) && decision.route === "PAID_PROVIDER") throw new Error("LANERIQ_ZERO_COST_ADMISSION_PAID_ROUTE_FORBIDDEN");
  if (ZERO_MODES.has(cost) && Number(decision.costRisk || 0) > 0) throw new Error("LANERIQ_ZERO_COST_ADMISSION_COST_RISK_FORBIDDEN");
  if (decision.crossUserComputeAllowed !== false) throw new Error("LANERIQ_ADMISSION_CROSS_USER_COMPUTE_FORBIDDEN");
  if (cost === "free" && decision.route === "FREE_PROVIDER" && decision.reason !== "verified_free_provider_hard_stop") {
    throw new Error("LANERIQ_FREE_PROVIDER_HARD_STOP_REQUIRED");
  }
  if (cost === "free" && decision.route === "SPONSORED_COMPUTE" && decision.reason !== "verified_sponsored_capacity") {
    throw new Error("LANERIQ_SPONSORED_COMPUTE_HARD_STOP_REQUIRED");
  }
  const connectivity = connectivityCapabilities(decision.connectivityState);
  if (!connectivity.internetAvailable && REMOTE_ROUTES.has(decision.route)) throw new Error("LANERIQ_REMOTE_ROUTE_REQUIRES_INTERNET");
  return true;
}

export const ZERO_COST_ADMISSION_POLICY = Object.freeze({
  version: ZERO_COST_ADMISSION_VERSION,
  zeroModePaidRouteAllowed: false,
  freeModePaidRouteAllowed: false,
  freeProviderRequiresVerifiedHardStop: true,
  sponsoredComputeRequiresVerifiedHardStop: true,
  byoComputeRequiresUserApproval: true,
  reuseBeforeCompute: true,
  deterministicBeforeCompute: true,
  localCacheBeforeCompute: true,
  localBeforeRemote: true,
  ownDeviceMeshBeforeRemote: true,
  offlineRemoteRoutesAllowed: false,
  queueBeforeSpendInZeroModes: true,
  paidRequiresExplicitPolicy: true,
  logicalWorkersDoNotCreatePhysicalCapacity: true,
  crossUserComputeAllowed: false,
});
