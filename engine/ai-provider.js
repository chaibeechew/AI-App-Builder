import { getProviderConfig } from "./model-router.js";

async function callOllama(prompt) {
  const baseUrl = process.env.OLLAMA_BASE_URL || "http://localhost:11434";

  const response = await fetch(`${baseUrl}/api/generate`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: getProviderConfig().model,
      prompt,
      stream: false,
    }),
  });

  if (!response.ok) {
    throw new Error(`Ollama error: ${response.status}`);
  }

  const data = await response.json();
  return data.response || "";
}

async function callGemini(prompt) {
  const key = process.env.GEMINI_API_KEY;

  if (!key) {
    throw new Error("Gemini API key not configured");
  }

  const model = process.env.GEMINI_MODEL || "gemini-2.5-flash";

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [{ text: prompt }],
          },
        ],
      }),
    }
  );

  if (!response.ok) {
    throw new Error(`Gemini error: ${response.status}`);
  }

  const data = await response.json();

  return (
    data.candidates?.[0]?.content?.parts
      ?.map((part) => part.text || "")
      .join("") || ""
  );
}

async function callOpenAICompatible({
  baseUrl,
  apiKey,
  model,
  prompt,
}) {
  if (!apiKey) {
    throw new Error("API key not configured");
  }

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.2,
    }),
  });

  if (!response.ok) {
    throw new Error(`AI provider error: ${response.status}`);
  }

  const data = await response.json();

  return data.choices?.[0]?.message?.content || "";
}

async function callGroq(prompt) {
  return callOpenAICompatible({
    baseUrl: "https://api.groq.com/openai/v1",
    apiKey: process.env.GROQ_API_KEY,
    model: process.env.GROQ_MODEL || "llama-3.3-70b-versatile",
    prompt,
  });
}

async function callCerebras(prompt) {
  return callOpenAICompatible({
    baseUrl: "https://api.cerebras.ai/v1",
    apiKey: process.env.CEREBRAS_API_KEY,
    model: process.env.CEREBRAS_MODEL || "llama-3.3-70b",
    prompt,
  });
}

async function callDeepSeek(prompt) {
  return callOpenAICompatible({
    baseUrl: "https://api.deepseek.com",
    apiKey: process.env.DEEPSEEK_API_KEY,
    model: process.env.DEEPSEEK_MODEL || "deepseek-chat",
    prompt,
  });
}

async function callOpenAI(prompt) {
  return callOpenAICompatible({
    baseUrl: "https://api.openai.com/v1",
    apiKey: process.env.OPENAI_API_KEY,
    model: process.env.OPENAI_MODEL || "gpt-5.6",
    prompt,
  });
}

export async function generateWithAI(prompt) {
  const { provider } = getProviderConfig();

  switch (provider) {
    case "ollama":
      return callOllama(prompt);

    case "gemini":
      return callGemini(prompt);

    case "groq":
      return callGroq(prompt);

    case "cerebras":
      return callCerebras(prompt);

    case "deepseek":
      return callDeepSeek(prompt);

    case "openai":
      return callOpenAI(prompt);

    default:
      throw new Error(`Unsupported AI provider: ${provider}`);
  }
}
