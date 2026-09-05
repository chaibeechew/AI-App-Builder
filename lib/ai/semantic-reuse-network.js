import crypto from "node:crypto";

export const SEMANTIC_REUSE_NETWORK_VERSION = "2026-09-05.2";
const DEFAULT_TTL_MS = 15 * 60 * 1000;
const MAX_TTL_MS = 24 * 60 * 60 * 1000;
const MAX_ENTRIES = 256;
const MAX_RESULT_CHARS = 500_000;

const runtime = globalThis.__LANERIQ_SEMANTIC_REUSE_V2 || {
  entries: new Map(),
  summary: { lookups: 0, exactHits: 0, approximateHits: 0, misses: 0, stores: 0, evictions: 0, blockedUnsafeReuse: 0 },
};
if (!(runtime.entries instanceof Map)) runtime.entries = new Map();
runtime.summary ||= { lookups: 0, exactHits: 0, approximateHits: 0, misses: 0, stores: 0, evictions: 0, blockedUnsafeReuse: 0 };
globalThis.__LANERIQ_SEMANTIC_REUSE_V2 = runtime;

function sha(value) {
  return crypto.createHash("sha256").update(String(value || "")).digest("hex");
}

function normalize(value) {
  return String(value || "")
    .normalize("NFKC")
    .toLowerCase()
    .replace(/https?:\/\/\S+/g, " <url> ")
    .replace(/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/gi, " <email> ")
    .replace(/\b[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\b/gi, " <uuid> ")
    .replace(/\b\+?[0-9][0-9\s().-]{7,}[0-9]\b/g, " <phone> ")
    .replace(/[^a-z0-9\u4e00-\u9fff<>=:#._/-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokens(value) {
  return [...new Set(normalize(value).split(" ").filter((item) => item.length >= 2))].slice(0, 512).sort();
}

function similarity(a, b) {
  if (!a.length || !b.length) return 0;
  const left = new Set(a);
  const right = new Set(b);
  let intersection = 0;
  for (const item of left) if (right.has(item)) intersection += 1;
  const union = left.size + right.size - intersection;
  return union > 0 ? intersection / union : 0;
}

function ttl(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return DEFAULT_TTL_MS;
  return Math.max(30_000, Math.min(MAX_TTL_MS, Math.floor(number)));
}

function purpose(value) {
  return String(value || "general").trim().toLowerCase().replace(/[^a-z0-9._:-]/g, "-").slice(0, 80) || "general";
}

function scopeHash(scope) {
  const clean = String(scope || "").trim();
  return clean ? sha(`scope:${clean}`) : "";
}

function prune(now = Date.now()) {
  for (const [key, entry] of runtime.entries) {
    if (!entry || entry.expiresAt <= now) runtime.entries.delete(key);
  }
  while (runtime.entries.size > MAX_ENTRIES) {
    const first = runtime.entries.keys().next().value;
    if (!first) break;
    runtime.entries.delete(first);
    runtime.summary.evictions += 1;
  }
}

export function buildReuseFingerprint({ keyMaterial, variant = "", purpose: reusePurpose = "general" } = {}) {
  const normalized = normalize(keyMaterial);
  const normalizedVariant = normalize(variant);
  return Object.freeze({
    exact: sha(`${purpose(reusePurpose)}\n${normalizedVariant}\n${normalized}`),
    tokenSignature: tokens(`${normalizedVariant} ${normalized}`),
    normalizedLength: normalized.length + normalizedVariant.length,
  });
}

function reusablePolicy({ scope, reuseClass = "private_result", allowApproximate = false } = {}) {
  const scoped = Boolean(scopeHash(scope));
  const className = String(reuseClass || "private_result").trim().toLowerCase();
  const approximateAllowed = allowApproximate === true && className === "blueprint";
  return Object.freeze({ scoped, className, exactAllowed: scoped, approximateAllowed });
}

export function lookupSemanticReuse({
  scope,
  purpose: reusePurpose = "general",
  keyMaterial,
  variant = "",
  reuseClass = "private_result",
  allowApproximate = false,
  approximateThreshold = 0.97,
} = {}) {
  runtime.summary.lookups += 1;
  prune();
  const policy = reusablePolicy({ scope, reuseClass, allowApproximate });
  if (!policy.exactAllowed || !String(keyMaterial || "").trim()) {
    runtime.summary.blockedUnsafeReuse += 1;
    runtime.summary.misses += 1;
    return Object.freeze({ hit: false, reason: "scope_or_key_required", exact: false, approximate: false });
  }

  const fingerprint = buildReuseFingerprint({ keyMaterial, variant, purpose: reusePurpose });
  const scopeId = scopeHash(scope);
  const p = purpose(reusePurpose);
  const exactKey = `${scopeId}:${p}:${fingerprint.exact}`;
  const exactEntry = runtime.entries.get(exactKey);
  if (exactEntry && exactEntry.expiresAt > Date.now()) {
    runtime.summary.exactHits += 1;
    exactEntry.lastAccessedAt = Date.now();
    return Object.freeze({ hit: true, exact: true, approximate: false, result: exactEntry.result, ageMs: Date.now() - exactEntry.createdAt });
  }

  if (policy.approximateAllowed) {
    const threshold = Math.max(0.95, Math.min(0.999, Number(approximateThreshold) || 0.97));
    for (const entry of runtime.entries.values()) {
      if (!entry || entry.scopeId !== scopeId || entry.purpose !== p || entry.reuseClass !== "blueprint" || entry.expiresAt <= Date.now()) continue;
      const ratio = entry.normalizedLength > 0 ? fingerprint.normalizedLength / entry.normalizedLength : 0;
      if (ratio < 0.9 || ratio > 1.1) continue;
      const score = similarity(fingerprint.tokenSignature, entry.tokenSignature);
      if (score >= threshold) {
        runtime.summary.approximateHits += 1;
        entry.lastAccessedAt = Date.now();
        return Object.freeze({ hit: true, exact: false, approximate: true, similarity: Number(score.toFixed(4)), result: entry.result, ageMs: Date.now() - entry.createdAt });
      }
    }
  }

  runtime.summary.misses += 1;
  return Object.freeze({ hit: false, reason: "miss", exact: false, approximate: false });
}

export function storeSemanticReuse({
  scope,
  purpose: reusePurpose = "general",
  keyMaterial,
  variant = "",
  reuseClass = "private_result",
  result,
  ttlMs,
} = {}) {
  prune();
  const policy = reusablePolicy({ scope, reuseClass, allowApproximate: false });
  const text = typeof result === "string" ? result : "";
  if (!policy.exactAllowed || !String(keyMaterial || "").trim() || !text || text.length > MAX_RESULT_CHARS) {
    runtime.summary.blockedUnsafeReuse += 1;
    return Object.freeze({ stored: false, reason: "unsafe_or_oversized" });
  }
  const fingerprint = buildReuseFingerprint({ keyMaterial, variant, purpose: reusePurpose });
  const scopeId = scopeHash(scope);
  const p = purpose(reusePurpose);
  const key = `${scopeId}:${p}:${fingerprint.exact}`;
  const now = Date.now();
  runtime.entries.set(key, {
    scopeId,
    purpose: p,
    reuseClass: String(reuseClass || "private_result").trim().toLowerCase(),
    result: text,
    tokenSignature: fingerprint.tokenSignature,
    normalizedLength: fingerprint.normalizedLength,
    createdAt: now,
    lastAccessedAt: now,
    expiresAt: now + ttl(ttlMs),
  });
  runtime.summary.stores += 1;
  prune(now);
  return Object.freeze({ stored: true, expiresAt: now + ttl(ttlMs) });
}

export function getSemanticReuseTruth() {
  prune();
  return Object.freeze({
    version: SEMANTIC_REUSE_NETWORK_VERSION,
    activeEntries: runtime.entries.size,
    lookups: Number(runtime.summary.lookups || 0),
    exactHits: Number(runtime.summary.exactHits || 0),
    approximateHits: Number(runtime.summary.approximateHits || 0),
    misses: Number(runtime.summary.misses || 0),
    stores: Number(runtime.summary.stores || 0),
    evictions: Number(runtime.summary.evictions || 0),
    blockedUnsafeReuse: Number(runtime.summary.blockedUnsafeReuse || 0),
    crossUserPrivateReuseAllowed: false,
    approximatePrivateResultReuseAllowed: false,
    approximateBlueprintReuseAllowed: true,
    rawPromptStored: false,
    runtimeEphemeral: true,
    evidenceBoundary: "Reuse counters are per-runtime-instance. Cached full outputs are scope-isolated and never prove cross-user safety, permanent storage, model equivalence, or unlimited capacity.",
  });
}

export const SEMANTIC_REUSE_POLICY = Object.freeze({
  version: SEMANTIC_REUSE_NETWORK_VERSION,
  scopeRequired: true,
  crossUserPrivateReuseAllowed: false,
  rawPromptStored: false,
  exactPrivateResultReuseAllowed: true,
  approximatePrivateResultReuseAllowed: false,
  approximateBlueprintReuseAllowed: true,
  maxEntries: MAX_ENTRIES,
  maxResultChars: MAX_RESULT_CHARS,
  defaultTtlMs: DEFAULT_TTL_MS,
});
