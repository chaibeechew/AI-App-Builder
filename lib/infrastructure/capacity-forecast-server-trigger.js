export const LANERIQ_CAPACITY_FORECAST_VERSION = "2026-09-04.1";

export const CAPACITY_ACTION = Object.freeze({
  STAY_SERVER_INDEPENDENT: "stay_server_independent",
  WATCH_CAPACITY: "watch_capacity",
  PREPARE_FIRST_SERVER: "prepare_first_server",
  REVIEW_FIRST_SERVER_ECONOMICS: "review_first_server_economics",
  PREPARE_SMALL_CLUSTER: "prepare_small_cluster",
  PREPARE_MULTI_NODE: "prepare_multi_node",
  PREPARE_MULTI_REGION: "prepare_multi_region",
});

function finite(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function ratio(value) {
  return Math.min(2, Math.max(0, finite(value, 0)));
}

function signalScore({ utilization, queueWaitRatio, providerQuotaUsedRatio, errorRate, paidUnitCostPressure }) {
  return (
    ratio(utilization) * 0.3
    + ratio(queueWaitRatio) * 0.2
    + ratio(providerQuotaUsedRatio) * 0.2
    + ratio(errorRate / 0.1) * 0.15
    + ratio(paidUnitCostPressure) * 0.15
  );
}

export function forecastCapacity({
  currentMau = 0,
  projectedMau30d = currentMau,
  utilization = 0,
  p95QueueWaitMs = 0,
  targetQueueWaitMs = 30000,
  providerQuotaUsedRatio = 0,
  errorRate = 0,
  paidUnitCostPressure = 0,
  dedicatedServerLowerMau = 20000,
  dedicatedServerUpperMau = 50000,
  smallClusterMau = 50000,
  multiNodeMau = 100000,
  multiRegionMau = 1000000,
} = {}) {
  const mau = Math.max(0, Math.floor(finite(currentMau, 0)));
  const projected = Math.max(mau, Math.floor(finite(projectedMau30d, mau)));
  const queueWaitRatio = finite(p95QueueWaitMs, 0) / Math.max(1, finite(targetQueueWaitMs, 30000));
  const stressScore = signalScore({ utilization, queueWaitRatio, providerQuotaUsedRatio, errorRate, paidUnitCostPressure });
  const sustainedStress = stressScore >= 0.85;
  const severeStress = stressScore >= 1.15;

  let action = CAPACITY_ACTION.STAY_SERVER_INDEPENDENT;
  const reasons = [];

  if (projected >= multiRegionMau) {
    action = CAPACITY_ACTION.PREPARE_MULTI_REGION;
    reasons.push("million_scale_projection");
  } else if (projected >= multiNodeMau) {
    action = CAPACITY_ACTION.PREPARE_MULTI_NODE;
    reasons.push("multi_node_scale_projection");
  } else if (projected >= smallClusterMau) {
    action = CAPACITY_ACTION.PREPARE_SMALL_CLUSTER;
    reasons.push("small_cluster_scale_projection");
  } else if (projected >= dedicatedServerUpperMau || (mau >= dedicatedServerLowerMau && sustainedStress)) {
    action = CAPACITY_ACTION.REVIEW_FIRST_SERVER_ECONOMICS;
    reasons.push(projected >= dedicatedServerUpperMau ? "dedicated_server_upper_mau_reached" : "lower_mau_with_sustained_stress");
  } else if (projected >= dedicatedServerLowerMau || (severeStress && projected >= Math.floor(dedicatedServerLowerMau * 0.75))) {
    action = CAPACITY_ACTION.PREPARE_FIRST_SERVER;
    reasons.push(projected >= dedicatedServerLowerMau ? "dedicated_server_planning_window_entered" : "early_severe_capacity_pressure");
  } else if (projected >= Math.floor(dedicatedServerLowerMau * 0.5) || sustainedStress) {
    action = CAPACITY_ACTION.WATCH_CAPACITY;
    reasons.push(projected >= Math.floor(dedicatedServerLowerMau * 0.5) ? "approaching_planning_window" : "capacity_pressure_detected");
  } else {
    reasons.push("free_or_existing_provider_capacity_adequate");
  }

  return Object.freeze({
    version: LANERIQ_CAPACITY_FORECAST_VERSION,
    currentMau: mau,
    projectedMau30d: projected,
    stressScore,
    sustainedStress,
    action,
    reasons: Object.freeze(reasons),
    firstDedicatedServerPlanningWindow: Object.freeze({ lowerMau: dedicatedServerLowerMau, upperMau: dedicatedServerUpperMau }),
    autoProvisionAllowed: false,
    autoPurchaseHardwareAllowed: false,
    automaticProviderMigrationAllowed: false,
    advisoryOnly: true,
    fixedInfrastructureCostAdded: false,
  });
}

export function publicCapacityForecastPolicy() {
  return Object.freeze({
    version: LANERIQ_CAPACITY_FORECAST_VERSION,
    forecastIsAdvisoryOnly: true,
    firstDedicatedServerPlanningMau: "20000-50000",
    smallClusterPlanningMau: "50000-100000",
    multiNodePlanningMau: ">=100000",
    multiRegionPlanningMau: ">=1000000",
    multiSignalBeforeHardwareDecision: true,
    autoProvisionAllowed: false,
    paidInfrastructureRequired: false,
  });
}
