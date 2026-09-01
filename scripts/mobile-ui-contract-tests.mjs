import assert from "node:assert/strict";
import fs from "node:fs";
import { MOBILE_QUALITY_POLICY, evaluateMobileCodeEvidence } from "../lib/mobile/mobile-quality-policy.js";

const css = fs.readFileSync("app/mobile-quality.css", "utf8");
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
assert.match(auth, /import "\.\/auth\.css"/);
for (const pattern of [
  /100svh/,
  /safe-area-inset-top/,
  /safe-area-inset-bottom/,
  /@media\(max-width:480px\)/,
  /touch-action:manipulation/,
  /@media\(prefers-reduced-motion:reduce\)/,
]) assert.match(authCss, pattern);

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
console.log("✓ Auth mobile styles are extracted and separately audited for safe-area, touch and reduced-motion behavior");
console.log("✓ Horizontal overflow, responsive media and focus-visible safeguards remain globally mounted");
console.log("✓ Code can score 100 while real-device visual/touch evidence remains separately required");
