// AI App Builder - Hardened Multi-Provider Router
// Server-side only. API keys are read from Vercel environment variables.

const TIMEOUT_MS = Number(process.env.AI_REQUEST_TIMEOUT_MS || 45000);

function err(message, status = 0) {
  const e = new Error(message);
  e.status = status;
  return e;
}

function configured(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function retryable(e) {
  const status = Number(e?.status || e?.statusCode || 0);
  const text = String(e?.message || e || "").toLowerCase();
  return status === 400 || status === 401 || status === 403 || status === 404 ||
    status === 408 || status === 409 || status === 425 || status === 429 || status >= 500 ||
    text.includes("quota") || text.includes("rate limit") || text.includes("rate_limit") ||
    text.includes("resource_exhausted") || text.includes("too many requests") ||
    text.includes("model not found") || text.includes("model_not_found") || text.includes("does not exist") ||
    text.includes("temporarily unavailable") || text.includes("capacity") || text.includes("overloaded");
}

async function fetchTimeout(url, options = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } catch (e) {
    if (e?.name === "AbortError") throw err("AI provider request timed out.", 408);
    throw e;
  } finally {
    clearTimeout(timer);
  }
}

async function jsonResponse(response, provider) {
  const text = await response.text();
  if (!response.ok) {
    throw err(`${provider} HTTP ${response.status}: ${text.slice(0, 2000)}`, response.status);
  }
  try { return JSON.parse(text); }
  catch { throw err(`${provider} returned invalid JSON.`, 502); }
}

function openAIText(data, provider) {
  const text = data?.choices?.[0]?.message?.content;
  if (typeof text !== "string" || !text.trim()) throw err(`${provider} returned an empty response.`, 502);
  return text.trim();
}

async function callOpenAI({ name, keyEnv, modelEnv, defaultModel, baseUrl, prompt, extraHeaders = {}, requiredEnvs = [] }) {
  for (const envName of requiredEnvs) {
    if (!configured(process.env[envName])) {
      throw err(`${name.toUpperCase().replace(/[^A-Z0-9]/g, "_")}_NOT_CONFIGURED`);
    }
  }

  const rawKey = process.env[keyEnv];
  const key = typeof rawKey === "string" ? rawKey.trim() : "";
  if (!key) throw err(`${name.toUpperCase().replace(/[^A-Z0-9]/g, "_")}_NOT_CONFIGURED`);

  const model = (process.env[modelEnv] || defaultModel || "").trim();
  if (!model) throw err(`${name.toUpperCase().replace(/[^A-Z0-9]/g, "_")}_MODEL_NOT_CONFIGURED`);

  const resolvedBaseUrl = typeof baseUrl === "function" ? baseUrl() : baseUrl;
  if (!configured(resolvedBaseUrl)) throw err(`${name.toUpperCase().replace(/[^A-Z0-9]/g, "_")}_NOT_CONFIGURED`);

  const headers = {
    "Content-Type": "application/json",
    ...extraHeaders,
    Authorization: `Bearer ${key}`
  };

  const response = await fetchTimeout(`${resolvedBaseUrl.replace(/\/$/, "")}/chat/completions`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      model,
      messages: [{ role: "user", content: prompt }],
      temperature: 0.2
    })
  });

  return { text: openAIText(await jsonResponse(response, name), name), provider: name };
}

async function callGemini(prompt) {
  const rawKey = process.env.GEMINI_API_KEY;
  const key = typeof rawKey === "string" ? rawKey.trim() : "";
  if (!key) throw err("GEMINI_NOT_CONFIGURED");
  const model = (process.env.GEMINI_MODEL || "gemini-3.6-flash").trim();
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(key)}`;
  const response = await fetchTimeout(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
  });
  const data = await jsonResponse(response, "Gemini");
  const text = data?.candidates?.[0]?.content?.parts?.map(p => p?.text || "").join("").trim();
  if (!text) throw err("Gemini returned an empty response.", 502);
  return { text, provider: "Gemini" };
}

const PROVIDERS = [
  { name: "Gemini", type: "gemini", keyEnv: "GEMINI_API_KEY", modelEnv: "GEMINI_MODEL", defaultModel: "gemini-3.6-flash", priority: 10 },
  { name: "Groq", type: "openai", keyEnv: "GROQ_API_KEY", modelEnv: "GROQ_MODEL", defaultModel: "llama-3.3-70b-versatile", baseUrl: "https://api.groq.com/openai/v1", priority: 20 },
  { name: "OpenRouter", type: "openai", keyEnv: "OPENROUTER_API_KEY", modelEnv: "OPENROUTER_MODEL", defaultModel: "openrouter/free", baseUrl: "https://openrouter.ai/api/v1", priority: 30, extraHeaders: { "HTTP-Referer": process.env.APP_URL || "https://ai-app-builder-lovat.vercel.app", "X-Title": "AI App Builder" } },
  { name: "Hugging Face", type: "openai", keyEnv: "HF_TOKEN", modelEnv: "HF_MODEL", defaultModel: "Qwen/Qwen2.5-Coder-32B-Instruct:fastest", baseUrl: "https://router.huggingface.co/v1", priority: 35 },
  { name: "Cerebras", type: "openai", keyEnv: "CEREBRAS_API_KEY", modelEnv: "CEREBRAS_MODEL", defaultModel: "llama-3.3-70b", baseUrl: "https://api.cerebras.ai/v1", priority: 40 },
  { name: "Cloudflare Workers AI", type: "openai", keyEnv: "CLOUDFLARE_AI_API_TOKEN", modelEnv: "CLOUDFLARE_AI_MODEL", defaultModel: "@cf/meta/llama-3.3-70b-instruct-fp8-fast", baseUrl: () => `https://api.cloudflare.com/client/v4/accounts/${process.env.CLOUDFLARE_AI_ACCOUNT_ID || ""}/ai/v1`, requiredEnvs: ["CLOUDFLARE_AI_ACCOUNT_ID"], priority: 45 },
  { name: "Mistral", type: "openai", keyEnv: "MISTRAL_API_KEY", modelEnv: "MISTRAL_MODEL", defaultModel: "mistral-small-latest", baseUrl: "https://api.mistral.ai/v1", priority: 50 },
  { name: "Together", type: "openai", keyEnv: "TOGETHER_API_KEY", modelEnv: "TOGETHER_MODEL", defaultModel: "meta-llama/Llama-3.3-70B-Instruct-Turbo", baseUrl: "https://api.together.xyz/v1", priority: 60 },
  { name: "Fireworks", type: "openai", keyEnv: "FIREWORKS_API_KEY", modelEnv: "FIREWORKS_MODEL", defaultModel: "accounts/fireworks/models/llama-v3p3-70b-instruct", baseUrl: "https://api.fireworks.ai/inference/v1", priority: 70 },
  { name: "DeepSeek", type: "openai", keyEnv: "DEEPSEEK_API_KEY", modelEnv: "DEEPSEEK_MODEL", defaultModel: "deepseek-chat", baseUrl: "https://api.deepseek.com/v1", priority: 80 },
  { name: "xAI", type: "openai", keyEnv: "XAI_API_KEY", modelEnv: "XAI_MODEL", defaultModel: "grok-3-mini", baseUrl: "https://api.x.ai/v1", priority: 90 },
  { name: "OpenAI", type: "openai", keyEnv: "OPENAI_API_KEY", modelEnv: "OPENAI_MODEL", defaultModel: "gpt-5-mini", baseUrl: "https://api.openai.com/v1", priority: 100 }
];

export async function generateWithAI(prompt) {
  if (typeof prompt !== "string" || !prompt.trim()) throw err("AI prompt is empty.", 400);
  const failures = [];

  for (const p of PROVIDERS.slice().sort((a, b) => a.priority - b.priority)) {
    try {
      const result = p.type === "gemini"
        ? await callGemini(prompt.trim())
        : await callOpenAI({ ...p, prompt: prompt.trim() });
      return result;
    } catch (e) {
      const message = String(e?.message || e || "Unknown provider error");
      failures.push(`${p.name}: ${message}`);
      console.warn(`[AI Provider skipped] ${p.name}: ${message}`);
      if (!retryable(e) && !message.endsWith("_NOT_CONFIGURED") && !message.endsWith("_MODEL_NOT_CONFIGURED")) {
        continue;
      }
      continue;
    }
  }

  const configuredFailures = failures.filter(message => !/_NOT_CONFIGURED(?:$|:)|_MODEL_NOT_CONFIGURED(?:$|:)/.test(message));
  const detail = configuredFailures.length ? ` Last provider errors: ${configuredFailures.slice(0, 3).join(" | ")}` : "";
  throw err(`All configured AI providers are currently unavailable. Automatic provider failover was attempted.${detail}`, 503);
}

export function getProviderStatus() {
  return PROVIDERS.map(p => {
    const requiredReady = (p.requiredEnvs || []).every(envName => configured(process.env[envName]));
    const isConfigured = p.type === "gemini"
      ? configured(process.env.GEMINI_API_KEY)
      : configured(process.env[p.keyEnv]) && requiredReady;

    return {
      name: p.name,
      type: p.type,
      configured: isConfigured,
      available: isConfigured,
      failures: 0,
      success: 0,
      model: process.env[p.modelEnv] || p.defaultModel
    };
  });
}
