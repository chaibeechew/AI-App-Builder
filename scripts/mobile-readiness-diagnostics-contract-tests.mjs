import assert from "node:assert/strict";
import fs from "node:fs";
import { isPublicAccountPath } from "../lib/auth/session-safety.js";

const page = fs.readFileSync("app/mobile-readiness/page.js", "utf8");
const client = fs.readFileSync("app/mobile-readiness/MobileReadinessClient.js", "utf8");
const css = fs.readFileSync("app/mobile-readiness/mobile-readiness.module.css", "utf8");
const stability = fs.readFileSync("scripts/production-stability-100.mjs", "utf8");
const creatorEncouragement = fs.readFileSync("app/components/CreatorEncouragement.js", "utf8");

assert.equal(isPublicAccountPath("/mobile-readiness"), true, "Real-device diagnostics must be reachable before sign-in.");
assert.equal(isPublicAccountPath("/mobile-readiness/private"), false, "The diagnostics public exception must stay exact and bounded.");
for (const publicPath of ["/", "/auth", "/mobile-readiness", "/ai-app-game-website-builder"]) {
  assert.equal(isPublicAccountPath(publicPath), true, `${publicPath} must stay classified as a public account surface.`);
}

assert.match(page, /robots:\s*\{\s*index:\s*false,\s*follow:\s*false\s*\}/, "Diagnostics must stay out of public search indexing.");
assert.match(page, /MobileReadinessClient/);

for (const pattern of [
  /MIN_TOUCH_TARGET_PX\s*=\s*44/,
  /MIN_INPUT_FONT_PX\s*=\s*16/,
  /MIN_VIEWPORT_PX\s*=\s*320/,
  /navigator\.maxTouchPoints/,
  /\(pointer: coarse\)/,
  /window\.visualViewport/,
  /safe-area-inset-top/,
  /document\.documentElement\.scrollWidth/,
  /PointerEvent/,
  /capture="environment"/,
  /navigator\.mediaDevices\?\.getUserMedia/,
  /speechSynthesis/,
  /SpeechRecognition|webkitSpeechRecognition/,
  /serviceWorker/,
  /display-mode: standalone/,
  /reportVersion:\s*2/,
  /evidenceLevel:\s*"REAL_DEVICE_SELF_TEST"/,
  /physicalDeviceVerified:\s*false/,
  /permissionPromptsTriggered:\s*Boolean\(interaction\.microphonePromptAttempted\)/,
  /microphonePromptAttempted:\s*false/,
  /Test microphone/,
  /Test Photos/,
  /Test camera/,
  /data-mobile-photo-probe/,
  /data-mobile-camera-probe/,
  /Copy report/,
  /No user ID, phone number, email address, file name or browser user-agent is collected/,
]) assert.match(client, pattern);

const microphoneFunction = client.match(/async function testMicrophone\(\) \{[\s\S]*?\n  \}/)?.[0] || "";
assert.match(microphoneFunction, /navigator\.mediaDevices\.getUserMedia\(\{ audio: true \}\)/, "Microphone access must only be requested from the explicit Test microphone action.");
assert.match(microphoneFunction, /track\.stop\(\)/, "Diagnostic microphone tracks must be released immediately.");
assert.doesNotMatch(client.match(/useEffect\(\(\) => \{[\s\S]*?\n  \}, \[runChecks\]\);/)?.[0] || "", /getUserMedia/, "Baseline effects must not auto-request microphone access.");
assert.doesNotMatch(client, /navigator\.permissions\.query/, "Diagnostics must not probe permission state before a user gesture.");
assert.doesNotMatch(client, /fetch\s*\(|sendBeacon\s*\(|XMLHttpRequest/, "Device evidence must stay local until the user explicitly copies it.");
assert.doesNotMatch(client, /localStorage|sessionStorage/, "Diagnostics must not persist device evidence in browser storage.");
assert.doesNotMatch(client, /userAgent|navigator\.platform/, "Diagnostics must not collect browser fingerprint strings.");
assert.doesNotMatch(client, /file\.name/, "Picker evidence must not collect customer file names.");
assert.doesNotMatch(client, /signInWithOtp|verifyOtp|sms-auth|phone-auth|SMS Login/i, "SMS/OTP execution remains on hold and must not be part of mobile readiness diagnostics.");

assert.match(creatorEncouragement, /usePathname/, "Global Creator Support must observe the active route before loading private status.");
assert.match(creatorEncouragement, /isPublicAccountPath/, "Creator Support must reuse the canonical public-account route classifier.");
assert.match(creatorEncouragement, /if\(isPublicAccountPath\(pathname\)\)return/, "Creator Support status fetch must be disabled on every canonical public account surface.");
assert.match(creatorEncouragement, /if\(!isPublicAccountPath\(pathname\)\)void load\(\)/, "Creator Support must only auto-load private status on non-public account routes.");

for (const pattern of [
  /100svh/,
  /safe-area-inset-top/,
  /safe-area-inset-right/,
  /safe-area-inset-bottom/,
  /safe-area-inset-left/,
  /min-height:48px/,
  /font-size:16px/,
  /touch-action:manipulation/,
  /focus-visible/,
  /@media\(max-width:760px\)/,
  /@media\(max-width:360px\)/,
  /prefers-reduced-motion:reduce/,
]) assert.match(css, pattern);

assert.ok(stability.includes('path:"/mobile-readiness"'), "The real-device diagnostics surface must be covered by Production stability.");

console.log("✓ Mobile readiness baseline remains public-but-noindex, exact-path bounded and permission-free");
console.log("✓ Global Creator Support cannot leak signed-out private status requests into canonical public account surfaces");
console.log("✓ Microphone, Photos and Camera checks are explicit user-tap self-tests and stay local to the device");
console.log("✓ Diagnostic microphone streams are released immediately; picker reports omit customer file names");
console.log("✓ Device report keeps physicalDeviceVerified=false until real-device evidence is externally reviewed");
console.log("✓ The mobile readiness page is locked into the Production stability surface set");
