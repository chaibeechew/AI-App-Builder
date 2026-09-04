import assert from "node:assert/strict";
import fs from "node:fs";

process.env.SOOLEN_COST_MODE = "zero";
process.env.SOOLEN_ZERO_COST_PROVIDERS = "ollama,soolen-local";
process.env.OLLAMA_BASE_URL = "https://ollama.router-canary.invalid";
process.env.OPENAI_API_KEY = "configured-but-zero-mode-must-block";
process.env.GEMINI_API_KEY = "configured-but-zero-mode-must-block";
process.env.VERCEL_ENV = "production";
process.env.VERCEL_GIT_COMMIT_SHA = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
process.env.VERCEL_PROJECT_ID = "prj_Q6mR7lmYGGKCW0ARu2Fgm9Pyzfcl";

const { generateWithFallback, getProviderRuntimeTruth } = await import("../engine/ai-provider.js");
const { selectProviderBeforeLimit } = await import("../lib/ai/provider-router.js");
const { providerRouterProductionTruth, runZeroCostProviderRouterCanary } = await import("../lib/ai/provider-router-truth.js");

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
  assert.ok(runtimeTruth.runtimeFailovers >= 2, "runtime must count quota failure and proactive quota fallback events");
  assert.ok(runtimeTruth.proactiveQuotaSwitches >= 1, "runtime must count proactive quota switches");
  assert.ok(runtimeTruth.blockedByCost >= 1, "runtime must count providers blocked by cost policy");
  assert.equal(runtimeTruth.externalProviderLiveVerified, false, "instance observations must never self-promote external providers to canonical LIVE");

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

  const route = fs.readFileSync("app/api/ai/provider-router/status/route.js", "utf8");
  const truthModule = fs.readFileSync("lib/ai/provider-router-truth.js", "utf8");
  const proxy = fs.readFileSync("lib/supabase/proxy.js", "utf8");
  const docs = fs.readFileSync("docs/provider-router-production-truth.md", "utf8");

  const getStart = route.indexOf("export async function GET");
  const postStart = route.indexOf("export async function POST");
  assert.ok(getStart >= 0 && postStart > getStart, "Provider Router route must expose read-only GET before protected POST canary");
  const getSource = route.slice(getStart, postStart);
  const postSource = route.slice(postStart);

  assert.doesNotMatch(getSource, /runZeroCostProviderRouterCanary|searchParams|get\(["']canary["']\)/, "Public GET must never execute or authorize the canary through query parameters");
  assert.match(getSource, /publicStatusPayload\(providerRouterProductionTruth\(\)\)/);
  assert.match(route, /runtimeCanary:\s*null/);
  assert.match(route, /canaryExecutionMethod:\s*"ADMIN_POST_ONLY"/);
  assert.match(route, /canaryRequiresAdmin:\s*true/);
  assert.match(postSource, /createServerClient\(\)/, "Canary POST must authenticate through the server session client");
  assert.match(postSource, /supabase\.auth\.getUser\(\)/);
  assert.match(postSource, /user\.app_metadata\?\.role/);
  assert.match(postSource, /role !== "admin"/);
  assert.match(postSource, /ADMIN_PERMISSION_REQUIRED/);
  assert.match(postSource, /ZERO_COST_CANARY_REQUIRES_ZERO_MODE/);
  assert.match(postSource, /runZeroCostProviderRouterCanary\(\)/, "Only protected POST may execute the bounded local canary");
  assert.match(postSource, /PRODUCTION_ZERO_COST_ROUTER_CANARY/);
  assert.match(route, /externalProvidersLiveVerified: false/);
  assert.match(route, /externalProviderEvidenceLevel: "EVIDENCE_REQUIRED"/);
  assert.match(route, /providerIdentityInternalOnly: true/);
  assert.doesNotMatch(route, /OPENAI_API_KEY|GROQ_API_KEY|GEMINI_API_KEY|CLOUDFLARE_AI_API_TOKEN|HF_TOKEN/, "public truth route must not inspect or expose provider secrets");
  assert.match(truthModule, /providers:\s*\["soolen-local"\]/, "canary implementation must pin execution to the local zero-cost provider");
  assert.doesNotMatch(truthModule, /OPENAI_API_KEY|GROQ_API_KEY|GEMINI_API_KEY|CLOUDFLARE_AI_API_TOKEN|HF_TOKEN/, "canary implementation must not inspect provider credentials");
  assert.match(proxy, /PUBLIC_PROVIDER_ROUTER_READ_ONLY_STATUS_ENDPOINTS\s*=\s*new Set\(\["\/api\/ai\/provider-router\/status"\]\)/, "proxy must expose only the exact read-only Provider Router status path");
  assert.match(proxy, /PUBLIC_PROVIDER_ROUTER_READ_ONLY_STATUS_ENDPOINTS\.has\(pathname\)\s*&&\s*\(request\.method === "GET" \|\| request\.method === "HEAD"\)/, "Provider Router public bypass must remain GET/HEAD-only");
  assert.doesNotMatch(proxy, /PUBLIC_PROVIDER_ROUTER_READ_ONLY_STATUS_ENDPOINTS\.has\(pathname\)[\s\S]{0,160}request\.method === "POST"/, "Provider Router POST must never enter the public bypass");
  assert.doesNotMatch(proxy, /pathname\.startsWith\(["']\/api\/ai\//, "proxy must never introduce a broad AI API authentication bypass");
  assert.match(docs, /GET \/api\/ai\/provider-router\/status/);
  assert.match(docs, /never executes a canary/i);
  assert.match(docs, /POST \/api\/ai\/provider-router\/status/);
  assert.match(docs, /requires an authenticated LANERIQ administrator/i);
  assert.doesNotMatch(docs, /Add `\?canary=1` to run/i, "Documentation must not reintroduce anonymous query-triggered canary execution");

  console.log("✓ Zero mode blocks metered providers before execution and fails over from a real 429 simulation to local zero-cost execution");
  console.log("✓ Successful near-quota response headers arm a proactive guard; the next request skips the provider without a network attempt");
  console.log("✓ Public Provider Router GET/HEAD status is read-only and cannot execute compute through ?canary=1");
  console.log("✓ Executable local zero-cost canary is session-protected, admin-only POST and still pins execution to soolen-local");
  console.log("✓ External provider LIVE remains EVIDENCE_REQUIRED even when runtime observations exist; provider identities stay internal");
} finally {
  globalThis.fetch = originalFetch;
}
