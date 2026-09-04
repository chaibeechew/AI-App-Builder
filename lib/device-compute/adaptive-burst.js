export const ADAPTIVE_BURST_VERSION = "2026-09-04.1";

export const HIGH_ENERGY_WORKLOADS = Object.freeze([
  "image_generation",
  "video_generation",
]);

const HIGH_ENERGY_ALIASES = new Map([
  ["image", "image_generation"],
  ["create_image", "image_generation"],
  ["image_create", "image_generation"],
  ["image_generation", "image_generation"],
  ["video", "video_generation"],
  ["create_video", "video_generation"],
  ["video_create", "video_generation"],
  ["video_generation", "video_generation"],
  ["video_render", "video_generation"],
]);

const DEVICE_WINDOWS = Object.freeze({
  mobile: Object.freeze({ burstSeconds: 20, cooldownSeconds: 32 }),
  tablet: Object.freeze({ burstSeconds: 30, cooldownSeconds: 32 }),
  laptop: Object.freeze({ burstSeconds: 75, cooldownSeconds: 35 }),
  desktop: Object.freeze({ burstSeconds: 120, cooldownSeconds: 30 }),
});

function clamp(value, min, max, fallback = min) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(max, Math.max(min, number));
}

export function normalizeHighEnergyWorkload(value) {
  const normalized = String(value || "").trim().toLowerCase();
  return HIGH_ENERGY_ALIASES.get(normalized) || normalized || "standard";
}

export function isHighEnergyWorkload(value) {
  return HIGH_ENERGY_WORKLOADS.includes(normalizeHighEnergyWorkload(value));
}

function normalizedThermal(value) {
  const state = String(value || "unknown").trim().toLowerCase();
  if (["nominal", "none", "normal", "cool"].includes(state)) return "nominal";
  if (["fair", "light", "warm"].includes(state)) return "fair";
  if (["moderate", "serious", "severe", "hot"].includes(state)) return "serious";
  if (["critical", "emergency", "shutdown"].includes(state)) return "critical";
  return "unknown";
}

export function createAdaptiveBurstPlan({
  workloadKind = "standard",
  deviceClass = "mobile",
  thermalState = "unknown",
  preventOverheatingEnabled = true,
  baselineCpuShare = 0.35,
  baselineGpuShare = 0.4,
} = {}) {
  const workload = normalizeHighEnergyWorkload(workloadKind);
  const highEnergy = isHighEnergyWorkload(workload);
  const thermal = normalizedThermal(thermalState);
  const window = DEVICE_WINDOWS[deviceClass] || DEVICE_WINDOWS.mobile;
  const baselineCpu = clamp(baselineCpuShare, 0.05, 1, 0.35);
  const baselineGpu = clamp(baselineGpuShare, 0.05, 1, 0.4);

  let multiplier = highEnergy ? 1.5 : 1;
  let phase = highEnergy ? "burst" : "normal";
  let reason = highEnergy ? "high_energy_image_or_video" : "standard_workload_no_burst";

  if (!highEnergy) {
    multiplier = 1;
  } else if (thermal === "critical") {
    multiplier = 0.25;
    phase = "cooldown";
    reason = "critical_heat_forces_cooldown";
  } else if (thermal === "serious") {
    multiplier = 0.5;
    phase = "cooldown";
    reason = "serious_heat_forces_cooldown";
  } else if (thermal === "fair") {
    multiplier = preventOverheatingEnabled ? 0.85 : 1;
    phase = preventOverheatingEnabled ? "cooldown" : "normal";
    reason = preventOverheatingEnabled ? "warm_device_early_cooldown" : "warm_device_standard_guard_only";
  } else if (thermal === "unknown" && preventOverheatingEnabled) {
    multiplier = 1.15;
    reason = "unknown_thermal_conservative_burst";
  }

  const burstSeconds = highEnergy
    ? (preventOverheatingEnabled ? window.burstSeconds : Math.round(window.burstSeconds * 1.5))
    : 0;
  const cooldownSeconds = highEnergy
    ? (preventOverheatingEnabled ? window.cooldownSeconds : Math.max(15, Math.round(window.cooldownSeconds * 0.6)))
    : 0;

  return Object.freeze({
    version: ADAPTIVE_BURST_VERSION,
    workloadKind: workload,
    highEnergy,
    phase,
    reason,
    baselinePowerPercent: 100,
    requestedPowerPercent: highEnergy ? 150 : 100,
    effectivePowerPercent: Math.round(multiplier * 100),
    multiplier,
    baselineCpuShare: baselineCpu,
    baselineGpuShare: baselineGpu,
    cpuCeilingShare: clamp(baselineCpu * multiplier, 0.05, 1, baselineCpu),
    gpuCeilingShare: clamp(baselineGpu * multiplier, 0.05, 1, baselineGpu),
    burstSeconds,
    cooldownSeconds,
    cooldownRequired: highEnergy,
    preventOverheatingEnabled: preventOverheatingEnabled !== false,
    thermalState: thermal,
    hardwareUtilizationMayExceed100Percent: false,
    providerFallbackAfterLocalAttempt: true,
    eligibleWorkloads: HIGH_ENERGY_WORKLOADS,
  });
}

export function publicAdaptiveBurstPolicy() {
  return Object.freeze({
    version: ADAPTIVE_BURST_VERSION,
    deviceFirst: true,
    onlyImageAndVideoMayRequestHighEnergyBurst: true,
    highEnergyWorkloads: HIGH_ENERGY_WORKLOADS,
    requestedBurstRelativeToBaselinePercent: 150,
    hardwareUtilizationMayExceed100Percent: false,
    automaticCooldownRequired: true,
    providerFallbackAfterLocalAttempt: true,
    providerSelectionUserVisible: false,
    userSelectableControl: "prevent_overheating",
  });
}
