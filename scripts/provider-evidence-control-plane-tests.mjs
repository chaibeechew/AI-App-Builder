import assert from "node:assert/strict";
import fs from "node:fs";

const SHA = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
const OTHER_SHA = "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";
const NOW = Date.parse("2026-09-05T03:55:00.000Z");
const SIGNING_SECRET = "provider-evidence-test-secret-0123456789abcdef";

const evidence = await import("../lib/ai/provider-evidence-control-plane.js");

const freeEnv = {
  ...process.env,
  VERCEL_ENV: "production",
  VERCEL_GIT_COMMIT_SHA: SHA,
  SOOLEN_COST_MODE: "free",
  SOOLEN_FREE_TIER_PROVIDERS: "groq,soolen-local",
  SOOLEN_FREE_TIER_HARD_STOP_PROVIDERS: "groq",
  LANERIQ_PROVIDER_EVIDENCE_SIGNING_SECRET: SIGNING_SECRET,
};

const zeroEnv = {
  ...freeEnv,
  SOOLEN_COST_MODE: "zero",
  SOOLEN_ZERO_COST_PROVIDERS: "ollama,soolen-local",
};

function receipt(overrides = {}) {
  return {
    contract: evidence.PROVIDER_EVIDENCE_CONTRACT,
    provider: "groq",
    source: "bounded-canary",
    observedAt: new Date(NOW - 1000).toISOString(),
    releaseSha: SHA,
    releaseEnvironment: "production",
    requestClass: "provider-health",
    promptDigest: "1".repeat(64),
    maxOutputTokens: 32,
    latencyMs: 120,
    success: true,
    externalProviderInvoked: true,
    userDataIncluded: false,
    costMode: "free",
    failoverVerified: true,
    ...overrides,
  };
}

function signed(value, env = freeEnv) {
  return evidence.signProviderEvidenceReceipt(value, env);
}

const validReceipt = receipt();
const validSignature = signed(validReceipt);
assert.match(validSignature, /^[a-f0-9]{64}$/);

const valid = evidence.verifyProviderEvidenceReceipt(validReceipt, validSignature, { env: freeEnv, now: NOW });
assert.equal(valid.liveVerified, true);
assert.equal(valid.state, evidence.PROVIDER_EVIDENCE_STATES.LIVE_VERIFIED);
assert.equal(valid.signatureVerified, true);
assert.equal(valid.exactReleaseIdentity, true);
assert.equal(valid.providerAllowedByCost, true);
assert.equal(valid.failoverVerified, true);

const tampered = evidence.verifyProviderEvidenceReceipt(
  { ...validReceipt, latencyMs: 121 },
  validSignature,
  { env: freeEnv, now: NOW },
);
assert.equal(tampered.liveVerified, false);
assert.ok(tampered.errors.includes("SIGNATURE_INVALID"));

const staleReceipt = receipt({ observedAt: new Date(NOW - evidence.PROVIDER_EVIDENCE_TTL_MS - 1).toISOString() });
const stale = evidence.verifyProviderEvidenceReceipt(staleReceipt, signed(staleReceipt), { env: freeEnv, now: NOW });
assert.equal(stale.liveVerified, false);
assert.ok(stale.errors.includes("STALE_EVIDENCE"));

const wrongShaReceipt = receipt({ releaseSha: OTHER_SHA });
const wrongSha = evidence.verifyProviderEvidenceReceipt(wrongShaReceipt, signed(wrongShaReceipt), { env: freeEnv, now: NOW });
assert.equal(wrongSha.liveVerified, false);
assert.ok(wrongSha.errors.includes("EXACT_RELEASE_MISMATCH"));

const userDataReceipt = receipt({ userDataIncluded: true });
const userData = evidence.verifyProviderEvidenceReceipt(userDataReceipt, signed(userDataReceipt), { env: freeEnv, now: NOW });
assert.equal(userData.liveVerified, false);
assert.ok(userData.errors.includes("USER_DATA_NOT_ALLOWED_IN_EVIDENCE_CANARY"));

const unboundedReceipt = receipt({ maxOutputTokens: 65 });
const unbounded = evidence.verifyProviderEvidenceReceipt(unboundedReceipt, signed(unboundedReceipt), { env: freeEnv, now: NOW });
assert.equal(unbounded.liveVerified, false);
assert.ok(unbounded.errors.includes("CANARY_OUTPUT_NOT_BOUNDED"));

const costModeMismatchReceipt = receipt({ costMode: "zero" });
const costModeMismatch = evidence.verifyProviderEvidenceReceipt(costModeMismatchReceipt, signed(costModeMismatchReceipt), { env: freeEnv, now: NOW });
assert.equal(costModeMismatch.liveVerified, false);
assert.ok(costModeMismatch.errors.includes("COST_MODE_MISMATCH"));

const blockedByZero = evidence.verifyProviderEvidenceReceipt(validReceipt, validSignature, { env: zeroEnv, now: NOW });
assert.equal(blockedByZero.liveVerified, false);
assert.ok(blockedByZero.errors.includes("PROVIDER_BLOCKED_BY_COST_POLICY"));
assert.ok(blockedByZero.errors.includes("COST_MODE_MISMATCH"));

const localReceipt = receipt({ provider: "soolen-local" });
const local = evidence.verifyProviderEvidenceReceipt(localReceipt, signed(localReceipt), { env: freeEnv, now: NOW });
assert.equal(local.liveVerified, false);
assert.ok(local.errors.includes("INVALID_EXTERNAL_PROVIDER"));

const noSigningEnv = { ...freeEnv };
delete noSigningEnv.LANERIQ_PROVIDER_EVIDENCE_SIGNING_SECRET;
const unsigned = evidence.verifyProviderEvidenceReceipt(validReceipt, validSignature, { env: noSigningEnv, now: NOW });
assert.equal(unsigned.liveVerified, false);
assert.ok(unsigned.errors.includes("SIGNING_NOT_CONFIGURED"));

const health = [
  { provider: "soolen-local", configured: true },
  { provider: "groq", configured: true, successes: 1, lastSuccessAt: NOW - 1000 },
  { provider: "openai", configured: true, failures: 1, lastFailureAt: NOW - 500, lastFailureKind: "authentication", lastFailureStatus: 401, cooldownUntil: NOW + 60000 },
  { provider: "gemini", configured: true, quotaGuardUntil: NOW + 60000, remainingRatio: 0 },
  { provider: "openrouter", configured: true, lastFailoverSuccessAt: NOW - 2000, lastSuccessAt: NOW - 2000 },
  { provider: "mistral", configured: false },
];

const observedOnly = evidence.buildPublicProviderEvidenceSummary(health, { env: freeEnv, now: NOW, signedReceipts: [] });
assert.equal(observedOnly.externalProvidersLiveVerified, false, "runtime observations alone must never become canonical LIVE");
assert.equal(observedOnly.evidenceLevel, "EVIDENCE_REQUIRED");
assert.equal(observedOnly.stateCounts.LOCAL_ZERO_COST, 1);
assert.equal(observedOnly.stateCounts.RUNTIME_OBSERVED, 1);
assert.equal(observedOnly.stateCounts.DEGRADED, 1);
assert.equal(observedOnly.stateCounts.QUOTA_EXHAUSTED, 1);
assert.equal(observedOnly.stateCounts.FAILOVER_VERIFIED, 1);
assert.equal(observedOnly.stateCounts.NOT_CONFIGURED, 1);

const canonicalSummary = evidence.buildPublicProviderEvidenceSummary(health, {
  env: freeEnv,
  now: NOW,
  signedReceipts: [{ receipt: validReceipt, signature: validSignature }],
});
assert.equal(canonicalSummary.externalProvidersLiveVerified, true);
assert.equal(canonicalSummary.externalLiveVerifiedCount, 1);
assert.equal(canonicalSummary.stateCounts.LIVE_VERIFIED, 1);
assert.equal(canonicalSummary.evidenceLevel, "PRODUCTION_PROVIDER_LIVE_EVIDENCE");
assert.doesNotMatch(JSON.stringify(canonicalSummary), /groq|openai|gemini|openrouter|mistral/i, "public evidence summary must not disclose provider identities");

const policy = evidence.boundedExternalProviderCanaryPolicy("groq", { env: freeEnv, maxOutputTokens: 64 });
assert.equal(policy.allowed, true);
assert.equal(policy.userDataAllowed, false);
assert.equal(policy.promptContentMayBePersisted, false);
assert.equal(evidence.boundedExternalProviderCanaryPolicy("groq", { env: freeEnv, maxOutputTokens: 65 }).allowed, false);
assert.equal(evidence.boundedExternalProviderCanaryPolicy("soolen-local", { env: freeEnv, maxOutputTokens: 32 }).allowed, false);
assert.equal(evidence.boundedExternalProviderCanaryPolicy("groq", { env: zeroEnv, maxOutputTokens: 32 }).allowed, false);

evidence.resetProviderEvidenceRegistryForTests();
assert.equal(evidence.getRecordedProviderEvidenceReceipts({ env: freeEnv, now: NOW }).length, 0);
const recorded = evidence.recordSignedProviderEvidenceReceipt(validReceipt, validSignature, { env: freeEnv, now: NOW });
assert.equal(recorded.liveVerified, true);
assert.equal(evidence.getRecordedProviderEvidenceReceipts({ env: freeEnv, now: NOW }).length, 1);
const registrySummary = evidence.buildPublicProviderEvidenceSummary(health, { env: freeEnv, now: NOW });
assert.equal(registrySummary.externalLiveVerifiedCount, 1);
assert.equal(registrySummary.receiptRegistrySize, 1);

const rejectedRecord = evidence.recordSignedProviderEvidenceReceipt(
  { ...validReceipt, userDataIncluded: true },
  validSignature,
  { env: freeEnv, now: NOW },
);
assert.equal(rejectedRecord.liveVerified, false);
assert.equal(evidence.getRecordedProviderEvidenceReceipts({ env: freeEnv, now: NOW }).length, 1, "invalid evidence must never enter canonical registry");

evidence.resetProviderEvidenceRegistryForTests();

process.env.VERCEL_ENV = "production";
process.env.VERCEL_GIT_COMMIT_SHA = SHA;
process.env.VERCEL_PROJECT_ID = "prj_Q6mR7lmYGGKCW0ARu2Fgm9Pyzfcl";
process.env.SOOLEN_COST_MODE = "zero";
process.env.SOOLEN_ZERO_COST_PROVIDERS = "ollama,soolen-local";
delete process.env.LANERIQ_PROVIDER_EVIDENCE_SIGNING_SECRET;

const { providerRouterProductionTruth } = await import("../lib/ai/provider-router-truth.js");
const truth = providerRouterProductionTruth();
assert.equal(truth.providerEvidence.contract, evidence.PROVIDER_EVIDENCE_CONTRACT);
assert.equal(truth.providerEvidence.externalProvidersLiveVerified, false);
assert.equal(truth.externalProvidersLiveVerified, false);
assert.equal(truth.externalProviderEvidenceLevel, "EVIDENCE_REQUIRED");
assert.equal(truth.providerIdentityInternalOnly, true);
assert.ok(truth.computeFabricTelemetry, "Batch 125 Compute Fabric telemetry must be preserved");
assert.ok(truth.zeroCostAdmission, "Batch 126 zero-cost admission truth must be preserved");
assert.equal(truth.codeCapabilities.providerEvidenceControlPlaneV2, true);
assert.equal(truth.codeCapabilities.signedProviderEvidenceReceipts, true);
assert.equal(truth.codeCapabilities.exactShaBoundProviderEvidence, true);

const engineSource = fs.readFileSync("engine/ai-provider.js", "utf8");
const truthSource = fs.readFileSync("lib/ai/provider-router-truth.js", "utf8");
const routeSource = fs.readFileSync("app/api/ai/provider-router/status/route.js", "utf8");
const evidenceSource = fs.readFileSync("lib/ai/provider-evidence-control-plane.js", "utf8");

assert.match(engineSource, /routerVersion:\s*"provider-router-v3"/);
assert.match(engineSource, /lastSuccessAt/);
assert.match(engineSource, /lastFailureKind/);
assert.match(engineSource, /lastFailoverSuccessAt/);
assert.match(truthSource, /deriveProviderComputeTelemetry/);
assert.match(truthSource, /getZeroCostAdmissionRuntimeTruth/);
assert.match(truthSource, /buildPublicProviderEvidenceSummary/);
assert.match(routeSource, /providerEvidence:\s*truth\.providerEvidence/);
assert.match(routeSource, /canaryExecutionMethod:\s*"ADMIN_POST_ONLY"/);
assert.match(routeSource, /resolveLaneriqAdminRequest\(request\)/);
assert.doesNotMatch(routeSource.slice(routeSource.indexOf("export async function GET"), routeSource.indexOf("export async function POST")), /runZeroCostProviderRouterCanary/, "public GET must remain read-only");
assert.doesNotMatch(routeSource, /LANERIQ_PROVIDER_EVIDENCE_SIGNING_SECRET|OPENAI_API_KEY|GROQ_API_KEY|GEMINI_API_KEY/, "public route must not inspect provider or evidence secrets");
assert.doesNotMatch(truthSource, /OPENAI_API_KEY|GROQ_API_KEY|GEMINI_API_KEY/, "truth aggregator must stay provider-secret opaque");
assert.match(evidenceSource, /USER_DATA_NOT_ALLOWED_IN_EVIDENCE_CANARY/);
assert.match(evidenceSource, /EXACT_RELEASE_MISMATCH/);
assert.match(evidenceSource, /PROVIDER_BLOCKED_BY_COST_POLICY/);
assert.match(evidenceSource, /SIGNATURE_INVALID/);

console.log("✓ Provider evidence v2 separates configured/runtime-observed state from canonical LIVE evidence");
console.log("✓ Canonical LIVE requires fresh signed Production exact-SHA evidence and current cost-mode authorization");
console.log("✓ Tampered, stale, wrong-SHA, user-data, unbounded, local-provider and zero-mode-blocked receipts fail closed");
console.log("✓ Provider identities remain internal; public status exposes aggregate evidence counts only");
console.log("✓ Batch 125 Compute Fabric, Batch 126 zero-cost admission and admin-only Provider Router canary boundaries are preserved");
