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
    text.includes("model not found") || text.includes("does not exist") ||
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

async function callOpenAI({ name, keyEnv, modelEnv, defaultModel, baseUrl, prompt, extraHeaders = {} }) {
  const rawKey = process.env[keyEnv];
  const key = typeof rawKey === "string" ? rawKey.trim() : "";
  if (!key) throw err(`${name.toUpperCase().replace(/[^A-Z0-9]/g, "_")}_NOT_CONFIGURED`);

  const model = (process.env[modelEnv] || defaultModel || "").trim();
  if (!model) throw err(`${name.toUpperCase().replace(/[^A-Z0-9]/g, "_")}_MODEL_NOT_CONFIGURED`);

  // Important: provider-specific headers are added first; Authorization is written last.
  const headers = {
    "Content-Type": "application/json",
    ...extraHeaders,
    Authorization: `Bearer ${key}`
  };

  const response = await fetchTimeout(`${baseUrl.replace(/\/$/, "")}/chat/completions`, {
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
  const model = (process.env.GEMINI_MODEL || "gemini-2.5-flash").trim();
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
  { name: "Gemini", type: "gemini", keyEnv: "GEMINI_API_KEY", modelEnv: "GEMINI_MODEL", defaultModel: "gemini-2.5-flash", priority: 10 },
  { name: "Groq", keyEnv: "GROQ_API_KEY", modelEnv: "GROQ_MODEL", defaultModel: "llama-3.3-70b-versatile", baseUrl: "https://api.groq.com/openai/v1", priority: 20 },
  { name: "OpenRouter", keyEnv: "OPENROUTER_API_KEY", modelEnv: "OPENROUTER_MODEL", defaultModel: "openrouter/free", baseUrl: "https://openrouter.ai/api/v1", priority: 30, extraHeaders: { "HTTP-Referer": process.env.APP_URL || "https://ai-app-builder-lovat.vercel.app", "X-Title": "AI App Builder" } },
  { name: "Cerebras", keyEnv: "CEREBRAS_API_KEY", modelEnv: "CEREBRAS_MODEL", defaultModel: "llama-3.3-70b", baseUrl: "https://api.cerebras.ai/v1", priority: 40 },
  { name: "Mistral", keyEnv: "MISTRAL_API_KEY", modelEnv: "MISTRAL_MODEL", defaultModel: "mistral-small-latest", baseUrl: "https://api.mistral.ai/v1", priority: 50 },
  { name: "Together", keyEnv: "TOGETHER_API_KEY", modelEnv: "TOGETHER_MODEL", defaultModel: "meta-llama/Llama-3.3-70B-Instruct-Turbo", baseUrl: "https://api.together.xyz/v1", priority: 60 },
  { name: "Fireworks", keyEnv: "FIREWORKS_API_KEY", modelEnv: "FIREWORKS_MODEL", defaultModel: "accounts/fireworks/models/llama-v3p3-70b-instruct", baseUrl: "https://api.fireworks.ai/inference/v1", priority: 70 },
  { name: "DeepSeek", keyEnv: "DEEPSEEK_API_KEY", modelEnv: "DEEPSEEK_MODEL", defaultModel: "deepseek-chat", baseUrl: "https://api.deepseek.com/v1", priority: 80 },
  { name: "xAI", keyEnv: "XAI_API_KEY", modelEnv: "XAI_MODEL", defaultModel: "grok-3-mini", baseUrl: "https://api.x.ai/v1", priority: 90 }
];

export async function generateWithAI(prompt) {
  if (typeof prompt !== "string" || !prompt.trim()) throw err("AI prompt is empty.", 400);
  const failures = [];

  for (const p of PROVIDERS.sort((a, b) => a.priority - b.priority)) {
    try {
      let result;
      if (p.type === "gemini") result = await callGemini(prompt.trim());
      else result = await callOpenAI({ ...p, prompt: prompt.trim() });
      return result;
    } catch (e) {
      const message = String(e?.message || e || "Unknown provider error");
      failures.push(`${p.name}: ${message}`);
      console.warn(`[AI Provider skipped] ${p.name}: ${message}`);
      // Any provider configuration/auth/quota/model/server failure is isolated.
      // Continue immediately to the next configured provider.
      if (retryable(e) || message.endsWith("_NOT_CONFIGURED") || message.endsWith("_MODEL_NOT_CONFIGURED")) continue;
      continue;
    }
  }

  throw err("All configured AI providers are currently unavailable. Automatic provider failover was attempted.", 503);
}

export function getProviderStatus() {
  return PROVIDERS.map(p => ({ name: p.name, configured: p.type === "gemini" ? configured(process.env.GEMINI_API_KEY) : configured(process.env[p.keyEnv]), model: process.env[p.modelEnv] || p.defaultModel }));
}
