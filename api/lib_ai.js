// ============================================================
// AI APP BUILDER
// Dynamic Multi-Provider Router v2
// ============================================================
//
// Design goals:
//
// 1. Automatically discover providers from Environment Variables
// 2. Support many providers without changing this router
// 3. 85% quota threshold triggers rollover when quota headers exist
// 4. Automatically rollover on 429 / quota / timeout / 5xx
// 5. Provider cooldown protection
// 6. Successful providers receive priority
// 7. API keys remain server-side
// 8. Supports OpenAI-compatible APIs
// 9. Supports Gemini
// 10. Supports Ollama
// 11. Future providers can be added through Environment Variables
//
// ============================================================


const MAX_PROMPT_LENGTH = Number(
  process.env.AI_MAX_PROMPT_LENGTH || 20000
);

const REQUEST_TIMEOUT_MS = Number(
  process.env.AI_REQUEST_TIMEOUT_MS || 45000
);

const ROLLOVER_THRESHOLD = Number(
  process.env.AI_ROLLOVER_THRESHOLD || 0.85
);

const COOLDOWN_MS = Number(
  process.env.AI_PROVIDER_COOLDOWN_MS || 60000
);

const MAX_PROVIDER_ERRORS = Number(
  process.env.AI_MAX_PROVIDER_ERRORS || 200
);


// ============================================================
// ERROR HELPERS
// ============================================================

function createError(message, status = 0, metadata = {}) {

  const error = new Error(message);

  error.status = status;

  Object.assign(
    error,
    metadata
  );

  return error;
}


function providerEnvName(name) {

  return String(name || "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "_");

}


function isNotConfigured(message) {

  const value =
    String(message || "");

  return (
    value.endsWith("_NOT_CONFIGURED") ||
    value.endsWith("_MODEL_NOT_CONFIGURED")
  );

}


function isRetryableProviderError(error) {

  const status = Number(
    error?.status ||
    error?.statusCode ||
    0
  );

  const message =
    String(
      error?.message ||
      error ||
      ""
    )
    .toLowerCase();

  return (

    status === 408 ||

    status === 409 ||

    status === 425 ||

    status === 429 ||

    status === 404 ||

    status >= 500 ||

    message.includes("quota") ||

    message.includes("rate limit") ||

    message.includes("rate_limit") ||

    message.includes("resource_exhausted") ||

    message.includes("too many requests") ||

    message.includes("model_not_found") ||

    message.includes("model not found") ||

    message.includes("does not exist") ||

    message.includes("temporarily unavailable") ||

    message.includes("capacity") ||

    message.includes("overloaded")

  );

}


// ============================================================
// PROMPT VALIDATION
// ============================================================

function validatePrompt(prompt) {

  if (
    typeof prompt !== "string"
  ) {

    throw createError(
      "Invalid AI prompt.",
      400
    );

  }

  const value =
    prompt.trim();

  if (!value) {

    throw createError(
      "AI prompt is empty.",
      400
    );

  }

  if (
    value.length >
    MAX_PROMPT_LENGTH
  ) {

    throw createError(
      `AI prompt is too long. Maximum ${MAX_PROMPT_LENGTH} characters.`,
      413
    );

  }

  return value;

}


// ============================================================
// PROVIDER MEMORY
// ============================================================
//
// Important:
//
// Vercel serverless functions are stateless.
//
// This memory is therefore only a short-lived optimization.
//
// It is NOT used as the source of truth for billing/quota.
//
// A future version can connect this to Redis / KV / database.
//
// ============================================================

const providerState =
  globalThis.__AI_APP_BUILDER_PROVIDER_STATE ||
  new Map();

globalThis.__AI_APP_BUILDER_PROVIDER_STATE =
  providerState;


function getProviderState(name) {

  if (
    !providerState.has(name)
  ) {

    providerState.set(
      name,
      {
        failures: 0,
        success: 0,
        cooldownUntil: 0,
        lastUsed: 0,
        lastQuotaRatio: null
      }
    );

  }

  return providerState.get(name);

}


function isProviderCoolingDown(name) {

  const state =
    getProviderState(name);

  return (
    state.cooldownUntil >
    Date.now()
  );

}


function markProviderFailure(
  name,
  error
) {

  const state =
    getProviderState(name);

  state.failures += 1;

  state.lastUsed =
    Date.now();

  if (
    isRetryableProviderError(
      error
    )
  ) {

    state.cooldownUntil =
      Date.now() +
      COOLDOWN_MS;

  }

}


function markProviderSuccess(
  name,
  quotaRatio = null
) {

  const state =
    getProviderState(name);

  state.success += 1;

  state.failures = 0;

  state.cooldownUntil = 0;

  state.lastUsed =
    Date.now();

  if (
    typeof quotaRatio ===
    "number"
  ) {

    state.lastQuotaRatio =
      quotaRatio;

  }

}


// ============================================================
// TIMEOUT PROTECTION
// ============================================================

async function fetchWithTimeout(
  url,
  options = {}
) {

  const controller =
    new AbortController();

  const timer =
    setTimeout(
      () => controller.abort(),
      REQUEST_TIMEOUT_MS
    );

  try {

    const response =
      await fetch(
        url,
        {
          ...options,
          signal:
            controller.signal
        }
      );

    return response;

  } catch (error) {

    if (
      error?.name ===
      "AbortError"
    ) {

      throw createError(
        "AI provider request timed out.",
        408
      );

    }

    throw error;

  } finally {

    clearTimeout(timer);

  }

}


// ============================================================
// QUOTA HEADER DETECTION
// ============================================================
//
// Different providers expose different headers.
//
// We check several common patterns.
//
// Example:
//
// x-ratelimit-limit-requests
// x-ratelimit-remaining-requests
// x-ratelimit-limit-tokens
// x-ratelimit-remaining-tokens
// x-ratelimit-used
// x-ratelimit-limit
// x-ratelimit-remaining
//
// If remaining / limit indicates >= 85% usage,
// rollover is triggered.
//
// ============================================================

function parseNumber(value) {

  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {

    return null;

  }

  const number =
    Number(
      String(value)
        .replace(/,/g, "")
        .trim()
    );

  return Number.isFinite(number)
    ? number
    : null;

}


function getHeader(
  headers,
  names
) {

  for (
    const name
    of names
  ) {

    const value =
      headers.get(name);

    if (
      value !== null
    ) {

      return value;

    }

  }

  return null;

}


function detectQuotaUsage(
  headers
) {

  if (!headers) {

    return {
      ratio: null,
      rollover: false
    };

  }


  // ----------------------------------------------------------
  // Method 1:
  // Used / Limit
  // ----------------------------------------------------------

  const used =
    parseNumber(
      getHeader(
        headers,
        [
          "x-ratelimit-used",
          "x-rate-limit-used",
          "x-quota-used",
          "x-usage"
        ]
      )
    );


  const limit =
    parseNumber(
      getHeader(
        headers,
        [
          "x-ratelimit-limit",
          "x-rate-limit-limit",
          "x-quota-limit"
        ]
      )
    );


  if (
    used !== null &&
    limit !== null &&
    limit > 0
  ) {

    const ratio =
      used / limit;

    return {
      ratio,
      rollover:
        ratio >=
        ROLLOVER_THRESHOLD
    };

  }


  // ----------------------------------------------------------
  // Method 2:
  // Remaining / Limit
  // ----------------------------------------------------------

  const remaining =
    parseNumber(
      getHeader(
        headers,
        [
          "x-ratelimit-remaining",
          "x-rate-limit-remaining"
        ]
      )
    );


  if (
    remaining !== null &&
    limit !== null &&
    limit > 0
  ) {

    const ratio =
      1 -
      remaining / limit;

    return {
      ratio,
      rollover:
        ratio >=
        ROLLOVER_THRESHOLD
    };

  }


  // ----------------------------------------------------------
  // Method 3:
  // Requests
  // ----------------------------------------------------------

  const requestLimit =
    parseNumber(
      getHeader(
        headers,
        [
          "x-ratelimit-limit-requests",
          "x-rate-limit-limit-requests"
        ]
      )
    );


  const requestRemaining =
    parseNumber(
      getHeader(
        headers,
        [
          "x-ratelimit-remaining-requests",
          "x-rate-limit-remaining-requests"
        ]
      )
    );


  if (
    requestLimit !== null &&
    requestRemaining !== null &&
    requestLimit > 0
  ) {

    const ratio =
      1 -
      requestRemaining /
      requestLimit;

    return {
      ratio,
      rollover:
        ratio >=
        ROLLOVER_THRESHOLD
    };

  }


  // ----------------------------------------------------------
  // Method 4:
  // Tokens
  // ----------------------------------------------------------

  const tokenLimit =
    parseNumber(
      getHeader(
        headers,
        [
          "x-ratelimit-limit-tokens",
          "x-rate-limit-limit-tokens"
        ]
      )
    );


  const tokenRemaining =
    parseNumber(
      getHeader(
        headers,
        [
          "x-ratelimit-remaining-tokens",
          "x-rate-limit-remaining-tokens"
        ]
      )
    );


  if (
    tokenLimit !== null &&
    tokenRemaining !== null &&
    tokenLimit > 0
  ) {

    const ratio =
      1 -
      tokenRemaining /
      tokenLimit;

    return {
      ratio,
      rollover:
        ratio >=
        ROLLOVER_THRESHOLD
    };

  }


  return {
    ratio: null,
    rollover: false
  };

}


// ============================================================
// RESPONSE PARSER
// ============================================================

async function readJson(
  response,
  providerName
) {

  const text =
    await response.text();

  if (
    !response.ok
  ) {

    const detail =
      text.length > 2000
        ? `${text.slice(0, 2000)}...`
        : text;

    throw createError(
      `${providerName} HTTP ${response.status}: ${detail}`,
      response.status
    );

  }

  try {

    return JSON.parse(
      text
    );

  } catch {

    throw createError(
      `${providerName} returned invalid JSON.`,
      502
    );

  }

}


// ============================================================
// OPENAI-COMPATIBLE RESPONSE
// ============================================================

function extractOpenAIContent(
  data,
  providerName
) {

  const content =
    data
      ?.choices?.[0]
      ?.message
      ?.content;

  if (
    typeof content !==
      "string" ||
    !content.trim()
  ) {

    throw createError(
      `${providerName} returned an empty response.`,
      502
    );

  }

  return content.trim();

}


// ============================================================
// OPENAI-COMPATIBLE CALL
// ============================================================

async function callOpenAICompatible({

  name,

  baseUrl,

  keyEnv,

  modelEnv,

  defaultModel,

  prompt,

  headers = {},

  body = {}

}) {

  const key =
    process.env[keyEnv];

  if (!key) {

    throw createError(
      `${providerEnvName(name)}_NOT_CONFIGURED`
    );

  }


  const model =
    process.env[modelEnv] ||
    defaultModel;


  if (!model) {

    throw createError(
      `${providerEnvName(name)}_MODEL_NOT_CONFIGURED`
    );

  }


  const response =
    await fetchWithTimeout(

      `${baseUrl.replace(
        /\/$/,
        ""
      )}/chat/completions`,

      {

        method: "POST",

        headers: {

          "Content-Type":
            "application/json",

          Authorization:
            `Bearer ${key}`,

          ...headers

        },

        body: JSON.stringify({

          model,

          messages: [

            {
              role: "user",
              content: prompt
            }

          ],

          temperature: 0.2,

          ...body

        })

      }

    );


  const quota =
    detectQuotaUsage(
      response.headers
    );


  if (
    quota.rollover
  ) {

    const error =
      createError(
        `${name} reached ${Math.round(
          quota.ratio * 100
        )}% usage. Automatic rollover triggered.`,
        429
      );

    error.quotaRatio =
      quota.ratio;

    throw error;

  }


  const data =
    await readJson(
      response,
      name
    );


  const output =
    extractOpenAIContent(
      data,
      name
    );


  return {

    text: output,

    quotaRatio:
      quota.ratio

  };

}


// ============================================================
// GEMINI
// ============================================================

async function callGemini(
  prompt
) {

  const key =
    process.env.GEMINI_API_KEY;

  if (!key) {

    throw createError(
      "GEMINI_NOT_CONFIGURED"
    );

  }


  const model =
    process.env.GEMINI_MODEL ||
    "gemini-2.5-flash";


  const url =
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
      model
    )}:generateContent?key=${encodeURIComponent(
      key
    )}`;


  const response =
    await fetchWithTimeout(

      url,

      {

        method: "POST",

        headers: {

          "Content-Type":
            "application/json"

        },

        body: JSON.stringify({

          contents: [

            {

              parts: [

                {
                  text: prompt
                }

              ]

            }

          ]

        })

      }

    );


  const quota =
    detectQuotaUsage(
      response.headers
    );


  if (
    quota.rollover
  ) {

    const error =
      createError(
        `Gemini reached ${Math.round(
          quota.ratio * 100
        )}% usage. Automatic rollover triggered.`,
        429
      );

    error.quotaRatio =
      quota.ratio;

    throw error;

  }


  const data =
    await readJson(
      response,
      "Gemini"
    );


  const output =
    data
      ?.candidates?.[0]
      ?.content
      ?.parts
      ?.map(
        part =>
          part?.text || ""
      )
      .join("")
      .trim();


  if (!output) {

    throw createError(
      "Gemini returned an empty response.",
      502
    );

  }


  return {

    text: output,

    quotaRatio:
      quota.ratio

  };

}


// ============================================================
// OLLAMA
// ============================================================

async function callOllama(
  prompt
) {

  const baseUrl =
    process.env.OLLAMA_BASE_URL;


  if (!baseUrl) {

    throw createError(
      "OLLAMA_NOT_CONFIGURED"
    );

  }


  const model =
    process.env.OLLAMA_MODEL ||
    "llama3.2";


  const response =
    await fetchWithTimeout(

      `${baseUrl.replace(
        /\/$/,
        ""
      )}/api/chat`,

      {

        method: "POST",

        headers: {

          "Content-Type":
            "application/json"

        },

        body: JSON.stringify({

          model,

          messages: [

            {

              role: "user",

              content: prompt

            }

          ],

          stream: false

        })

      }

    );


  const quota =
    detectQuotaUsage(
      response.headers
    );


  if (
    quota.rollover
  ) {

    const error =
      createError(
        `Ollama reached ${Math.round(
          quota.ratio * 100
        )}% usage. Automatic rollover triggered.`,
        429
      );

    error.quotaRatio =
      quota.ratio;

    throw error;

  }


  const data =
    await readJson(
      response,
      "Ollama"
    );


  const output =
    data
      ?.message
      ?.content
      ?.trim();


  if (!output) {

    throw createError(
      "Ollama returned an empty response.",
      502
    );

  }


  return {

    text: output,

    quotaRatio:
      quota.ratio

  };

}


// ============================================================
// BUILT-IN PROVIDER DEFINITIONS
// ============================================================
//
// These are only defaults.
//
// The Router can discover additional providers
// through environment variables.
//
// ============================================================

const BUILTIN_PROVIDERS = [

  {
    name: "Gemini",

    type: "gemini",

    keyEnv:
      "GEMINI_API_KEY",

    modelEnv:
      "GEMINI_MODEL",

    priority: 10
  },


  {
    name: "Groq",

    type: "openai",

    keyEnv:
      "GROQ_API_KEY",

    modelEnv:
      "GROQ_MODEL",

    baseUrl:
      "https://api.groq.com/openai/v1",

    defaultModel:
      "llama-3.3-70b-versatile",

    priority: 20
  },


  {
    name: "OpenRouter",

    type: "openai",

    keyEnv:
      "OPENROUTER_API_KEY",

    modelEnv:
      "OPENROUTER_MODEL",

    baseUrl:
      "https://openrouter.ai/api/v1",

    defaultModel:
      "openrouter/free",

    priority: 30,

    headers: {

      "HTTP-Referer":
        process.env.APP_URL ||
        "https://ai-app-builder.vercel.app",

      "X-Title":
        "AI App Builder"

    }

  },


  {
    name: "Cerebras",

    type: "openai",

    keyEnv:
      "CEREBRAS_API_KEY",

    modelEnv:
      "CEREBRAS_MODEL",

    baseUrl:
      "https://api.cerebras.ai/v1",

    defaultModel:
      "llama-3.3-70b",

    priority: 40
  },


  {
    name: "Mistral",

    type: "openai",

    keyEnv:
      "MISTRAL_API_KEY",

    modelEnv:
      "MISTRAL_MODEL",

    baseUrl:
      "https://api.mistral.ai/v1",

    defaultModel:
      "mistral-small-latest",

    priority: 50
  },


  {
    name: "Together",

    type: "openai",

    keyEnv:
      "TOGETHER_API_KEY",

    modelEnv:
      "TOGETHER_MODEL",

    baseUrl:
      "https://api.together.xyz/v1",

    defaultModel:
      "meta-llama/Llama-3.3-70B-Instruct-Turbo",

    priority: 60
  },


  {
    name: "Fireworks",

    type: "openai",

    keyEnv:
      "FIREWORKS_API_KEY",

    modelEnv:
      "FIREWORKS_MODEL",

    baseUrl:
      "https://api.fireworks.ai/inference/v1",

    defaultModel:
      "accounts/fireworks/models/llama-v3p3-70b-instruct",

    priority: 70
  },


  {
    name: "DeepSeek",

    type: "openai",

    keyEnv:
      "DEEPSEEK_API_KEY",

    modelEnv:
      "DEEPSEEK_MODEL",

    baseUrl:
      "https://api.deepseek.com/v1",

    defaultModel:
      "deepseek-chat",

    priority: 80
  },


  {
    name: "xAI",

    type: "openai",

    keyEnv:
      "XAI_API_KEY",

    modelEnv:
      "XAI_MODEL",

    baseUrl:
      "https://api.x.ai/v1",

    defaultModel:
      "grok-3-mini",

    priority: 90
  },


  {
    name: "OpenAI",

    type: "openai",

    keyEnv:
      "OPENAI_API_KEY",

    modelEnv:
      "OPENAI_MODEL",

    baseUrl:
      "https://api.openai.com/v1",

    defaultModel:
      "gpt-5-mini",

    priority: 100
  },


  {
    name: "Ollama",

    type: "ollama",

    keyEnv:
      null,

    modelEnv:
      "OLLAMA_MODEL",

    priority: 110
  }

];


// ============================================================
// DYNAMIC PROVIDER DISCOVERY
// ============================================================
//
// New providers can be added with:
//
// AI_PROVIDER_MYAI_API_KEY
// AI_PROVIDER_MYAI_BASE_URL
// AI_PROVIDER_MYAI_MODEL
//
// Example:
//
// AI_PROVIDER_ANTHROPIC_API_KEY
// AI_PROVIDER_ANTHROPIC_BASE_URL
// AI_PROVIDER_ANTHROPIC_MODEL
//
// For OpenAI-compatible APIs.
//
// No change to this file is required.
//
// ============================================================

function discoverDynamicProviders() {

  const providers =
    [];


  const keys =
    Object.keys(
      process.env
    );


  const providerNames =
    new Set();


  for (
    const key
    of keys
  ) {

    const match =
      key.match(
        /^AI_PROVIDER_([A-Z0-9_]+)_API_KEY$/
      );


    if (
      match
    ) {

      providerNames.add(
        match[1]
      );

    }

  }


  let priority =
    1000;


  for (
    const providerId
    of providerNames
  ) {

    const keyEnv =
      `AI_PROVIDER_${providerId}_API_KEY`;

    const baseUrlEnv =
      `AI_PROVIDER_${providerId}_BASE_URL`;

    const modelEnv =
      `AI_PROVIDER_${providerId}_MODEL`;

    const typeEnv =
      `AI_PROVIDER_${providerId}_TYPE`;

    const priorityEnv =
      `AI_PROVIDER_${providerId}_PRIORITY`;


    const baseUrl =
      process.env[
        baseUrlEnv
      ];


    const model =
      process.env[
        modelEnv
      ];


    const type =
      (
        process.env[
          typeEnv
        ] ||
        "openai"
      )
      .toLowerCase();


    if (
      !baseUrl
    ) {

      continue;

    }


    providers.push({

      name:
        providerId
          .toLowerCase()
          .replace(
            /_/g,
            " "
          )
          .replace(
            /\b\w/g,
            char =>
              char.toUpperCase()
          ),

      type,

      keyEnv,

      modelEnv,

      baseUrl,

      defaultModel:
        model,

      priority:
        Number(
          process.env[
            priorityEnv
          ]
        ) ||
        priority

    });


    priority += 1;

  }


  return providers;

}


// ============================================================
// PROVIDER LIST
// ============================================================

function getProviders() {

  const dynamic =
    discoverDynamicProviders();


  const all = [

    ...BUILTIN_PROVIDERS,

    ...dynamic

  ];


  // Remove duplicate provider names.

  const unique =
    new Map();


  for (
    const provider
    of all
  ) {

    if (
      !unique.has(
        provider.name
      )
    ) {

      unique.set(
        provider.name,
        provider
      );

    }

  }


  return Array.from(
    unique.values()
  )
  .sort(
    (
      a,
      b
    ) =>
      Number(
        a.priority || 9999
      ) -
      Number(
        b.priority || 9999
      )
  );

}


// ============================================================
// PROVIDER CALLER
// ============================================================

async function callProvider(
  provider,
  prompt
) {

  if (
    provider.type ===
    "gemini"
  ) {

    return callGemini(
      prompt
    );

  }


  if (
    provider.type ===
    "ollama"
  ) {

    return callOllama(
      prompt
    );

  }


  return callOpenAICompatible({

    name:
      provider.name,

    baseUrl:
      provider.baseUrl,

    keyEnv:
      provider.keyEnv,

    modelEnv:
      provider.modelEnv,

    defaultModel:
      provider.defaultModel,

    prompt,

    headers:
      provider.headers || {}

  });

}


// ============================================================
// PROVIDER SCORING
// ============================================================
//
// Lower score = better.
//
// Successful providers get priority.
// Failed providers are penalized.
// Cooling providers are skipped.
//
// ============================================================

function getProviderScore(
  provider
) {

  const state =
    getProviderState(
      provider.name
    );


  if (
    state.cooldownUntil >
    Date.now()
  ) {

    return Infinity;

  }


  let score =
    Number(
      provider.priority || 9999
    );


  // Successful providers receive a small advantage.

  if (
    state.success > 0
  ) {

    score -= 20;

  }


  // Failed providers receive a penalty.

  score +=
    state.failures *
    50;


  // If we already know this provider
  // is close to the rollover threshold,
  // push it to the back.

  if (
    typeof state.lastQuotaRatio ===
      "number" &&
    state.lastQuotaRatio >=
      ROLLOVER_THRESHOLD
  ) {

    return Infinity;

  }


  return score;

}


// ============================================================
// MAIN AI ROUTER
// ============================================================

export async function generateWithAI(
  prompt
) {

  const safePrompt =
    validatePrompt(
      prompt
    );


  const providers =
    getProviders();


  if (
    providers.length === 0
  ) {

    throw createError(

      "No AI providers are configured. " +
      "Add provider API keys in Vercel Environment Variables.",

      503

    );

  }


  const orderedProviders =
    providers
      .map(
        provider => ({
          provider,

          score:
            getProviderScore(
              provider
            )

        })
      )
      .filter(
        item =>
          Number.isFinite(
            item.score
          )
      )
      .sort(
        (
          a,
          b
        ) =>
          a.score -
          b.score
      )
      .map(
        item =>
          item.provider
      );


  const errors =
    [];


  let attempted =
    0;


  for (
    const provider
    of orderedProviders
  ) {

    if (
      attempted >=
      providers.length
    ) {

      break;

    }


    attempted += 1;


    try {

      const result =
        await callProvider(
          provider,
          safePrompt
        );


      const quotaRatio =
        result?.quotaRatio;


      markProviderSuccess(
        provider.name,
        quotaRatio
      );


      return {

        text:
          result.text,

        provider:
          provider.name,

        quotaRatio:
          typeof quotaRatio ===
          "number"
            ? quotaRatio
            : null

      };


    } catch (error) {

      markProviderFailure(
        provider.name,
        error
      );


      const message =
        String(
          error?.message ||
          error ||
          "Unknown provider error"
        );


      if (
        errors.length <
        MAX_PROVIDER_ERRORS
      ) {

        errors.push(
          `${provider.name}: ${message}`
        );

      }


      // ------------------------------------------------------
      // Automatic rollover
      // ------------------------------------------------------

      if (
        isRetryableProviderError(
          error
        ) ||
        isNotConfigured(
          message
        )
      ) {

        continue;

      }


      // ------------------------------------------------------
      // Non-retryable error
      // ------------------------------------------------------

      throw error;

    }

  }


  // ==========================================================
  // SECOND PASS
  // ==========================================================
  //
  // If all preferred providers failed,
  // retry providers that were temporarily
  // skipped by scoring.
  //
  // This protects against short-lived
  // state/cooldown issues.
  //
  // ==========================================================

  const fallbackProviders =
    providers.filter(
      provider =>
        !orderedProviders.includes(
          provider
        )
    );


  for (
    const provider
    of fallbackProviders
  ) {

    try {

      const result =
        await callProvider(
          provider,
          safePrompt
        );


      const quotaRatio =
        result?.quotaRatio;


      markProviderSuccess(
        provider.name,
        quotaRatio
      );


      return {

        text:
          result.text,

        provider:
          provider.name,

        quotaRatio:
          typeof quotaRatio ===
          "number"
            ? quotaRatio
            : null

      };


    } catch (error) {

      markProviderFailure(
        provider.name,
        error
      );


      const message =
        String(
          error?.message ||
          error ||
          "Unknown provider error"
        );


      if (
        errors.length <
        MAX_PROVIDER_ERRORS
      ) {

        errors.push(
          `${provider.name}: ${message}`
        );

      }

      continue;

    }

  }


  // ==========================================================
  // FINAL ERROR
  // ==========================================================

  throw createError(

    "All available AI providers failed. " +
    "Automatic rollover was attempted. " +
    errors.join(
      " | "
    ),

    503

  );

}


// ============================================================
// PROVIDER STATUS
// ============================================================
//
// Useful for future Admin Dashboard.
//
// ============================================================

export function getProviderStatus() {

  const providers =
    getProviders();


  return providers.map(
    provider => {

      const state =
        getProviderState(
          provider.name
        );


      return {

        name:
          provider.name,

        type:
          provider.type,

        priority:
          provider.priority,

        configured:
          provider.type ===
          "ollama"
            ? Boolean(
                process.env.OLLAMA_BASE_URL
              )
            : Boolean(
                process.env[
                  provider.keyEnv
                ]
              ),

        failures:
          state.failures,

        success:
          state.success,

        cooldownUntil:
          state.cooldownUntil,

        lastQuotaRatio:
          state.lastQuotaRatio,

        available:
          !isProviderCoolingDown(
            provider.name
          )

      };

    }
  );

}


// ============================================================
// EXPORTS
// ============================================================

export {

  callGemini,

  callOllama,

  callOpenAICompatible,

  getProviders,

  discoverDynamicProviders,

  isRetryableProviderError

};
