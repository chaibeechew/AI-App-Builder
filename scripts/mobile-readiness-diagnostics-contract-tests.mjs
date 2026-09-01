import assert from "node:assert/strict";
import fs from "node:fs";
import { isPublicAccountPath } from "../lib/auth/session-safety.js";

const page = fs.readFileSync("app/mobile-readiness/page.js", "utf8");
const client = fs.readFileSync("app/mobile-readiness/MobileReadinessClient.js", "utf8");
const css = fs.readFileSync("app/mobile-readiness/mobile-readiness.module.css", "utf8");
const stability = fs.readFileSync("scripts/production-stability-100.mjs", "utf8");

assert.equal(isPublicAccountPath("/mobile-readiness"), true, "Real-device diagnostics must be reachable before sign-in.");
assert.equal(isPublicAccountPath("/mobile-readiness/private"), false, "The diagnostics public exception must stay exact and bounded.");

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
  /capture/,
  /navigator\.mediaDevices\?\.getUserMedia/,
  /speechSynthesis/,
  /SpeechRecognition|webkitSpeechRecognition/,
  /serviceWorker/,
  /display-mode: standalone/,
  /permissionPromptsTriggered:\s*false/,
  /Copy report/,
  /No user ID, phone number, email address or browser user-agent is collected/,
]) assert.match(client, pattern);

assert.doesNotMatch(client, /getUserMedia\s*\(/, "Diagnostics must inspect microphone support without requesting permission.");
assert.doesNotMatch(client, /navigator\.permissions\.query/, "Diagnostics must not probe permission state or trigger privacy-sensitive flows.");
assert.doesNotMatch(client, /fetch\s*\(|sendBeacon\s*\(|XMLHttpRequest/, "Device evidence must stay local until the user explicitly copies it.");
assert.doesNotMatch(client, /localStorage|sessionStorage/, "Diagnostics must not persist device evidence in browser storage.");
assert.doesNotMatch(client, /userAgent|platform/, "Diagnostics must not collect browser fingerprint strings.");
assert.doesNotMatch(client, /signInWithOtp|verifyOtp|sms-auth|phone-auth|SMS Login/i, "SMS/OTP execution remains on hold and must not be part of mobile readiness diagnostics.");

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

console.log("✓ Mobile readiness diagnostics are public-but-noindex, exact-path bounded and permission-free");
console.log("✓ Device report checks viewport, touch, safe area, 44px targets, 16px inputs, picker, media, voice and PWA capabilities without uploading evidence");
console.log("✓ Diagnostics collect no user ID, phone/email, user-agent, browser storage or SMS/OTP execution evidence");
console.log("✓ The mobile readiness page is locked into the Production stability surface set");
