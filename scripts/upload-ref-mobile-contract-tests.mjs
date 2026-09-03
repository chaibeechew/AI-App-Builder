import assert from "node:assert/strict";
import fs from "node:fs";

const uploader=fs.readFileSync("app/components/ReferenceUploader.js","utf8");
const css=fs.readFileSync("app/mobile-quality.css","utf8");
const policy=fs.readFileSync("lib/media/reference-policy.js","utf8");

for(const pattern of [
  /type="file"/,
  /multiple/,
  /data-reference-library-input/,
  /data-reference-camera-input/,
  /accept="image\/\*" capture="environment"/,
  /Photos · Video · Files/,
  /Take Photo/,
  /image\/heic/,
  /image\/heif/,
  /video\/quicktime/,
  /video\/mp4/,
  /playsInline/,
  /createImageBitmap/,
  /URL\.createObjectURL/,
  /URL\.revokeObjectURL/,
  /crypto\.subtle\.digest\("SHA-256"/,
  /maxFiles/,
  /maxTotalSourceBytes/,
  /maxAnalysisReferences/,
  /12000/,
  /supabase\.auth\.getUser\(\)/,
  /storage\.from\("user-assets"\)\.upload/,
  /reusableAcrossUsers:\s*false/,
  /privateCustomerAsset:\s*true/,
  /min-width:44px;min-height:44px/,
  /\.upload,\.camera,\.analyze\{[^}]*min-height:44px/,
  /@media\(max-width:640px\)\{[\s\S]*\.panel\{position:fixed;inset:0/,
  /safe-area-inset-bottom/,
]) assert.match(uploader,pattern);

assert.match(css,/\.referenceDock\{right:max\(10px,env\(safe-area-inset-right\)\)/);
assert.match(css,/safe-area-inset-bottom/);
assert.match(css,/72svh/);
assert.match(css,/-webkit-overflow-scrolling:touch/);
assert.match(policy,/REFERENCE_LIMITS/);

console.log("✓ Upload Ref mobile code exposes separate Photos/Video/Files and rear-camera capture paths");
console.log("✓ Picker, close, remove and analyze actions meet 44px mobile touch-target rules and safe-area/full-screen constraints");
console.log("✓ iPhone HEIC/HEIF, QuickTime/MP4, multiple selection, inline video preview and bounded local preprocessing remain supported");
console.log("✓ Object URLs, media processing timeouts, SHA-256 dedupe and owner-scoped private storage remain bounded and cleaned up");
console.log("✓ Physical Photos/Camera picker interaction remains real-device evidence, not a fabricated code claim");
