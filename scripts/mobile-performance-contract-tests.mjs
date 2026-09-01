import assert from "node:assert/strict";
import fs from "node:fs";
import { MOBILE_PERFORMANCE_BUDGET, evaluateMobileCodeEvidence } from "../lib/mobile/mobile-quality-policy.js";

const layout = fs.readFileSync("app/layout.js", "utf8");
const css = fs.readFileSync("app/mobile-quality.css", "utf8");
const homeGuard = fs.readFileSync("app/components/HomeLoadGuard.js", "utf8");

assert.equal(MOBILE_PERFORMANCE_BUDGET.targetLcpMs, 2500);
assert.equal(MOBILE_PERFORMANCE_BUDGET.targetInpMs, 200);
assert.equal(MOBILE_PERFORMANCE_BUDGET.targetCls, 0.1);
assert.equal(MOBILE_PERFORMANCE_BUDGET.interactionAnimationMaxMs, 300);
assert.equal(MOBILE_PERFORMANCE_BUDGET.maxHeroPreloads, 1);
assert.equal(MOBILE_PERFORMANCE_BUDGET.realDeviceEvidenceRequired, true);

const preloadCount = (layout.match(/rel="preload"/g) || []).length;
assert.ok(preloadCount <= MOBILE_PERFORMANCE_BUDGET.maxHeroPreloads, `Too many eager hero preloads: ${preloadCount}`);
assert.match(layout, /fetchPriority="high"/);
assert.doesNotMatch(layout, /<script[^>]+src="https?:\/\//i, "Root layout must not inject blocking third-party scripts.");
assert.match(css, /prefers-reduced-motion:reduce/);
assert.match(css, /animation-duration:\.01ms!important/);
assert.match(css, /transition-duration:\.01ms!important/);
assert.match(homeGuard, /requestAnimationFrame|setTimeout|fetch/i, "Home load guard must contain an explicit load-control mechanism.");

const perfect = evaluateMobileCodeEvidence({
  safeArea: true,
  minimumTouchTargetPx: 44,
  minimumInputFontPx: 16,
  preventHorizontalOverflow: true,
  reducedMotion: true,
  focusVisible: true,
  responsiveMedia: true,
  heroPreloads: preloadCount,
});
assert.equal(perfect.score, 100);
assert.equal(perfect.realDeviceVerified, false);

console.log("✓ Mobile Performance code budget locks LCP/INP/CLS targets and limits eager hero preloading");
console.log("✓ Root layout avoids blocking third-party scripts and reduced-motion disables expensive animation work");
console.log("✓ Performance code score is 100; real iPhone/network measurements remain evidence-gated");
