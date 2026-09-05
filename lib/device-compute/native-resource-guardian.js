export const NATIVE_RESOURCE_GUARDIAN_VERSION = "2026-09-05.1";

const MOBILE_PLATFORMS = new Set(["ios", "ipados", "android"]);
const DESKTOP_PLATFORMS = new Set(["macos", "windows", "linux"]);

function text(value) {
  return String(value || "").trim().toLowerCase();
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, Number(value || 0)));
}

export function normalizeNativePlatform(value) {
  const platform = text(value);
  if (["iphone", "iphoneos", "ios"].includes(platform)) return "ios";
  if (["ipad", "ipados"].includes(platform)) return "ipados";
  if (["android"].includes(platform)) return "android";
  if (["mac", "macos", "darwin"].includes(platform)) return "macos";
  if (["win32", "windows"].includes(platform)) return "windows";
  if (["linux"].includes(platform)) return "linux";
  return platform || "web";
}

export function normalizeNativeThermalState(value) {
  const state = text(value);
  if (["nominal", "normal", "cool", "none"].includes(state)) return "nominal";
  if (["fair", "warm", "light"].includes(state)) return "fair";
  if (["serious", "severe", "hot", "moderate"].includes(state)) return "serious";
  if (["critical", "emergency", "shutdown"].includes(state)) return "critical";
  return "unknown";
}

export function normalizeNativeTelemetry(input = {}) {
  const platform = normalizeNativePlatform(input.platform || input.nativePlatform);
  const lifecycleState = ["foreground", "background", "inactive"].includes(text(input.lifecycleState))
    ? text(input.lifecycleState)
    : input.visibility === "hidden" ? "background" : "foreground";
  const batteryLevel = Number.isFinite(Number(input.batteryLevel)) ? clamp(input.batteryLevel, 0, 1) : null;
  const thermalState = normalizeNativeThermalState(input.thermalState);
  const backgroundLease = text(input.backgroundLease || input.systemBackgroundLease || "none");
  const networkType = text(input.networkType || "unknown");

  return Object.freeze({
    bridgeVersion: text(input.bridgeVersion || "unknown"),
    platform,
    mobile: MOBILE_PLATFORMS.has(platform),
    desktop: DESKTOP_PLATFORMS.has(platform),
    lifecycleState,
    foreground: lifecycleState === "foreground",
    thermalState,
    thermalTelemetryAvailable: thermalState !== "unknown",
    lowPowerMode: input.lowPowerMode === true,
    batteryLevel,
    charging: input.charging === true,
    backgroundLease,
    backgroundConstraintsSatisfied: input.backgroundConstraintsSatisfied === true,
    networkType,
    meteredNetwork: input.meteredNetwork === true,
    deviceIdle: input.deviceIdle === true,
    userActive: input.userActive !== false,
  });
}

function platformBackgroundLeaseAllowed(telemetry) {
  if (telemetry.platform === "ios" || telemetry.platform === "ipados") {
    return ["ios_bg_processing", "ios_task_completion", "ios_bg_app_refresh"].includes(telemetry.backgroundLease);
  }
  if (telemetry.platform === "android") {
    return telemetry.backgroundLease === "android_work_manager";
  }
  return telemetry.desktop;
}

function mobilePersonalCeiling(telemetry) {
  if (telemetry.lowPowerMode) return 0;
  if (["serious", "critical"].includes(telemetry.thermalState)) return 0;
  if (telemetry.thermalState === "unknown" || telemetry.thermalState === "fair") return 0.01;
  if (!telemetry.charging && telemetry.batteryLevel !== null && telemetry.batteryLevel < 0.35) return 0.005;
  if (!telemetry.charging && telemetry.batteryLevel !== null && telemetry.batteryLevel < 0.2) return 0;
  return 0.03;
}

export function evaluateNativeResourceAdmission(input = {}) {
  const telemetry = normalizeNativeTelemetry(input.telemetry || input);
  const purpose = input.purpose === "community_compute" ? "community_compute" : "personal_compute";
  const userInitiatedTask = input.userInitiatedTask !== false;
  const explicitConsent = input.explicitConsent === true;
  const consentWithdrawn = input.consentWithdrawn === true;
  const estimatedNetworkBytes = Math.max(0, Number(input.estimatedNetworkBytes || 0));
  const requestedShare = clamp(input.requestedShare ?? 0.05, 0, 0.05);
  const community = purpose === "community_compute";
  const mobile = telemetry.mobile;
  const background = telemetry.lifecycleState !== "foreground";

  if (!explicitConsent || consentWithdrawn) {
    return Object.freeze({
      allowed: false,
      reason: consentWithdrawn ? "consent_withdrawn" : "explicit_consent_required",
      telemetry,
      maxAllowedShare: 0,
      communityExecutionAllowed: false,
    });
  }

  if (community && mobile) {
    return Object.freeze({
      allowed: false,
      reason: "mobile_community_compute_blocked",
      telemetry,
      maxAllowedShare: 0,
      communityExecutionAllowed: false,
    });
  }

  if (community) {
    const desktopCandidate = telemetry.desktop
      && telemetry.charging
      && telemetry.deviceIdle
      && !telemetry.userActive
      && !telemetry.lowPowerMode
      && telemetry.thermalState === "nominal"
      && !telemetry.meteredNetwork;
    return Object.freeze({
      allowed: false,
      reason: desktopCandidate ? "community_runtime_globally_gated" : "desktop_community_candidate_not_eligible",
      telemetry,
      maxAllowedShare: 0,
      desktopCommunityCandidateEligible: desktopCandidate,
      communityExecutionAllowed: false,
    });
  }

  if (!userInitiatedTask) {
    return Object.freeze({
      allowed: false,
      reason: "personal_compute_requires_user_purpose",
      telemetry,
      maxAllowedShare: 0,
      communityExecutionAllowed: false,
    });
  }

  if (telemetry.lowPowerMode) {
    return Object.freeze({ allowed: false, reason: "low_power_mode", telemetry, maxAllowedShare: 0, communityExecutionAllowed: false });
  }
  if (["serious", "critical"].includes(telemetry.thermalState)) {
    return Object.freeze({ allowed: false, reason: "thermal_guard", telemetry, maxAllowedShare: 0, communityExecutionAllowed: false });
  }

  if (background) {
    if (!platformBackgroundLeaseAllowed(telemetry) || !telemetry.backgroundConstraintsSatisfied) {
      return Object.freeze({
        allowed: false,
        reason: "system_managed_background_lease_required",
        telemetry,
        maxAllowedShare: 0,
        communityExecutionAllowed: false,
      });
    }
    if ((telemetry.platform === "ios" || telemetry.platform === "ipados") && telemetry.thermalState !== "nominal") {
      return Object.freeze({ allowed: false, reason: "ios_background_requires_nominal_thermal", telemetry, maxAllowedShare: 0, communityExecutionAllowed: false });
    }
    if (telemetry.meteredNetwork && estimatedNetworkBytes > 128 * 1024) {
      return Object.freeze({ allowed: false, reason: "metered_background_network_budget", telemetry, maxAllowedShare: 0, communityExecutionAllowed: false });
    }
  }

  const platformCeiling = mobile ? mobilePersonalCeiling(telemetry) : 0.05;
  const maxAllowedShare = Math.min(requestedShare, platformCeiling);
  if (maxAllowedShare <= 0) {
    return Object.freeze({ allowed: false, reason: "resource_budget_zero", telemetry, maxAllowedShare: 0, communityExecutionAllowed: false });
  }

  return Object.freeze({
    allowed: true,
    reason: background ? "system_managed_background_personal_compute" : "foreground_personal_compute",
    telemetry,
    maxAllowedShare,
    personalComputeOnly: mobile,
    foregroundPreferred: true,
    userPriorityRequired: true,
    downloadableExecutableWorkloadsAllowed: false,
    bypassSystemPowerManagementAllowed: false,
    communityExecutionAllowed: false,
  });
}

export function publicNativeResourceGuardianPolicy() {
  return Object.freeze({
    version: NATIVE_RESOURCE_GUARDIAN_VERSION,
    mobileCommunityComputeAllowed: false,
    desktopCommunityExecutionLive: false,
    mobilePersonalComputeMaximumShare: 0.03,
    unknownOrWarmMobileThermalMaximumShare: 0.01,
    globalAbsoluteMaximumShare: 0.05,
    lowPowerModeBlocksOptionalCompute: true,
    seriousOrCriticalThermalBlocksOptionalCompute: true,
    foregroundPreferred: true,
    systemManagedBackgroundRequired: true,
    iosBackgroundLeases: ["ios_bg_processing", "ios_task_completion", "ios_bg_app_refresh"],
    androidBackgroundLease: "android_work_manager",
    meteredBackgroundNetworkGuardRequired: true,
    userPurposeRequiredForPersonalCompute: true,
    downloadableExecutableWorkloadsAllowed: false,
    bypassSystemPowerManagementAllowed: false,
    realDeviceVerificationRequiredBeforeProductionClaim: true,
  });
}
