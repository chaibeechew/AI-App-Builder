import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";

process.env.SOOLEN_COST_MODE = "zero";
process.env.SOOLEN_ZERO_COST_PROVIDERS = "ollama,soolen-local";
process.env.OLLAMA_BASE_URL = "https://ollama.router-canary.invalid";
process.env.OPENAI_API_KEY = "configured-but-zero-mode-must-block";
process.env.GEMINI_API_KEY = "configured-but-zero-mode-must-block";
process.env.VERCEL_ENV = "production";
process.env.VERCEL_GIT_COMMIT_SHA = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
process.env.VERCEL_PROJECT_ID = "prj_Q6mR7lmYGGKCW0ARu2Fgm9Pyzfcl";

const { generateWithFallback, getProviderRuntimeHealth, getProviderRuntimeTruth } = await import("../engine/ai-provider.js");
const { selectProviderBeforeLimit } = await import("../lib/ai/provider-router.js");
const { providerRouterProductionTruth, runZeroCostProviderRouterCanary } = await import("../lib/ai/provider-router-truth.js");
const {
  PROVIDER_EVIDENCE_STATES,
  boundedExternalProviderCanaryPolicy,
  buildInternalProviderEvidenceSnapshot,
  buildPublicProviderEvidenceSummary,
  signProviderEvidenceReceipt,
  verifyProviderEvidenceReceipt,
} = await import("../lib/ai/provider-evidence-control-plane.js");

const originalFetch = globalThis.fetch;
let ollamaCalls = 0;
let groqCalls = 0;
try {
  globalThis.fetch = async (url) => {
    const target = String(url);
    if (target.startsWith("https://ollama.router-canary.invalid")) {
      ollamaCalls += 1;
      return {
        ok: false,
        status: 429,
        headers: new Headers({ "retry-after": "1" }),
        text: async () => JSON.stringify({ error: "quota" }),
      };
    }
    if (target.startsWith("https://api.groq.com/")) {
      groqCalls += 1;
      return {
        ok: true,
        status: 200,
        headers: new Headers({
          "x-ratelimit-remaining-requests": "1",
          "x-ratelimit-limit-requests": "100",
        }),
        text: async () => JSON.stringify({ choices: [{ message: { content: "free-tier groq canary" } }] }),
      };
    }
    throw new Error(`Unexpected network target: ${target}`);
  };

  const quotaFailureFallback = await generateWithFallback(
    "Router quota exhaustion fallback test",
    { providers: ["openai", "ollama", "soolen-local"] },
  );
  assert.equal(quotaFailureFallback.provider, "soolen-local", "429 must fail over to the next authorized zero-cost provider");
  assert.equal(quotaFailureFallback.attempts, 2, "429 provider plus local fallback should be the only executed attempts");
  assert.equal(quotaFailureFallback.errors.length, 1);
  assert.equal(quotaFailureFallback.errors[0].kind, "quota");
  assert.equal(quotaFailureFallback.errors[0].status, 429);
  assert.equal(quotaFailureFallback.routingEvidence.blockedByCostCount, 1, "metered OpenAI must be filtered before execution in zero mode");
  assert.equal(ollamaCalls, 1);

  process.env.SOOLEN_COST_MODE = "free";
  process.env.SOOLEN_FREE_TIER_PROVIDERS = "groq,soolen-local";
  process.env.GROQ_API_KEY = "free-tier-canary-key";
  process.env.GROQ_FREE_MODEL = "openai/gpt-oss-20b";

  const nearQuotaSuccess = await generateWithFallback(
    "Router proactive quota observation test",
    { providers: ["groq", "soolen-local"] },
  );
  assert.equal(nearQuotaSuccess.provider, "groq");
  assert.equal(nearQuotaSuccess.attempts, 1);
  assert.equal(groqCalls, 1);

  const proactiveSwitch = await generateWithFallback(
    "Router proactive quota switch test",
    { providers: ["groq", "soolen-local"] },
  );
  assert.equal(proactiveSwitch.provider, "soolen-local", "near-exhausted provider must be skipped on the next request");
  assert.equal(proactiveSwitch.attempts, 1, "quota-guarded provider must not consume a network attempt");
  assert.ok(proactiveSwitch.errors.some((item) => item.error === "quota_guard"), "proactive switch must expose a quota_guard evidence event internally");
  assert.equal(proactiveSwitch.routingEvidence.quotaGuardSkips, 1);
  assert.equal(groqCalls, 1, "proactive quota guard must prevent the second Groq request");

  const selected = selectProviderBeforeLimit({
    providers: ["groq", "soolen-local"],
    usage: { groq: { remainingRatio: 0.05 }, "soolen-local": { remainingRatio: 1 } },
    threshold: 0.8,
  });
  assert.equal(selected, "soolen-local", "selection helper must proactively switch before quota exhaustion");

  const runtimeTruth = getProviderRuntimeTruth();
  assert.equal(runtimeTruth.codeCapabilities.automaticFailover, true);
  assert.equal(runtimeTruth.codeCapabilities.proactiveQuotaSwitch, true);
  assert.equal(runtimeTruth.codeCapabilities.providerEvidenceStateMachine, true);
  assert.equal(runtimeTruth.codeCapabilities.signedProviderEvidenceReceipts, true);
  assert.equal(runtimeTruth.codeCapabilities.boundedExternalCanaryPolicy, true);
  assert.equal(runtimeTruth.codeCapabilities.exactReleaseEvidenceBinding, true);
  assert.ok(runtimeTruth.runtimeFailovers >= 2, "runtime must count quota failure and proactive quota fallback events");
  assert.ok(runtimeTruth.proactiveQuotaSwitches >= 1, "runtime must count proactive quota switches");
  assert.ok(runtimeTruth.blockedByCost >= 1, "runtime must count providers blocked by cost policy");
  assert.equal(runtimeTruth.externalProviderLiveVerified, false, "instance observations must never self-promote external providers to canonical LIVE");

  const runtimeHealth = getProviderRuntimeHealth();
  const groqHealth = runtimeHealth.find((item) => item.provider === "groq");
  const ollamaHealth = runtimeHealth.find((item) => item.provider === "ollama");
  const localHealth = runtimeHealth.find((item) => item.provider === "soolen-local");
  assert.ok(Number(groqHealth.lastSuccessAt) > 0, "provider runtime must retain last-success evidence");
  assert.equal(ollamaHealth.lastFailureKind, "quota", "provider runtime must retain failure classification");
  assert.equal(ollamaHealth.lastFailureStatus, 429, "provider runtime must retain failure HTTP status");
  assert.ok(Number(localHealth.lastFailoverSuccessAt) > 0, "fallback destination must retain failover-success evidence");

  const now = Date.now();
  const evidenceEnv = {
    SOOLEN_COST_MODE: "free",
    SOOLEN_FREE_TIER_PROVIDERS: "groq,soolen-local",
    VERCEL_ENV: "production",
    VERCEL_GIT_COMMIT_SHA: "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
    LANERIQ_PROVIDER_EVIDENCE_SIGNING_SECRET: "provider-evidence-test-secret-32-bytes-minimum-value",
  };
  const promptDigest = crypto.createHash("sha256").update("LANERIQ bounded provider health canary").digest("hex");
  const receipt = {
    contract: "prve1",
    provider: "groq",
    source: "bounded-canary",
    observedAt: new Date(now).toISOString(),
    releaseSha: evidenceEnv.VERCEL_GIT_COMMIT_SHA,
    releaseEnvironment: "production",
    requestClass: "provider-health",
    promptDigest,
    maxOutputTokens: 32,
    latencyMs: 50,
    success: true,
    externalProviderInvoked: true,
    userDataIncluded: false,
    costMode: "free",
    failoverVerified: true,
  };
  const signature = signProviderEvidenceReceipt(receipt, evidenceEnv);
  assert.match(String(signature), /^[a-f0-9]{64}$/);
  const verifiedReceipt = verifyProviderEvidenceReceipt(receipt, signature, { env: evidenceEnv, now });
  assert.equal(verifiedReceipt.liveVerified, true, "fresh signed exact-Production receipt must qualify as canonical LIVE evidence");
  assert.equal(verifiedReceipt.state, PROVIDER_EVIDENCE_STATES.LIVE_VERIFIED);
  assert.equal(verifiedReceipt.failoverVerified, true);

  const tamperedReceipt = { ...receipt, maxOutputTokens: 65 };
  const tamperedVerification = verifyProviderEvidenceReceipt(tamperedReceipt, signature, { env: evidenceEnv, now });
  assert.equal(tamperedVerification.liveVerified, false, "tampered or over-bounded canary evidence must fail closed");
  assert.ok(tamperedVerification.errors.includes("CANARY_OUTPUT_NOT_BOUNDED"));
  assert.ok(tamperedVerification.errors.includes("SIGNATURE_INVALID"));

  const staleReceipt = { ...receipt, observedAt: new Date(now - 16 * 60 * 1000).toISOString() };
  const staleSignature = signProviderEvidenceReceipt(staleReceipt, evidenceEnv);
  const staleVerification = verifyProviderEvidenceReceipt(staleReceipt, staleSignature, { env: evidenceEnv, now });
  assert.equal(staleVerification.liveVerified, false, "stale provider evidence must not remain LIVE");
  assert.ok(staleVerification.errors.includes("STALE_EVIDENCE"));

  const wrongReleaseReceipt = { ...receipt, releaseSha: "cccccccccccccccccccccccccccccccccccccccc" };
  const wrongReleaseSignature = signProviderEvidenceReceipt(wrongReleaseReceipt, evidenceEnv);
  const wrongReleaseVerification = verifyProviderEvidenceReceipt(wrongReleaseReceipt, wrongReleaseSignature, { env: evidenceEnv, now });
  assert.equal(wrongReleaseVerification.liveVerified, false, "provider evidence must be bound to the exact current Production SHA");
  assert.ok(wrongReleaseVerification.errors.includes("EXACT_RELEASE_MISMATCH"));

  const zeroEvidenceEnv = {
    ...evidenceEnv,
    SOOLEN_COST_MODE: "zero",
    SOOLEN_ZERO_COST_PROVIDERS: "soolen-local",
  };
  const zeroModeVerification = verifyProviderEvidenceReceipt(receipt, signProviderEvidenceReceipt(receipt, zeroEvidenceEnv), { env: zeroEvidenceEnv, now });
  assert.equal(zeroModeVerification.liveVerified, false, "signed evidence cannot override zero-cost provider policy");
  assert.ok(zeroModeVerification.errors.includes("PROVIDER_BLOCKED_BY_COST_POLICY"));

  const internalSnapshot = buildInternalProviderEvidenceSnapshot([
    { provider: "groq", configured: true, successes: 1, failures: 0, lastSuccessAt: now - 100, lastFailureAt: 0, lastFailoverSuccessAt: 0, quotaGuardUntil: 0, cooldownUntil: 0, remainingRatio: 0.7 },
    { provider: "openai", configured: true, successes: 0, failures: 1, lastSuccessAt: 0, lastFailureAt: now - 50, lastFailureKind: "quota", lastFailureStatus: 429, lastFailoverSuccessAt: 0, quotaGuardUntil: now + 1000, cooldownUntil: now + 1000, remainingRatio: 0 },
    { provider: "soolen-local", configured: true, successes: 1, failures: 0, lastSuccessAt: now, lastFailureAt: 0, lastFailoverSuccessAt: now, quotaGuardUntil: 0, cooldownUntil: 0, remainingRatio: null },
    { provider: "xai", configured: false, successes: 0, failures: 0, lastSuccessAt: 0, lastFailureAt: 0, lastFailoverSuccessAt: 0, quotaGuardUntil: 0, cooldownUntil: 0, remainingRatio: null },
  ], { env: evidenceEnv, now, signedReceipts: [{ receipt, signature }] });
  assert.equal(internalSnapshot.providers.find((item) => item.provider === "groq").state, PROVIDER_EVIDENCE_STATES.LIVE_VERIFIED);
  assert.equal(internalSnapshot.providers.find((item) => item.provider === "openai").state, PROVIDER_EVIDENCE_STATES.QUOTA_EXHAUSTED);
  assert.equal(internalSnapshot.providers.find((item) => item.provider === "soolen-local").state, PROVIDER_EVIDENCE_STATES.LOCAL_ZERO_COST);
  assert.equal(internalSnapshot.providers.find((item) => item.provider === "xai").state, PROVIDER_EVIDENCE_STATES.NOT_CONFIGURED);

  const publicEvidence = buildPublicProviderEvidenceSummary(internalSnapshot.providers.map((item) => ({
    ...item,
    configured: item.configured,
    quotaGuardUntil: item.quotaGuarded ? now + 1000 : 0,
    cooldownUntil: item.coolingDown ? now + 1000 : 0,
  })), { env: evidenceEnv, now, signedReceipts: [{ receipt, signature }] });
  assert.equal(publicEvidence.externalProvidersLiveVerified, true);
  assert.equal(publicEvidence.externalLiveVerifiedCount, 1);
  assert.equal(publicEvidence.evidenceLevel, "PRODUCTION_PROVIDER_LIVE_EVIDENCE");
  assert.equal(publicEvidence.providerIdentityInternalOnly, true);
  assert.doesNotMatch(JSON.stringify(publicEvidence), /groq|openai|gemini|xai/, "public evidence summary must not expose provider identities");

  const freeCanaryPolicy = boundedExternalProviderCanaryPolicy("groq", { env: evidenceEnv, maxOutputTokens: 64 });
  assert.equal(freeCanaryPolicy.allowed, true);
  assert.equal(freeCanaryPolicy.userDataAllowed, false);
  const zeroCanaryPolicy = boundedExternalProviderCanaryPolicy("groq", { env: zeroEvidenceEnv, maxOutputTokens: 64 });
  assert.equal(zeroCanaryPolicy.allowed, false, "bounded external canary must still obey zero-cost policy");
  const oversizedCanaryPolicy = boundedExternalProviderCanaryPolicy("groq", { env: evidenceEnv, maxOutputTokens: 65 });
  assert.equal(oversizedCanaryPolicy.allowed, false, "external canary must be hard-bounded");

  process.env.SOOLEN_COST_MODE = "zero";
  delete process.env.OLLAMA_BASE_URL;
  const canary = await runZeroCostProviderRouterCanary();
  assert.equal(canary.success, true);
  assert.equal(canary.providerClass, "LOCAL_ZERO_COST");
  assert.equal(canary.meteredProviderAttempted, false);
  assert.equal(canary.externalProviderInvoked, false);
  assert.equal(canary.evidenceLevel, "PRODUCTION_ZERO_COST_ROUTER_CANARY");
  assert.equal(canary.externalProvidersLiveVerified, false);

  const productionTruth = providerRouterProductionTruth();
  assert.equal(productionTruth.contract, "prtr1");
  assert.equal(productionTruth.zeroCostLaunchMode, true);
  assert.equal(productionTruth.externalSpendCap, 0);
  assert.equal(productionTruth.externalProvidersLiveVerified, false);
  assert.equal(productionTruth.externalProviderEvidenceLevel, "EVIDENCE_REQUIRED");
  assert.equal(productionTruth.providerIdentityInternalOnly, true);
  assert.equal(productionTruth.providerEvidence.providerIdentityInternalOnly, true);
  assert.equal(productionTruth.providerEvidence.externalProvidersLiveVerified, false);
  assert.doesNotMatch(JSON.stringify(productionTruth.providerEvidence), /groq|openai|gemini|xai/, "Production public truth must keep provider identities internal");

  const route = fs.readFileSync("app/api/ai/provider-router/status/route.js", "utf8");
  const truthModule = fs.readFileSync("lib/ai/provider-router-truth.js", "utf8");
  const evidenceModule = fs.readFileSync("lib/ai/provider-evidence-control-plane.js", "utf8");
  const proxy = fs.readFileSync("lib/supabase/proxy.js", "utf8");
  assert.match(route, /PRODUCTION_ZERO_COST_ROUTER_CANARY/);
  assert.match(route, /providerEvidence: truthAfter\.providerEvidence/);
  assert.match(route, /externalProvidersLiveVerified: truthAfter\.externalProvidersLiveVerified/);
  assert.match(route, /externalProviderEvidenceLevel: truthAfter\.externalProviderEvidenceLevel/);
  assert.match(route, /providerIdentityInternalOnly: true/);
  assert.doesNotMatch(route, /OPENAI_API_KEY|GROQ_API_KEY|GEMINI_API_KEY|CLOUDFLARE_AI_API_TOKEN|HF_TOKEN/, "public truth route must not inspect or expose provider secrets");
  assert.match(truthModule, /providers:\s*\["soolen-local"\]/, "public launch canary implementation must pin execution to the local zero-cost provider");
  assert.match(truthModule, /LANERIQ_PROVIDER_EVIDENCE_RECEIPTS_B64/, "canonical external provider evidence must use explicit configured signed receipts rather than instance success alone");
  assert.doesNotMatch(truthModule, /OPENAI_API_KEY|GROQ_API_KEY|GEMINI_API_KEY|CLOUDFLARE_AI_API_TOKEN|HF_TOKEN/, "public truth module must not inspect provider credentials");
  assert.match(evidenceModule, /EXACT_RELEASE_MISMATCH/);
  assert.match(evidenceModule, /PROVIDER_BLOCKED_BY_COST_POLICY/);
  assert.match(evidenceModule, /STALE_EVIDENCE/);
  assert.match(evidenceModule, /USER_DATA_NOT_ALLOWED_IN_EVIDENCE_CANARY/);
  assert.match(evidenceModule, /CANARY_OUTPUT_NOT_BOUNDED/);
  assert.match(proxy, /PUBLIC_PROVIDER_ROUTER_LIVE_CANARY_ENDPOINTS\s*=\s*new Set\(\["\/api\/ai\/provider-router\/status"\]\)/, "proxy must expose only the exact Provider Router observability path");
  assert.match(proxy, /PUBLIC_PROVIDER_ROUTER_LIVE_CANARY_ENDPOINTS\.has\(pathname\)\s*&&\s*\(request\.method === "GET" \|\| request\.method === "HEAD"\)/, "Provider Router auth bypass must remain read-only");
  assert.doesNotMatch(proxy, /pathname\.startsWith\(["']\/api\/ai\//, "proxy must never introduce a broad AI API authentication bypass");

  console.log("✓ Zero mode blocks metered providers before execution and fails over from a real 429 simulation to local zero-cost execution");
  console.log("✓ Successful near-quota response headers arm a proactive guard; the next request skips the provider without a network attempt");
  console.log("✓ Provider runtime records release-independent observation timestamps, failure class/status and failover success without self-promoting LIVE");
  console.log("✓ Canonical provider LIVE requires fresh signed Production exact-SHA evidence and cannot override cost policy or canary bounds");
  console.log("✓ Public provider evidence is aggregate-only; provider identities and credentials remain internal");
  console.log("✓ Production Router canary proves the local zero-cost execution path without invoking an external provider");
  console.log("✓ Provider Router evidence path is an exact GET/HEAD-only observability bypass; all other AI APIs remain session protected");
} finally {
  globalThis.fetch = originalFetch;
}
