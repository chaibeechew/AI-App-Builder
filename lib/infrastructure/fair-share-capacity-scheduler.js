import { WORKLOAD_PRIORITY } from "./admission-backpressure.js";

export const LANERIQ_FAIR_SHARE_SCHEDULER_VERSION = "2026-09-04.1";

const CLASS_MULTIPLIER = Object.freeze({
  [WORKLOAD_PRIORITY.CRITICAL]: 3,
  [WORKLOAD_PRIORITY.INTERACTIVE]: 2,
  [WORKLOAD_PRIORITY.NORMAL]: 1,
  [WORKLOAD_PRIORITY.BACKGROUND]: 0.6,
  [WORKLOAD_PRIORITY.MAINTENANCE]: 0.35,
});

function finite(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function normalizeTenant(entry, index, { starvationAgeMs, maxTenantShareRatio }) {
  const tenantId = String(entry?.tenantId || "").trim();
  if (!tenantId) throw new Error(`LANERIQ_FAIR_SHARE_TENANT_ID_REQUIRED:${index}`);
  const workloadClass = entry?.workloadClass || WORKLOAD_PRIORITY.NORMAL;
  if (!CLASS_MULTIPLIER[workloadClass]) {
    throw new Error(`LANERIQ_FAIR_SHARE_CLASS_INVALID:${workloadClass}`);
  }
  const demand = Math.max(0, Math.floor(finite(entry?.demand, 0)));
  const weight = clamp(finite(entry?.weight, 1), 0.1, 100);
  const ageMs = Math.max(0, finite(entry?.oldestAgeMs, 0));
  const ageBoost = clamp(ageMs / Math.max(1, starvationAgeMs), 0, 2) * 0.5;
  const effectiveWeight = weight * CLASS_MULTIPLIER[workloadClass] * (1 + ageBoost);

  return {
    tenantId,
    workloadClass,
    demand,
    weight,
    effectiveWeight,
    oldestAgeMs: ageMs,
    isolated: entry?.isolated === true,
    maxTenantShareRatio,
  };
}

function allocateWeighted({ candidates, capacity, hardCap }) {
  const allocations = new Map(candidates.map((tenant) => [tenant.tenantId, 0]));
  let remaining = Math.max(0, Math.floor(capacity));
  let active = candidates.filter((tenant) => !tenant.isolated && tenant.demand > 0);

  while (remaining > 0 && active.length > 0) {
    const totalWeight = active.reduce((sum, tenant) => sum + tenant.effectiveWeight, 0);
    if (totalWeight <= 0) break;
    let distributed = 0;

    for (const tenant of active) {
      if (remaining <= 0) break;
      const current = allocations.get(tenant.tenantId) || 0;
      const tenantCap = Math.min(tenant.demand, hardCap);
      const room = Math.max(0, tenantCap - current);
      if (room <= 0) continue;
      const weighted = Math.max(1, Math.floor((remaining * tenant.effectiveWeight) / totalWeight));
      const amount = Math.min(room, weighted, remaining);
      allocations.set(tenant.tenantId, current + amount);
      remaining -= amount;
      distributed += amount;
    }

    if (distributed === 0) break;
    active = active.filter((tenant) => {
      const current = allocations.get(tenant.tenantId) || 0;
      return current < Math.min(tenant.demand, hardCap);
    });
  }

  return { allocations, remaining };
}

export function buildFairShareSchedule({
  capacity = 0,
  tenants = [],
  reservedCriticalRatio = 0.2,
  maxTenantShareRatio = 0.5,
  starvationAgeMs = 60000,
} = {}) {
  const totalCapacity = Math.max(0, Math.floor(finite(capacity, 0)));
  const maxShare = clamp(finite(maxTenantShareRatio, 0.5), 0.05, 1);
  const criticalReserveRatio = clamp(finite(reservedCriticalRatio, 0.2), 0, 0.8);
  const normalized = [...tenants]
    .map((entry, index) => normalizeTenant(entry, index, { starvationAgeMs, maxTenantShareRatio: maxShare }))
    .sort((a, b) => a.tenantId.localeCompare(b.tenantId));

  const hardCap = totalCapacity === 0 ? 0 : Math.max(1, Math.floor(totalCapacity * maxShare));
  const critical = normalized.filter((tenant) => tenant.workloadClass === WORKLOAD_PRIORITY.CRITICAL);
  const criticalReserve = Math.min(totalCapacity, Math.floor(totalCapacity * criticalReserveRatio));
  const criticalPass = allocateWeighted({ candidates: critical, capacity: criticalReserve, hardCap });

  const baseAllocations = criticalPass.allocations;
  let remaining = totalCapacity - [...baseAllocations.values()].reduce((sum, value) => sum + value, 0);
  const allPassCandidates = normalized.map((tenant) => ({
    ...tenant,
    demand: Math.max(0, tenant.demand - (baseAllocations.get(tenant.tenantId) || 0)),
  }));
  const allPass = allocateWeighted({ candidates: allPassCandidates, capacity: remaining, hardCap });

  const rows = normalized.map((tenant) => {
    const reserved = baseAllocations.get(tenant.tenantId) || 0;
    const shared = allPass.allocations.get(tenant.tenantId) || 0;
    const allocated = Math.min(tenant.demand, reserved + shared);
    return Object.freeze({
      tenantId: tenant.tenantId,
      workloadClass: tenant.workloadClass,
      demand: tenant.demand,
      allocated,
      deferred: Math.max(0, tenant.demand - allocated),
      isolated: tenant.isolated,
      starvationProtected: tenant.oldestAgeMs >= starvationAgeMs,
      shareRatio: totalCapacity > 0 ? allocated / totalCapacity : 0,
    });
  });

  const allocatedCapacity = rows.reduce((sum, row) => sum + row.allocated, 0);
  return Object.freeze({
    version: LANERIQ_FAIR_SHARE_SCHEDULER_VERSION,
    totalCapacity,
    allocatedCapacity,
    unusedCapacity: Math.max(0, totalCapacity - allocatedCapacity),
    reservedCriticalCapacity: criticalReserve,
    maxTenantShareRatio: maxShare,
    starvationAgeMs,
    allocations: Object.freeze(rows),
    deterministicOrder: "tenant_id_ascending",
    paidQueueRequired: false,
    globalThrottleForSingleTenant: false,
  });
}

export function publicFairShareSchedulerPolicy() {
  return Object.freeze({
    version: LANERIQ_FAIR_SHARE_SCHEDULER_VERSION,
    weightedFairShare: true,
    criticalCapacityReservation: true,
    perTenantShareCap: true,
    starvationAging: true,
    isolatedTenantGetsCapacity: false,
    externalSchedulerRequired: false,
    paidInfrastructureRequired: false,
  });
}
