import assert from "node:assert/strict";
import fs from "node:fs";

const account = fs.readFileSync("app/components/AccountNav.js", "utf8");
const uploader = fs.readFileSync("app/components/ReferenceUploader.js", "utf8");
const voice = fs.readFileSync("app/components/SoolenVoiceAssistant.js", "utf8");
const readiness = fs.readFileSync("app/mobile-readiness/MobileReadinessClient.js", "utf8");
const workflow = fs.readFileSync(".github/workflows/production-mobile-browser-qa.yml", "utf8");
const productionQa = fs.readFileSync("scripts/production-mobile-real-device-entry-qa.mjs", "utf8");

for (const pattern of [
  /accountTrigger\{[^}]*min-height:44px/,
  /visibleLogout\{[^}]*min-height:44px/,
  /accountMenu button\{[^}]*min-height:44px/,
  /safe-area-inset-right/,
  /safe-area-inset-top/,
]) assert.match(account, pattern);

for (const pattern of [
  /data-reference-library-input/,
  /data-reference-camera-input/,
  /capture="environment"/,
  /Photos · Video · Files/,
  /Take Photo/,
  /\.upload,\.camera,\.analyze\{[^}]*min-height:44px/,
  /min-width:44px;min-height:44px/,
]) assert.match(uploader, pattern);

for (const pattern of [
  /async function ensureTouchAppleMicrophoneAccess/,
  /navigator\.mediaDevices\.getUserMedia\(\{ audio: true \}\)/,
  /track\.stop\(\)/,
  /const micAccess=await ensureTouchAppleMicrophoneAccess\(\)/,
  /Apple may show its normal system permission prompt/,
]) assert.match(voice, pattern);
const voiceLifecycle = voice.match(/useEffect\(\(\)=>\{[\s\S]*?\n  \},\[\]\);/)?.[0] || "";
assert.doesNotMatch(voiceLifecycle, /getUserMedia|\.start\(\)/, "Voice lifecycle must never auto-start microphone capture.");

for (const pattern of [
  /reportVersion:\s*2/,
  /evidenceLevel:\s*"REAL_DEVICE_SELF_TEST"/,
  /physicalDeviceVerified:\s*false/,
  /permissionPromptsTriggered:\s*Boolean\(interaction\.microphonePromptAttempted\)/,
  /Test microphone/,
  /Test Photos/,
  /Test camera/,
  /data-mobile-photo-probe/,
  /data-mobile-camera-probe/,
  /capture="environment"/,
  /navigator\.mediaDevices\.getUserMedia\(\{ audio: true \}\)/,
  /No user ID, phone number, email address, file name or browser user-agent is collected/,
]) assert.match(readiness, pattern);
assert.doesNotMatch(readiness, /file\.name/, "Diagnostic picker evidence must not collect file names.");
assert.doesNotMatch(readiness, /fetch\s*\(|sendBeacon\s*\(|XMLHttpRequest/, "Diagnostic evidence must not be uploaded automatically.");

assert.match(workflow, /production-mobile-real-device-entry-qa\.mjs/);
for (const pattern of [
  /devices\["iPhone 13"\]/,
  /"Test microphone", "Test Photos", "Test camera"/,
  /box\.width >= 44 && box\.height >= 44/,
  /permissionActionsExercised: false/,
  /microphoneCaptureExercised: false/,
  /pickerInteractionExercised: false/,
  /physicalDeviceVerified: false/,
]) assert.match(productionQa, pattern);
assert.doesNotMatch(productionQa, /\.click\(|getUserMedia\s*\(/, "Production browser QA must not trigger real permission actions.");

console.log("✓ Batch 12 locks Account 44px/safe-area mobile chrome into CI");
console.log("✓ Upload Ref exposes separate library and rear-camera paths with 44px+ controls");
console.log("✓ Voice primes iPhone microphone permission only from explicit user tap and releases the stream immediately");
console.log("✓ Mobile Readiness exposes local-only microphone/Photos/camera self-tests without auto-upload or file-name collection");
console.log("✓ Production WebKit QA verifies deployed real-device entry readiness while preserving physicalDeviceVerified=false");
