import assert from "node:assert/strict";
import fs from "node:fs";
import { MOBILE_PERFORMANCE_BUDGET, evaluateMobileCodeEvidence } from "../lib/mobile/mobile-quality-policy.js";

const layout = fs.readFileSync("app/layout.js", "utf8");
const css = fs.readFileSync("app/mobile-quality.css", "utf8");
const homeGuard = fs.readFileSync("app/components/HomeLoadGuard.js", "utf8");
const browserEvidence = fs.readFileSync("scripts/production-mobile-performance-evidence.mjs", "utf8");
const browserWorkflow = fs.readFileSync(".github/workflows/production-mobile-browser-qa.yml", "utf8");

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

for (const pattern of [
  /webkit/,
  /devices\["iPhone 13"\]/,
  /chromium/,
  /devices\["Pixel 5"\]/,
  /performance\.getEntriesByType\("navigation"\)/,
  /first-contentful-paint/,
  /largest-contentful-paint/,
  /layout-shift/,
  /longtask/,
  /transferSize/,
  /encodedBodySize/,
  /decodedBodySize/,
  /resourceCount|resources:\s*\{/,
  /inpMs:\s*null/,
  /enforcement:\s*"observational_browser_emulation_only"/,
  /evidenceLevel:\s*"BROWSER_EMULATION"/,
  /realDevicePerformanceVerified:\s*false/,
  /realDeviceEvidenceRequired:\s*MOBILE_PERFORMANCE_BUDGET\.realDeviceEvidenceRequired/,
  /real iPhone\/network evidence is still required for 100 LIVE VERIFIED/,
]) assert.match(browserEvidence, pattern);

// Browser engines may expose an entry but omit a timing. Unknown values must remain unknown;
// JavaScript Number(null) === 0 must never turn missing evidence into a fake perfect metric.
assert.match(browserEvidence, /if \(value == null \|\| value === ""\) return null/);
assert.match(browserEvidence, /responseStart > 0 \? responseStart : null/);
assert.match(browserEvidence, /ttfbMeasured:/);
assert.match(browserEvidence, /TTFB \$\{ttfb\}/);
assert.match(browserEvidence, /performanceEvidenceVersion:\s*2/);
assert.match(browserEvidence, /Missing\/unsupported timings remain null and are never converted to 0/);
assert.match(browserEvidence, /Unsupported timing values remain n\/a\/null instead of being misreported as 0ms/);
assert.doesNotMatch(browserEvidence, /const ttfb = evidence\.navigation\.ttfbMs == null \? "0ms"/);

for (const surface of ["/", "/auth", "/mobile-readiness", "/ai-app-game-website-builder"]) {
  assert.match(browserEvidence, new RegExp(surface.replaceAll("/", "\\/")));
}
assert.doesNotMatch(browserEvidence, /getUserMedia\s*\(|grantPermissions|signInWithOtp|verifyOtp/i, "Performance evidence must remain permission-free and must not exercise Auth delivery flows.");
assert.doesNotMatch(browserEvidence, /realDevicePerformanceVerified:\s*true|evidenceLevel:\s*"PHYSICAL_DEVICE"/, "Browser emulation must never be relabeled as physical-device proof.");
assert.match(browserWorkflow, /Run cross-engine Production mobile browser QA[\s\S]*Record Production mobile performance browser evidence[\s\S]*Upload browser-emulation evidence/);
assert.match(browserWorkflow, /node scripts\/production-mobile-performance-evidence\.mjs/);

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
console.log("✓ Production browser evidence records navigation, paint, LCP/CLS support and resource-weight observations across WebKit/iPhone and Chromium/Pixel");
console.log("✓ Missing browser timings stay null/n/a instead of being misreported as 0ms");
console.log("✓ Browser performance evidence is observational BROWSER_EMULATION only; INP and real iPhone/network proof remain evidence-gated");
console.log("✓ Performance code score is 100; real device evidence is still required for 100 LIVE VERIFIED");
