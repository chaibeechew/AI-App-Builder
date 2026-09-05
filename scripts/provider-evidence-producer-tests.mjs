import assert from "node:assert/strict";
import fs from "node:fs";
import {
  EXTERNAL_PROVIDER_EVIDENCE_MAX_OUTPUT_TOKENS,
  EXTERNAL_PROVIDER_EVIDENCE_PROMPT,
  preflightExternalProviderEvidenceCanary,
  runBoundedExternalProviderEvidenceCanary,
} from "../lib/ai/provider-evidence-producer.js";
import {
  getRecordedProviderEvidenceReceipts,
  resetProviderEvidenceRegistryForTests,
} from "../lib/ai/provider-evidence-control-plane.js";

const SHA = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
const NOW = Date.parse("2026-09-05T04:10:00.000Z");
const SIGNING_SECRET = "batch133-provider-evidence-signing-secret-0123456789";

function baseEnv(overrides = {}) {
  return {
    VERCEL_ENV: "production",
    VERCEL_GIT_COMMIT_SHA: SHA,
    SOOLEN_COST_MODE: "free",
    SOOLEN_FREE_TIER_PROVIDERS: "groq,soolen-local",
    SOOLEN_FREE_TIER_HARD_STOP_PROVIDERS: "groq",
    LANERIQ_PROVIDER_EVIDENCE_SIGNING_SECRET: SIGNING_SECRET,
    LANERIQ_EXTERNAL_PROVIDER_EVIDENCE_CANARY_ENABLED: "true",
    LANERIQ_EXTERNAL_PROVIDER_EVIDENCE_CANARY_PROVIDERS: "groq",
    GROQ_API_KEY: "test-groq-key",
    GROQ_FREE_MODEL: "openai/gpt-oss-20b",
    ...overrides,
  };
}

async function expectBlocked(provider, env, expectedCode) {
  let fetchCalls = 0;
  await assert.rejects(
    () => runBoundedExternalProviderEvidenceCanary(provider, {
      env,
      now: NOW,
      fetchFn: async () => {
        fetchCalls += 1;
        throw new Error("Network must not be reached for blocked evidence canary.");
      },
    }),
    (error) => {
      assert.equal(error.code, expectedCode);
      return true;
    },
  );
  assert.equal(fetchCalls, 0, `${expectedCode} must fail before network`);
}

resetProviderEvidenceRegistryForTests();

await expectBlocked("groq", baseEnv({ SOOLEN_COST_MODE: "zero", SOOLEN_ZERO_COST_PROVIDERS: "soolen-local" }), "EXTERNAL_EVIDENCE_CANARY_REQUIRES_FREE_MODE");
await expectBlocked("groq", baseEnv({ LANERIQ_EXTERNAL_PROVIDER_EVIDENCE_CANARY_ENABLED: "false" }), "EXTERNAL_EVIDENCE_CANARY_NOT_ENABLED");
await expectBlocked("groq", baseEnv({ LANERIQ_EXTERNAL_PROVIDER_EVIDENCE_CANARY_PROVIDERS: "" }), "EVIDENCE_PROVIDER_NOT_ALLOWLISTED");
await expectBlocked("groq", baseEnv({ SOOLEN_FREE_TIER_HARD_STOP_PROVIDERS: "" }), "PROVIDER_FREE_TIER_HARD_STOP_REQUIRED");
await expectBlocked("groq", baseEnv({ LANERIQ_PROVIDER_EVIDENCE_SIGNING_SECRET: "" }), "PROVIDER_EVIDENCE_SIGNING_NOT_CONFIGURED");
await expectBlocked("soolen-local", baseEnv(), "EVIDENCE_PROVIDER_NOT_SUPPORTED");
await expectBlocked("openai", baseEnv(), "EVIDENCE_PROVIDER_NOT_SUPPORTED");
await expectBlocked("groq", baseEnv({ VERCEL_ENV: "preview" }), "EXACT_PRODUCTION_RELEASE_REQUIRED");

const ready = preflightExternalProviderEvidenceCanary("groq", baseEnv());
assert.equal(ready.networkPermitted, true);
assert.equal(ready.mode, "free");
assert.equal(ready.production, true);
assert.equal(ready.releaseSha, SHA);
assert.equal(ready.explicitlyEnabled, true);
assert.equal(ready.explicitlyAllowlisted, true);
assert.equal(ready.costAllowed, true);
assert.equal(ready.hardStopVerified, true);
assert.equal(ready.signingConfigured, true);
assert.equal(ready.bounded, true);
assert.equal(ready.maxOutputTokens, 64);

let fetchCalls = 0;
let capturedUrl = "";
let capturedBody = null;
const validEnv = baseEnv();
const result = await runBoundedExternalProviderEvidenceCanary("groq", {
  env: validEnv,
  now: NOW,
  fetchFn: async (url, options) => {
    fetchCalls += 1;
    capturedUrl = String(url);
    capturedBody = JSON.parse(String(options.body || "{}"));
    assert.equal(options.method, "POST");
    assert.match(String(options.headers.Authorization || ""), /^Bearer /);
    return {
      ok: true,
      status: 200,
      text: async () => JSON.stringify({ choices: [{ message: { content: "LANERIQ_PROVIDER_OK" } }] }),
    };
  },
});

assert.equal(fetchCalls, 1, "successful evidence canary must execute exactly one provider request");
assert.equal(capturedUrl, "https://api.groq.com/openai/v1/chat/completions");
assert.equal(capturedBody.max_tokens, EXTERNAL_PROVIDER_EVIDENCE_MAX_OUTPUT_TOKENS);
assert.equal(capturedBody.temperature, 0);
assert.equal(capturedBody.messages.length, 1);
assert.equal(capturedBody.messages[0].role, "user");
assert.equal(capturedBody.messages[0].content, EXTERNAL_PROVIDER_EVIDENCE_PROMPT);
assert.equal(result.success, true);
assert.equal(result.evidenceState, "LIVE_VERIFIED");
assert.equal(result.liveVerified, true);
assert.equal(result.exactReleaseIdentity, true);
assert.equal(result.providerAllowedByCost, true);
assert.equal(result.maxOutputTokens, 64);
assert.equal(result.fallbackAllowed, false);
assert.equal(result.networkAttempts, 1);
assert.equal(result.outputContentReturned, false);
assert.equal(result.outputContentPersisted, false);
assert.equal(result.userDataIncluded, false);
assert.equal(result.receiptSignatureReturned, false);
assert.match(result.outputDigest, /^[a-f0-9]{64}$/);
assert.doesNotMatch(JSON.stringify(result), /LANERIQ_PROVIDER_OK|test-groq-key|batch133-provider-evidence-signing-secret/);

const receipts = getRecordedProviderEvidenceReceipts({ env: validEnv, now: NOW });
assert.equal(receipts.length, 1);
assert.equal(receipts[0].receipt.provider, "groq");
assert.equal(receipts[0].receipt.requestClass, "provider-health");
assert.equal(receipts[0].receipt.maxOutputTokens, 64);
assert.equal(receipts[0].receipt.userDataIncluded, false);
assert.equal(receipts[0].receipt.externalProviderInvoked, true);

resetProviderEvidenceRegistryForTests();
let failureFetchCalls = 0;
await assert.rejects(
  () => runBoundedExternalProviderEvidenceCanary("groq", {
    env: validEnv,
    now: NOW,
    fetchFn: async () => {
      failureFetchCalls += 1;
      return {
        ok: false,
        status: 429,
        text: async () => JSON.stringify({ error: "quota" }),
      };
    },
  }),
  (error) => {
    assert.equal(error.code, "PROVIDER_EVIDENCE_UPSTREAM_FAILED");
    return true;
  },
);
assert.equal(failureFetchCalls, 1);
assert.equal(getRecordedProviderEvidenceReceipts({ env: validEnv, now: NOW }).length, 0, "failed provider request must never create canonical evidence");

const producerSource = fs.readFileSync("lib/ai/provider-evidence-producer.js", "utf8");
const routeSource = fs.readFileSync("app/api/ai/provider-router/evidence/canary/route.js", "utf8");
const proxySource = fs.readFileSync("lib/supabase/proxy.js", "utf8");

assert.match(producerSource, /EXTERNAL_PROVIDER_EVIDENCE_MAX_OUTPUT_TOKENS = 64/);
assert.match(producerSource, /LANERIQ_EXTERNAL_PROVIDER_EVIDENCE_CANARY_ENABLED/);
assert.match(producerSource, /LANERIQ_EXTERNAL_PROVIDER_EVIDENCE_CANARY_PROVIDERS/);
assert.match(producerSource, /PROVIDER_FREE_TIER_HARD_STOP_REQUIRED/);
assert.match(producerSource, /PROVIDER_EVIDENCE_SIGNING_NOT_CONFIGURED/);
assert.match(producerSource, /max_tokens:\s*EXTERNAL_PROVIDER_EVIDENCE_MAX_OUTPUT_TOKENS/);
assert.match(producerSource, /maxOutputTokens:\s*EXTERNAL_PROVIDER_EVIDENCE_MAX_OUTPUT_TOKENS/);
assert.doesNotMatch(producerSource, /generateWithFallback/, "evidence producer must never inherit ordinary Router fallback behavior");

assert.match(routeSource, /resolveLaneriqAdminRequest\(request\)/);
assert.match(routeSource, /keys\.length !== 1 \|\| keys\[0\] !== "provider"/);
assert.match(routeSource, /Prompts and user content are not permitted/);
assert.match(routeSource, /runBoundedExternalProviderEvidenceCanary\(provider\)/);
assert.doesNotMatch(routeSource, /export async function GET/, "evidence producer route must have no public read method");
assert.doesNotMatch(routeSource, /LANERIQ_PROVIDER_EVIDENCE_SIGNING_SECRET|GROQ_API_KEY|OPENROUTER_API_KEY|GEMINI_API_KEY/, "route must not inspect or expose provider/evidence secrets");

assert.match(proxySource, /PUBLIC_PROVIDER_ROUTER_READ_ONLY_STATUS_ENDPOINTS\s*=\s*new Set\(\["\/api\/ai\/provider-router\/status"\]\)/);
assert.doesNotMatch(proxySource, /provider-router\/evidence\/canary/, "evidence producer route must never enter the public proxy allowlist");

console.log("✓ zero mode, disabled, non-allowlisted, missing-hard-stop and missing-signing states all block before fetch");
console.log("✓ bounded free-tier evidence canary performs exactly one mocked provider call with a fixed synthetic prompt and 64-token request cap");
console.log("✓ no fallback, no user content, no raw output, no receipt signature and no secrets are returned or persisted in public response");
console.log("✓ successful evidence creates canonical LIVE_VERIFIED receipt; upstream failure creates no receipt");
console.log("✓ evidence producer route remains session-protected plus admin-only and is absent from public proxy bypasses");
