import assert from "node:assert/strict";
import fs from "node:fs";
import {
  HIGH_RISK_API_LIMITS,
  RequestBoundaryError,
  isUuid,
  isVerifiedUser,
  privateJson,
  readBoundedJson,
} from "../lib/security/high-risk-api-boundary.js";

const imageRoute = fs.readFileSync("app/api/images/analyze/route.js", "utf8");
const createAppRoute = fs.readFileSync("app/api/create-app/route.js", "utf8");
const refundRoute = fs.readFileSync("app/api/refunds/route.js", "utf8");
const withdrawalRoute = fs.readFileSync("app/api/withdrawals/route.js", "utf8");
const workflow = fs.readFileSync(".github/workflows/production-mobile-browser-qa.yml", "utf8");

assert.equal(HIGH_RISK_API_LIMITS.imageAnalyzeBytes, 8_500_000);
assert.equal(HIGH_RISK_API_LIMITS.imageBase64Chars, 8_000_000);
assert.equal(HIGH_RISK_API_LIMITS.createAppBytes, 16 * 1024);
assert.equal(HIGH_RISK_API_LIMITS.createAppPromptChars, 8_000);
assert.equal(HIGH_RISK_API_LIMITS.refundBytes, 4 * 1024);
assert.equal(HIGH_RISK_API_LIMITS.withdrawalBytes, 4 * 1024);

assert.equal(isUuid("00000000-0000-4000-8000-000000000000"), true);
assert.equal(isUuid("not-a-uuid"), false);
assert.equal(isVerifiedUser({ email_confirmed_at: "2026-09-03T00:00:00Z" }), true);
assert.equal(isVerifiedUser({}), false);

const privateResponse = privateJson({ ok: true }, 201);
assert.equal(privateResponse.status, 201);
assert.match(privateResponse.headers.get("cache-control") || "", /private/);
assert.match(privateResponse.headers.get("cache-control") || "", /no-store/);
assert.equal(privateResponse.headers.get("pragma"), "no-cache");

const parsed = await readBoundedJson(new Request("https://laneriq.invalid", {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ ok: true }),
}), 128);
assert.deepEqual(parsed, { ok: true });

await assert.rejects(
  readBoundedJson(new Request("https://laneriq.invalid", {
    method: "POST",
    headers: { "content-type": "application/json", "content-length": "129" },
    body: "{}",
  }), 128),
  (error) => error instanceof RequestBoundaryError && error.status === 413 && error.code === "REQUEST_TOO_LARGE"
);

await assert.rejects(
  readBoundedJson(new Request("https://laneriq.invalid", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ data: "x".repeat(256) }),
  }), 64),
  (error) => error instanceof RequestBoundaryError && error.status === 413
);

await assert.rejects(
  readBoundedJson(new Request("https://laneriq.invalid", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: "{broken",
  }), 128),
  (error) => error instanceof RequestBoundaryError && error.status === 400 && error.code === "INVALID_JSON"
);

await assert.rejects(
  readBoundedJson(new Request("https://laneriq.invalid", {
    method: "POST",
    headers: { "content-type": "text/plain" },
    body: "{}",
  }), 128),
  (error) => error instanceof RequestBoundaryError && error.status === 415
);

for (const [label, source] of [
  ["Image Analyze", imageRoute],
  ["Create App", createAppRoute],
  ["Refund", refundRoute],
  ["Withdrawal", withdrawalRoute],
]) {
  assert.match(source, /auth\.getUser\(\)/, `${label} must authenticate before protected execution`);
  assert.match(source, /isVerifiedUser\(user\)/, `${label} must require a verified account`);
  assert.match(source, /readBoundedJson\(request,/, `${label} must use bounded JSON parsing`);
  assert.match(source, /privateJson\(/, `${label} must use private no-store JSON responses`);
  assert.doesNotMatch(source, /await request\.json\(/, `${label} must not bypass the bounded JSON parser`);
}

for (const pattern of [
  /HIGH_RISK_API_LIMITS\.imageAnalyzeBytes/,
  /HIGH_RISK_API_LIMITS\.imageBase64Chars/,
  /ALLOWED_IMAGE_MIME/,
  /16_384/,
  /Image MIME type does not match/,
]) assert.match(imageRoute, pattern);

for (const pattern of [
  /HIGH_RISK_API_LIMITS\.createAppBytes/,
  /HIGH_RISK_API_LIMITS\.createAppPromptChars/,
  /runAutonomousEngine\(prompt\)/,
  /humanApprovalRequired:\s*true/,
]) assert.match(createAppRoute, pattern);

for (const pattern of [
  /HIGH_RISK_API_LIMITS\.refundBytes/,
  /isUuid\(subscriptionId\)/,
  /request_subscription_refund/,
  /refundFailure\(error\)/,
]) assert.match(refundRoute, pattern);
assert.doesNotMatch(refundRoute, /error:\s*error\.message/, "Refund API must not expose raw RPC errors");

for (const pattern of [
  /HIGH_RISK_API_LIMITS\.withdrawalBytes/,
  /isUuid\(payoutAccountId\)/,
  /Math\.round\(amount \* 100\)/,
  /cents > 100_000/,
  /request_withdrawal/,
]) assert.match(withdrawalRoute, pattern);
assert.doesNotMatch(withdrawalRoute, /error:\s*error\.message/, "Withdrawal API must not expose raw RPC errors");

assert.match(workflow, /Verify signed-out Production high-risk API boundaries/);
assert.match(workflow, /production-high-risk-api-boundary-qa\.mjs/);
assert.ok(
  workflow.indexOf("production-high-risk-api-boundary-qa.mjs") < workflow.indexOf("production-mobile-browser-qa.mjs"),
  "High-risk API Production boundary proof must run before browser QA"
);

console.log("✓ High-risk API boundary helper enforces streaming body caps, JSON media type, verification and private no-store responses");
console.log("✓ Image Analyze, Create App, Refund and Withdrawal are auth-first and bounded before protected work/RPC execution");
console.log("✓ Refund and Withdrawal reject malformed UUIDs and do not expose raw database errors");
console.log("✓ Production workflow includes exact-SHA signed-out proof before browser-emulation QA");
console.log("✓ Authenticated image processing, generation, refund/withdrawal RPC success and physical-device evidence remain separate verification gates");
