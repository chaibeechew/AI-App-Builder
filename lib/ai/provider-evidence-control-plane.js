import crypto from "node:crypto";
import { filterProvidersByCost, getSoolenCostMode } from "../soolen/cost-policy.js";

export const PROVIDER_EVIDENCE_CONTRACT = "prve1";
export const PROVIDER_EVIDENCE_TTL_MS = 15 * 60 * 1000;

const MAX_CLOCK_SKEW_MS = 5 * 60 * 1000;
const MAX_BOUNDED_CANARY_OUTPUT_TOKENS = 64;
const EXACT_SHA = /^[a-f0-9]{40}$/i;
const SHA256_HEX = /^[a-f0-9]{64}$/i;
const SAFE_PROVIDER = /^[a-z0-9][a-z0-9-]{0,63}$/;
const LOCAL_PROVIDERS = new Set(["ollama", "soolen-local"]);
const CANONICAL_SOURCES = new Set(["bounded-canary", "production-runtime"]);
const SIGNING_DOMAIN = "LANERIQ-PRVE1-HMAC-SHA256";

export const PROVIDER_EVIDENCE_STATES = Object.freeze({
  NOT_CONFIGURED: "NOT_CONFIGURED",
  LOCAL_ZERO_COST: "LOCAL_ZERO_COST",
  CONFIGURED_UNVERIFIED: "CONFIGURED_UNVERIFIED",
  RUNTIME_OBSERVED: "RUNTIME_OBSERVED",
  DEGRADED: "DEGRADED",
  QUOTA_EXHAUSTED: "QUOTA_EXHAUSTED",
  FAILOVER_VERIFIED: "FAILOVER_VERIFIED",
  LIVE_VERIFIED: "LIVE_VERIFIED",
});

function canonical(value) {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  const keys = Object.keys(value).sort();
  return `{${keys.map((key) => `${JSON.stringify(key)}:${canonical(value[key])}`).join(",")}}`;
}

function releaseIdentity(env = process.env) {
  const sha = String(env.VERCEL_GIT_COMMIT_SHA || "").trim().toLowerCase();
  const environment = String(env.VERCEL_ENV || "").trim().toLowerCase() || "unknown";
  return Object.freeze({
    sha: EXACT_SHA.test(sha) ? sha : null,
    environment,
    production: environment === "production",
  });
}

function signingSecret(env = process.env) {
  return String(env.LANERIQ_PROVIDER_EVIDENCE_SIGNING_SECRET || "");
}

function safeEqualHex(left, right) {
  const a = String(left || "").toLowerCase();
  const b = String(right || "").toLowerCase();
  if (!SHA256_HEX.test(a) || !SHA256_HEX.test(b)) return false;
  return crypto.timingSafeEqual(Buffer.from(a, "hex"), Buffer.from(b, "hex"));
}

function normalizeReceipt(receipt = {}) {
  return {
    contract: PROVIDER_EVIDENCE_CONTRACT,
    provider: String(receipt.provider || "").trim().toLowerCase(),
    source: String(receipt.source || "").trim().toLowerCase(),
    observedAt: String(receipt.observedAt || ""),
    releaseSha: String(receipt.releaseSha || "").trim().toLowerCase(),
    releaseEnvironment: String(receipt.releaseEnvironment || "").trim().toLowerCase(),
    requestClass: String(receipt.requestClass || "").trim().toLowerCase(),
    promptDigest: String(receipt.promptDigest || "").trim().toLowerCase(),
    maxOutputTokens: Number(receipt.maxOutputTokens || 0),
    latencyMs: Math.max(0, Number(receipt.latencyMs || 0)),
    success: receipt.success === true,
    externalProviderInvoked: receipt.externalProviderInvoked === true,
    userDataIncluded: receipt.userDataIncluded === true,
    costMode: String(receipt.costMode || "").trim().toLowerCase(),
    failoverVerified: receipt.failoverVerified === true,
  };
}

export function signProviderEvidenceReceipt(receipt, env = process.env) {
  const secret = signingSecret(env);
  if (secret.length < 32) return null;
  const normalized = normalizeReceipt(receipt);
  return crypto.createHmac("sha256", secret)
    .update(`${SIGNING_DOMAIN}\n${canonical(normalized)}`)
    .digest("hex");
}

export function verifyProviderEvidenceReceipt(receipt, signature, { env = process.env, now = Date.now() } = {}) {
  const normalized = normalizeReceipt(receipt);
  const release = releaseIdentity(env);
  const secret = signingSecret(env);
  const timestamp = Date.parse(normalized.observedAt);
  const providerAllowedByCost = filterProvidersByCost([normalized.provider], env).includes(normalized.provider);
  const errors = [];

  if (receipt?.contract !== PROVIDER_EVIDENCE_CONTRACT) errors.push("CONTRACT_MISMATCH");
  if (!SAFE_PROVIDER.test(normalized.provider) || LOCAL_PROVIDERS.has(normalized.provider)) errors.push("INVALID_EXTERNAL_PROVIDER");
  if (!CANONICAL_SOURCES.has(normalized.source)) errors.push("INVALID_SOURCE");
  if (!Number.isFinite(timestamp)) errors.push("INVALID_OBSERVED_AT");
  if (!EXACT_SHA.test(normalized.releaseSha)) errors.push("INVALID_RELEASE_SHA");
  if (normalized.releaseEnvironment !== "production") errors.push("NOT_PRODUCTION");
  if (!normalized.success || !normalized.externalProviderInvoked) errors.push("EXTERNAL_SUCCESS_REQUIRED");
  if (normalized.userDataIncluded) errors.push("USER_DATA_NOT_ALLOWED_IN_EVIDENCE_CANARY");
  if (normalized.source === "bounded-canary") {
    if (normalized.requestClass !== "provider-health") errors.push("INVALID_CANARY_CLASS");
    if (!SHA256_HEX.test(normalized.promptDigest)) errors.push("INVALID_PROMPT_DIGEST");
    if (!Number.isInteger(normalized.maxOutputTokens) || normalized.maxOutputTokens < 1 || normalized.maxOutputTokens > MAX_BOUNDED_CANARY_OUTPUT_TOKENS) {
      errors.push("CANARY_OUTPUT_NOT_BOUNDED");
    }
  }
  if (!providerAllowedByCost) errors.push("PROVIDER_BLOCKED_BY_COST_POLICY");
  if (!release.production || !release.sha || normalized.releaseSha !== release.sha) errors.push("EXACT_RELEASE_MISMATCH");
  const fresh = Number.isFinite(timestamp) && timestamp <= now + MAX_CLOCK_SKEW_MS && now - timestamp <= PROVIDER_EVIDENCE_TTL_MS;
  if (!fresh) errors.push("STALE_EVIDENCE");

  const secretReady = secret.length >= 32;
  const expectedSignature = secretReady ? signProviderEvidenceReceipt(normalized, env) : null;
  const signatureVerified = Boolean(expectedSignature && safeEqualHex(signature, expectedSignature));
  if (!secretReady) errors.push("SIGNING_NOT_CONFIGURED");
  else if (!signatureVerified) errors.push("SIGNATURE_INVALID");

  const liveVerified = errors.length === 0;
  return Object.freeze({
    contract: PROVIDER_EVIDENCE_CONTRACT,
    provider: SAFE_PROVIDER.test(normalized.provider) ? normalized.provider : null,
    state: liveVerified ? PROVIDER_EVIDENCE_STATES.LIVE_VERIFIED : PROVIDER_EVIDENCE_STATES.CONFIGURED_UNVERIFIED,
    liveVerified,
    signatureVerified,
    exactReleaseIdentity: Boolean(release.production && release.sha && normalized.releaseSha === release.sha),
    fresh,
    providerAllowedByCost,
    failoverVerified: liveVerified && normalized.failoverVerified,
    errors,
  });
}

function receiptForProvider(provider, signedReceipts = [], env = process.env, now = Date.now()) {
  for (const entry of signedReceipts) {
    if (String(entry?.receipt?.provider || "").toLowerCase() !== provider) continue;
    const verified = verifyProviderEvidenceReceipt(entry.receipt, entry.signature, { env, now });
    if (verified.liveVerified) return verified;
  }
  return null;
}

function runtimeState(item, signedReceipts, env, now) {
  if (!item.configured) return PROVIDER_EVIDENCE_STATES.NOT_CONFIGURED;
  if (LOCAL_PROVIDERS.has(item.provider)) return PROVIDER_EVIDENCE_STATES.LOCAL_ZERO_COST;
  if (receiptForProvider(item.provider, signedReceipts, env, now)) return PROVIDER_EVIDENCE_STATES.LIVE_VERIFIED;
  if (Number(item.quotaGuardUntil || 0) > now) return PROVIDER_EVIDENCE_STATES.QUOTA_EXHAUSTED;
  if (Number(item.cooldownUntil || 0) > now || Number(item.lastFailureAt || 0) > Number(item.lastSuccessAt || 0)) return PROVIDER_EVIDENCE_STATES.DEGRADED;
  if (Number(item.lastFailoverSuccessAt || 0) > 0) return PROVIDER_EVIDENCE_STATES.FAILOVER_VERIFIED;
  if (Number(item.lastSuccessAt || 0) > 0) return PROVIDER_EVIDENCE_STATES.RUNTIME_OBSERVED;
  return PROVIDER_EVIDENCE_STATES.CONFIGURED_UNVERIFIED;
}

export function buildInternalProviderEvidenceSnapshot(health = [], { env = process.env, now = Date.now(), signedReceipts = [] } = {}) {
  const providers = health.map((item) => Object.freeze({
    provider: String(item.provider || ""),
    configured: Boolean(item.configured),
    state: runtimeState(item, signedReceipts, env, now),
    successes: Number(item.successes || 0),
    failures: Number(item.failures || 0),
    lastSuccessAt: Number(item.lastSuccessAt || 0) || null,
    lastFailureAt: Number(item.lastFailureAt || 0) || null,
    lastFailureKind: item.lastFailureKind || null,
    lastFailureStatus: Number(item.lastFailureStatus || 0) || null,
    lastFailoverSuccessAt: Number(item.lastFailoverSuccessAt || 0) || null,
    remainingRatio: Number.isFinite(item.remainingRatio) ? item.remainingRatio : null,
    quotaGuarded: Number(item.quotaGuardUntil || 0) > now,
    coolingDown: Number(item.cooldownUntil || 0) > now,
  }));
  return Object.freeze({
    contract: PROVIDER_EVIDENCE_CONTRACT,
    providerIdentityInternalOnly: true,
    providers: Object.freeze(providers),
  });
}

export function buildPublicProviderEvidenceSummary(health = [], { env = process.env, now = Date.now(), signedReceipts = [] } = {}) {
  const snapshot = buildInternalProviderEvidenceSnapshot(health, { env, now, signedReceipts });
  const counts = {};
  for (const state of Object.values(PROVIDER_EVIDENCE_STATES)) counts[state] = 0;
  for (const provider of snapshot.providers) counts[provider.state] = Number(counts[provider.state] || 0) + 1;
  const externalLiveVerifiedCount = counts[PROVIDER_EVIDENCE_STATES.LIVE_VERIFIED] || 0;
  const remoteConfiguredCount = snapshot.providers.filter((item) => item.configured && !LOCAL_PROVIDERS.has(item.provider)).length;
  return Object.freeze({
    contract: PROVIDER_EVIDENCE_CONTRACT,
    providerIdentityInternalOnly: true,
    remoteConfiguredCount,
    stateCounts: Object.freeze({ ...counts }),
    signingConfigured: signingSecret(env).length >= 32,
    externalLiveVerifiedCount,
    externalProvidersLiveVerified: externalLiveVerifiedCount > 0,
    evidenceLevel: externalLiveVerifiedCount > 0 ? "PRODUCTION_PROVIDER_LIVE_EVIDENCE" : "EVIDENCE_REQUIRED",
    costMode: getSoolenCostMode(env),
  });
}

export function boundedExternalProviderCanaryPolicy(provider, { env = process.env, maxOutputTokens = MAX_BOUNDED_CANARY_OUTPUT_TOKENS } = {}) {
  const normalized = String(provider || "").trim().toLowerCase();
  const costAllowed = filterProvidersByCost([normalized], env).includes(normalized);
  const bounded = Number.isInteger(maxOutputTokens) && maxOutputTokens >= 1 && maxOutputTokens <= MAX_BOUNDED_CANARY_OUTPUT_TOKENS;
  const external = SAFE_PROVIDER.test(normalized) && !LOCAL_PROVIDERS.has(normalized);
  return Object.freeze({
    provider: external ? normalized : null,
    allowed: external && bounded && costAllowed,
    external,
    bounded,
    costAllowed,
    maxOutputTokens: bounded ? maxOutputTokens : null,
    userDataAllowed: false,
    promptContentMayBePersisted: false,
    requiresConfiguredProvider: true,
    requiresProductionExactShaForLive: true,
    requiresFreshSignedReceiptForLive: true,
  });
}
