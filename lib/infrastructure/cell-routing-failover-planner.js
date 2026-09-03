export const LANERIQ_CELL_ROUTING_VERSION = "2026-09-03.2";

export const ROUTE_PLAN_STATE = Object.freeze({
  READY: "ready",
  DEGRADED: "degraded",
  NO_SAFE_ROUTE: "no_safe_route",
});

function finiteNonNegative(value, name) {
  const number = Number(value ?? 0);
  if (!Number.isFinite(number) || number < 0) throw new Error(`LANERIQ_ROUTE_INVALID_${name}`);
  return number;
}

function token(value, name) {
  const normalized = String(value || "").trim().toLowerCase();
  if (!/^[a-z0-9][a-z0-9._:-]{0,95}$/.test(normalized)) throw new Error(`LANERIQ_ROUTE_INVALID_${name}`);
  return normalized;
}

function normalizeCandidate(candidate, index) {
  if (candidate && typeof candidate === "object") {
    for (const key of Object.keys(candidate)) {
      if (/(provider|vendor)/i.test(key)) throw new Error(`LANERIQ_ROUTE_PROVIDER_IDENTITY_FORBIDDEN:${index}`);
    }
  }
  return Object.freeze({
    id: token(candidate?.id, `CANDIDATE_${index}_ID`),
    cellId: token(candidate?.cellId, `CANDIDATE_${index}_CELL_ID`),
    routeClass: token(candidate?.routeClass || "default", `CANDIDATE_${index}_ROUTE_CLASS`),
    healthy: candidate?.healthy !== false,
    availableCapacity: finiteNonNegative(candidate?.availableCapacity ?? 0, `CANDIDATE_${index}_CAPACITY`),
    predictedLatencyMs: finiteNonNegative(candidate?.predictedLatencyMs ?? 0, `CANDIDATE_${index}_LATENCY`),
    incrementalCostUsd: finiteNonNegative(candidate?.incrementalCostUsd ?? 0, `CANDIDATE_${index}_COST`),
  });
}

function score(candidate, sourceCellId) {
  const localPenalty = candidate.cellId === sourceCellId ? 0 : 100000;
  const healthPenalty = candidate.healthy ? 0 : 1000000;
  const costPenalty = candidate.incrementalCostUsd * 10000;
  const capacityBonus = Math.min(1000, candidate.availableCapacity) * 0.1;
  return healthPenalty + localPenalty + costPenalty + candidate.predictedLatencyMs - capacityBonus;
}

export function planCellRoute({
  requestId,
  sourceCellId,
  candidates = [],
  minimumCapacity = 1,
  maxLatencyMs = 3000,
  allowCrossCellFailover = false,
  approvedIncrementalCostUsd = 0,
} = {}) {
  const request = token(requestId, "REQUEST_ID");
  const source = token(sourceCellId, "SOURCE_CELL_ID");
  const capacityFloor = finiteNonNegative(minimumCapacity, "MINIMUM_CAPACITY");
  const latencyCeiling = finiteNonNegative(maxLatencyMs, "MAX_LATENCY_MS");
  const costCeiling = finiteNonNegative(approvedIncrementalCostUsd, "APPROVED_INCREMENTAL_COST_USD");
  const normalized = (Array.isArray(candidates) ? candidates : []).map(normalizeCandidate);

  const eligible = normalized.filter((candidate) => (
    candidate.healthy &&
    candidate.availableCapacity >= capacityFloor &&
    candidate.predictedLatencyMs <= latencyCeiling &&
    candidate.incrementalCostUsd <= costCeiling &&
    (candidate.cellId === source || allowCrossCellFailover)
  ));
  const ranked = eligible.sort((a, b) => score(a, source) - score(b, source) || a.id.localeCompare(b.id));
  const primary = ranked[0] || null;
  const fallbacks = ranked.slice(1, 4);
  const sameCellEligible = ranked.some((candidate) => candidate.cellId === source);
  const crossCellSelected = Boolean(primary && primary.cellId !== source);

  let state = ROUTE_PLAN_STATE.READY;
  const reasons = [];
  if (!primary) {
    state = ROUTE_PLAN_STATE.NO_SAFE_ROUTE;
    reasons.push("no_candidate_satisfies_health_capacity_latency_cost_and_cell_policy");
  } else if (crossCellSelected) {
    state = ROUTE_PLAN_STATE.DEGRADED;
    reasons.push("cross_cell_failover_plan_requires_explicit_execution_approval");
  } else if (!sameCellEligible) {
    state = ROUTE_PLAN_STATE.DEGRADED;
    reasons.push("no_same_cell_candidate_available");
  }

  return Object.freeze({
    version: LANERIQ_CELL_ROUTING_VERSION,
    requestId: request,
    sourceCellId: source,
    state,
    reasons: Object.freeze(reasons),
    primary,
    fallbacks: Object.freeze(fallbacks),
    crossCellSelected,
    crossCellFailoverPlanningAllowed: Boolean(allowCrossCellFailover),
    automaticLiveCutoverAllowed: false,
    providerIdentityExposed: false,
    approvedIncrementalCostUsd: costCeiling,
  });
}

export function assertRoutePlanSafe(plan) {
  if (!plan || plan.state === ROUTE_PLAN_STATE.NO_SAFE_ROUTE || !plan.primary) throw new Error("LANERIQ_ROUTE_NO_SAFE_ROUTE");
  if (plan.crossCellSelected) throw new Error("LANERIQ_ROUTE_CROSS_CELL_EXECUTION_REQUIRES_APPROVAL");
  return plan;
}

export function publicCellRoutingPolicy() {
  return Object.freeze({
    version: LANERIQ_CELL_ROUTING_VERSION,
    sameCellPreferred: true,
    crossCellFailoverNeedsExplicitPlanningPermission: true,
    crossCellExecutionNeedsSeparateApproval: true,
    automaticLiveCutoverAllowed: false,
    providerIdentityExposed: false,
    defaultApprovedIncrementalCostUsd: 0,
    physicalCellsClaimedLive: false,
    fixedInfrastructureRequired: false,
  });
}
