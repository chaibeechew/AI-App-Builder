import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";

const baseUrl = String(process.env.LANERIQ_PRODUCTION_URL || "https://laneriq-ai.vercel.app").replace(/\/$/, "");
const expectedSha = String(process.env.LANERIQ_EXPECTED_SHA || "").trim();
const artifactDir = path.resolve("artifacts/production-mobile-browser-qa");
await fs.mkdir(artifactDir, { recursive: true });

function assertPrivateSignedOut(response, body, label) {
  assert.equal(response.status, 401, `${label} must fail closed with signed-out 401`);
  assert.match(response.headers.get("content-type") || "", /application\/json/i, `${label} must return JSON`);
  const cache = response.headers.get("cache-control") || "";
  assert.match(cache, /private/i, `${label} must be private`);
  assert.match(cache, /no-store/i, `${label} must be no-store`);
  assert.match(String(body?.error || ""), /authentication required/i, `${label} must reject before protected work`);

  const serialized = JSON.stringify(body).toLowerCase();
  for (const forbidden of [
    "openai_api_key",
    "gemini_api_key",
    "service_role",
    "postgres",
    "create_app_demo",
    "app_shares",
  ]) {
    assert.equal(serialized.includes(forbidden), false, `${label} leaked internal detail: ${forbidden}`);
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
  { label: "/api/voice/understand", path: "/api/voice/understand", body: { transcript: "Create a private CRM", history: [] } },
  { label: "/api/security", path: "/api/security", body: { text: "const safe = true;" } },
  { label: "/api/share", path: "/api/share", body: { appId: "00000000-0000-4000-8000-000000000000" } },
  { label: "/api/demo", path: "/api/demo", body: { appId: "00000000-0000-4000-8000-000000000000", versionId: "00000000-0000-4000-8000-000000000001" } },
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
  assertPrivateSignedOut(response, body, check.label);
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
  authenticatedConversationVerified: false,
  authenticatedSecurityScanVerified: false,
  authenticatedShareCreationVerified: false,
  authenticatedDemoCreationVerified: false,
  liveProviderVerified: false,
  physicalDeviceVerified: false,
  officialStoreVerified: false,
  results,
};

await fs.writeFile(
  path.join(artifactDir, "interaction-api-boundary-report.json"),
  `${JSON.stringify(report, null, 2)}\n`,
  "utf8"
);

console.log(`✓ Production interaction API boundary QA passed ${results.length}/${checks.length} exact signed-out HTTP gates on SHA ${buildInfo?.commitSha || "unknown"}`);
console.log("✓ Evidence is PRODUCTION_HTTP signed-out access-control/cache proof only; authenticated interactions, LIVE_PROVIDER, PHYSICAL_DEVICE and OFFICIAL_STORE remain separate");
