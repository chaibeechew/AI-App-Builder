import assert from "node:assert/strict";
import fs from "node:fs";

import {
  NATIVE_RESOURCE_GUARDIAN_VERSION,
  applyNativeAdmissionToBudget,
  evaluateNativeResourceAdmission,
  normalizeNativeTelemetry,
  publicNativeResourceGuardianPolicy,
} from "../lib/device-compute/native-resource-guardian.js";

const manager = fs.readFileSync("app/components/DeviceComputeManager.js", "utf8");
const settingsPage = fs.readFileSync("app/account/device-compute/page.js", "utf8");
const policyRoute = fs.readFileSync("app/api/device-compute/policy/route.js", "utf8");
const iosGuardian = fs.readFileSync("native/ios/MotherAIResourceGuardian.swift", "utf8");
const androidGuardian = fs.readFileSync("native/android/MotherAIResourceGuardian.kt", "utf8");

assert.match(NATIVE_RESOURCE_GUARDIAN_VERSION, /^2026-09-05\./);

const iosForeground = evaluateNativeResourceAdmission({
  purpose: "personal_compute",
  explicitConsent: true,
  userInitiatedTask: true,
  requestedShare: 0.05,
  telemetry: {
    platform: "ios",
    lifecycleState: "foreground",
    thermalState: "nominal",
    lowPowerMode: false,
    batteryLevel: 0.8,
    charging: true,
  },
});
assert.equal(iosForeground.allowed, true);
assert.equal(iosForeground.maxAllowedShare, 0.03, "Native mobile Personal Compute must remain capped below the global 5% ceiling.");
assert.equal(iosForeground.personalComputeOnly, true);

const iosLowPower = evaluateNativeResourceAdmission({
  purpose: "personal_compute",
  explicitConsent: true,
  telemetry: { platform: "ios", lifecycleState: "foreground", thermalState: "nominal", lowPowerMode: true, charging: true },
});
assert.equal(iosLowPower.allowed, false);
assert.equal(iosLowPower.reason, "low_power_mode");

const iosNoLease = evaluateNativeResourceAdmission({
  purpose: "personal_compute",
  explicitConsent: true,
  telemetry: {
    platform: "ios",
    lifecycleState: "background",
    thermalState: "nominal",
    charging: true,
    backgroundLease: "none",
    backgroundConstraintsSatisfied: false,
  },
});
assert.equal(iosNoLease.allowed, false);
assert.equal(iosNoLease.reason, "system_managed_background_lease_required");

const iosManagedBackground = evaluateNativeResourceAdmission({
  purpose: "personal_compute",
  explicitConsent: true,
  requestedShare: 0.03,
  telemetry: {
    platform: "ios",
    lifecycleState: "background",
    thermalState: "nominal",
    charging: true,
    backgroundLease: "ios_bg_processing",
    backgroundConstraintsSatisfied: true,
    meteredNetwork: false,
  },
});
assert.equal(iosManagedBackground.allowed, true);
assert.equal(iosManagedBackground.reason, "system_managed_background_personal_compute");

const iosWarmBackground = evaluateNativeResourceAdmission({
  purpose: "personal_compute",
  explicitConsent: true,
  telemetry: {
    platform: "ios",
    lifecycleState: "background",
    thermalState: "fair",
    charging: true,
    backgroundLease: "ios_bg_processing",
    backgroundConstraintsSatisfied: true,
  },
});
assert.equal(iosWarmBackground.allowed, false);
assert.equal(iosWarmBackground.reason, "ios_background_requires_nominal_thermal");

const androidManagedBackground = evaluateNativeResourceAdmission({
  purpose: "personal_compute",
  explicitConsent: true,
  requestedShare: 0.03,
  telemetry: {
    platform: "android",
    lifecycleState: "background",
    thermalState: "nominal",
    charging: true,
    backgroundLease: "android_work_manager",
    backgroundConstraintsSatisfied: true,
    meteredNetwork: false,
  },
});
assert.equal(androidManagedBackground.allowed, true);
assert.equal(androidManagedBackground.maxAllowedShare, 0.03);

const androidMeteredHeavyBackground = evaluateNativeResourceAdmission({
  purpose: "personal_compute",
  explicitConsent: true,
  estimatedNetworkBytes: 512 * 1024,
  telemetry: {
    platform: "android",
    lifecycleState: "background",
    thermalState: "nominal",
    charging: true,
    backgroundLease: "android_work_manager",
    backgroundConstraintsSatisfied: true,
    meteredNetwork: true,
  },
});
assert.equal(androidMeteredHeavyBackground.allowed, false);
assert.equal(androidMeteredHeavyBackground.reason, "metered_background_network_budget");

for (const platform of ["ios", "ipados", "android"]) {
  const community = evaluateNativeResourceAdmission({
    purpose: "community_compute",
    explicitConsent: true,
    telemetry: { platform, lifecycleState: "foreground", thermalState: "nominal", charging: true },
  });
  assert.equal(community.allowed, false);
  assert.equal(community.reason, "mobile_community_compute_blocked");
  assert.equal(community.communityExecutionAllowed, false);
}

const desktopCandidate = evaluateNativeResourceAdmission({
  purpose: "community_compute",
  explicitConsent: true,
  telemetry: {
    platform: "windows",
    lifecycleState: "background",
    thermalState: "nominal",
    charging: true,
    deviceIdle: true,
    userActive: false,
    meteredNetwork: false,
  },
});
assert.equal(desktopCandidate.allowed, false, "Desktop Community Compute remains globally gated in Batch 141.");
assert.equal(desktopCandidate.reason, "community_runtime_globally_gated");
assert.equal(desktopCandidate.desktopCommunityCandidateEligible, true);

const withdrawn = evaluateNativeResourceAdmission({
  purpose: "personal_compute",
  explicitConsent: true,
  consentWithdrawn: true,
  telemetry: { platform: "android", lifecycleState: "foreground", thermalState: "nominal", charging: true },
});
assert.equal(withdrawn.allowed, false);
assert.equal(withdrawn.reason, "consent_withdrawn");

const unknownThermalMobile = evaluateNativeResourceAdmission({
  purpose: "personal_compute",
  explicitConsent: true,
  requestedShare: 0.05,
  telemetry: { platform: "android", lifecycleState: "foreground", thermalState: "unknown", charging: true },
});
assert.equal(unknownThermalMobile.allowed, true);
assert.equal(unknownThermalMobile.maxAllowedShare, 0.01);

const normalized = normalizeNativeTelemetry({ platform: "iPhoneOS", thermalState: "severe", batteryLevel: 2, visibility: "hidden" });
assert.equal(normalized.platform, "ios");
assert.equal(normalized.thermalState, "serious");
assert.equal(normalized.batteryLevel, 1);
assert.equal(normalized.lifecycleState, "background");

const blockedBudget = applyNativeAdmissionToBudget({
  internetAvailable: true,
  ownDeviceMeshAvailable: true,
  route: "local_device",
  effectiveWorkerLimit: 2,
  schedulerDutyCycleShare: 0.03,
  sustainedCpuShare: 0.03,
  sustainedGpuShare: 0.03,
  burstCpuShare: 0.05,
  burstGpuShare: 0.05,
}, { allowed: false, reason: "low_power_mode" });
assert.equal(blockedBudget.route, "own_desktop", "Same-user Desktop must remain ahead of cloud fallback when native local execution is blocked.");
assert.equal(blockedBudget.sustainedCpuShare, 0);
assert.equal(blockedBudget.nativeGuardianBlocked, true);

const cappedBudget = applyNativeAdmissionToBudget({
  effectiveWorkerLimit: 2,
  schedulerDutyCycleShare: 0.03,
  sustainedCpuShare: 0.03,
  sustainedGpuShare: 0.03,
  burstCpuShare: 0.05,
  burstGpuShare: 0.05,
}, { allowed: true, reason: "foreground_personal_compute", maxAllowedShare: 0.01 });
assert.equal(cappedBudget.sustainedCpuShare, 0.01);
assert.equal(cappedBudget.burstGpuShare, 0.01);
assert.equal(cappedBudget.nativeGuardianBlocked, false);

const publicPolicy = publicNativeResourceGuardianPolicy();
assert.equal(publicPolicy.mobileCommunityComputeAllowed, false);
assert.equal(publicPolicy.desktopCommunityExecutionLive, false);
assert.equal(publicPolicy.mobilePersonalComputeMaximumShare, 0.03);
assert.equal(publicPolicy.globalAbsoluteMaximumShare, 0.05);
assert.equal(publicPolicy.systemManagedBackgroundRequired, true);
assert.equal(publicPolicy.realDeviceVerificationRequiredBeforeProductionClaim, true);

for (const pattern of [
  /applyNativeAdmissionToBudget/,
  /evaluateNativeResourceAdmission/,
  /canExecutePersonalCompute/,
  /canExecuteCommunityCompute:\s*\(\)\s*=>\s*false/,
  /mobileCommunityComputeAllowed:\s*false/,
  /downloadableExecutableWorkloadsAllowed:\s*false/,
  /bypassSystemPowerManagementAllowed:\s*false/,
]) assert.match(manager, pattern);

for (const pattern of [
  /runtimeSnapshot/,
  /Native Resource Guardian/,
  /Mobile Community Compute/,
  /system-managed/,
  /Desktop-only; separate opt-in required/,
]) assert.match(settingsPage, pattern);

assert.match(policyRoute, /publicNativeResourceGuardianPolicy/);
assert.match(policyRoute, /nativeResourceGuardian/);

for (const pattern of [
  /ProcessInfo\.processInfo/,
  /thermalState/,
  /isLowPowerModeEnabled/,
  /UIDevice\.current\.isBatteryMonitoringEnabled/,
  /communityComputeAllowed.*false/s,
  /downloadedExecutableWorkloadsAllowed.*false/s,
]) assert.match(iosGuardian, pattern);
assert.doesNotMatch(iosGuardian, /BGTaskScheduler\.shared\.submit|beginBackgroundTask\(/, "The telemetry adapter must not self-schedule or manufacture iOS background runtime.");
assert.doesNotMatch(iosGuardian, /communityComputeAllowed.*true/s);

for (const pattern of [
  /PowerManager/,
  /isPowerSaveMode/,
  /currentThermalStatus/,
  /isActiveNetworkMetered/,
  /communityComputeAllowed.*false/s,
  /downloadedExecutableWorkloadsAllowed.*false/s,
]) assert.match(androidGuardian, pattern);
assert.doesNotMatch(androidGuardian, /newWakeLock|startForegroundService|PARTIAL_WAKE_LOCK/, "The Android telemetry adapter must not create wake locks or force a foreground service.");
assert.doesNotMatch(androidGuardian, /communityComputeAllowed.*true/s);

console.log("✓ Native Resource Guardian enforces mobile Personal Compute only and keeps Community Compute blocked");
console.log("✓ iOS background Personal Compute requires a legitimate system-managed lease and nominal thermal state");
console.log("✓ Android background Personal Compute requires WorkManager-style system-managed work and respects metered-network budgets");
console.log("✓ Low Power Mode, serious heat and consent withdrawal reduce optional native compute to 0%");
console.log("✓ Same-user Desktop remains ahead of cloud fallback when local native compute is blocked");
console.log("✓ Native Swift/Kotlin adapters expose public OS resource signals without self-scheduling background work, wake locks or Community Compute");
console.log("✓ Batch 141 remains CODE/CONTRACT only: signed native build and real-device verification are still required before Production claims");
