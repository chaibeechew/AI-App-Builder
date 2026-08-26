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

  try {
    return JSON.parse(cleaned.slice(firstBrace, lastBrace + 1));
  } catch {
    throw new Error("AI returned invalid JSON");
  }
}

function buildPrompt(userIdea) {
  return `
You are the planning engine of an AI App Builder.

The user wants to build:

"${userIdea}"

Create a practical app specification.

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

async function callGemini(model, prompt) {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured");
  }

  const controller = new AbortController();

  const timeout = setTimeout(() => {
    controller.abort();
  }, 30000);

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        signal: controller.signal,
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: prompt,
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.2,
            responseMimeType: "application/json",
          },
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();

      throw new Error(
        `Gemini HTTP ${response.status}: ${errorText.slice(0, 500)}`
      );
    }

    const data = await response.json();

    const text =
      data?.candidates?.[0]?.content?.parts?.[0]?.text || "";

    if (!text) {
      throw new Error("Gemini returned an empty response");
    }

    return text;
  } catch (error) {
    if (error?.name === "AbortError") {
      throw new Error("Gemini request timed out after 30 seconds");
    }

    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

async function callProvider(provider, model, prompt) {
  if (provider === "gemini") {
    return callGemini(model, prompt);
  }

  throw new Error(
    `${provider} is not enabled yet. Gemini is the active AI provider.`
  );
}

export async function runAutonomousEngine(userIdea) {
  if (!userIdea || !userIdea.trim()) {
    throw new Error("Please describe the app you want to build.");
  }

  const providers = getAvailableProviders();

  const gemini = providers.find(
    (item) => item.provider === "gemini"
  );

  if (!gemini) {
    throw new Error(
      "Gemini AI is not configured. Please add GEMINI_API_KEY in Vercel Environment Variables."
    );
  }

  console.log("AI App Builder: starting Gemini generation");

  const prompt = buildPrompt(userIdea.trim());

  const result = await callProvider(
    gemini.provider,
    gemini.model,
    prompt
  );

  console.log("AI App Builder: Gemini response received");

  const specification = extractJson(result);

  console.log("AI App Builder: specification created");

  /*
   * STEP 1:
   * Return the AI specification immediately.
   *
   * Preview, testing, security and app creation
   * will be handled in the next stages.
   */

  return {
    status: "preview_ready",

    idea: userIdea.trim(),

    specification,

    aiProvider: gemini.provider,

    aiModel: gemini.model,

    nextStep: "preview",

    test: {
      status: "pending",
    },

    security: {
      status: "pending",
    },

    publish: {
      allowed: false,
      requiresHumanApproval: true,
    },
  };
}
