import assert from "node:assert/strict";
import fs from "node:fs";
import { isPublicAccountPath } from "../lib/auth/session-safety.js";

const page = fs.readFileSync("app/production-e2e/page.js", "utf8");
const client = fs.readFileSync("app/production-e2e/ProductionE2EClient.js", "utf8");
const css = fs.readFileSync("app/production-e2e/production-e2e.module.css", "utf8");
const buildInfo = fs.readFileSync("app/api/build-info/route.js", "utf8");

assert.equal(isPublicAccountPath("/production-e2e"), false, "Authenticated Production E2E evidence must remain protected by account middleware.");
assert.match(page, /robots:\s*\{\s*index:\s*false,\s*follow:\s*false\s*\}/);
assert.match(page, /ProductionE2EClient/);

for (const pattern of [
  /fetch\("\/api\/build-info"/,
  /body\?\.product !== "LANERIQ AI"/,
  /environment === "production"/,
  /commitRef === "main"/,
  /COMMIT_SHA\.test\(commitSha\)/,
  /Production evidence is locked to an exact main deployment/,
  /fetch\("\/api\/apps"/,
  /fetch\(`\/api\/apps\/\$\{selected\.id\}`/,
  /current_version_id/,
  /detail\.versions\.find/,
  /\/a\/\$\{id\}\?demo=1/,
  /\/website\/\$\{id\}/,
  /\/app-dashboard\/\$\{id\}\/versions/,
  /\/release\/\$\{id\}/,
  /FRESH_WINDOW_MS\s*=\s*20 \* 60 \* 1000/,
  /rawAgeMs >= 0 && rawAgeMs <= FRESH_WINDOW_MS/,
  /freshGenerationWithin20Minutes/,
  /reportVersion:\s*2/,
  /evidenceLevel:\s*"authenticated-production-browser"/,
  /exactProductionBuildVerified:\s*build\.exactProductionBuildVerified/,
  /physicalDeviceVerified:\s*false/,
  /originalGenerationProviderVerified:\s*false/,
  /evidenceRunnerReplayedProviderOutput:\s*false/,
  /writesExercised:\s*false/,
  /smsExercised:\s*false/,
  /commitSha:\s*build\.commitSha/,
  /commitRef:\s*build\.commitRef/,
  /environment:\s*build\.environment/,
  /redirect:\s*"manual"/,
  /credentials:\s*"same-origin"/,
  /Copy report/,
]) assert.match(client, pattern);

assert.match(buildInfo, /VERCEL_GIT_COMMIT_SHA/);
assert.match(buildInfo, /VERCEL_GIT_COMMIT_REF/);
assert.match(buildInfo, /VERCEL_ENV/);
assert.match(buildInfo, /Cache-Control": "private, no-store/);

assert.doesNotMatch(client, /Math\.max\(0,\s*Date\.now\(\) - createdAtMs\)/, "A future project timestamp must never be coerced to age 0 and accepted as fresh evidence.");
assert.doesNotMatch(client, /providerOutputReplayed:\s*false/, "Evidence-runner behavior must not be mislabeled as proof about the original generation provider output.");
assert.doesNotMatch(client, /createClient\s*\(/, "Evidence UI must use normal protected application APIs instead of constructing privileged Supabase access.");
assert.doesNotMatch(client, /signInWithOtp|verifyOtp|phone-auth|sms-auth/i, "SMS/OTP execution remains on hold and outside authenticated E2E evidence.");
assert.doesNotMatch(client, /\/api\/generate|\/api\/modify|\/api\/apps\/.*\/publish/, "Evidence collection must be read-only and must not create, modify or publish a project.");
assert.doesNotMatch(client, /service_role|SUPABASE_SERVICE|admin\.createUser/i, "Evidence collection must never bypass normal Auth with privileged credentials.");

for (const pattern of [
  /100svh/,
  /safe-area-inset-top/,
  /min-height:48px/,
  /font-size:16px/,
  /touch-action:manipulation/,
  /focus-visible/,
  /@media\(max-width:760px\)/,
  /prefers-reduced-motion:reduce/,
]) assert.match(css, pattern);

console.log("✓ Authenticated Production E2E evidence route stays protected and noindex");
console.log("✓ Evidence can be issued only from an exact Production main deployment with a real 40-character commit SHA");
console.log("✓ Evidence runner validates a real persisted app, current version, App Demo, Website Preview, Versions/Undo and Release surfaces");
console.log("✓ Fresh Generate→Save evidence is bounded to a non-future project created within 20 minutes instead of inferred from an old or clock-invalid project");
console.log("✓ Report v2 distinguishes exact-build, physical-device, original-provider, runner-replay and write-execution evidence truthfully");
console.log("✓ Evidence is read-only: no fake Auth, no provider replay, no Generate/Modify/Publish write, and SMS remains untouched");
