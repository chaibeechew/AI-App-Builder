// Secure Multi-AI Provider Router
// AI App Builder
//
// Provider strategy:
// Gemini -> Groq -> OpenRouter -> Cerebras -> Mistral
// -> Together -> Fireworks -> DeepSeek -> xAI -> OpenAI -> Ollama
//
// API keys MUST be stored in Vercel Environment Variables.
// Never expose provider keys to the browser.

const MAX_PROMPT_LENGTH = Number(
  process.env.AI_MAX_PROMPT_LENGTH || 20000
);

const REQUEST_TIMEOUT_MS = Number(
  process.env.AI_REQUEST_TIMEOUT_MS || 45000
);


// ============================================
// ERROR HELPERS
// ============================================

function createError(message, status = 0) {
  const error = new Error(message);
  error.status = status;
  return error;
}


function isNotConfigured(message) {
  return (
    message.endsWith("_NOT_CONFIGURED") ||
    message.endsWith("_MODEL_NOT_CONFIGURED")
  );
}


function isRetryableProviderError(error) {
  const status = Number(
    error?.status ||
    error?.statusCode ||
    0
  );

  const message = String(
    error?.message ||
    error ||
    ""
  ).toLowerCase();

  return (
    status === 408 ||
    status === 429 ||
    status === 404 ||
    status >= 500 ||
    message.includes("quota") ||
    message.includes("rate limit") ||
    message.includes("resource_exhausted") ||
    message.includes("too many requests") ||
    message.includes("model_not_found") ||
    message.includes("does not exist") ||
    message.includes("temporarily unavailable")
  );
}


// ============================================
// PROMPT VALIDATION
// ============================================

function validatePrompt(prompt) {

  if (typeof prompt !== "string") {
    throw createError(
      "Invalid AI prompt.",
      400
    );
  }

  const value = prompt.trim();

  if (!value) {
    throw createError(
      "AI prompt is empty.",
      400
    );
  }

  if (value.length > MAX_PROMPT_LENGTH) {
    throw createError(
      `AI prompt is too long. Maximum ${MAX_PROMPT_LENGTH} characters.`,
      413
    );
  }

  return value;
}


// ============================================
// TIMEOUT PROTECTION
// ============================================

async function fetchWithTimeout(
  url,
  options = {}
) {

  const controller =
    new AbortController();

  const timer = setTimeout(
    () => controller.abort(),
    REQUEST_TIMEOUT_MS
  );

  try {

    return await fetch(
      url,
      {
        ...options,
        signal: controller.signal
      }
    );

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


// ============================================
// RESPONSE PARSER
// ============================================

async function readJson(
  response,
  providerName
) {

  const text =
    await response.text();

  if (!response.ok) {

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

    return JSON.parse(text);

  } catch {

    throw createError(
      `${providerName} returned invalid JSON.`,
      502
    );

  }
}


// ============================================
// OPENAI-COMPATIBLE PROVIDERS
// ============================================

function extractOpenAIContent(
  data,
  providerName
) {

  const content =
    data?.choices?.[0]?.message?.content;

  if (
    typeof content !== "string" ||
    !content.trim()
  ) {

    throw createError(
      `${providerName} returned an empty response.`,
      502
    );
  }

  return content.trim();
}


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
      `${name
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, "_")
      }_NOT_CONFIGURED`
    );

  }

  const model =
    process.env[modelEnv] ||
    defaultModel;

  if (!model) {

    throw createError(
      `${name
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, "_")
      }_MODEL_NOT_CONFIGURED`
    );

  }

  const response =
    await fetchWithTimeout(
      `${baseUrl.replace(/\/$/, "")}/chat/completions`,
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

  const data =
    await readJson(
      response,
      name
    );

  return extractOpenAIContent(
    data,
    name
  );
}


// ============================================
// GEMINI
// ============================================

async function callGemini(prompt) {

  const key =
    process.env.GEMINI_API_KEY;

  if (!key) {

    throw createError(
      "GEMINI_NOT_CONFIGURED"
    );

  }

  const model =
    process.env.GEMINI_MODEL ||
    "gemini-3.6-flash";

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
        part => part?.text || ""
      )
      .join("")
      .trim();

  if (!output) {

    throw createError(
      "Gemini returned an empty response.",
      502
    );

  }

  return output;
}


// ============================================
// GROQ
// ============================================

async function callGroq(prompt) {

  return callOpenAICompatible({

    name: "Groq",

    baseUrl:
      "https://api.groq.com/openai/v1",

    keyEnv:
      "GROQ_API_KEY",

    modelEnv:
      "GROQ_MODEL",

    // Current default chosen to avoid
    // the retired llama-3.1-8b-instant model.
    defaultModel:
      "llama-3.3-70b-versatile",

    prompt

  });

}


// ============================================
// OPENROUTER
// ============================================

async function callOpenRouter(prompt) {

  return callOpenAICompatible({

    name:
      "OpenRouter",

    baseUrl:
      "https://openrouter.ai/api/v1",

    keyEnv:
      "OPENROUTER_API_KEY",

    modelEnv:
      "OPENROUTER_MODEL",

    defaultModel:
      "openrouter/free",

    prompt,

    headers: {

      "HTTP-Referer":
        process.env.APP_URL ||
        "https://ai-app-builder.vercel.app",

      "X-Title":
        "AI App Builder"

    }

  });

}


// ============================================
// CEREBRAS
// ============================================

async function callCerebras(prompt) {

  return callOpenAICompatible({

    name:
      "Cerebras",

    baseUrl:
      "https://api.cerebras.ai/v1",

    keyEnv:
      "CEREBRAS_API_KEY",

    modelEnv:
      "CEREBRAS_MODEL",

    defaultModel:
      "llama-3.3-70b",

    prompt

  });

}


// ============================================
// MISTRAL
// ============================================

async function callMistral(prompt) {

  return callOpenAICompatible({

    name:
      "Mistral",

    baseUrl:
      "https://api.mistral.ai/v1",

    keyEnv:
      "MISTRAL_API_KEY",

    modelEnv:
      "MISTRAL_MODEL",

    defaultModel:
      "mistral-small-latest",

    prompt

  });

}


// ============================================
// TOGETHER AI
// ============================================

async function callTogether(prompt) {

  return callOpenAICompatible({

    name:
      "Together",

    baseUrl:
      "https://api.together.xyz/v1",

    keyEnv:
      "TOGETHER_API_KEY",

    modelEnv:
      "TOGETHER_MODEL",

    defaultModel:
      "meta-llama/Llama-3.3-70B-Instruct-Turbo",

    prompt

  });

}


// ============================================
// FIREWORKS AI
// ============================================

async function callFireworks(prompt) {

  return callOpenAICompatible({

    name:
      "Fireworks",

    baseUrl:
      "https://api.fireworks.ai/inference/v1",

    keyEnv:
      "FIREWORKS_API_KEY",

    modelEnv:
      "FIREWORKS_MODEL",

    defaultModel:
      "accounts/fireworks/models/llama-v3p3-70b-instruct",

    prompt

  });

}


// ============================================
// DEEPSEEK
// ============================================

async function callDeepSeek(prompt) {

  return callOpenAICompatible({

    name:
      "DeepSeek",

    baseUrl:
      "https://api.deepseek.com/v1",

    keyEnv:
      "DEEPSEEK_API_KEY",

    modelEnv:
      "DEEPSEEK_MODEL",

    defaultModel:
      "deepseek-chat",

    prompt

  });

}


// ============================================
// xAI
// ============================================

async function callXAI(prompt) {

  return callOpenAICompatible({

    name:
      "xAI",

    baseUrl:
      "https://api.x.ai/v1",

    keyEnv:
      "XAI_API_KEY",

    modelEnv:
      "XAI_MODEL",

    defaultModel:
      "grok-3-mini",

    prompt

  });

}


// ============================================
// OPENAI
// ============================================

async function callOpenAI(prompt) {

  return callOpenAICompatible({

    name:
      "OpenAI",

    baseUrl:
      "https://api.openai.com/v1",

    keyEnv:
      "OPENAI_API_KEY",

    modelEnv:
      "OPENAI_MODEL",

    defaultModel:
      "gpt-5-mini",

    prompt

  });

}


// ============================================
// OLLAMA
// ============================================
//
// Important:
// Vercel cannot access Ollama running on
// your iPhone/Mac/PC localhost.
//
// OLLAMA_BASE_URL must point to a server
// that is publicly reachable from Vercel.

async function callOllama(prompt) {

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

  return output;
}


// ============================================
// PROVIDER ORDER
// ============================================

const PROVIDERS = [

  {
    name: "Gemini",
    call: callGemini
  },

  {
    name: "Groq",
    call: callGroq
  },

  {
    name: "OpenRouter",
    call: callOpenRouter
  },

  {
    name: "Cerebras",
    call: callCerebras
  },

  {
    name: "Mistral",
    call: callMistral
  },

  {
    name: "Together",
    call: callTogether
  },

  {
    name: "Fireworks",
    call: callFireworks
  },

  {
    name: "DeepSeek",
    call: callDeepSeek
  },

  {
    name: "xAI",
    call: callXAI
  },

  {
    name: "OpenAI",
    call: callOpenAI
  },

  {
    name: "Ollama",
    call: callOllama
  }

];


// ============================================
// MAIN AI ROUTER
// ============================================

export async function generateWithAI(
  prompt
) {

  const safePrompt =
    validatePrompt(prompt);

  const errors = [];

  let configuredProviders = 0;

  for (
    const provider
    of PROVIDERS
  ) {

    try {

      const output =
        await provider.call(
          safePrompt
        );

      return {

        text: output,

        provider:
          provider.name

      };

    } catch (error) {

      const message =
        String(
          error?.message ||
          error ||
          "Unknown provider error"
        );

      if (
        !isNotConfigured(
          message
        )
      ) {

        configuredProviders += 1;

        errors.push(
          `${provider.name}: ${message}`
        );

      }

      // Skip providers that are not configured.
      //
      // Also automatically fall through when
      // quota, rate-limit, 404 model-not-found,
      // timeout or server errors happen.

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

      // Non-retryable error.
      throw error;

    }

  }

  if (
    configuredProviders === 0
  ) {

    throw createError(

      "No AI provider is configured. " +
      "Add at least one provider API key " +
      "in Vercel Environment Variables.",

      503

    );

  }

  throw createError(

    "All configured AI providers failed. " +
    errors.join(" | "),

    503

  );

}


// ============================================
// EXPORTS
// ============================================

export {

  callGemini,

  callGroq,

  callOpenRouter,

  callCerebras,

  callMistral,

  callTogether,

  callFireworks,

  callDeepSeek,

  callXAI,

  callOpenAI,

  callOllama,

  PROVIDERS,

  isRetryableProviderError

};
