import assert from "node:assert/strict";
import fs from "node:fs";

const workflow = fs.readFileSync(".github/workflows/qa-production-mobile-browser.yml", "utf8");
const script = fs.readFileSync("scripts/qa-production-mobile-browser.mjs", "utf8");

assert.match(workflow, /LANERIQ AI QA Production Mobile Browser/);
assert.match(workflow, /workflow_dispatch:/);
assert.match(workflow, /schedule:/);
assert.match(workflow, /playwright install --with-deps webkit chromium/);
assert.match(workflow, /qa-production-mobile-browser\.mjs/);
assert.doesNotMatch(workflow, /playwright install --with-deps chromium\s*$/m, "QA must not download Chromium only while launching WebKit.");

for (const pattern of [
  /import \{ chromium, devices, webkit \}/,
  /deviceName: "iPhone 13"/,
  /deviceName: "Pixel 5"/,
  /browserType: webkit/,
  /browserType: chromium/,
  /\/mobile-readiness/,
  /\/studio/,
  /\/asset-library/,
  /\/brand-kit/,
  /width=device-width/,
  /scrollWidth <= layout\.innerWidth \+ 1/,
  /maxTouchPoints > 0/,
  /coarsePointer, true/,
  /metrics\.height >= 44/,
  /metrics\.fontSize >= 16/,
  /permissionPromptsTriggered, false/,
  /physicalDeviceVerified: false/,
]) assert.match(script, pattern);

assert.doesNotMatch(script, /getUserMedia\s*\(/, "Browser QA must not request microphone permission.");
assert.doesNotMatch(script, /signInWithOtp|verifyOtp|phone-auth|sms-auth/i, "SMS remains on hold and must not be exercised by browser QA.");
assert.match(script, /evidenceLevel: "browser-emulation"/);

console.log("✓ Production mobile-browser QA installs and launches both WebKit and Chromium");
console.log("✓ iPhone/Android emulation checks public rendering, protected redirects, mobile sizing, overflow and readiness hydration");
console.log("✓ Browser evidence is explicitly labeled emulation-only and never claims physical-device verification");
console.log("✓ SMS and permission-triggering microphone flows remain outside this QA surface");
