import { HIGH_ENERGY_WORKLOADS } from "./adaptive-burst.js";

export const DEVICE_COMPUTE_POLICY_VERSION = "2026-09-04.1";
export const DEVICE_COMPUTE_STORAGE_KEY = "laneriq.device-compute.v1";
export const DEVICE_COMPUTE_EVENT = "laneriq:device-compute-updated";

// Kept for backward compatibility with older stored settings and native clients.
// The customer UI no longer exposes compute-target or performance-mode selection.
export const COMPUTE_MODES = Object.freeze({
  battery_saver: Object.freeze({ id: "battery_saver", label: "Battery Saver", description: "Legacy compatibility mode." }),
  gaming: Object.freeze({ id: "gaming", label: "Automatic", description: "LANERIQ automatically schedules safe local compute." }),
  performance: Object.freeze({ id: "performance", label: "Performance", description: "Legacy compatibility mode." }),
});

const DEVICE_BUDGETS = Object.freeze({
  mobile: Object.freeze({ sustainedCpuShare: 0.38, sustainedGpuShare: 0.42, burstCpuShare: 0.72, burstGpuShare: 0.8, burstSeconds: 30, recoverySeconds: 20 }),
  tablet: Object.freeze({ sustainedCpuShare: 0.42, sustainedGpuShare: 0.46, burstCpuShare: 0.75, burstGpuShare: 0.82, burstSeconds: 45, recoverySeconds: 20 }),
  laptop: Object.freeze({ sustainedCpuShare: 0.55, sustainedGpuShare: 0.6, burstCpuShare: 0.82, burstGpuShare: 0.88, burstSeconds: 120, recoverySeconds: 30 }),
  desktop: Object.freeze({ sustainedCpuShare: 0.65, sustainedGpuShare: 0.7, burstCpuShare: 0.9, burstGpuShare: 0.94, burstSeconds: 180, recoverySeconds: 25 }),
});

export function normalizeThermalState(value) {
  const state = String(value || "unknown").trim().toLowerCase();
  if (["nominal", "none", "normal", "cool"].includes(state)) return "nominal";
  if (["fair", "light", "warm"].includes(state)) return "fair";
  if (["moderate", "serious", "severe", "hot"].includes(state)) return "serious";
  if (["critical", "emergency", "shutdown"].includes(state)) return "critical";
  return "unknown";
}

export function classifyDevice(input = {}) {
  const ua = String(input.userAgent || "");
  const cores = Math.max(0, Number(input.hardwareConcurrency || 0));
  const memory = Math.max(0, Number(input.deviceMemory || 0));
  const touch = Math.max(0, Number(input.maxTouchPoints || 0));
  const mobile = /iPhone|Android.+Mobile|Windows Phone|Mobile/i.test(ua);
  const tablet = /iPad|Tablet|Android(?!.*Mobile)/i.test(ua) || (!mobile && touch > 1 && /Macintosh/i.test(ua));
  if (mobile) return "mobile";
  if (tablet) return "tablet";
  if (/MacBook|Laptop/i.test(ua)) return "laptop";
  if (cores && cores <= 8 && memory && memory <= 8) return "laptop";
  return "desktop";
}

export function createDefaultDeviceComputeSettings() {
  return {
    policyVersion: DEVICE_COMPUTE_POLICY_VERSION,
    decision: "local",
    localComputeEnabled: true,
    mode: "gaming",
    preventOverheatingEnabled: true,
    keepLocalProjectData: true,
    backgroundComputeEnabled: false,
    ownDesktopRemoteComputeEnabled: false,
    crossUserComputeEnabled: false,
    thermalGuardianEnabled: true,
    consentAt: null,
    installationId: null,
  };
}

export function sanitizeDeviceComputeSettings(value = {}) {
  const defaults = createDefaultDeviceComputeSettings();
  return {
    ...defaults,
    policyVersion: DEVICE_COMPUTE_POLICY_VERSION,
    decision: "local",
    localComputeEnabled: true,
    mode: "gaming",
    preventOverheatingEnabled: value.preventOverheatingEnabled !== false,
    keepLocalProjectData: value.keepLocalProjectData !== false,
    backgroundComputeEnabled: false,
    ownDesktopRemoteComputeEnabled: value.ownDesktopRemoteComputeEnabled === true,
    crossUserComputeEnabled: false,
    thermalGuardianEnabled: true,
    consentAt: typeof value.consentAt === "string" ? value.consentAt : null,
    installationId: typeof value.installationId === "string" && /^[A-Za-z0-9._:-]{8,160}$/.test(value.installationId) ? value.installationId : null,
  };
}

function scaleBudget(budget, factor) {
  const scale = (value) => Math.max(0.05, Math.min(1, Number((value * factor).toFixed(3))));
  return {
    ...budget,
    sustainedCpuShare: scale(budget.sustainedCpuShare),
    sustainedGpuShare: scale(budget.sustainedGpuShare),
    burstCpuShare: scale(budget.burstCpuShare),
    burstGpuShare: scale(budget.burstGpuShare),
  };
}

function applyUnknownThermalGuard(budget, deviceClass, proactive) {
  const baseFactor = deviceClass === "mobile" ? 0.65 : deviceClass === "tablet" ? 0.7 : deviceClass === "laptop" ? 0.85 : 0.9;
  const factor = proactive ? baseFactor : Math.min(0.95, baseFactor + 0.12);
  const guarded = scaleBudget(budget, factor);
  if (deviceClass === "mobile") {
    guarded.burstSeconds = Math.min(guarded.burstSeconds, proactive ? 20 : 25);
    guarded.recoverySeconds = Math.max(guarded.recoverySeconds, proactive ? 30 : 24);
  } else if (deviceClass === "tablet") {
    guarded.burstSeconds = Math.min(guarded.burstSeconds, proactive ? 30 : 38);
    guarded.recoverySeconds = Math.max(guarded.recoverySeconds, proactive ? 30 : 24);
  }
  return guarded;
}

export function computeDeviceBudget(input = {}) {
  const settings = sanitizeDeviceComputeSettings(input.settings || {});
  const deviceClass = DEVICE_BUDGETS[input.deviceClass] ? input.deviceClass : "mobile";
  const thermalState = normalizeThermalState(input.thermalState);
  const batteryLevel = Number.isFinite(Number(input.batteryLevel)) ? Math.max(0, Math.min(1, Number(input.batteryLevel))) : null;
  const charging = input.charging === true;
  const visibility = input.visibility === "hidden" ? "hidden" : "visible";
  const cores = Math.max(1, Number(input.hardwareConcurrency || 1));
  let budget = { ...DEVICE_BUDGETS[deviceClass] };
  let route = "local_device";
  let reason = "automatic_device_first";

  if (!settings.thermalGuardianEnabled) throw new Error("THERMAL_GUARDIAN_CANNOT_BE_DISABLED");
  if (settings.crossUserComputeEnabled) throw new Error("CROSS_USER_COMPUTE_NOT_ALLOWED");

  if (thermalState === "critical") {
    budget = scaleBudget(budget, 0.1);
    route = settings.ownDesktopRemoteComputeEnabled ? "own_desktop" : "cloud_fallback";
    reason = "thermal_critical";
  } else if (thermalState === "serious") {
    budget = scaleBudget(budget, settings.preventOverheatingEnabled ? 0.28 : 0.35);
    route = settings.ownDesktopRemoteComputeEnabled ? "own_desktop" : "cloud_fallback";
    reason = "thermal_serious";
  } else if (thermalState === "fair") {
    budget = scaleBudget(budget, settings.preventOverheatingEnabled ? 0.62 : 0.78);
    reason = settings.preventOverheatingEnabled ? "prevent_overheating_early_throttle" : "thermal_fair_throttled";
  } else if (thermalState === "unknown") {
    budget = applyUnknownThermalGuard(budget, deviceClass, settings.preventOverheatingEnabled);
    reason = settings.preventOverheatingEnabled ? "prevent_overheating_unknown_thermal" : "thermal_unknown_conservative";
  }

  if (batteryLevel !== null && batteryLevel < 0.2 && !charging) {
    budget = scaleBudget(budget, 0.55);
    if (deviceClass === "mobile" || deviceClass === "tablet") {
      route = settings.ownDesktopRemoteComputeEnabled ? "own_desktop" : "cloud_fallback";
      reason = "low_battery";
    }
  }

  if (visibility === "hidden") {
    budget = scaleBudget(budget, 0.2);
    route = settings.ownDesktopRemoteComputeEnabled ? "own_desktop" : "cloud_fallback";
    reason = "background_compute_disabled";
  }

  const effectiveWorkerLimit = Math.max(1, Math.min(cores, Math.floor(cores * budget.sustainedCpuShare) || 1));
  return Object.freeze({
    deviceClass,
    mode: "automatic",
    thermalState,
    thermalTelemetryAvailable: thermalState !== "unknown",
    route,
    reason,
    effectiveWorkerLimit,
    npuPreferred: true,
    gpuPreferredAfterNpu: true,
    cpuFallbackAllowed: true,
    cloudFallbackAllowed: true,
    ownDevicesOnly: true,
    crossUserComputeAllowed: false,
    thermalGuardianEnabled: true,
    preventOverheatingEnabled: settings.preventOverheatingEnabled,
    userSelectableComputeTarget: false,
    providerSelectionUserVisible: false,
    highEnergyWorkloads: HIGH_ENERGY_WORKLOADS,
    ...budget,
  });
}

export function publicDeviceComputePolicy() {
  return Object.freeze({
    policyVersion: DEVICE_COMPUTE_POLICY_VERSION,
    localFirst: true,
    deviceFirstAutomatic: true,
    npuFirst: true,
    gpuSecond: true,
    cpuFallback: true,
    ownDesktopFallback: true,
    cloudLastResort: true,
    localProjectStorageFirst: true,
    deltaSyncPreferred: true,
    backgroundComputeDefault: false,
    crossUserComputeAllowed: false,
    thermalGuardianRequired: true,
    preventOverheatingDefault: true,
    onlyUserSelectableComputeControl: "prevent_overheating",
    userSelectableComputeTarget: false,
    userSelectablePerformanceMode: false,
    providerSelectionUserVisible: false,
    highEnergyWorkloads: HIGH_ENERGY_WORKLOADS,
    onlyImageAndVideoUseHighEnergyBurst: true,
    fullMobileBudgetRequiresRealThermalTelemetry: true,
    userFacingCreditsRequired: false,
    modes: Object.values(COMPUTE_MODES),
  });
}
