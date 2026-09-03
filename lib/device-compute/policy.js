export const DEVICE_COMPUTE_POLICY_VERSION = "2026-09-03.1";
export const DEVICE_COMPUTE_STORAGE_KEY = "laneriq.device-compute.v1";
export const DEVICE_COMPUTE_EVENT = "laneriq:device-compute-updated";

export const COMPUTE_MODES = Object.freeze({
  battery_saver: Object.freeze({
    id: "battery_saver",
    label: "Battery Saver",
    description: "Keep this device cool and prefer your own Desktop or cloud fallback for heavy work.",
  }),
  gaming: Object.freeze({
    id: "gaming",
    label: "Gaming Mode",
    description: "Balanced local compute designed to feel like a well-optimized mobile game: responsive, warm at most, and dynamically throttled.",
  }),
  performance: Object.freeze({
    id: "performance",
    label: "Performance",
    description: "Use more of this device for short heavy bursts while keeping thermal protection permanently enabled.",
  }),
});

const DEVICE_BUDGETS = Object.freeze({
  mobile: Object.freeze({
    battery_saver: { sustainedCpuShare: 0.22, sustainedGpuShare: 0.24, burstCpuShare: 0.45, burstGpuShare: 0.5, burstSeconds: 15, recoverySeconds: 30 },
    gaming: { sustainedCpuShare: 0.38, sustainedGpuShare: 0.42, burstCpuShare: 0.72, burstGpuShare: 0.8, burstSeconds: 30, recoverySeconds: 20 },
    performance: { sustainedCpuShare: 0.48, sustainedGpuShare: 0.55, burstCpuShare: 0.82, burstGpuShare: 0.9, burstSeconds: 35, recoverySeconds: 25 },
  }),
  tablet: Object.freeze({
    battery_saver: { sustainedCpuShare: 0.25, sustainedGpuShare: 0.28, burstCpuShare: 0.5, burstGpuShare: 0.55, burstSeconds: 20, recoverySeconds: 30 },
    gaming: { sustainedCpuShare: 0.42, sustainedGpuShare: 0.46, burstCpuShare: 0.75, burstGpuShare: 0.82, burstSeconds: 45, recoverySeconds: 20 },
    performance: { sustainedCpuShare: 0.52, sustainedGpuShare: 0.58, burstCpuShare: 0.85, burstGpuShare: 0.92, burstSeconds: 55, recoverySeconds: 25 },
  }),
  laptop: Object.freeze({
    battery_saver: { sustainedCpuShare: 0.32, sustainedGpuShare: 0.34, burstCpuShare: 0.55, burstGpuShare: 0.6, burstSeconds: 45, recoverySeconds: 25 },
    gaming: { sustainedCpuShare: 0.55, sustainedGpuShare: 0.6, burstCpuShare: 0.82, burstGpuShare: 0.88, burstSeconds: 120, recoverySeconds: 30 },
    performance: { sustainedCpuShare: 0.68, sustainedGpuShare: 0.72, burstCpuShare: 0.92, burstGpuShare: 0.96, burstSeconds: 150, recoverySeconds: 35 },
  }),
  desktop: Object.freeze({
    battery_saver: { sustainedCpuShare: 0.4, sustainedGpuShare: 0.42, burstCpuShare: 0.65, burstGpuShare: 0.7, burstSeconds: 90, recoverySeconds: 20 },
    gaming: { sustainedCpuShare: 0.65, sustainedGpuShare: 0.7, burstCpuShare: 0.9, burstGpuShare: 0.94, burstSeconds: 180, recoverySeconds: 25 },
    performance: { sustainedCpuShare: 0.78, sustainedGpuShare: 0.82, burstCpuShare: 0.98, burstGpuShare: 1, burstSeconds: 240, recoverySeconds: 30 },
  }),
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
    decision: null,
    localComputeEnabled: false,
    mode: "gaming",
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
  const decision = ["local", "cloud_only"].includes(value.decision) ? value.decision : null;
  const mode = Object.prototype.hasOwnProperty.call(COMPUTE_MODES, value.mode) ? value.mode : defaults.mode;
  return {
    ...defaults,
    policyVersion: DEVICE_COMPUTE_POLICY_VERSION,
    decision,
    localComputeEnabled: decision === "local" && value.localComputeEnabled !== false,
    mode,
    keepLocalProjectData: value.keepLocalProjectData !== false,
    backgroundComputeEnabled: value.backgroundComputeEnabled === true,
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

export function computeDeviceBudget(input = {}) {
  const settings = sanitizeDeviceComputeSettings(input.settings || {});
  const deviceClass = DEVICE_BUDGETS[input.deviceClass] ? input.deviceClass : "mobile";
  const thermalState = normalizeThermalState(input.thermalState);
  const batteryLevel = Number.isFinite(Number(input.batteryLevel)) ? Math.max(0, Math.min(1, Number(input.batteryLevel))) : null;
  const charging = input.charging === true;
  const visibility = input.visibility === "hidden" ? "hidden" : "visible";
  const cores = Math.max(1, Number(input.hardwareConcurrency || 1));
  let budget = { ...DEVICE_BUDGETS[deviceClass][settings.mode] };
  let route = settings.localComputeEnabled ? "local_device" : "cloud_fallback";
  let reason = settings.localComputeEnabled ? "local_compute_enabled" : "cloud_only_selected";

  if (!settings.thermalGuardianEnabled) throw new Error("THERMAL_GUARDIAN_CANNOT_BE_DISABLED");
  if (settings.crossUserComputeEnabled) throw new Error("CROSS_USER_COMPUTE_NOT_ALLOWED");

  if (!settings.localComputeEnabled) {
    budget = scaleBudget(budget, 0.1);
  } else if (thermalState === "critical") {
    budget = scaleBudget(budget, 0.1);
    route = settings.ownDesktopRemoteComputeEnabled ? "own_desktop" : "cloud_fallback";
    reason = "thermal_critical";
  } else if (thermalState === "serious") {
    budget = scaleBudget(budget, 0.35);
    route = settings.ownDesktopRemoteComputeEnabled ? "own_desktop" : "cloud_fallback";
    reason = "thermal_serious";
  } else if (thermalState === "fair") {
    budget = scaleBudget(budget, 0.72);
    reason = "thermal_fair_throttled";
  }

  if (batteryLevel !== null && batteryLevel < 0.2 && !charging && settings.localComputeEnabled) {
    budget = scaleBudget(budget, 0.55);
    if (deviceClass === "mobile" || deviceClass === "tablet") {
      route = settings.ownDesktopRemoteComputeEnabled ? "own_desktop" : "cloud_fallback";
      reason = "low_battery";
    }
  }

  if (visibility === "hidden" && !settings.backgroundComputeEnabled && settings.localComputeEnabled) {
    budget = scaleBudget(budget, 0.2);
    route = settings.ownDesktopRemoteComputeEnabled ? "own_desktop" : "cloud_fallback";
    reason = "background_compute_disabled";
  }

  const effectiveWorkerLimit = Math.max(1, Math.min(cores, Math.floor(cores * budget.sustainedCpuShare) || 1));
  return Object.freeze({
    deviceClass,
    mode: settings.mode,
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
    ...budget,
  });
}

export function publicDeviceComputePolicy() {
  return Object.freeze({
    policyVersion: DEVICE_COMPUTE_POLICY_VERSION,
    localFirst: true,
    npuFirst: true,
    ownDesktopFallback: true,
    cloudLastResort: true,
    localProjectStorageFirst: true,
    deltaSyncPreferred: true,
    backgroundComputeDefault: false,
    crossUserComputeAllowed: false,
    thermalGuardianRequired: true,
    userFacingCreditsRequired: false,
    modes: Object.values(COMPUTE_MODES),
  });
}
