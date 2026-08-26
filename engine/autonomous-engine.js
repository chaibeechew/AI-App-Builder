function extractJson(text) {
  if (!text) {
    throw new Error("Gemini returned an empty response");
  }

  const cleaned = text
    .replace(/```json/gi, "")
    .replace(/```/g, "")
    .trim();

  const firstBrace = cleaned.indexOf("{");
  const lastBrace = cleaned.lastIndexOf("}");

  if (firstBrace === -1 || lastBrace === -1) {
    throw new Error("Gemini did not return valid JSON");
  }

  try {
    return JSON.parse(cleaned.slice(firstBrace, lastBrace + 1));
  } catch {
    throw new Error("Gemini returned invalid JSON");
  }
}

function buildPrompt(userIdea) {
  return `
You are the AI engine of an AI App Builder.

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
2. Infer missing details intelligently.
3. Create useful pages and features.
4. Return JSON only.
5. Do not return source code.
`;
}

async function callGemini(prompt) {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error(
      "GEMINI_API_KEY is not configured. Please add it in Vercel Environment Variables."
    );
  }

  const model = "gemini-3.6-flash";

  const controller = new AbortController();

  const timeout = setTimeout(() => {
    controller.abort();
  }, 30000);

  try {
    console.log("AI App Builder: calling Gemini 3.6 Flash");

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

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        `Gemini HTTP ${response.status}: ${JSON.stringify(data)}`
      );
    }

    const text =
      data?.candidates?.[0]?.content?.parts?.[0]?.text || "";

    if (!text) {
      throw new Error("Gemini returned an empty response");
    }

    console.log("AI App Builder: Gemini response received");

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

export async function runAutonomousEngine(userIdea) {
  if (!userIdea || !userIdea.trim()) {
    throw new Error("Please describe the app you want to build.");
  }

  console.log("AI App Builder: starting Gemini 3.6 Flash");

  // Diagnostic only: never print the API key itself.
  console.log(
    "AI App Builder: Gemini API key configured:",
    Boolean(process.env.GEMINI_API_KEY),
    "length:",
    process.env.GEMINI_API_KEY?.length || 0
  );

  const prompt = buildPrompt(userIdea.trim());

  const result = await callGemini(prompt);

  const specification = extractJson(result);

  console.log("AI App Builder: specification created");

  return {
    status: "preview_ready",

    idea: userIdea.trim(),

    specification,

    aiProvider: "gemini",

    aiModel: "gemini-3.6-flash",

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
