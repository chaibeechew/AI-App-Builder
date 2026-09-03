export const LANERIQ_TENANT_RESOURCE_FIREWALL_VERSION = "2026-09-03.1";

export const TENANT_RESOURCE_STATE = Object.freeze({
  HEALTHY: "healthy",
  WATCH: "watch",
  THROTTLED: "throttled",
  ISOLATE: "isolate",
});

function finite(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function utilization(used, limit) {
  const safeLimit = Math.max(1, finite(limit, 1));
  return Math.max(0, finite(used, 0)) / safeLimit;
}

export function assessTenantResourceUsage({
  requests = 0,
  requestLimit = 1000,
  concurrency = 0,
  concurrencyLimit = 20,
  aiCostUsd = 0,
  aiCostLimitUsd = 1,
  storageBytes = 0,
  storageLimitBytes = 100000000,
  queueDepth = 0,
  queueDepthLimit = 100,
  errorRate = 0,
} = {}) {
  const ratios = Object.freeze({
    requests: utilization(requests, requestLimit),
    concurrency: utilization(concurrency, concurrencyLimit),
    aiCost: utilization(aiCostUsd, aiCostLimitUsd),
    storage: utilization(storageBytes, storageLimitBytes),
    queueDepth: utilization(queueDepth, queueDepthLimit),
    errorRate: Math.max(0, finite(errorRate, 0)),
  });

  const maxRatio = Math.max(ratios.requests, ratios.concurrency, ratios.aiCost, ratios.storage, ratios.queueDepth);
  let state = TENANT_RESOURCE_STATE.HEALTHY;
  if (maxRatio >= 1.5 || ratios.errorRate >= 0.5) state = TENANT_RESOURCE_STATE.ISOLATE;
  else if (maxRatio >= 1 || ratios.errorRate >= 0.25) state = TENANT_RESOURCE_STATE.THROTTLED;
  else if (maxRatio >= 0.8 || ratios.errorRate >= 0.1) state = TENANT_RESOURCE_STATE.WATCH;

  return Object.freeze({
    state,
    maxRatio,
    ratios,
    noisyNeighbor: state === TENANT_RESOURCE_STATE.THROTTLED || state === TENANT_RESOURCE_STATE.ISOLATE,
  });
}

export function createTenantResourceDecision({ tenantId, usage, cellId = null } = {}) {
  const id = String(tenantId || "").trim();
  if (!id) throw new Error("LANERIQ_TENANT_FIREWALL_TENANT_ID_REQUIRED");
  const assessment = assessTenantResourceUsage(usage || {});
  const action = assessment.state === TENANT_RESOURCE_STATE.ISOLATE
    ? "isolate_tenant_workload"
    : assessment.state === TENANT_RESOURCE_STATE.THROTTLED
      ? "throttle_tenant_only"
      : assessment.state === TENANT_RESOURCE_STATE.WATCH
        ? "observe_and_limit_bursts"
        : "allow";
  return Object.freeze({
    tenantId: id,
    cellId: cellId ? String(cellId) : null,
    ...assessment,
    action,
    affectsOtherTenants: false,
  });
}

export function publicTenantResourceFirewallPolicy() {
  return Object.freeze({
    version: LANERIQ_TENANT_RESOURCE_FIREWALL_VERSION,
    states: Object.values(TENANT_RESOURCE_STATE),
    throttleScope: "tenant_only",
    noisyNeighborIsolationSupported: true,
    globalThrottleForSingleTenantSpike: false,
    paidInfrastructureRequired: false,
  });
}
