import { COST_GUARD_STATE, evaluateExternalSpendBudget } from "./resource-ledger.js";

export const LANERIQ_COST_GOVERNOR_VERSION = "2026-09-04.1";

export const ROUTE_CLASS = Object.freeze({
  LOCAL_DEVICE: "local_device",
  EDGE_FREE: "edge_free",
  CLOUD_FREE: "cloud_free",
  CLOUD_PAID: "cloud_paid",
  OWN_INFRA_FUTURE: "own_infra_future",
});

const ROUTE_BASE_SCORE = Object.freeze({
  [ROUTE_CLASS.LOCAL_DEVICE]: 100,
  [ROUTE_CLASS.EDGE_FREE]: 82,
  [ROUTE_CLASS.CLOUD_FREE]: 72,
  [ROUTE_CLASS.CLOUD_PAID]: 35,
  [ROUTE_CLASS.OWN_INFRA_FUTURE]: 20,
});

function finiteNonNegative(value, fallback = 0) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.max(0, number);
}

function ratio(value, fallback = 0) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(1, Math.max(0, number));
}

function normalizeCandidate(candidate, index) {
  const id = String(candidate?.id || "").trim();
  if (!id) throw new Error(`LANERIQ_COST_GOVERNOR_CANDIDATE_ID_REQUIRED:${index}`);
  const routeClass = String(candidate?.routeClass || "").trim();
  if (!ROUTE_BASE_SCORE[routeClass]) {
    throw new Error(`LANERIQ_COST_GOVERNOR_ROUTE_CLASS_INVALID:${id}:${routeClass || "missing"}`);
  }
  return Object.freeze({
    id,
    routeClass,
    available: candidate?.available !== false,
    healthy: candidate?.healthy !== false,
    commercialUseAllowed: candidate?.commercialUseAllowed !== false,
    estimatedCostUsd: finiteNonNegative(candidate?.estimatedCostUsd),
    fixedCostUsd: finiteNonNegative(candidate?.fixedCostUsd),
    freeQuotaRemainingRatio: ratio(candidate?.freeQuotaRemainingRatio, 1),
    latencyMs: finiteNonNegative(candidate?.latencyMs),
    privacyFit: ratio(candidate?.privacyFit, 1),
    taskFit: ratio(candidate?.taskFit, 1),
    thermalFit: ratio(candidate?.thermalFit, 1),
  });
}

function isFreeQuotaClass(routeClass) {
  return routeClass === ROUTE_CLASS.EDGE_FREE || routeClass === ROUTE_CLASS.CLOUD_FREE;
}

function isPaid(candidate) {
  return candidate.routeClass === ROUTE_CLASS.CLOUD_PAID || candidate.estimatedCostUsd > 0 || candidate.fixedCostUsd > 0;
}

function scoreCandidate(candidate) {
  const latencyPenalty = Math.min(25, candidate.latencyMs / 100);
  const costPenalty = Math.min(50, candidate.estimatedCostUsd * 1000 + candidate.fixedCostUsd * 100);
  const quotaBonus = isFreeQuotaClass(candidate.routeClass) ? candidate.freeQuotaRemainingRatio * 18 : 0;
  const thermalBonus = candidate.routeClass === ROUTE_CLASS.LOCAL_DEVICE ? candidate.thermalFit * 12 : 0;
  return Number((
    ROUTE_BASE_SCORE[candidate.routeClass]
    + quotaBonus
    + thermalBonus
    + candidate.taskFit * 18
    + candidate.privacyFit * 12
    - latencyPenalty
    - costPenalty
  ).toFixed(6));
}

export function planCostRoute({
  candidates = [],
  spentUsd = 0,
  softLimitUsd = 0,
  hardLimitUsd = 0,
  allowPaid = false,
  zeroFixedCostMode = true,
  localDeviceEligible = true,
  minimumLocalThermalFit = 0.5,
  ownInfrastructureAvailable = false,
} = {}) {
  const budget = evaluateExternalSpendBudget({ spentUsd, softLimitUsd, hardLimitUsd });
  const minimumThermalFit = ratio(minimumLocalThermalFit, 0.5);
  const normalized = (Array.isArray(candidates) ? candidates : []).map(normalizeCandidate);
  const rejected = [];
  const eligible = [];

  for (const candidate of normalized) {
    let reason = null;
    if (!candidate.available) reason = "unavailable";
    else if (!candidate.healthy) reason = "unhealthy";
    else if (!candidate.commercialUseAllowed) reason = "commercial_use_not_allowed";
    else if (candidate.routeClass === ROUTE_CLASS.LOCAL_DEVICE && !localDeviceEligible) reason = "local_device_not_eligible";
    else if (candidate.routeClass === ROUTE_CLASS.LOCAL_DEVICE && candidate.thermalFit < minimumThermalFit) reason = "local_thermal_budget_insufficient";
    else if (isFreeQuotaClass(candidate.routeClass) && candidate.freeQuotaRemainingRatio <= 0) reason = "free_quota_exhausted";
    else if (candidate.routeClass === ROUTE_CLASS.OWN_INFRA_FUTURE && !ownInfrastructureAvailable) reason = "own_infrastructure_not_available";
    else if (zeroFixedCostMode && candidate.fixedCostUsd > 0) reason = "fixed_cost_forbidden";
    else if (isPaid(candidate) && (!allowPaid || !budget.paidRoutingAllowed)) reason = "paid_route_not_authorized";

    if (reason) rejected.push(Object.freeze({ id: candidate.id, routeClass: candidate.routeClass, reason }));
    else eligible.push(Object.freeze({ ...candidate, score: scoreCandidate(candidate) }));
  }

  eligible.sort((a, b) => b.score - a.score || a.id.localeCompare(b.id));
  const selected = eligible[0] || null;

  return Object.freeze({
    version: LANERIQ_COST_GOVERNOR_VERSION,
    decision: selected ? "route" : "defer",
    selected: selected ? Object.freeze({ id: selected.id, routeClass: selected.routeClass, score: selected.score }) : null,
    reason: selected ? "lowest_safe_policy_compliant_route" : "no_policy_compliant_route",
    budget,
    rejected: Object.freeze(rejected),
    silentPaidEscalation: false,
    zeroFixedCostMode: Boolean(zeroFixedCostMode),
  });
}

export function publicCostGovernorPolicy() {
  return Object.freeze({
    version: LANERIQ_COST_GOVERNOR_VERSION,
    routeClasses: Object.values(ROUTE_CLASS),
    defaultExternalSpendCapUsd: 0,
    localFirst: true,
    freeQuotaAware: true,
    thermalAwareForLocalCompute: true,
    commercialUseEligibilityRequired: true,
    silentPaidEscalationAllowed: false,
    dedicatedInfrastructureAutoPurchaseAllowed: false,
    providerOpaque: true,
    fixedInfrastructureCostRequired: false,
    zeroSpendGuardState: COST_GUARD_STATE.BLOCK_NONESSENTIAL_PAID,
  });
}
