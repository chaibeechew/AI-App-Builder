import assert from "node:assert/strict";
import fs from "node:fs";

const read = (file) => fs.readFileSync(file, "utf8");
const buildInfo = read("app/api/build-info/route.js");
const workflow = read(".github/workflows/production-mobile-browser-qa.yml");
const runner = read("scripts/production-mobile-browser-qa.mjs");
const sessionProxy = read("lib/supabase/proxy.js");
const policy = read("lib/ui/global-overlay-policy.js");
const overlays = read("app/components/BuilderGlobalOverlays.js");
const studio = read("app/components/StudioLauncher.js");
const layout = read("app/layout.js");
const homeInputSafety = read("app/home-mobile-input-safety.css");
const homeMobileFinal = read("app/home-signature-mobile-final.css");

for (const pattern of [
  /VERCEL_GIT_COMMIT_SHA/,
  /VERCEL_GIT_COMMIT_REF/,
  /VERCEL_ENV/,
  /private, no-store, max-age=0/,
  /PRODUCT_BRAND\.name/,
]) assert.match(buildInfo, pattern);
assert.doesNotMatch(buildInfo, /TOKEN|SECRET|PASSWORD|SERVICE_ROLE|API_KEY/i, "Public build identity must never expose secrets or credentials.");

for (const pattern of [
  /PUBLIC_READ_ONLY_OBSERVABILITY_ENDPOINTS/,
  /new Set\(\["\/api\/build-info"\]\)/,
  /PUBLIC_READ_ONLY_OBSERVABILITY_ENDPOINTS\.has\(pathname\)/,
  /request\.method === "GET"/,
  /request\.method === "HEAD"/,
  /no broad \/api prefix bypass/,
]) assert.match(sessionProxy, pattern);
assert.doesNotMatch(sessionProxy, /startsWith\("\/api\/build-info"\)/, "Build identity access must remain exact-path only.");

for (const pattern of [
  /playwright@1\.62\.1/,
  /install --with-deps chromium webkit/,
  /\/api\/build-info/,
  /LANERIQ_EXPECTED_SHA/,
  /production-mobile-browser-qa\.mjs/,
  /actions\/upload-artifact@v4/,
]) assert.match(workflow, pattern);

for (const pattern of [
  /webkit/,
  /devices\["iPhone 13"\]/,
  /chromium/,
  /devices\["Pixel 5"\]/,
  /BROWSER_EMULATION/,
  /physicalDeviceVerified:\s*false/,
  /\/mobile-readiness/,
  /permissionPromptsTriggered/,
  /noHorizontalOverflow/,
  /duplicateOverlayCount/,
  /visibleInputs/,
  /undersizedInputs/,
  /page\.screenshot/,
  /failure\.png/,
  /writeEvidence/,
  /consoleErrors/,
  /pageErrors/,
]) assert.match(runner, pattern);
assert.doesNotMatch(runner, /getUserMedia\s*\(|grantPermissions|permissions\.query|signInWithOtp|verifyOtp/i, "Browser-emulation QA must stay permission-free and must not exercise Email/SMS Auth.");

assert.match(layout, /home-mobile-input-safety\.css/);
assert.match(homeInputSafety, /@media\s*\(max-width:\s*820px\)/);
assert.match(homeInputSafety, /\.premiumHome \.promptCard textarea/);
assert.match(homeInputSafety, /\.premiumHome \.promptCard input:not\(\[type="hidden"\]\)/);
assert.match(homeInputSafety, /\.premiumHome \.promptCard select/);
assert.match(homeInputSafety, /\.premiumHome textarea/);
assert.match(homeInputSafety, /font-size:\s*16px\s*!important/);
assert.match(homeMobileFinal, /@media\(max-width:520px\)[\s\S]*\.premiumHome \.promptCard textarea\{min-height:94px!important;font-size:16px!important\}/);
assert.doesNotMatch(homeMobileFinal, /\.premiumHome \.promptCard textarea\{[^}]*font-size:(?:1[0-5]|[0-9](?:\.[0-9]+)?)px!important/);

for (const pattern of [
  /"\/"/,
  /"\/auth"/,
  /"\/studio"/,
  /"\/production-e2e"/,
  /"\/mobile-readiness"/,
  /"\/a\/"/,
  /"\/website\/"/,
  /"\/release\/"/,
]) assert.match(policy, pattern);

assert.match(overlays, /shouldHideBuilderGlobalOverlay/);
assert.match(overlays, /<StudioLauncher\s*\/>/);
assert.match(overlays, /<ReferenceUploader\s*\/>/);
assert.match(overlays, /<SoolenVoiceAssistant\s*\/>/);
assert.match(studio, /shouldHideBuilderGlobalOverlay/);
assert.match(layout, /BuilderGlobalOverlays/);
assert.doesNotMatch(layout, /<StudioLauncher\s*\/>|<ReferenceUploader\s*\/>|<SoolenVoiceAssistant\s*\/>/, "Heavy global overlays must be mounted only through the route gate.");

console.log("✓ Public build identity is privacy-safe, exact-commit aware, no-store and GET/HEAD-only before sign-in");
console.log("✓ Session protection keeps the build identity bypass exact-path only with no broad /api prefix bypass");
console.log("✓ Production mobile QA is pinned to Playwright 1.62.1 with WebKit/iPhone and Chromium/Pixel evidence");
console.log("✓ Final mobile visual authority and safety layer both force homepage editable controls to >=16px");
console.log("✓ Browser QA preserves failure screenshots/report details, including undersized editable-control diagnostics");
console.log("✓ Browser QA stays permission-free and labels evidence as browser emulation, never physical-device proof");
console.log("✓ Homepage/auth/evidence/customer-preview surfaces do not mount duplicate heavy global builder overlays");
