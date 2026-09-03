import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";

const baseUrl = String(process.env.LANERIQ_PRODUCTION_URL || "https://laneriq-ai.vercel.app").replace(/\/$/, "");
const expectedSha = String(process.env.LANERIQ_EXPECTED_SHA || "").trim();
const artifactDir = path.resolve("artifacts/production-mobile-browser-qa");
await fs.mkdir(artifactDir, { recursive: true });

function assertPrivateJson(response, body, label) {
  assert.equal(response.status, 401, `${label} must fail closed with signed-out 401`);
  assert.match(response.headers.get("content-type") || "", /application\/json/i, `${label} must return JSON`);
  const cache = response.headers.get("cache-control") || "";
  assert.match(cache, /private/i, `${label} must be private`);
  assert.match(cache, /no-store/i, `${label} must be no-store`);
  assert.equal(body?.success, false, `${label} must not report success while signed out`);
  assert.match(String(body?.error || ""), /authentication required/i, `${label} must fail before protected work`);

  const serialized = JSON.stringify(body).toLowerCase();
  for (const forbidden of [
    "openai_api_key",
    "gemini_api_key",
    "service_role",
    "supabase_service",
    "postgres",
    "request_subscription_refund",
    "request_withdrawal",
  ]) {
    assert.equal(serialized.includes(forbidden), false, `${label} leaked internal provider/database detail: ${forbidden}`);
  }
}

const buildResponse = await fetch(`${baseUrl}/api/build-info`, {
  headers: { Accept: "application/json", "Cache-Control": "no-cache" },
  cache: "no-store",
});
const buildInfo = await buildResponse.json();
assert.equal(buildResponse.status, 200, "build-info must be healthy");
assert.equal(buildInfo?.product, "LANERIQ AI");
if (expectedSha) assert.equal(buildInfo?.commitSha, expectedSha, `Production must match exact SHA ${expectedSha}`);

const checks = [
  {
    label: "/api/images/analyze",
    path: "/api/images/analyze",
    body: { imageData: "not-processed-while-signed-out", mimeType: "image/jpeg" },
  },
  {
    label: "/api/create-app",
    path: "/api/create-app",
    body: { prompt: "Create a private test app" },
  },
  {
    label: "/api/refunds",
    path: "/api/refunds",
    body: { subscriptionId: "00000000-0000-4000-8000-000000000000", reason: "test" },
  },
  {
    label: "/api/withdrawals",
    path: "/api/withdrawals",
    body: { payoutAccountId: "00000000-0000-4000-8000-000000000000", amount: 1 },
  },
];

const results = [];
for (const check of checks) {
  const response = await fetch(`${baseUrl}${check.path}`, {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/json", "Cache-Control": "no-cache" },
    body: JSON.stringify(check.body),
    cache: "no-store",
  });
  const body = await response.json().catch(() => null);
  assertPrivateJson(response, body, check.label);
  results.push({
    label: check.label,
    status: response.status,
    privateNoStore: true,
    failedBeforeProtectedExecution: true,
    passed: true,
  });
  console.log(`✓ ${check.label}: signed-out Production POST failed closed with private JSON 401`);
}

const report = {
  evidenceVersion: 1,
  evidenceLevel: "PRODUCTION_HTTP",
  productionUrl: baseUrl,
  buildInfo,
  expectedSha: expectedSha || null,
  generatedAt: new Date().toISOString(),
  signedOutBoundaryVerified: true,
  authenticatedExecutionVerified: false,
  authenticatedImageProcessingVerified: false,
  authenticatedGenerationVerified: false,
  authenticatedRefundRpcVerified: false,
  authenticatedWithdrawalRpcVerified: false,
  liveProviderVerified: false,
  physicalDeviceVerified: false,
  officialStoreVerified: false,
  results,
};

await fs.writeFile(
  path.join(artifactDir, "high-risk-api-boundary-report.json"),
  `${JSON.stringify(report, null, 2)}\n`,
  "utf8"
);

console.log(`✓ Production high-risk API boundary QA passed ${results.length}/${checks.length} exact signed-out HTTP gates on SHA ${buildInfo?.commitSha || "unknown"}`);
console.log("✓ Evidence is PRODUCTION_HTTP signed-out access-control/cache proof only; authenticated execution, LIVE_PROVIDER, PHYSICAL_DEVICE and OFFICIAL_STORE remain separate");
