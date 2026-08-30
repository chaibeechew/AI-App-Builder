import { getProviderConfig } from "./model-router.js";
import { filterProvidersByCost, getSoolenCostMode } from "../lib/soolen/cost-policy.js";
import { generateWithZeroCostRules } from "./zero-cost-provider.js";

const REQUEST_TIMEOUT_MS = Number(process.env.AI_REQUEST_TIMEOUT_MS || 30000);
const LOCAL_PROVIDERS = new Set(["ollama", "soolen-local"]);
const ORDER = [
  "gateway", "openrouter", "groq", "gemini", "cloudflare", "huggingface",
  "cerebras", "deepseek", "mistral", "together", "xai", "openai",
  "ollama", "soolen-local",
];

const runtime = globalThis.__SOOLEN_PROVIDER_RUNTIME || { cursor: 0, providers: new Map() };
globalThis.__SOOLEN_PROVIDER_RUNTIME = runtime;

function providerError(provider, message, status = 0, retryAfterMs = 0) {
  const error = new Error(message);
  error.provider = provider;
  error.status = status;
  error.retryAfterMs = retryAfterMs;
  return error;
}

function state(provider) {
  if (!runtime.providers.has(provider)) {
    runtime.providers.set(provider, { failures: 0, successes: 0, cooldownUntil: 0, lastError: "" });
  }
  return runtime.providers.get(provider);
}

function cooldownFor(error) {
  const status = Number(error?.status || 0);
  if (Number(error?.retryAfterMs) > 0) return Number(error.retryAfterMs);
  if (status === 401 || status === 403) return 60 * 60 * 1000;
  if (status === 402) return 24 * 60 * 60 * 1000;
  if (status === 429) return 90 * 1000;
  if (status === 400 || status === 404) return 10 * 60 * 1000;
  if (status >= 500) return 30 * 1000;
  return 15 * 1000;
}

function markFailure(provider, error) {
  const current = state(provider);
  current.failures += 1;
  current.lastError = String(error?.message || error || "Provider failed").slice(0, 300);
  current.cooldownUntil = Date.now() + cooldownFor(error);
}

function markSuccess(provider) {
  const current = state(provider);
  current.successes += 1;
  current.failures = 0;
  current.lastError = "";
  current.cooldownUntil = 0;
}

function parseRetryAfter(response) {
  const raw = response.headers.get("retry-after");
  if (!raw) return 0;
  const seconds = Number(raw);
  if (Number.isFinite(seconds)) return Math.max(0, seconds * 1000);
  const date = Date.parse(raw);
  return Number.isFinite(date) ? Math.max(0, date - Date.now()) : 0;
}

async function fetchJson(provider, url, options) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    const text = await response.text();
    let data = {};
    try { data = text ? JSON.parse(text) : {}; }
    catch { throw providerError(provider, `${provider} returned invalid JSON.`, 502); }
    if (!response.ok) {
      throw providerError(provider, `${provider} HTTP ${response.status}`, response.status, parseRetryAfter(response));
    }
    return data;
  } catch (error) {
    if (error?.name === "AbortError") throw providerError(provider, `${provider} timed out.`, 408);
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

function messageContent(data, provider) {
  const content = data?.choices?.[0]?.message?.content;
  const text = Array.isArray(content)
    ? content.map((part) => typeof part === "string" ? part : part?.text || "").join("")
    : String(content || "");
  if (!text.trim()) throw providerError(provider, `${provider} returned an empty response.`, 502);
  return text.trim();
}

async function openAICompatible({ provider, baseUrl, apiKey, model, prompt, extra = {}, headers = {} }) {
  if (!apiKey || !model) throw providerError(provider, `${provider} is not configured.`);
  const data = await fetchJson(provider, `${baseUrl.replace(/\/$/, "")}/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}`, ...headers },
    body: JSON.stringify({ model, messages: [{ role: "user", content: prompt }], temperature: 0.2, ...extra }),
  });
  return messageContent(data, provider);
}

async function callGemini(prompt) {
  const provider = "gemini";
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw providerError(provider, "Gemini is not configured.");
  const freeMode = getSoolenCostMode() === "free";
  const model = freeMode
    ? process.env.GEMINI_FREE_MODEL || "gemini-3-flash-preview"
    : process.env.GEMINI_MODEL || "gemini-2.5-flash";
  const data = await fetchJson(provider, `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(key)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { temperature: 0.2 } }),
  });
  const text = data?.candidates?.[0]?.content?.parts?.map((part) => part?.text || "").join("").trim();
  if (!text) throw providerError(provider, "Gemini returned an empty response.", 502);
  return text;
}

async function callCloudflare(prompt) {
  const provider = "cloudflare";
  const accountId = String(process.env.CLOUDFLARE_AI_ACCOUNT_ID || "").trim();
  const token = process.env.CLOUDFLARE_AI_API_TOKEN;
  const freeMode = getSoolenCostMode() === "free";
  const model = freeMode
    ? process.env.CLOUDFLARE_AI_FREE_MODEL || "@cf/zai-org/glm-4.7-flash"
    : process.env.CLOUDFLARE_AI_MODEL || "@cf/openai/gpt-oss-20b";
  if (!/^[A-Za-z0-9_-]+$/.test(accountId) || !token || !/^@cf\/[A-Za-z0-9._/-]+$/.test(model)) {
    throw providerError(provider, "Cloudflare Workers AI is not configured.");
  }
  const modelPath = model.split("/").map(encodeURIComponent).join("/");
  const data = await fetchJson(provider, `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${modelPath}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ messages: [{ role: "user", content: prompt }], temperature: 0.2 }),
  });
  const text = String(data?.result?.response || data?.result?.output_text || "").trim();
  if (!text) throw providerError(provider, "Cloudflare returned an empty response.", 502);
  return text;
}

async function callOllama(prompt) {
  const provider = "ollama";
  const base = String(process.env.OLLAMA_BASE_URL || "").replace(/\/$/, "");
  if (!base) throw providerError(provider, "Ollama is not configured.");
  const data = await fetchJson(provider, `${base}/api/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model: process.env.OLLAMA_MODEL || "llama3.2:3b", prompt, stream: false, options: { temperature: 0.2 } }),
  });
  const text = String(data?.response || "").trim();
  if (!text) throw providerError(provider, "Ollama returned an empty response.", 502);
  return text;
}

const calls = {
  "soolen-local": async (prompt) => generateWithZeroCostRules(prompt),
  gateway: (prompt) => openAICompatible({ provider:"gateway", baseUrl:"https://ai-gateway.vercel.sh/v1", apiKey:process.env.AI_GATEWAY_API_KEY, model:process.env.AI_GATEWAY_MODEL, prompt }),
  openrouter: (prompt) => openAICompatible({ provider:"openrouter", baseUrl:"https://openrouter.ai/api/v1", apiKey:process.env.OPENROUTER_API_KEY, model:getSoolenCostMode() === "free" ? "openrouter/free" : process.env.OPENROUTER_MODEL || "openrouter/auto", prompt, headers:{ "HTTP-Referer":process.env.APP_URL || "https://ai-app-builder-lovat.vercel.app", "X-Title":"Soolen AI" } }),
  groq: (prompt) => openAICompatible({ provider:"groq", baseUrl:"https://api.groq.com/openai/v1", apiKey:process.env.GROQ_API_KEY, model:getSoolenCostMode() === "free" ? process.env.GROQ_FREE_MODEL || "openai/gpt-oss-20b" : process.env.GROQ_MODEL || "openai/gpt-oss-20b", prompt }),
  huggingface: (prompt) => openAICompatible({ provider:"huggingface", baseUrl:"https://router.huggingface.co/v1", apiKey:process.env.HF_TOKEN, model:process.env.HF_MODEL, prompt }),
  cerebras: (prompt) => openAICompatible({ provider:"cerebras", baseUrl:"https://api.cerebras.ai/v1", apiKey:process.env.CEREBRAS_API_KEY, model:process.env.CEREBRAS_MODEL || "llama-3.3-70b", prompt }),
  deepseek: (prompt) => openAICompatible({ provider:"deepseek", baseUrl:"https://api.deepseek.com", apiKey:process.env.DEEPSEEK_API_KEY, model:process.env.DEEPSEEK_MODEL || "deepseek-chat", prompt }),
  mistral: (prompt) => openAICompatible({ provider:"mistral", baseUrl:"https://api.mistral.ai/v1", apiKey:process.env.MISTRAL_API_KEY, model:process.env.MISTRAL_MODEL || "mistral-small-latest", prompt }),
  together: (prompt) => openAICompatible({ provider:"together", baseUrl:"https://api.together.xyz/v1", apiKey:process.env.TOGETHER_API_KEY, model:process.env.TOGETHER_MODEL || "meta-llama/Llama-3.3-70B-Instruct-Turbo", prompt }),
  xai: (prompt) => openAICompatible({ provider:"xai", baseUrl:"https://api.x.ai/v1", apiKey:process.env.XAI_API_KEY, model:process.env.XAI_MODEL || "grok-4-1-fast-non-reasoning", prompt }),
  openai: (prompt) => openAICompatible({ provider:"openai", baseUrl:"https://api.openai.com/v1", apiKey:process.env.OPENAI_API_KEY, model:process.env.OPENAI_MODEL || "gpt-5.6", prompt }),
  cloudflare: callCloudflare,
};

function configured(provider) {
  if (provider === "soolen-local") return true;
  if (provider === "ollama") return Boolean(process.env.OLLAMA_BASE_URL);
  if (provider === "gateway") return Boolean(process.env.AI_GATEWAY_API_KEY && process.env.AI_GATEWAY_MODEL);
  if (provider === "gemini") return Boolean(process.env.GEMINI_API_KEY);
  if (provider === "openrouter") return Boolean(process.env.OPENROUTER_API_KEY);
  if (provider === "cloudflare") return Boolean(process.env.CLOUDFLARE_AI_ACCOUNT_ID && process.env.CLOUDFLARE_AI_API_TOKEN);
  if (provider === "huggingface") return Boolean(process.env.HF_TOKEN && process.env.HF_MODEL);
  return Boolean(process.env[`${provider.toUpperCase()}_API_KEY`]);
}

function orderedProviders(providers) {
  const selected = getProviderConfig().provider;
  let remote = providers.filter((provider) => !LOCAL_PROVIDERS.has(provider));
  const local = providers.filter((provider) => LOCAL_PROVIDERS.has(provider));

  if (getSoolenCostMode() === "free" && remote.length > 1) {
    const offset = runtime.cursor % remote.length;
    runtime.cursor = (runtime.cursor + 1) % Number.MAX_SAFE_INTEGER;
    remote = [...remote.slice(offset), ...remote.slice(0, offset)];
  } else if (selected && remote.includes(selected)) {
    remote = [selected, ...remote.filter((provider) => provider !== selected)];
  }
  return [...remote, ...local];
}

export async function generateWithAI(prompt) {
  const response = await generateWithFallback(prompt);
  return response.result;
}

export async function generateWithFallback(prompt, options = {}) {
  const value = String(prompt || "").trim();
  if (!value) throw providerError("router", "AI prompt is empty.", 400);
  const allowed = Array.isArray(options.providers) && options.providers.length
    ? new Set(options.providers.map((provider) => String(provider).toLowerCase()))
    : null;
  const requested = allowed ? ORDER.filter((provider) => allowed.has(provider)) : ORDER;
  const order = orderedProviders(filterProvidersByCost(requested));
  const errors = [];
  let attempts = 0;

  for (const provider of order) {
    if (!configured(provider)) continue;
    const current = state(provider);
    if (current.cooldownUntil > Date.now() && provider !== "soolen-local") {
      errors.push({ provider, error:"cooling_down", retryAt:current.cooldownUntil });
      continue;
    }
    attempts += 1;
    try {
      const result = provider === "ollama"
        ? await callOllama(value)
        : provider === "gemini"
          ? await callGemini(value)
          : await calls[provider](value);
      if (result) {
        markSuccess(provider);
        return { provider, result, attempts, errors };
      }
      throw providerError(provider, `${provider} returned an empty response.`, 502);
    } catch (error) {
      markFailure(provider, error);
      errors.push({ provider, error:String(error?.message || "Unknown error"), status:Number(error?.status || 0) });
    }
  }

  throw providerError("router", `All authorized AI providers failed: ${JSON.stringify(errors)}`, 503);
}

export function getProviderRuntimeHealth() {
  return ORDER.map((provider) => ({ provider, configured:configured(provider), ...state(provider) }));
}
