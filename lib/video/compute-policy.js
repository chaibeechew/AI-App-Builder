export const VIDEO_COMPUTE_POLICIES = {
  mobile: {
    label: "Mobile Safe",
    defaultClipSeconds: 8,
    maxClipSeconds: 12,
    maxProjectSeconds: 60,
    deviceComputeTarget: 15,
    serverComputeTarget: 85,
    maxPreviewHeight: 720,
  },
  desktop: {
    label: "Desktop Balanced",
    defaultClipSeconds: 12,
    maxClipSeconds: 20,
    maxProjectSeconds: 120,
    deviceComputeTarget: 35,
    serverComputeTarget: 65,
    maxPreviewHeight: 1080,
  },
  high_performance_desktop: {
    label: "Desktop Pro",
    defaultClipSeconds: 15,
    maxClipSeconds: 20,
    maxProjectSeconds: 120,
    deviceComputeTarget: 45,
    serverComputeTarget: 55,
    maxPreviewHeight: 1080,
  },
};

export function normalizeDeviceClass(value) {
  return VIDEO_COMPUTE_POLICIES[value] ? value : "mobile";
}

export function getVideoComputePolicy(deviceClass = "mobile", signals = {}) {
  const normalized = normalizeDeviceClass(deviceClass);
  const base = VIDEO_COMPUTE_POLICIES[normalized];
  let device = base.deviceComputeTarget;

  if (signals.lowPowerMode || Number(signals.batteryLevel) < 0.2 || signals.thermalPressure === "high") device = Math.min(device, 8);
  if (signals.networkQuality === "poor" && normalized !== "mobile") device = Math.min(50, device + 8);
  if (signals.memoryPressure === "high") device = Math.min(device, 12);

  const server = 100 - device;
  return {
    ...base,
    deviceClass: normalized,
    deviceComputeTarget: device,
    serverComputeTarget: server,
    customerVisible: false,
    finalRenderLocation: "server",
    heavyTasks: ["generation", "upscale", "denoise", "complex-effects", "final-encode", "final-compile"],
    localTasks: ["preview", "timeline", "thumbnail", "trim-preview", "subtitle-layout", "volume-preview"],
  };
}

export function inferClientDeviceClass({ coarsePointer = false, width = 390, cores = 4, memoryGb = 4 } = {}) {
  if (coarsePointer || width < 900) return "mobile";
  if (cores >= 10 && memoryGb >= 12) return "high_performance_desktop";
  return "desktop";
}
