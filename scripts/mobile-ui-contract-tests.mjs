import assert from "node:assert/strict";
import fs from "node:fs";
import { MOBILE_QUALITY_POLICY, evaluateMobileCodeEvidence } from "../lib/mobile/mobile-quality-policy.js";

const css = fs.readFileSync("app/mobile-quality.css", "utf8");
const layout = fs.readFileSync("app/layout.js", "utf8");
const auth = fs.readFileSync("app/auth/page.js", "utf8");

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
assert.match(auth, /100svh/);
assert.match(auth, /safe-area-inset-top/);
assert.match(auth, /safe-area-inset-bottom/);
assert.match(auth, /@media\(max-width:480px\)/);
assert.match(auth, /touch-action:manipulation/);
assert.match(auth, /@media\(prefers-reduced-motion:reduce\)/);

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
console.log("✓ Horizontal overflow, responsive media, focus-visible and reduced-motion safeguards are globally mounted");
console.log("✓ Code can score 100 while real-device visual/touch evidence remains separately required");
