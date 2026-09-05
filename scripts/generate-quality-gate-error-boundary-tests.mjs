import assert from "node:assert/strict";
import fs from "node:fs";

const route=fs.readFileSync("app/api/generate/route.js","utf8");

assert.match(route,/function generationQualityGateFailure\(message\)/);
assert.match(route,/Soolen Super Brain could not verify the generated specification after autonomous repair attempts/);
assert.match(route,/Generated app failed final verification:/);
assert.match(route,/code:"GENERATION_QUALITY_GATE_NOT_MET"/);
assert.match(route,/retryable:true\},422\)/);
assert.match(route,/restoreFailedAppBuilderCreate/);
assert.match(route,/refundAiCredits/);
assert.match(route,/console\.warn\("AI BUILD APP & WEB quality gate:","GENERATION_QUALITY_GATE_NOT_MET"\)/);
assert.match(route,/console\.error\("AI BUILD APP & WEB error:",error\)/);
assert.match(route,/\},500\);/);

const catchIndex=route.indexOf("}catch(error){");
const refundIndex=route.indexOf("refundAiCredits(userId",catchIndex);
const qualityIndex=route.indexOf("if(generationQualityGateFailure(message))",catchIndex);
const unknownErrorIndex=route.indexOf('console.error("AI BUILD APP & WEB error:",error)',catchIndex);
assert.ok(catchIndex>=0&&refundIndex>catchIndex,"Generate catch must preserve automatic financial restoration.");
assert.ok(qualityIndex>refundIndex,"Quality-gate response must happen after entitlement/credit restoration.");
assert.ok(unknownErrorIndex>qualityIndex,"Expected quality-gate failures must return before unknown exceptions are logged as server errors.");

console.log("✓ Generate quality-gate failures are recoverable 422 responses with a stable error code");
console.log("✓ Failed generation still restores entitlement/refunds credits before returning");
console.log("✓ Unknown exceptions remain 500 errors and keep server-error logging");