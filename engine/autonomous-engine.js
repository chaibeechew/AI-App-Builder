import { createPreview } from "./preview-engine.js";
import { testApp } from "./test-engine.js";
import { securityScan } from "./security-engine.js";
import { getAvailableProviders } from "./model-router.js";

function extractJson(text) {
  if (!text) {
    throw new Error("AI returned an empty response");
  }

  const cleaned = text
    .replace(/```json/gi, "")
    .replace(/```/g, "")
    .trim();

  const firstBrace = cleaned.indexOf("{");
  const lastBrace = cleaned.lastIndexOf("}");

  if (firstBrace === -1 || lastBrace === -1) {
    throw new Error("AI did not return valid JSON");
  }

  return JSON.parse(cleaned.slice(firstBrace, lastBrace + 1));
}

function buildPrompt(userIdea) {
  return `
You are the planning engine of an AI App Builder.

The user wants to build:

"${userIdea}"

Convert this idea into a practical app specification.

Return ONLY valid JSON:

{
  "name": "App name",
  "description": "Short description",
  "pages": [
    {
      "name": "Page name",
      "purpose": "What this page does"
    }
  ],
  "features": [
    {
      "name": "Feature name",
      "description": "What the feature does"
    }
  ],
  "data": [
    {
      "name": "Data type",
      "fields": ["field1", "field2"]
    }
  ],
  "actions": [
    {
      "name": "Action name",
      "description": "What happens"
    }
  ]
}

Rules:
1. Keep the app practical.
2. Create only useful pages.
3. Infer missing details intelligently.
4. Return JSON only.
5. Do not return source code.
6. Make the result understandable to non-technical users.
`;
}

async function callProvider(provider, model, prompt) {
  if (provider === "ollama") {
    const base =
      process.env.OLLAMA_BASE_URL || "http://localhost:11434";

    const response = await fetch(`${base}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        messages: [{ role: "user", content: prompt }],
        stream: false,
      }),
    });

    if (!response.ok) {
      throw new Error(`Ollama HTTP ${response.status}`);
    }

    const data = await response.json();

    return data?.message?.content || "";
  }

  if (provider === "gemini") {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              parts: [{ text: prompt }],
            },
          ],
          generationConfig: {
            temperature: 0.2,
          },
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`Gemini HTTP ${response.status}`);
    }

    const data = await response.json();

    return (
      data?.candidates?.[0]?.content?.parts?.[0]?.text || ""
    );
  }

  const keyMap = {
    groq: process.env.GROQ_API_KEY,
    cerebras: process.env.CEREBRAS_API_KEY,
    deepseek: process.env.DEEPSEEK_API_KEY,
    openai: process.env.OPENAI_API_KEY,
  };

  const urlMap = {
    groq: "https://api.groq.com/openai/v1/chat/completions",
    cerebras: "https://api.cerebras.ai/v1/chat/completions",
    deepseek: "https://api.deepseek.com/chat/completions",
    openai: "https://api.openai.com/v1/chat/completions",
  };

  const key = keyMap[provider];

  if (!key) {
    throw new Error(`${provider} API key is not configured`);
  }

  const response = await fetch(urlMap[provider], {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model,
      messages: [{ role: "user", content: prompt }],
      temperature: 0.2,
    }),
  });

  if (!response.ok) {
    throw new Error(`${provider} HTTP ${response.status}`);
  }

  const data = await response.json();

  return data?.choices?.[0]?.message?.content || "";
}

async function generateWithFallback(prompt) {
  const providers = getAvailableProviders();

  if (!providers.length) {
    throw new Error(
      "No AI provider is configured. Add a free AI provider API key in Vercel Environment Variables."
    );
  }

  let lastError = null;

  for (const config of providers) {
    try {
      const result = await callProvider(
        config.provider,
        config.model,
        prompt
      );

      if (result) {
        return {
          result,
          provider: config.provider,
          model: config.model,
        };
      }
    } catch (error) {
      console.error(
        `AI provider ${config.provider} failed:`,
        error
      );

      lastError = error;
    }
  }

  throw lastError || new Error("All AI providers failed");
}

export async function runAutonomousEngine(userIdea) {
  if (!userIdea || !userIdea.trim()) {
    throw new Error("Please describe the app you want to build.");
  }

  const planResponse = await generateWithFallback(
    buildPrompt(userIdea.trim())
  );

  const specification = extractJson(planResponse.result);

  const preview = await createPreview({
    idea: userIdea.trim(),
    specification,
  });

  const test = testApp(preview);
  const security = securityScan(preview);

  return {
    status: "ready",
    idea: userIdea.trim(),
    specification,
    preview,
    test,
    security,
    publish: {
      allowed: false,
      requiresHumanApproval: true,
      reason: "Publishing requires human approval.",
    },
    aiProvider: planResponse.provider,
    aiModel: planResponse.model,
  };
}
