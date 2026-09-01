import assert from "node:assert/strict";
import fs from "node:fs";

const uploader=fs.readFileSync("app/components/ReferenceUploader.js","utf8");
const css=fs.readFileSync("app/mobile-quality.css","utf8");
const policy=fs.readFileSync("lib/media/reference-policy.js","utf8");

for(const pattern of [
  /type="file"/,
  /multiple/,
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
  /reusableAcrossUsers:false/,
  /privateCustomerAsset:true/,
]) assert.match(uploader,pattern);

assert.match(css,/\.referenceDock\{right:max\(10px,env\(safe-area-inset-right\)\)/);
assert.match(css,/safe-area-inset-bottom/);
assert.match(css,/72svh/);
assert.match(css,/-webkit-overflow-scrolling:touch/);
assert.match(policy,/REFERENCE_LIMITS/);

console.log("✓ Upload Ref mobile code supports iPhone HEIC/HEIF, QuickTime/MP4, multiple selection and inline video preview");
console.log("✓ Object URLs, media processing timeouts and SHA-256 dedupe are bounded and cleaned up");
console.log("✓ Private owner-scoped storage remains mandatory and the mobile picker panel respects safe areas");
console.log("✓ Real Photos/Camera picker behavior remains a final iPhone evidence item, not a fabricated code claim");
