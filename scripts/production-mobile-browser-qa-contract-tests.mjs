import assert from "node:assert/strict";
import fs from "node:fs";

const read = (file) => fs.readFileSync(file, "utf8");
const buildInfo = read("app/api/build-info/route.js");
const imageReadiness = read("app/api/images/readiness/route.js");
const workflow = read(".github/workflows/production-mobile-browser-qa.yml");
const runner = read("scripts/production-mobile-browser-qa.mjs");
const sessionProxy = read("lib/supabase/proxy.js");
const sessionRoute = read("app/api/auth/session/route.js");
const policy = read("lib/ui/global-overlay-policy.js");
const overlays = read("app/components/BuilderGlobalOverlays.js");
const studio = read("app/components/StudioLauncher.js");
const wallpaper = read("app/components/AdaptiveWallpaperEngine.js");
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
  /externalProviderConnected:config\.connected/,
  /externalProviderAllowed:config\.configured/,
  /blockedByCostPolicy:config\.blockedByCostPolicy/,
  /durableProviderCapture:true/,
  /idempotentReplay:true/,
  /private, no-store, max-age=0/,
]) assert.match(imageReadiness, pattern);
assert.doesNotMatch(imageReadiness, /TOKEN|SECRET|PASSWORD|SERVICE_ROLE|API_KEY|IMAGE_GENERATION_ENDPOINT/i, "Public Image Studio readiness must expose state only, never credentials or runtime endpoints.");

for (const pattern of [
  /PUBLIC_READ_ONLY_OBSERVABILITY_ENDPOINTS/,
  /new Set\(\["\/api\/build-info","\/api\/images\/readiness"\]\)/,
  /PUBLIC_READ_ONLY_OBSERVABILITY_ENDPOINTS\.has\(pathname\)/,
  /request\.method === "GET"/,
  /request\.method === "HEAD"/,
  /no broad \/api prefix bypass/,
]) assert.match(sessionProxy, pattern);
assert.doesNotMatch(sessionProxy, /startsWith\("\/api\/build-info"\)/, "Build identity access must remain exact-path only.");
assert.equal(sessionProxy.includes('startsWith("/api/images'),false,"Image Studio observability must never create a broad /api/images prefix bypass.");
assert.equal(sessionProxy.includes("startsWith('/api/images"),false,"Image Studio observability must never create a broad /api/images prefix bypass.");
assert.match(sessionRoute, /SESSION_REQUIRED[\s\S]*401/);

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
  /wallpaperControlCount/,
  /visibleInputs/,
  /undersizedInputs/,
  /page\.screenshot/,
  /failure\.png/,
  /writeEvidence/,
  /consoleErrors/,
  /pageErrors/,
  /page\.on\("response"/,
  /classifyHttpFailure/,
  /expectedSession401s/,
  /unexpectedHttpFailures/,
  /url\.pathname === "\/api\/auth\/session" && status === 401/,
  /Failed to load resource:\.\*status of 401\\b/,
  /Auth must not mount the Wallpaper control over login actions/,
  /Mobile readiness evidence must not be obscured by the Wallpaper control/,
  /assert\.deepEqual\(unexpectedHttpFailures, \[\]/,
]) assert.match(runner, pattern);
assert.doesNotMatch(runner, /getUserMedia\s*\(|grantPermissions|permissions\.query|signInWithOtp|verifyOtp/i, "Browser-emulation QA must stay permission-free and must not exercise Email/SMS Auth.");
assert.doesNotMatch(runner, /status === 401\)\s*return null|status >= 400\)\s*return null/, "QA must never blanket-ignore 401 or 4xx/5xx responses.");

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
assert.match(wallpaper, /wallpaperControlHidden/);
assert.match(wallpaper, /path==="\/auth"/);
assert.match(wallpaper, /path==="\/mobile-readiness"/);

console.log("✓ Public build identity and Image Studio readiness are privacy-safe, exact-path, no-store and GET/HEAD-only before sign-in");
console.log("✓ Session protection preserves signed-out SESSION_REQUIRED 401 semantics for every mutable/protected API");
console.log("✓ Production mobile QA is pinned to Playwright 1.62.1 with WebKit/iPhone and Chromium/Pixel evidence");
console.log("✓ Mobile QA recognizes both WebKit and Chromium generic 401 console wording while exact response-level URL/status checks remain authoritative");
console.log("✓ Mobile QA classifies only exact signed-out GET /api/auth/session 401 responses as expected and fails all unexpected HTTP errors");
console.log("✓ Final mobile visual authority and safety layer both force homepage editable controls to >=16px");
console.log("✓ Auth/home/readiness browser evidence fails if the floating Wallpaper control overlaps primary mobile surfaces");
console.log("✓ Browser QA preserves failure screenshots/report details, including undersized editable-control diagnostics");
console.log("✓ Browser QA stays permission-free and labels evidence as browser emulation, never physical-device proof");
console.log("✓ Homepage/auth/evidence/customer-preview surfaces do not mount duplicate heavy global builder overlays");
