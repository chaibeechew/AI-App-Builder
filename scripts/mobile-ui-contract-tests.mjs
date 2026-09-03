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
const languageCss = fs.readFileSync("app/language-runtime.css", "utf8");

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
assert.match(layout, /"\/design-studio"/);
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
  /\.sv-backdrop\{[\s\S]*z-index:500!important/,
  /\.sv-panel \.sv-close/,
  /\.sv-panel \.sv-mic/,
  /\.sv-panel \.sv-build/,
  /\.sv-panel textarea\{font-size:16px!important\}/,
  /\.referenceDock:has\(\.panel\)\{z-index:500!important\}/,
  /\.referenceDock>\.trigger/,
  /\.referenceDock \.panel/,
  /height:100svh!important/,
  /\.referenceDock \.panel \.upload/,
  /-webkit-overflow-scrolling:touch/,
]) assert.match(featureCss, pattern);
assert.match(languageCss, /\.laneriqLangButton\.floating\{position:fixed;z-index:120/);
assert.match(languageCss, /\.laneriqLangBackdrop\{[\s\S]*z-index:10000/);

for (const pattern of [
  /devices\["iPhone 13"\]/,
  /devices\["Pixel 5"\]/,
  /verifyProtectedDesignEntry/,
  /\/design-studio/,
  /\/image-studio\?mode=design/,
  /must not expose protected Design Studio content before authentication/,
  /authenticatedDesignStudioVerified:false/,
  /\/templates/,
  /\.accountNav/,
  /\.sv-fab/,
  /\.sv-panel/,
  /\.referenceDock/,
  /\.studioLauncher/,
  /public \/templates must not expose private/,
  /data-laneriq-private-feature-css-probe/,
  /\.sv-panel textarea/,
  /\.referenceDock>\.trigger/,
  /Upload Ref CSS probe panel/,
  /featureEvidenceVersion:4/,
  /publicIsolation:\{accountHidden:true,voiceHidden:true,uploadRefHidden:true,studioHidden:true,designUiHiddenBeforeAuth:true\}/,
  /cssProbe:\{touchTargetsAtLeast44:true,voiceInputFontAtLeast16:true,uploadRefViewportRuleActive:true,noHorizontalOverflow:true\}/,
  /authenticatedFeatureSurfacesVerified:false/,
  /authenticatedActionsExercised:false/,
  /permissionActionsExercised:false/,
  /physicalDeviceVerified:false/,
  /authenticatedAccountSurfaceVerified:false/,
  /logoutInteractionExercised:false/,
  /componentRendered:false/,
  /microphoneCaptureExercised:false/,
  /speechRecognitionResultVerified:false/,
  /pickerInteractionExercised:false/,
  /Design UI protected-route isolation, public feature isolation and deployed mobile CSS probes passed/,
  /does not pretend protected feature controls were rendered or clicked/,
  /Authenticated Design Studio interaction, Account\/Logout, protected Voice\/Upload Ref rendering, physical iPhone microphone capture/,
]) assert.match(featureQa, pattern);
assert.doesNotMatch(featureQa, /voiceTrigger\.click|refTrigger\.click|\.sv-close"\)\.click|input\[type=['"]file['"]\].*click|getUserMedia\([^)]*\)\s*;/i, "Signed-out Production QA must never click protected feature controls or permission surfaces.");
assert.doesNotMatch(featureQa, /authenticatedFeatureSurfacesVerified:true|authenticatedDesignStudioVerified:true|physicalDeviceVerified:true|componentRendered:true/, "Public isolation evidence must never be relabeled as protected/physical feature evidence.");
assert.doesNotMatch(featureQa, /force\s*:\s*true/, "QA must never force interactions through overlay conflicts.");
assert.match(workflow, /Verify signed-out private feature isolation and mobile CSS probes/);
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
console.log("✓ Voice Idea and Upload Ref protected controls retain mobile CSS constraints without exposing them on public routes");
console.log("✓ Exact-Production browser evidence verifies signed-out Design UI/private-feature isolation and deployed CSS behavior");
console.log("✓ Browser evidence explicitly records that authenticated Design Studio, Logout, protected feature rendering, microphone recognition and picker actions were not exercised");
console.log("✓ Code can score 100 while authenticated/real-device visual, touch and permission evidence remains separately required");
