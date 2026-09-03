import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";

const base = String(process.env.LANERIQ_PRODUCTION_URL || "https://laneriq-ai.vercel.app").replace(/\/$/, "");
const expectedSha = String(process.env.LANERIQ_EXPECTED_SHA || "").trim();
const outputDir = new URL("../artifacts/production-mobile-browser-qa/", import.meta.url);

function privateNoStore(headers) {
  const value = String(headers.get("cache-control") || "").toLowerCase();
  return value.includes("private") && value.includes("no-store");
}

async function fetchJson(path, options = {}) {
  const response = await fetch(`${base}${path}`, { cache: "no-store", ...options });
  const text = await response.text();
  let data = null;
  try { data = JSON.parse(text); } catch {}
  return { response, data, text };
}

const build = await fetchJson("/api/build-info", { headers: { "Cache-Control": "no-cache" } });
assert.equal(build.response.status, 200, "Production build-info must be reachable.");
assert.ok(expectedSha, "LANERIQ_EXPECTED_SHA is required.");
assert.equal(String(build.data?.commitSha || ""), expectedSha, "Production must be on the exact expected SHA.");

const signedOutGet = await fetchJson("/api/account/email-change");
assert.equal(signedOutGet.response.status, 401, "Signed-out email-change GET must fail closed.");
assert.equal(signedOutGet.data?.code, "AUTHENTICATION_REQUIRED");
assert.ok(privateNoStore(signedOutGet.response.headers), "Signed-out email-change GET must be private/no-store.");

const signedOutPost = await fetchJson("/api/account/email-change", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Origin: base,
    "Sec-Fetch-Site": "same-origin",
  },
  body: JSON.stringify({ action: "request", newEmail: "qa@example.com", requestId: "production-signed-out-qa" }),
});
assert.equal(signedOutPost.response.status, 401, "Signed-out email-change POST must fail before any code dispatch.");
assert.equal(signedOutPost.data?.code, "AUTHENTICATION_REQUIRED");
assert.ok(privateNoStore(signedOutPost.response.headers), "Signed-out email-change POST must be private/no-store.");

const pageResponse = await fetch(`${base}/account/security`, { redirect: "manual", cache: "no-store" });
assert.ok([301, 302, 303, 307, 308].includes(pageResponse.status), "Signed-out account security page must redirect to authentication.");
const location = String(pageResponse.headers.get("location") || "");
assert.match(location, /\/auth(?:\?|$)/, "Account security redirect must target LANERIQ auth.");

const readiness = await fetchJson("/api/auth/verification/status");
assert.equal(readiness.response.status, 200, "Email verification readiness must remain observable.");
assert.equal(readiness.data?.otpAuthority, "laneriq");
assert.equal(readiness.data?.sessionAuthority, "laneriq");
assert.equal(readiness.data?.stages?.guard, true);
assert.equal(readiness.data?.stages?.storage, true);
assert.equal(readiness.data?.stages?.delivery, true);

const report = {
  evidenceLevel: "PRODUCTION_HTTP",
  expectedSha,
  deployedSha: build.data?.commitSha || null,
  signedOutBoundaryVerified: true,
  accountSecurityRedirectVerified: true,
  emailVerificationInfrastructureReady: readiness.data?.ready === true,
  emailDeliveryOperationalReady: readiness.data?.operationalReady === true,
  emailDeliveryState: readiness.data?.deliveryHealth?.state || null,
  emailDeliveryIssue: readiness.data?.deliveryHealth?.issue || null,
  authenticatedDualCodeFlowExercised: false,
  liveEmailDeliveryVerified: false,
  physicalDeviceVerified: false,
  smsFallbackUsed: false,
};

await mkdir(outputDir, { recursive: true });
await writeFile(new URL("email-change-boundary-report.json", outputDir), `${JSON.stringify(report, null, 2)}\n`);
console.log("✓ Exact Production SHA verified for Email Change boundary");
console.log("✓ Signed-out Email Change API fails closed before any code dispatch");
console.log("✓ Account Security page is protected and Email Verification infrastructure is ready");
console.log(`ℹ Email delivery operationalReady=${report.emailDeliveryOperationalReady} state=${report.emailDeliveryState || "unknown"} issue=${report.emailDeliveryIssue || "none"}`);
console.log("ℹ LIVE_EMAIL_DELIVERY remains separate until a real inbox receives the dual verification flow");
