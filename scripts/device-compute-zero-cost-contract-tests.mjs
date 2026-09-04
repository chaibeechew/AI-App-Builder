import assert from "node:assert/strict";
import fs from "node:fs";

import {
  DEVICE_COMPUTE_POLICY_VERSION,
  classifyDevice,
  computeDeviceBudget,
  createDefaultDeviceComputeSettings,
  publicDeviceComputePolicy,
  sanitizeDeviceComputeSettings,
} from "../lib/device-compute/policy.js";
import {
  HIGH_ENERGY_WORKLOADS,
  createAdaptiveBurstPlan,
  isHighEnergyWorkload,
  publicAdaptiveBurstPolicy,
} from "../lib/device-compute/adaptive-burst.js";
import { zeroCostPolicy } from "../lib/soolen/cost-policy.js";

const manager = fs.readFileSync("app/components/DeviceComputeManager.js", "utf8");
const settingsPage = fs.readFileSync("app/account/device-compute/page.js", "utf8");
const thermalControl = fs.readFileSync("app/components/ThermalProtectionControl.js", "utf8");
const operations = fs.readFileSync("app/operations/[id]/page.js", "utf8");
const accountNav = fs.readFileSync("app/components/AccountNav.js", "utf8");
const layout = fs.readFileSync("app/layout.js", "utf8");
const costCss = fs.readFileSync("app/local-first-cost-control.css", "utf8");

const defaults = createDefaultDeviceComputeSettings();
assert.equal(defaults.decision, "local");
assert.equal(defaults.localComputeEnabled, true, "LANERIQ must now migrate customers to automatic device-first compute instead of asking Local vs Cloud.");
assert.equal(defaults.preventOverheatingEnabled, true, "Prevent Overheating should default ON.");
assert.equal(defaults.backgroundComputeEnabled, false);
assert.equal(defaults.crossUserComputeEnabled, false);
assert.equal(defaults.thermalGuardianEnabled, true);

const hostileSettings = sanitizeDeviceComputeSettings({
  decision: "cloud_only",
  localComputeEnabled: false,
  mode: "performance",
  preventOverheatingEnabled: false,
  backgroundComputeEnabled: true,
  crossUserComputeEnabled: true,
  thermalGuardianEnabled: false,
});
assert.equal(hostileSettings.decision, "local", "Stored legacy Cloud Only selection must no longer control the compute route.");
assert.equal(hostileSettings.localComputeEnabled, true);
assert.equal(hostileSettings.mode, "gaming", "Performance modes are no longer customer-selectable.");
assert.equal(hostileSettings.preventOverheatingEnabled, false, "Prevent Overheating is the only customer-selectable compute control.");
assert.equal(hostileSettings.backgroundComputeEnabled, false);
assert.equal(hostileSettings.crossUserComputeEnabled, false);
assert.equal(hostileSettings.thermalGuardianEnabled, true, "Core Thermal Guardian cannot be disabled even when early overheat prevention is OFF.");

assert.equal(classifyDevice({ userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 26_0 like Mac OS X)", hardwareConcurrency: 6, maxTouchPoints: 5 }), "mobile");
assert.equal(classifyDevice({ userAgent: "Mozilla/5.0 (iPad; CPU OS 26_0 like Mac OS X)", hardwareConcurrency: 8, maxTouchPoints: 5 }), "tablet");
assert.equal(classifyDevice({ userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X)", hardwareConcurrency: 16, deviceMemory: 16 }), "desktop");

const automaticMobile = computeDeviceBudget({
  settings: defaults,
  deviceClass: "mobile",
  thermalState: "nominal",
  batteryLevel: 0.8,
  charging: false,
  visibility: "visible",
  hardwareConcurrency: 8,
});
assert.equal(automaticMobile.route, "local_device");
assert.equal(automaticMobile.reason, "automatic_device_first");
assert.equal(automaticMobile.mode, "automatic");
assert.equal(automaticMobile.npuPreferred, true);
assert.equal(automaticMobile.gpuPreferredAfterNpu, true);
assert.equal(automaticMobile.cpuFallbackAllowed, true);
assert.equal(automaticMobile.providerSelectionUserVisible, false);
assert.equal(automaticMobile.userSelectableComputeTarget, false);
assert.deepEqual(automaticMobile.highEnergyWorkloads, ["image_generation", "video_generation"]);

const unknownThermalMobile = computeDeviceBudget({
  settings: defaults,
  deviceClass: "mobile",
  thermalState: "unknown",
  batteryLevel: 0.8,
  charging: false,
  visibility: "visible",
  hardwareConcurrency: 8,
});
assert.equal(unknownThermalMobile.thermalTelemetryAvailable, false);
assert.equal(unknownThermalMobile.reason, "prevent_overheating_unknown_thermal");
assert.ok(unknownThermalMobile.burstSeconds <= 20, "Prevent Overheating must shorten mobile burst windows when thermal telemetry is unavailable.");
assert.ok(unknownThermalMobile.recoverySeconds >= 30, "Prevent Overheating must extend mobile recovery when thermal telemetry is unavailable.");

const seriousMobile = computeDeviceBudget({
  settings: defaults,
  deviceClass: "mobile",
  thermalState: "severe",
  batteryLevel: 0.8,
  visibility: "visible",
  hardwareConcurrency: 8,
});
assert.equal(seriousMobile.route, "cloud_fallback", "Serious heat must stop heavy local execution when no own Desktop fallback is linked.");
assert.equal(seriousMobile.reason, "thermal_serious");

assert.deepEqual(HIGH_ENERGY_WORKLOADS, ["image_generation", "video_generation"]);
assert.equal(isHighEnergyWorkload("create_image"), true);
assert.equal(isHighEnergyWorkload("video_render"), true);
assert.equal(isHighEnergyWorkload("app_build"), false);
assert.equal(isHighEnergyWorkload("self_heal"), false);
assert.equal(isHighEnergyWorkload("code_generation"), false);

const normalPlan = createAdaptiveBurstPlan({
  workloadKind: "self_heal",
  deviceClass: "mobile",
  thermalState: "nominal",
  preventOverheatingEnabled: true,
  baselineCpuShare: 0.38,
  baselineGpuShare: 0.42,
});
assert.equal(normalPlan.highEnergy, false);
assert.equal(normalPlan.requestedPowerPercent, 100);
assert.equal(normalPlan.phase, "normal");
assert.equal(normalPlan.burstSeconds, 0);

for (const workloadKind of ["image_generation", "video_generation"]) {
  const plan = createAdaptiveBurstPlan({
    workloadKind,
    deviceClass: "mobile",
    thermalState: "nominal",
    preventOverheatingEnabled: true,
    baselineCpuShare: 0.6,
    baselineGpuShare: 0.8,
  });
  assert.equal(plan.highEnergy, true);
  assert.equal(plan.requestedPowerPercent, 150, `${workloadKind} should be eligible for the 150% relative-to-baseline burst request.`);
  assert.equal(plan.effectivePowerPercent, 150);
  assert.equal(plan.hardwareUtilizationMayExceed100Percent, false);
  assert.ok(plan.cpuCeilingShare <= 1 && plan.gpuCeilingShare <= 1, "Physical scheduler ceilings must remain capped at 100% hardware utilization.");
  assert.ok(plan.burstSeconds > 0);
  assert.ok(plan.cooldownSeconds > 0);
  assert.equal(plan.cooldownRequired, true);
  assert.equal(plan.providerFallbackAfterLocalAttempt, true);
}

const hotImage = createAdaptiveBurstPlan({
  workloadKind: "image_generation",
  deviceClass: "mobile",
  thermalState: "hot",
  preventOverheatingEnabled: true,
});
assert.equal(hotImage.phase, "cooldown");
assert.ok(hotImage.effectivePowerPercent < 100, "Serious heat must override a requested image burst.");

const unknownImage = createAdaptiveBurstPlan({
  workloadKind: "image_generation",
  deviceClass: "mobile",
  thermalState: "unknown",
  preventOverheatingEnabled: true,
});
assert.equal(unknownImage.effectivePowerPercent, 115, "Unknown thermal state should use a conservative image/video burst instead of assuming the device is cool.");

const publicPolicy = publicDeviceComputePolicy();
assert.equal(publicPolicy.policyVersion, DEVICE_COMPUTE_POLICY_VERSION);
assert.equal(publicPolicy.deviceFirstAutomatic, true);
assert.equal(publicPolicy.onlyUserSelectableComputeControl, "prevent_overheating");
assert.equal(publicPolicy.userSelectableComputeTarget, false);
assert.equal(publicPolicy.userSelectablePerformanceMode, false);
assert.equal(publicPolicy.providerSelectionUserVisible, false);
assert.equal(publicPolicy.onlyImageAndVideoUseHighEnergyBurst, true);
assert.equal(publicPolicy.thermalGuardianRequired, true);
assert.equal(publicPolicy.crossUserComputeAllowed, false);

const burstPolicy = publicAdaptiveBurstPolicy();
assert.equal(burstPolicy.onlyImageAndVideoMayRequestHighEnergyBurst, true);
assert.equal(burstPolicy.requestedBurstRelativeToBaselinePercent, 150);
assert.equal(burstPolicy.automaticCooldownRequired, true);
assert.equal(burstPolicy.userSelectableControl, "prevent_overheating");
assert.equal(burstPolicy.providerSelectionUserVisible, false);

const costPolicy = zeroCostPolicy({ SOOLEN_COST_MODE: "zero" });
for (const [key, expected] of Object.entries({
  deviceFirst: true,
  localProjectStorageFirst: true,
  deltaSyncPreferred: true,
  invisibleCostGovernor: true,
  userFacingCreditsRequired: false,
  backgroundComputeDefault: false,
  ownDesktopFallbackPreferred: true,
  crossUserComputeAllowed: false,
  thermalGuardianRequired: true,
})) assert.equal(costPolicy[key], expected, `Zero-cost policy mismatch for ${key}`);

for (const pattern of [
  /beginHighEnergyWorkload/,
  /endHighEnergyWorkload/,
  /createAdaptiveBurstPlan/,
  /onlyImageAndVideoHighEnergy:\s*true/,
  /providerSelectionUserVisible:\s*false/,
  /onlyUserSelectableComputeControl:\s*"prevent_overheating"/,
  /return null/,
]) assert.match(manager, pattern);
assert.doesNotMatch(manager, /Allow Local Compute — Recommended/);
assert.doesNotMatch(manager, /Use Cloud Only/);
assert.doesNotMatch(manager, /Gaming Mode/);
assert.doesNotMatch(manager, /temperature\s*=\s*Math\.random|thermalState\s*=\s*["']nominal["']/i, "Browser runtime must not fabricate a healthy thermal reading.");

for (const pattern of [
  /ThermalProtectionControl/,
  /Image \+ Video only/,
  /NPU → GPU → CPU/,
  /Provider names, performance modes and Local\/Cloud target choices are intentionally hidden/,
]) assert.match(settingsPage, pattern);
assert.doesNotMatch(settingsPage, /Object\.values\(COMPUTE_MODES\)/);
assert.doesNotMatch(settingsPage, />Local Compute</);
assert.doesNotMatch(settingsPage, /Use Cloud Only/);

assert.match(thermalControl, /Prevent Overheating/);
assert.match(thermalControl, /aria-label="Prevent overheating"/);
assert.match(thermalControl, /source:\s*"settings-ui"/);
assert.doesNotMatch(thermalControl, /provider/i, "The only customer-facing compute control must not expose provider selection.");

assert.match(operations, /ThermalProtectionControl/);
assert.match(operations, /AI TESTING & SELF-HEAL/);
assert.match(operations, /Only Create Image and Create Video may request the bounded high-energy burst profile/);

assert.match(layout, /import DeviceComputeManager from "\.\/components\/DeviceComputeManager"/);
assert.match(layout, /<DeviceComputeManager\s*\/>/);
assert.match(layout, /local-first-cost-control\.css/);
assert.match(accountNav, /\/account\/device-compute/);
assert.doesNotMatch(accountNav, /go\("\/credits"\)/, "Credits must not remain a primary Account menu item during the current invisible-cost-governor stage.");
assert.match(costCss, /\.premiumHome \.topActions > a\.credits/);
assert.match(costCss, /display:\s*none\s*!important/);

console.log("✓ LANERIQ device compute is automatic Device First; Local/Cloud/provider/performance-mode choices are removed from customer controls");
console.log("✓ Prevent Overheating is the only customer-selectable compute control while the core Thermal Guardian remains mandatory");
console.log("✓ Only Create Image and Create Video can request the 150% relative-to-baseline high-energy burst profile");
console.log("✓ Standard App, code, testing and Self-Heal work cannot enter the high-energy burst profile");
console.log("✓ Image/video burst ceilings never exceed 100% physical hardware utilization and always carry a cooldown plan");
console.log("✓ Unknown/warm/serious thermal states progressively reduce or cancel image/video burst behavior");
console.log("✓ Cross-customer compute remains forced OFF and Provider selection remains internal");
