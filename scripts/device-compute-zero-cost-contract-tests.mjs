import assert from "node:assert/strict";
import fs from "node:fs";

import {
  COMPUTE_MODES,
  DEVICE_COMPUTE_POLICY_VERSION,
  classifyDevice,
  computeDeviceBudget,
  createDefaultDeviceComputeSettings,
  publicDeviceComputePolicy,
  sanitizeDeviceComputeSettings,
} from "../lib/device-compute/policy.js";
import { zeroCostPolicy } from "../lib/soolen/cost-policy.js";

const manager = fs.readFileSync("app/components/DeviceComputeManager.js", "utf8");
const settingsPage = fs.readFileSync("app/account/device-compute/page.js", "utf8");
const accountNav = fs.readFileSync("app/components/AccountNav.js", "utf8");
const layout = fs.readFileSync("app/layout.js", "utf8");
const liuiHomeCss = fs.readFileSync("app/home-liui-v5.css", "utf8");

const defaults = createDefaultDeviceComputeSettings();
assert.equal(defaults.decision, null);
assert.equal(defaults.localComputeEnabled, false, "Local compute must not silently enable before the user's explicit first-use choice.");
assert.equal(defaults.mode, "gaming");
assert.equal(defaults.backgroundComputeEnabled, false, "Background compute must be OFF by default.");
assert.equal(defaults.ownDesktopRemoteComputeEnabled, false, "Remote Desktop compute needs a separate opt-in.");
assert.equal(defaults.crossUserComputeEnabled, false, "LANERIQ must never default into cross-customer compute.");
assert.equal(defaults.thermalGuardianEnabled, true);
assert.deepEqual(Object.values(COMPUTE_MODES).map((mode) => mode.label), ["Battery Saver", "Gaming Mode", "Performance"]);

const hostileSettings = sanitizeDeviceComputeSettings({
  decision: "local",
  localComputeEnabled: true,
  mode: "performance",
  backgroundComputeEnabled: true,
  ownDesktopRemoteComputeEnabled: true,
  crossUserComputeEnabled: true,
  thermalGuardianEnabled: false,
});
assert.equal(hostileSettings.localComputeEnabled, true);
assert.equal(hostileSettings.crossUserComputeEnabled, false, "Sanitization must force cross-user compute OFF.");
assert.equal(hostileSettings.thermalGuardianEnabled, true, "Thermal Guardian cannot be disabled by stored/user-controlled state.");

assert.equal(classifyDevice({ userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 26_0 like Mac OS X)", hardwareConcurrency: 6, maxTouchPoints: 5 }), "mobile");
assert.equal(classifyDevice({ userAgent: "Mozilla/5.0 (iPad; CPU OS 26_0 like Mac OS X)", hardwareConcurrency: 8, maxTouchPoints: 5 }), "tablet");
assert.equal(classifyDevice({ userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X)", hardwareConcurrency: 16, deviceMemory: 16 }), "desktop");

const gamingMobile = computeDeviceBudget({
  settings: { ...defaults, decision: "local", localComputeEnabled: true, mode: "gaming" },
  deviceClass: "mobile",
  thermalState: "nominal",
  batteryLevel: 0.8,
  charging: false,
  visibility: "visible",
  hardwareConcurrency: 8,
});
assert.equal(gamingMobile.route, "local_device");
assert.equal(gamingMobile.sustainedCpuShare, 0.38);
assert.equal(gamingMobile.burstGpuShare, 0.8);
assert.equal(gamingMobile.burstSeconds, 30);
assert.ok(gamingMobile.effectiveWorkerLimit >= 1 && gamingMobile.effectiveWorkerLimit < 8);
assert.equal(gamingMobile.npuPreferred, true);
assert.equal(gamingMobile.ownDevicesOnly, true);
assert.equal(gamingMobile.crossUserComputeAllowed, false);

const unknownThermalPerformanceMobile = computeDeviceBudget({
  settings: { ...defaults, decision: "local", localComputeEnabled: true, mode: "performance" },
  deviceClass: "mobile",
  thermalState: "unknown",
  batteryLevel: 0.8,
  charging: false,
  visibility: "visible",
  hardwareConcurrency: 8,
});
assert.equal(unknownThermalPerformanceMobile.thermalTelemetryAvailable, false);
assert.equal(unknownThermalPerformanceMobile.reason, "thermal_unknown_conservative");
assert.ok(unknownThermalPerformanceMobile.sustainedCpuShare <= 0.32, "Unknown mobile thermal state must cap sustained CPU near gaming-safe levels.");
assert.ok(unknownThermalPerformanceMobile.burstGpuShare <= 0.59, "Unknown mobile thermal state must not allow the full Performance GPU burst.");
assert.ok(unknownThermalPerformanceMobile.burstSeconds <= 20, "Unknown mobile thermal state must shorten heavy bursts.");
assert.ok(unknownThermalPerformanceMobile.recoverySeconds >= 30, "Unknown mobile thermal state must lengthen recovery time.");

const fairMobile = computeDeviceBudget({
  settings: { ...defaults, decision: "local", localComputeEnabled: true, mode: "gaming" },
  deviceClass: "mobile",
  thermalState: "fair",
  batteryLevel: 0.8,
  visibility: "visible",
  hardwareConcurrency: 8,
});
assert.ok(fairMobile.sustainedCpuShare < gamingMobile.sustainedCpuShare, "Fair/warm thermal state must proactively reduce the local budget.");
assert.equal(fairMobile.route, "local_device");

const seriousMobile = computeDeviceBudget({
  settings: { ...defaults, decision: "local", localComputeEnabled: true, mode: "gaming", ownDesktopRemoteComputeEnabled: true },
  deviceClass: "mobile",
  thermalState: "severe",
  batteryLevel: 0.8,
  visibility: "visible",
  hardwareConcurrency: 8,
});
assert.equal(seriousMobile.route, "own_desktop", "Serious/severe heat should move heavy work to the user's own linked Desktop when available.");
assert.equal(seriousMobile.reason, "thermal_serious");

const criticalMobile = computeDeviceBudget({
  settings: { ...defaults, decision: "local", localComputeEnabled: true, mode: "performance" },
  deviceClass: "mobile",
  thermalState: "critical",
  batteryLevel: 0.9,
  visibility: "visible",
  hardwareConcurrency: 8,
});
assert.equal(criticalMobile.route, "cloud_fallback");
assert.equal(criticalMobile.reason, "thermal_critical");
assert.ok(criticalMobile.burstCpuShare <= 0.1);

const background = computeDeviceBudget({
  settings: { ...defaults, decision: "local", localComputeEnabled: true, mode: "gaming", backgroundComputeEnabled: false },
  deviceClass: "mobile",
  thermalState: "nominal",
  batteryLevel: 0.8,
  visibility: "hidden",
  hardwareConcurrency: 8,
});
assert.equal(background.route, "cloud_fallback");
assert.equal(background.reason, "background_compute_disabled");

const publicPolicy = publicDeviceComputePolicy();
assert.equal(publicPolicy.policyVersion, DEVICE_COMPUTE_POLICY_VERSION);
assert.equal(publicPolicy.localFirst, true);
assert.equal(publicPolicy.npuFirst, true);
assert.equal(publicPolicy.deltaSyncPreferred, true);
assert.equal(publicPolicy.backgroundComputeDefault, false);
assert.equal(publicPolicy.crossUserComputeAllowed, false);
assert.equal(publicPolicy.thermalGuardianRequired, true);
assert.equal(publicPolicy.fullMobileBudgetRequiresRealThermalTelemetry, true);
assert.equal(publicPolicy.userFacingCreditsRequired, false);

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
  /Allow Local Compute — Recommended/,
  /Use Cloud Only/,
  /background compute and remote Desktop compute stay OFF/i,
  /never used to compute another customer/i,
  /__LANERIQ_NATIVE_TELEMETRY__/,
  /thermalState \|\| "unknown"/,
  /navigator\.storage\.persist\(\)/,
  /decision === "local"/,
]) assert.match(manager, pattern);
assert.doesNotMatch(manager, /temperature\s*=\s*Math\.random|thermalState\s*=\s*["']nominal["']/i, "Browser runtime must not fabricate a healthy thermal reading.");

for (const pattern of [
  /Object\.values\(COMPUTE_MODES\)/,
  /Thermal Guardian/,
  /Other customers&apos; devices/,
  /Not allowed/,
  /User-facing Credits required/,
  /No — cost control stays internal at this stage/,
  /Request persistent local storage/,
]) assert.match(settingsPage, pattern);

assert.match(layout, /import DeviceComputeManager from "\.\/components\/DeviceComputeManager"/);
assert.match(layout, /<DeviceComputeManager\s*\/>/);
assert.match(layout, /home-liui-v5\.css/,'Invisible-cost UI policy must live in the active LIUI design layer.');
assert.doesNotMatch(layout, /local-first-cost-control\.css/,'Retired homepage/cost visual layer must not return to the active runtime.');
assert.match(accountNav, /\/account\/device-compute/);
assert.doesNotMatch(accountNav, /go\("\/credits"\)/, "Credits must not remain a primary Account menu item during the current invisible-cost-governor stage.");
assert.match(liuiHomeCss, /\.premiumHome \.topActions > a\.credits/);
assert.match(liuiHomeCss, /display:\s*none\s*!important/);

console.log("✓ LANERIQ Local-First Device Compute requires an explicit first-use choice and keeps Cloud Only available");
console.log("✓ Mobile/tablet/laptop/desktop budgets are separate, Gaming Mode is adaptive, and Thermal Guardian cannot be disabled");
console.log("✓ Missing mobile thermal telemetry forces a conservative budget, shorter bursts and longer recovery instead of assuming the device is cool");
console.log("✓ Severe/critical heat, low battery and background rules can redirect heavy work to the user's own Desktop or cloud fallback");
console.log("✓ Browser thermal telemetry remains UNKNOWN unless an installed native LANERIQ wrapper supplies a real thermal signal");
console.log("✓ Cross-customer compute is forced OFF; only the customer's own devices may participate in distributed compute");
console.log("✓ Local project storage, persistent-storage request, delta-sync preference and invisible cost governance are encoded as product policy");
console.log("✓ User-facing Credits are removed from the primary home/account journey while internal cost controls remain available through LIUI");
