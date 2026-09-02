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
  /engine\.device\.isMobile, true/,
  /engine\.device\.hasTouch, true/,
  /\/mobile-readiness/,
  /\/studio/,
  /\/asset-library/,
  /\/brand-kit/,
  /width=device-width/,
  /layout\.innerWidth >= 320 && layout\.innerWidth <= 500/,
  /layout\.scrollWidth <= layout\.innerWidth \+ 1/,
  /maxTouchPoints/,
  /coarsePointer/,
  /touchEventSupport/,
  /metrics\.height >= 44/,
  /metrics\.fontSize >= 16/,
  /permissionPromptsTriggered, false/,
  /physicalDeviceVerified: false/,
]) assert.match(script, pattern);

assert.doesNotMatch(script, /layout\.maxTouchPoints > 0/, "Linux WebKit DOM maxTouchPoints is an engine detail, not a product pass/fail gate.");
assert.doesNotMatch(script, /layout\.coarsePointer, true/, "Linux browser pointer reporting is recorded but must not masquerade as physical-device proof.");
assert.doesNotMatch(script, /getUserMedia\s*\(/, "Browser QA must not request microphone permission.");
assert.doesNotMatch(script, /signInWithOtp|verifyOtp|phone-auth|sms-auth/i, "SMS remains on hold and must not be exercised by browser QA.");
assert.match(script, /evidenceLevel: "browser-emulation"/);

console.log("✓ Production mobile-browser QA installs and launches both WebKit and Chromium");
console.log("✓ iPhone/Android descriptors explicitly enable mobile + touch emulation while DOM touch signals remain informational");
console.log("✓ Production rendering, protected redirects, phone width, 44px/16px sizing, overflow and readiness hydration stay gated");
console.log("✓ Browser evidence is explicitly emulation-only; physical-device, microphone, Photos and SMS evidence are not claimed");
