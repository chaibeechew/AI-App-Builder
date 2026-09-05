import crypto from "node:crypto";
import {
  filterProvidersByCost,
  getSoolenCostMode,
  isFreeTierProviderHardStopVerified,
  providerMayCharge,
} from "../soolen/cost-policy.js";
import {
  boundedExternalProviderCanaryPolicy,
  recordSignedProviderEvidenceReceipt,
  signProviderEvidenceReceipt,
} from "./provider-evidence-control-plane.js";

export const EXTERNAL_PROVIDER_EVIDENCE_CANARY_VERSION = "2026-09-05.1";
export const EXTERNAL_PROVIDER_EVIDENCE_MAX_OUTPUT_TOKENS = 64;
export const EXTERNAL_PROVIDER_EVIDENCE_PROMPT = "LANERIQ external provider health evidence canary. Return only: LANERIQ_PROVIDER_OK";

const EXACT_SHA = /^[a-f0-9]{40}$/i;
const SUPPORTED_PROVIDERS = new Set(["groq", "openrouter", "gemini", "cloudflare", "huggingface"]);
const REQUEST_TIMEOUT_MS = 12000;

function evidenceError(code, message, status = 409, details = {}) {
  const error = new Error(message);
  error.code = code;
  error.status = status;
  error.details = Object.freeze({ ...details });
  return error;
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

function configured(provider, env = process.env) {
  if (provider === "groq") return Boolean(env.GROQ_API_KEY);
  if (provider === "openrouter") return Boolean(env.OPENROUTER_API_KEY);
  if (provider === "gemini") return Boolean(env.GEMINI_API_KEY);
  if (provider === "cloudflare") return Boolean(env.CLOUDFLARE_AI_ACCOUNT_ID && env.CLOUDFLARE_AI_API_TOKEN);
  if (provider === "huggingface") return Boolean(env.HF_TOKEN && env.HF_MODEL);
  return false;
}

function signingConfigured(env = process.env) {
  return String(env.LANERIQ_PROVIDER_EVIDENCE_SIGNING_SECRET || "").length >= 32;
}

function executionEnabled(env = process.env) {
  return String(env.LANERIQ_EXTERNAL_PROVIDER_EVIDENCE_CANARY_ENABLED || "").trim().toLowerCase() === "true";
}

function executionAllowlist(env = process.env) {
  return new Set(
    String(env.LANERIQ_EXTERNAL_PROVIDER_EVIDENCE_CANARY_PROVIDERS || "")
      .split(",")
      .map((item) => item.trim().toLowerCase())
      .filter((item) => SUPPORTED_PROVIDERS.has(item)),
  );
}

function promptDigest() {
  return crypto.createHash("sha256").update(EXTERNAL_PROVIDER_EVIDENCE_PROMPT).digest("hex");
}

export function preflightExternalProviderEvidenceCanary(provider, env = process.env) {
  const normalized = String(provider || "").trim().toLowerCase();
  const mode = getSoolenCostMode(env);
  const release = releaseIdentity(env);
  const supported = SUPPORTED_PROVIDERS.has(normalized);
  const explicitlyEnabled = executionEnabled(env);
  const explicitlyAllowlisted = supported && executionAllowlist(env).has(normalized);
  const providerConfigured = supported && configured(normalized, env);
  const costAllowed = supported && filterProvidersByCost([normalized], env).includes(normalized);
  const hardStopVerified = supported && (!providerMayCharge(normalized) || isFreeTierProviderHardStopVerified(normalized, env));
  const signingReady = signingConfigured(env);
  const boundedPolicy = boundedExternalProviderCanaryPolicy(normalized, {
    env,
    maxOutputTokens: EXTERNAL_PROVIDER_EVIDENCE_MAX_OUTPUT_TOKENS,
  });

  let code = null;
  if (!supported) code = "EVIDENCE_PROVIDER_NOT_SUPPORTED";
  else if (mode !== "free") code = "EXTERNAL_EVIDENCE_CANARY_REQUIRES_FREE_MODE";
  else if (!release.production || !release.sha) code = "EXACT_PRODUCTION_RELEASE_REQUIRED";
  else if (!explicitlyEnabled) code = "EXTERNAL_EVIDENCE_CANARY_NOT_ENABLED";
  else if (!explicitlyAllowlisted) code = "EVIDENCE_PROVIDER_NOT_ALLOWLISTED";
  else if (!costAllowed || !hardStopVerified) code = "PROVIDER_FREE_TIER_HARD_STOP_REQUIRED";
  else if (!providerConfigured) code = "PROVIDER_NOT_CONFIGURED";
  else if (!signingReady) code = "PROVIDER_EVIDENCE_SIGNING_NOT_CONFIGURED";
  else if (!boundedPolicy.allowed) code = "BOUNDED_EVIDENCE_POLICY_BLOCKED";

  return Object.freeze({
    version: EXTERNAL_PROVIDER_EVIDENCE_CANARY_VERSION,
    provider: supported ? normalized : null,
    mode,
    production: release.production,
    releaseSha: release.sha,
    supported,
    explicitlyEnabled,
    explicitlyAllowlisted,
    providerConfigured,
    costAllowed,
    hardStopVerified,
    signingConfigured: signingReady,
    bounded: boundedPolicy.bounded,
    maxOutputTokens: EXTERNAL_PROVIDER_EVIDENCE_MAX_OUTPUT_TOKENS,
    networkPermitted: code === null,
    code,
  });
}

function openAiCompatibleRequest(provider, env) {
  if (provider === "groq") {
    return {
      url: "https://api.groq.com/openai/v1/chat/completions",
      headers: { Authorization: `Bearer ${env.GROQ_API_KEY}` },
      body: { model: env.GROQ_FREE_MODEL || "openai/gpt-oss-20b" },
    };
  }
  if (provider === "openrouter") {
    return {
      url: "https://openrouter.ai/api/v1/chat/completions",
      headers: {
        Authorization: `Bearer ${env.OPENROUTER_API_KEY}`,
        "HTTP-Referer": env.APP_URL || "https://laneriq-ai.vercel.app",
        "X-Title": "LANERIQ AI",
      },
      body: { model: "openrouter/free" },
    };
  }
  if (provider === "huggingface") {
    return {
      url: "https://router.huggingface.co/v1/chat/completions",
      headers: { Authorization: `Bearer ${env.HF_TOKEN}` },
      body: { model: env.HF_MODEL },
    };
  }
  return null;
}

function providerRequest(provider, env) {
  const compatible = openAiCompatibleRequest(provider, env);
  if (compatible) {
    return {
      url: compatible.url,
      options: {
        method: "POST",
        headers: { "Content-Type": "application/json", ...compatible.headers },
        body: JSON.stringify({
          ...compatible.body,
          messages: [{ role: "user", content: EXTERNAL_PROVIDER_EVIDENCE_PROMPT }],
          temperature: 0,
          max_tokens: EXTERNAL_PROVIDER_EVIDENCE_MAX_OUTPUT_TOKENS,
        }),
      },
      readText(data) {
        const content = data?.choices?.[0]?.message?.content;
        return Array.isArray(content)
          ? content.map((part) => typeof part === "string" ? part : part?.text || "").join("").trim()
          : String(content || "").trim();
      },
    };
  }

  if (provider === "gemini") {
    const model = env.GEMINI_FREE_MODEL || "gemini-3-flash-preview";
    return {
      url: `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(env.GEMINI_API_KEY)}`,
      options: {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: EXTERNAL_PROVIDER_EVIDENCE_PROMPT }] }],
          generationConfig: { temperature: 0, maxOutputTokens: EXTERNAL_PROVIDER_EVIDENCE_MAX_OUTPUT_TOKENS },
        }),
      },
      readText(data) {
        return String(data?.candidates?.[0]?.content?.parts?.map((part) => part?.text || "").join("") || "").trim();
      },
    };
  }

  if (provider === "cloudflare") {
    const model = env.CLOUDFLARE_AI_FREE_MODEL || "@cf/zai-org/glm-4.7-flash";
    const accountId = String(env.CLOUDFLARE_AI_ACCOUNT_ID || "").trim();
    const modelPath = model.split("/").map(encodeURIComponent).join("/");
    return {
      url: `https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(accountId)}/ai/run/${modelPath}`,
      options: {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${env.CLOUDFLARE_AI_API_TOKEN}` },
        body: JSON.stringify({
          messages: [{ role: "user", content: EXTERNAL_PROVIDER_EVIDENCE_PROMPT }],
          temperature: 0,
          max_tokens: EXTERNAL_PROVIDER_EVIDENCE_MAX_OUTPUT_TOKENS,
        }),
      },
      readText(data) {
        return String(data?.result?.response || data?.result?.output_text || "").trim();
      },
    };
  }

  throw evidenceError("EVIDENCE_PROVIDER_NOT_SUPPORTED", "Provider is not supported for bounded evidence canaries.", 400);
}

async function fetchBoundedProvider(provider, env, fetchFn) {
  const request = providerRequest(provider, env);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetchFn(request.url, { ...request.options, signal: controller.signal });
    const raw = await response.text();
    let data = {};
    try { data = raw ? JSON.parse(raw) : {}; }
    catch { throw evidenceError("PROVIDER_EVIDENCE_INVALID_JSON", "Provider evidence response was invalid.", 502); }
    if (!response.ok) {
      throw evidenceError("PROVIDER_EVIDENCE_UPSTREAM_FAILED", `Provider evidence request failed with HTTP ${response.status}.`, 502, {
        upstreamStatus: Number(response.status || 0),
      });
    }
    const text = request.readText(data);
    if (!text) throw evidenceError("PROVIDER_EVIDENCE_EMPTY_RESPONSE", "Provider evidence response was empty.", 502);
    return text;
  } catch (error) {
    if (error?.name === "AbortError") {
      throw evidenceError("PROVIDER_EVIDENCE_TIMEOUT", "Provider evidence request timed out.", 504);
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

export async function runBoundedExternalProviderEvidenceCanary(provider, {
  env = process.env,
  fetchFn = globalThis.fetch,
  now = Date.now(),
} = {}) {
  const preflight = preflightExternalProviderEvidenceCanary(provider, env);
  if (!preflight.networkPermitted) {
    throw evidenceError(preflight.code || "EVIDENCE_CANARY_BLOCKED", "External provider evidence canary is not permitted by current Production policy.", 409, {
      preflight,
    });
  }
  if (typeof fetchFn !== "function") throw evidenceError("FETCH_NOT_AVAILABLE", "Provider evidence transport is unavailable.", 503);

  const startedAt = Date.now();
  const text = await fetchBoundedProvider(preflight.provider, env, fetchFn);
  const latencyMs = Math.max(0, Date.now() - startedAt);
  const receipt = Object.freeze({
    contract: "prve2",
    provider: preflight.provider,
    source: "bounded-canary",
    observedAt: new Date(now).toISOString(),
    releaseSha: preflight.releaseSha,
    releaseEnvironment: "production",
    requestClass: "provider-health",
    promptDigest: promptDigest(),
    maxOutputTokens: EXTERNAL_PROVIDER_EVIDENCE_MAX_OUTPUT_TOKENS,
    latencyMs,
    success: true,
    externalProviderInvoked: true,
    userDataIncluded: false,
    costMode: "free",
    failoverVerified: false,
  });
  const signature = signProviderEvidenceReceipt(receipt, env);
  if (!signature) throw evidenceError("PROVIDER_EVIDENCE_SIGNING_NOT_CONFIGURED", "Provider evidence signing is unavailable.", 503);
  const verification = recordSignedProviderEvidenceReceipt(receipt, signature, { env, now });
  if (!verification.liveVerified) {
    throw evidenceError("PROVIDER_EVIDENCE_RECEIPT_REJECTED", "Provider evidence receipt failed canonical verification.", 502, {
      verificationErrors: verification.errors,
    });
  }

  return Object.freeze({
    success: true,
    version: EXTERNAL_PROVIDER_EVIDENCE_CANARY_VERSION,
    provider: preflight.provider,
    evidenceState: verification.state,
    liveVerified: verification.liveVerified,
    exactReleaseIdentity: verification.exactReleaseIdentity,
    fresh: verification.fresh,
    providerAllowedByCost: verification.providerAllowedByCost,
    requestClass: receipt.requestClass,
    maxOutputTokens: receipt.maxOutputTokens,
    latencyMs: receipt.latencyMs,
    outputContentReturned: false,
    outputContentPersisted: false,
    userDataIncluded: false,
    fallbackAllowed: false,
    networkAttempts: 1,
    receiptSignatureReturned: false,
    outputDigest: crypto.createHash("sha256").update(text).digest("hex"),
  });
}
