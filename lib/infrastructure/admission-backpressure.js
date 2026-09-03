export const LANERIQ_ADMISSION_BACKPRESSURE_VERSION = "2026-09-03.1";

export const WORKLOAD_PRIORITY = Object.freeze({
  CRITICAL: "critical",
  INTERACTIVE: "interactive",
  NORMAL: "normal",
  BACKGROUND: "background",
  MAINTENANCE: "maintenance",
});

export const ADMISSION_DECISION = Object.freeze({
  ADMIT: "admit",
  DEFER: "defer",
  SHED: "shed",
});

const PRIORITY_SCORE = Object.freeze({
  [WORKLOAD_PRIORITY.CRITICAL]: 5,
  [WORKLOAD_PRIORITY.INTERACTIVE]: 4,
  [WORKLOAD_PRIORITY.NORMAL]: 3,
  [WORKLOAD_PRIORITY.BACKGROUND]: 2,
  [WORKLOAD_PRIORITY.MAINTENANCE]: 1,
});

function ratio(value) {
  const number = Number(value || 0);
  if (!Number.isFinite(number)) return 0;
  return Math.min(1, Math.max(0, number));
}

export function classifyQueuePressure({ depth = 0, capacity = 1, oldestAgeMs = 0, targetAgeMs = 30000 } = {}) {
  const depthRatio = ratio(Number(depth) / Math.max(1, Number(capacity) || 1));
  const ageRatio = ratio(Number(oldestAgeMs) / Math.max(1, Number(targetAgeMs) || 1));
  const pressure = Math.max(depthRatio, ageRatio);
  if (pressure >= 0.95) return Object.freeze({ level: "emergency", pressure });
  if (pressure >= 0.85) return Object.freeze({ level: "critical", pressure });
  if (pressure >= 0.7) return Object.freeze({ level: "high", pressure });
  if (pressure >= 0.5) return Object.freeze({ level: "elevated", pressure });
  return Object.freeze({ level: "normal", pressure });
}

export function decideAdmission({
  priority = WORKLOAD_PRIORITY.NORMAL,
  queue = {},
  operationalMode = "normal",
  tenantThrottled = false,
  paidExternalRouteRequired = false,
  paidRoutingAllowed = true,
} = {}) {
  if (!PRIORITY_SCORE[priority]) throw new Error(`LANERIQ_ADMISSION_PRIORITY_INVALID:${priority}`);
  const pressure = classifyQueuePressure(queue);
  const score = PRIORITY_SCORE[priority];

  if (tenantThrottled && score < PRIORITY_SCORE[WORKLOAD_PRIORITY.CRITICAL]) {
    return Object.freeze({ decision: ADMISSION_DECISION.DEFER, reason: "tenant_throttled", pressure });
  }
  if (paidExternalRouteRequired && !paidRoutingAllowed && score < PRIORITY_SCORE[WORKLOAD_PRIORITY.CRITICAL]) {
    return Object.freeze({ decision: ADMISSION_DECISION.DEFER, reason: "paid_route_budget_guard", pressure });
  }
  if (operationalMode === "survival") {
    if (score >= PRIORITY_SCORE[WORKLOAD_PRIORITY.INTERACTIVE]) {
      return Object.freeze({ decision: ADMISSION_DECISION.ADMIT, reason: "survival_priority", pressure });
    }
    return Object.freeze({ decision: ADMISSION_DECISION.SHED, reason: "survival_nonessential_shed", pressure });
  }
  if (pressure.level === "emergency") {
    if (score >= PRIORITY_SCORE[WORKLOAD_PRIORITY.INTERACTIVE]) {
      return Object.freeze({ decision: ADMISSION_DECISION.ADMIT, reason: "emergency_priority", pressure });
    }
    return Object.freeze({ decision: ADMISSION_DECISION.SHED, reason: "emergency_load_shed", pressure });
  }
  if (pressure.level === "critical" && score <= PRIORITY_SCORE[WORKLOAD_PRIORITY.NORMAL]) {
    return Object.freeze({ decision: ADMISSION_DECISION.DEFER, reason: "critical_backpressure", pressure });
  }
  if (pressure.level === "high" && score <= PRIORITY_SCORE[WORKLOAD_PRIORITY.BACKGROUND]) {
    return Object.freeze({ decision: ADMISSION_DECISION.DEFER, reason: "high_backpressure", pressure });
  }
  return Object.freeze({ decision: ADMISSION_DECISION.ADMIT, reason: "capacity_available", pressure });
}

export function publicAdmissionBackpressurePolicy() {
  return Object.freeze({
    version: LANERIQ_ADMISSION_BACKPRESSURE_VERSION,
    priorities: Object.values(WORKLOAD_PRIORITY),
    decisions: Object.values(ADMISSION_DECISION),
    protectCriticalAndInteractiveFirst: true,
    backgroundSheddingBeforeCritical: true,
    externalQueueRequired: false,
    fixedInfrastructureCostRequired: false,
  });
}
