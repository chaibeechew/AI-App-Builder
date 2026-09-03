import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";

const baseUrl = String(process.env.LANERIQ_PRODUCTION_URL || "https://laneriq-ai.vercel.app").replace(/\/$/, "");
const expectedSha = String(process.env.LANERIQ_EXPECTED_SHA || "").trim();
const artifactDir = path.resolve("artifacts/production-mobile-browser-qa");
await fs.mkdir(artifactDir, { recursive: true });

async function jsonRequest(pathname, init = {}) {
  const response = await fetch(`${baseUrl}${pathname}`, {
    ...init,
    cache: "no-store",
    redirect: "manual",
    headers: {
      Accept: "application/json",
      Origin: baseUrl,
      "Cache-Control": "no-cache",
      ...(init.headers || {}),
    },
  });
  const text = await response.text();
  let body = null;
  try { body = JSON.parse(text); } catch {}
  return { response, text, body };
}

const build = await jsonRequest("/api/build-info");
assert.equal(build.response.status, 200, `build-info must return 200, got ${build.response.status}`);
assert.equal(build.body?.ok, true, "build-info must report ok=true");
assert.equal(build.body?.product, "LANERIQ AI", "build-info must identify LANERIQ AI");
if (expectedSha) assert.equal(build.body?.commitSha, expectedSha, `Production SHA ${build.body?.commitSha || "unknown"} must equal ${expectedSha}`);

const cases = [
  {
    id: "community-chat",
    pathname: "/api/community-chat",
    init: { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message: "provider-boundary-qa" }) },
  },
  {
    id: "voice-transcribe",
    pathname: "/api/voice/transcribe",
    init: { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ audioBase64: "AA==", mimeType: "audio/webm" }) },
  },
  {
    id: "neural-voice",
    pathname: "/api/soolenai/voice",
    init: { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text: "provider-boundary-qa", language: "en" }) },
  },
  {
    id: "admin-voice-clone",
    pathname: "/api/admin/soolenai-voice/clone",
    init: { method: "POST" },
  },
];

const results = [];
for (const testCase of cases) {
  const result = await jsonRequest(testCase.pathname, testCase.init);
  assert.equal(result.response.status, 401, `${testCase.pathname} signed-out POST must fail closed with 401, got ${result.response.status}: ${result.text.slice(0, 200)}`);
  assert.match(String(result.response.headers.get("content-type") || ""), /application\/json/i, `${testCase.pathname} 401 must stay JSON`);
  assert.match(String(result.response.headers.get("cache-control") || ""), /no-store/i, `${testCase.pathname} 401 must be no-store`);
  const responseText = JSON.stringify(result.body || result.text);
  assert.doesNotMatch(responseText, /OPENAI|GEMINI|ELEVENLABS|API[_ -]?KEY|provider endpoint|generativelanguage|api\.openai|api\.elevenlabs/i, `${testCase.pathname} must not expose provider identity or credentials`);
  results.push({ id: testCase.id, pathname: testCase.pathname, status: result.response.status, json: Boolean(result.body), noStore: /no-store/i.test(String(result.response.headers.get("cache-control") || "")), passed: true });
  console.log(`✓ ${testCase.pathname}: signed-out Production POST failed closed with JSON 401 before provider execution`);
}

const evidence = {
  evidenceVersion: 1,
  evidenceLevel: "PRODUCTION_HTTP",
  productionUrl: baseUrl,
  expectedSha: expectedSha || null,
  actualSha: build.body?.commitSha || null,
  authenticatedProviderExecutionExercised: false,
  liveProviderVerified: false,
  physicalDeviceVerified: false,
  officialStoreVerified: false,
  generatedAt: new Date().toISOString(),
  results,
};
await fs.writeFile(path.join(artifactDir, "provider-boundary-report.json"), `${JSON.stringify(evidence, null, 2)}\n`, "utf8");
console.log(`✓ Production provider-boundary QA passed ${results.length}/${cases.length} exact signed-out API gates on SHA ${build.body?.commitSha || "unknown"}`);
console.log("✓ Evidence is Production HTTP + access-control proof only; it is not LIVE_PROVIDER, PHYSICAL_DEVICE, or OFFICIAL_STORE evidence");
