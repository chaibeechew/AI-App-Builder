import assert from "node:assert/strict";
import fs from "node:fs";

process.env.SOOLEN_COST_MODE = "zero";
process.env.SOOLEN_ZERO_COST_PROVIDERS = "soolen-local";
process.env.OPENAI_API_KEY = "must-never-run-in-zero-mode";
process.env.GEMINI_API_KEY = "must-never-run-in-zero-mode";

const {
  ZERO_COST_ADMISSION_POLICY,
  assertAdmissionSafe,
  decideZeroCostAdmission,
  estimateAdmissionDemand,
} = await import("../lib/ai/zero-cost-admission-controller.js");
const {
  SEMANTIC_REUSE_POLICY,
  lookupSemanticReuse,
  storeSemanticReuse,
} = await import("../lib/ai/semantic-reuse-network.js");
const {
  generateWithZeroCostAdmission,
  getZeroCostAdmissionRuntimeTruth,
} = await import("../lib/ai/zero-cost-admitted-generation.js");

assert.equal(ZERO_COST_ADMISSION_POLICY.zeroModePaidRouteAllowed, false);
assert.equal(ZERO_COST_ADMISSION_POLICY.freeModePaidRouteAllowed, false);
assert.equal(ZERO_COST_ADMISSION_POLICY.localBeforeRemote, true);
assert.equal(ZERO_COST_ADMISSION_POLICY.freeProviderRequiresVerifiedHardStop, true);

const demand = estimateAdmissionDemand({ promptChars: 32_000, attachmentCount: 2, requestedAgents: 5 });
assert.ok(demand.estimatedTokens >= 8_000);
assert.ok(["medium", "large", "very_large"].includes(demand.className));

const zeroLocal = decideZeroCostAdmission({ costMode: "zero", localEngineAvailable: true, paidProviderAvailable: true, paidFallbackAllowed: true });
assert.equal(zeroLocal.route, "LOCAL_ENGINE");
assert.equal(zeroLocal.costRisk, 0);
assert.equal(assertAdmissionSafe(zeroLocal, { costMode: "zero" }), true);

const zeroNoLocal = decideZeroCostAdmission({ costMode: "zero", localEngineAvailable: false, paidProviderAvailable: true, paidFallbackAllowed: true });
assert.equal(zeroNoLocal.route, "BLOCK");
assert.equal(zeroNoLocal.paidBlocked, true);

const freeUnverified = decideZeroCostAdmission({ costMode: "free", localEngineAvailable: false, freeProviderAvailable: true, freeProviderHardStopVerified: false });
assert.equal(freeUnverified.route, "BLOCK");
assert.equal(freeUnverified.reason, "free_provider_hard_stop_not_verified");

const freeVerified = decideZeroCostAdmission({ costMode: "free", localEngineAvailable: false, freeProviderAvailable: true, freeProviderHardStopVerified: true });
assert.equal(freeVerified.route, "FREE_PROVIDER");
assert.equal(freeVerified.costRisk, 0);
assert.equal(assertAdmissionSafe(freeVerified, { costMode: "free" }), true);

const balancedPaid = decideZeroCostAdmission({ costMode: "balanced", localEngineAvailable: false, paidProviderAvailable: true, paidFallbackAllowed: true });
assert.equal(balancedPaid.route, "PAID_PROVIDER");
assert.equal(balancedPaid.costRisk, 1);

assert.equal(SEMANTIC_REUSE_POLICY.scopeRequired, true);
assert.equal(SEMANTIC_REUSE_POLICY.crossUserPrivateReuseAllowed, false);
assert.equal(SEMANTIC_REUSE_POLICY.approximatePrivateResultReuseAllowed, false);
assert.equal(SEMANTIC_REUSE_POLICY.rawPromptStored, false);

const suffix = `${Date.now()}-${Math.random()}`;
const scopeA = `user:a:${suffix}`;
const scopeB = `user:b:${suffix}`;
const privateKey = "Build a private real estate dashboard for my agency";
assert.equal(storeSemanticReuse({ scope: scopeA, purpose: "test-private", keyMaterial: privateKey, result: "private-result" }).stored, true);
const sameScope = lookupSemanticReuse({ scope: scopeA, purpose: "test-private", keyMaterial: privateKey, reuseClass: "private_result", allowApproximate: false });
assert.equal(sameScope.hit, true);
assert.equal(sameScope.exact, true);
assert.equal(sameScope.result, "private-result");
const otherScope = lookupSemanticReuse({ scope: scopeB, purpose: "test-private", keyMaterial: privateKey, reuseClass: "private_result", allowApproximate: false });
assert.equal(otherScope.hit, false, "Private output must never cross user scope.");
const privateApprox = lookupSemanticReuse({ scope: scopeA, purpose: "test-private", keyMaterial: `${privateKey} please`, reuseClass: "private_result", allowApproximate: true });
assert.equal(privateApprox.hit, false, "Approximate reuse must remain disabled for private full outputs.");

const blueprintScope = `blueprint:${suffix}`;
assert.equal(storeSemanticReuse({ scope: blueprintScope, purpose: "blueprint", keyMaterial: "real estate crm lead pipeline dashboard mobile responsive", reuseClass: "blueprint", result: "blueprint-result" }).stored, true);
const blueprintApprox = lookupSemanticReuse({ scope: blueprintScope, purpose: "blueprint", keyMaterial: "real estate crm lead pipeline dashboard mobile responsive app", reuseClass: "blueprint", allowApproximate: true, approximateThreshold: 0.95 });
assert.equal(blueprintApprox.hit, true);
assert.equal(blueprintApprox.approximate, true);

const originalFetch = globalThis.fetch;
let externalCalls = 0;
try {
  globalThis.fetch = async () => {
    externalCalls += 1;
    throw new Error("Zero mode must not reach remote providers");
  };
  const runtimeScope = `user:runtime:${suffix}`;
  const first = await generateWithZeroCostAdmission("Build a simple property CRM", {
    scope: runtimeScope,
    purpose: "runtime-test",
    reuseKeyMaterial: "property crm",
    reuseAllowed: true,
    interactive: true,
    paidFallbackAllowed: false,
  });
  assert.equal(first.admissionSource, "local");
  assert.equal(externalCalls, 0);
  const second = await generateWithZeroCostAdmission("Build a simple property CRM", {
    scope: runtimeScope,
    purpose: "runtime-test",
    reuseKeyMaterial: "property crm",
    reuseAllowed: true,
    interactive: true,
    paidFallbackAllowed: false,
  });
  assert.equal(second.admissionSource, "reuse");
  assert.equal(second.provider, "laneriq-semantic-reuse");
  assert.equal(second.attempts, 0);
  assert.equal(externalCalls, 0);
} finally {
  globalThis.fetch = originalFetch;
}

const truth = getZeroCostAdmissionRuntimeTruth();
assert.ok(truth.requests >= 2);
assert.ok(truth.localResolutions >= 1);
assert.ok(truth.reuseHits >= 1);
assert.equal(truth.zeroModePaidFallbackAllowed, false);
assert.equal(truth.freeModePaidFallbackAllowed, false);

const chatRoute = fs.readFileSync("app/api/chat/route.js", "utf8");
assert.match(chatRoute, /generateWithZeroCostAdmission/);
assert.match(chatRoute, /scope:\s*`user:\$\{user\.id\}`/);
assert.match(chatRoute, /reuseKeyMaterial:\s*conversation/);
assert.match(chatRoute, /reuseClass:\s*"private_result"/);
assert.match(chatRoute, /allowApproximateReuse:\s*false/);
assert.match(chatRoute, /paidFallbackAllowed:\s*false/);
assert.doesNotMatch(chatRoute, /generateWithFallback/);

console.log("✓ Zero/Free admission can never escalate to paid compute and free remote capacity requires a verified hard stop");
console.log("✓ Admission estimates workload before execution and prefers deterministic/reuse/local capacity before remote capacity");
console.log("✓ Semantic Reuse Network v2 isolates full outputs by scope, stores no raw prompt, and blocks approximate private-result reuse");
console.log("✓ Blueprint-only approximate reuse is permitted inside an explicit scope with a high similarity threshold");
console.log("✓ Zero-mode runtime executes local-first, then reuses the scoped result without any remote network call");
console.log("✓ Customer chat is wired through Zero-Cost Admission + user-scoped exact reuse with paid fallback disabled");
