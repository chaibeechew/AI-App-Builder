import {
  WORKLOAD_PRIORITY,
  classifyQueuePressure,
  decideAdmission,
} from "./admission-backpressure.js";
import { buildFairShareSchedule } from "./fair-share-capacity-scheduler.js";

export const LANERIQ_CAPACITY_EVIDENCE_VERSION = "2026-09-04.1";

export const CAPACITY_EVIDENCE_LEVEL = Object.freeze({
  MODEL_ONLY: "model_only",
  SYNTHETIC_CI: "synthetic_ci",
  PREVIEW_LOAD: "preview_load",
  PRODUCTION_LOAD: "production_load",
  PROVIDER_LIVE: "provider_live",
});

const EVIDENCE_RANK = Object.freeze({
  [CAPACITY_EVIDENCE_LEVEL.MODEL_ONLY]: 1,
  [CAPACITY_EVIDENCE_LEVEL.SYNTHETIC_CI]: 2,
  [CAPACITY_EVIDENCE_LEVEL.PREVIEW_LOAD]: 3,
  [CAPACITY_EVIDENCE_LEVEL.PRODUCTION_LOAD]: 4,
  [CAPACITY_EVIDENCE_LEVEL.PROVIDER_LIVE]: 5,
});

function finite(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function positiveInteger(value, fallback) {
  return Math.max(1, Math.floor(finite(value, fallback)));
}

function ratio(value, fallback) {
  return Math.min(1, Math.max(0, finite(value, fallback)));
}

function freezeRows(rows) {
  return Object.freeze(rows.map((row) => Object.freeze(row)));
}

export function capacityClaimAllowed({
  kind = "app",
  evidenceLevel = CAPACITY_EVIDENCE_LEVEL.MODEL_ONLY,
  measuredConcurrentUsers = 0,
  targetConcurrentUsers = 0,
} = {}) {
  const measured = Math.max(0, Math.floor(finite(measuredConcurrentUsers, 0)));
  const target = Math.max(0, Math.floor(finite(targetConcurrentUsers, 0)));
  const requiredLevel = kind === "generation"
    ? CAPACITY_EVIDENCE_LEVEL.PROVIDER_LIVE
    : CAPACITY_EVIDENCE_LEVEL.PRODUCTION_LOAD;
  const levelRank = EVIDENCE_RANK[evidenceLevel] || 0;
  const requiredRank = EVIDENCE_RANK[requiredLevel];

  return Object.freeze({
    allowed: target > 0 && measured >= target && levelRank >= requiredRank,
    kind,
    evidenceLevel,
    requiredLevel,
    measuredConcurrentUsers: measured,
    targetConcurrentUsers: target,
  });
}

export function buildSyntheticCapacityStage({
  concurrentUsers,
  generationShare = 0.1,
  modeledGenerationSlots = 800,
  evidenceLevel = CAPACITY_EVIDENCE_LEVEL.SYNTHETIC_CI,
} = {}) {
  const users = positiveInteger(concurrentUsers, 1);
  const generationRatio = ratio(generationShare, 0.1);
  const slots = positiveInteger(modeledGenerationSlots, 800);
  const generationDemand = Math.max(1, Math.ceil(users * generationRatio));
  const pressure = classifyQueuePressure({
    depth: generationDemand,
    capacity: slots,
    oldestAgeMs: 0,
    targetAgeMs: 30000,
  });

  const decisions = Object.freeze({
    critical: decideAdmission({ priority: WORKLOAD_PRIORITY.CRITICAL, queue: { depth: generationDemand, capacity: slots } }),
    interactive: decideAdmission({ priority: WORKLOAD_PRIORITY.INTERACTIVE, queue: { depth: generationDemand, capacity: slots } }),
    normal: decideAdmission({ priority: WORKLOAD_PRIORITY.NORMAL, queue: { depth: generationDemand, capacity: slots } }),
    background: decideAdmission({ priority: WORKLOAD_PRIORITY.BACKGROUND, queue: { depth: generationDemand, capacity: slots } }),
  });

  const tenantDemand = [
    { tenantId: "critical-a", workloadClass: WORKLOAD_PRIORITY.CRITICAL, ratio: 0.1 },
    { tenantId: "interactive-a", workloadClass: WORKLOAD_PRIORITY.INTERACTIVE, ratio: 0.25 },
    { tenantId: "interactive-b", workloadClass: WORKLOAD_PRIORITY.INTERACTIVE, ratio: 0.2 },
    { tenantId: "normal-a", workloadClass: WORKLOAD_PRIORITY.NORMAL, ratio: 0.2 },
    { tenantId: "normal-b", workloadClass: WORKLOAD_PRIORITY.NORMAL, ratio: 0.15 },
    { tenantId: "background-a", workloadClass: WORKLOAD_PRIORITY.BACKGROUND, ratio: 0.1 },
  ].map((entry) => ({
    tenantId: entry.tenantId,
    workloadClass: entry.workloadClass,
    demand: Math.max(1, Math.ceil(generationDemand * entry.ratio)),
  }));

  const schedulerCapacity = Math.min(slots, generationDemand);
  const fairShare = buildFairShareSchedule({
    capacity: schedulerCapacity,
    reservedCriticalRatio: 0.2,
    maxTenantShareRatio: 0.5,
    starvationAgeMs: 60000,
    tenants: tenantDemand,
  });

  const appClaim = capacityClaimAllowed({
    kind: "app",
    evidenceLevel,
    measuredConcurrentUsers: users,
    targetConcurrentUsers: users,
  });
  const generationClaim = capacityClaimAllowed({
    kind: "generation",
    evidenceLevel,
    measuredConcurrentUsers: generationDemand,
    targetConcurrentUsers: generationDemand,
  });

  return Object.freeze({
    version: LANERIQ_CAPACITY_EVIDENCE_VERSION,
    evidenceLevel,
    concurrentUsers: users,
    syntheticGenerationShare: generationRatio,
    syntheticGenerationDemand: generationDemand,
    modeledGenerationSlots: slots,
    pressure,
    decisions,
    fairShare: Object.freeze({
      totalCapacity: fairShare.totalCapacity,
      allocatedCapacity: fairShare.allocatedCapacity,
      unusedCapacity: fairShare.unusedCapacity,
      allocations: freezeRows(fairShare.allocations),
    }),
    evidenceBoundary: Object.freeze({
      syntheticOnly: true,
      productionTrafficSent: false,
      providerNetworkCalls: 0,
      paidProviderCalls: 0,
      productionMutation: false,
      physicalDeviceVerified: false,
      smsExercised: false,
      emailExercised: false,
      appConcurrentCapacityClaimAllowed: appClaim.allowed,
      generationConcurrentCapacityClaimAllowed: generationClaim.allowed,
    }),
  });
}

export function buildSyntheticCapacityEvidence({
  targets = [1000, 5000, 10000],
  generationShare = 0.1,
  modeledGenerationSlots = 800,
} = {}) {
  const stages = targets.map((target) => buildSyntheticCapacityStage({
    concurrentUsers: target,
    generationShare,
    modeledGenerationSlots,
    evidenceLevel: CAPACITY_EVIDENCE_LEVEL.SYNTHETIC_CI,
  }));

  return Object.freeze({
    version: LANERIQ_CAPACITY_EVIDENCE_VERSION,
    evidenceLevel: CAPACITY_EVIDENCE_LEVEL.SYNTHETIC_CI,
    targets: Object.freeze(stages.map((stage) => stage.concurrentUsers)),
    stages: Object.freeze(stages),
    liveValidationRequiredForSupportClaim: true,
    productionLoadRequiredForAppConcurrencyClaim: true,
    providerLiveRequiredForGenerationConcurrencyClaim: true,
    smsBoundary: "ON_HOLD_NOT_EXERCISED",
    paidInfrastructureRequired: false,
  });
}

export function publicCapacityEvidencePolicy() {
  return Object.freeze({
    version: LANERIQ_CAPACITY_EVIDENCE_VERSION,
    evidenceLevels: Object.values(CAPACITY_EVIDENCE_LEVEL),
    syntheticGateTargets: Object.freeze([1000, 5000, 10000]),
    syntheticEvidenceMayClaimLiveCapacity: false,
    previewEvidenceMayClaimProductionCapacity: false,
    productionLoadRequiredForAppConcurrencyClaim: true,
    providerLiveRequiredForGenerationConcurrencyClaim: true,
    physicalDeviceEvidenceIndependent: true,
    smsOnHoldBoundaryPreserved: true,
    paidInfrastructureRequired: false,
  });
}
