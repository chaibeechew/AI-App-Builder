import assert from "node:assert/strict";
import fs from "node:fs";
import { MOBILE_QUALITY_POLICY, evaluateMobileCodeEvidence } from "../lib/mobile/mobile-quality-policy.js";

const css = fs.readFileSync("app/mobile-quality.css", "utf8");
const featureCss = fs.readFileSync("app/mobile-feature-hardening.css", "utf8");
const featureQa = fs.readFileSync("scripts/production-mobile-feature-surfaces-qa.mjs", "utf8");
const workflow = fs.readFileSync(".github/workflows/production-mobile-browser-qa.yml", "utf8");
const layout = fs.readFileSync("app/layout.js", "utf8");
const auth = fs.readFileSync("app/auth/page.js", "utf8");
const authCss = fs.readFileSync("app/auth/auth.css", "utf8");

assert.equal(MOBILE_QUALITY_POLICY.minimumTouchTargetPx, 44);
assert.equal(MOBILE_QUALITY_POLICY.minimumInputFontPx, 16);
assert.equal(MOBILE_QUALITY_POLICY.supportedViewportMinPx, 320);
assert.equal(MOBILE_QUALITY_POLICY.safeAreaRequired, true);
assert.equal(MOBILE_QUALITY_POLICY.preventHorizontalOverflow, true);
assert.equal(MOBILE_QUALITY_POLICY.reducedMotionRequired, true);
assert.equal(MOBILE_QUALITY_POLICY.focusVisibleRequired, true);

for (const pattern of [
  /safe-area-inset-left/,
  /safe-area-inset-right/,
  /min-width:320px/,
  /overflow-x:clip/,
  /min-height:44px/,
  /font-size:16px!important/,
  /touch-action:manipulation/,
  /:focus-visible/,
  /prefers-reduced-motion:reduce/,
  /img,video,canvas,svg\{max-width:100%;height:auto\}/,
]) assert.match(css, pattern);

assert.match(layout, /import "\.\/mobile-quality\.css"/);
assert.match(layout, /import "\.\/mobile-feature-hardening\.css"/);
assert.match(auth, /import "\.\/auth\.css"/);
for (const pattern of [
  /100svh/,
  /safe-area-inset-top/,
  /safe-area-inset-bottom/,
  /@media\(max-width:480px\)/,
  /touch-action:manipulation/,
  /@media\(prefers-reduced-motion:reduce\)/,
]) assert.match(authCss, pattern);

for (const pattern of [
  /\.accountNav \.accountTrigger/,
  /\.accountNav \.visibleLogout/,
  /\.accountNav \.accountMenu button/,
  /min-height:44px!important/,
  /safe-area-inset-top/,
  /70svh/,
  /\.sv-panel \.sv-close/,
  /\.sv-panel \.sv-mic/,
  /\.sv-panel \.sv-build/,
  /\.sv-panel textarea\{font-size:16px!important\}/,
  /\.referenceDock>\.trigger/,
  /\.referenceDock \.panel/,
  /height:100svh!important/,
  /\.referenceDock \.panel \.upload/,
  /-webkit-overflow-scrolling:touch/,
]) assert.match(featureCss, pattern);

for (const pattern of [
  /devices\["iPhone 13"\]/,
  /devices\["Pixel 5"\]/,
  /\/templates/,
  /\.accountNav/,
  /signed-out public route must not expose account chrome/,
  /\.sv-fab/,
  /\.sv-panel textarea/,
  /opening Voice Idea must not request microphone capture/,
  /\.referenceDock>\.trigger/,
  /Upload Ref mobile panel must use the viewport/,
  /voicePanel\.screenshot/,
  /refPanelLocator\.screenshot/,
  /permissionActionsExercised:false/,
  /physicalDeviceVerified:false/,
]) assert.match(featureQa, pattern);
assert.doesNotMatch(featureQa, /fullPage\s*:\s*true/, "Three-feature evidence must screenshot bounded feature panels, not potentially unbounded full pages.");
assert.doesNotMatch(featureQa, /\.sv-mic"\)\.click|input\[type=['"]file['"]\].*click|getUserMedia\([^)]*\)\s*;/i, "Production three-feature QA must not exercise microphone/camera/file-picker permissions.");
assert.match(workflow, /Verify Account Voice and Upload Ref mobile surfaces/);
assert.match(workflow, /production-mobile-feature-surfaces-qa\.mjs/);

const result = evaluateMobileCodeEvidence({
  safeArea: true,
  minimumTouchTargetPx: 44,
  minimumInputFontPx: 16,
  preventHorizontalOverflow: true,
  reducedMotion: true,
  focusVisible: true,
  responsiveMedia: true,
  heroPreloads: 1,
});
assert.equal(result.score, 100);
assert.equal(result.passed, true);
assert.equal(result.realDeviceVerified, false);

console.log("✓ Mobile UI code contract enforces iPhone safe areas, 44px touch targets and 16px form inputs");
console.log("✓ Account/Logout mobile chrome has 44px+ controls, bounded menus and iPhone safe-area placement");
console.log("✓ Voice Idea mobile dialog keeps 44px controls and 16px transcript input without auto-exercising microphone capture");
console.log("✓ Upload Ref becomes a full-viewport mobile panel with 44px controls and safe-area scrolling");
console.log("✓ Three-feature Production evidence captures bounded panels, avoiding browser screenshot dimension limits without relaxing assertions");
console.log("✓ Exact-Production WebKit/iPhone and Chromium/Pixel feature-surface QA is wired without relabeling browser emulation as physical-device proof");
console.log("✓ Code can score 100 while real-device visual/touch/permission evidence remains separately required");
