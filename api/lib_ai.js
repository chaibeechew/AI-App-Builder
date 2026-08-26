// AI Provider Router
// Order: Gemini -> Groq
// Gemini quota/rate-limit will automatically fall back to Groq.
// More providers can be added later.

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
    status === 429 ||
    status === 408 ||
    status >= 500 ||
    message.includes("quota") ||
    message.includes("rate limit") ||
    message.includes("resource_exhausted") ||
    message.includes("too many requests")
  );
}


// ================================
// GEMINI
// ================================

async function callGemini(prompt) {
  const key = process.env.GEMINI_API_KEY;

  if (!key) {
    throw new Error("GEMINI_NOT_CONFIGURED");
  }

  const model =
    process.env.GEMINI_MODEL ||
    "gemini-3.6-flash";

  const url =
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
      model
    )}:generateContent?key=${encodeURIComponent(key)}`;

  const response = await fetch(url, {
    method: "POST",

    headers: {
      "Content-Type": "application/json",
    },

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
    }),
  });

  const text = await response.text();

  if (!response.ok) {
    const error = new Error(
      `Gemini HTTP ${response.status}: ${text}`
    );

    error.status = response.status;

    throw error;
  }

  const data = JSON.parse(text);

  const output =
    data?.candidates?.[0]?.content?.parts
      ?.map((part) => part?.text || "")
      .join("")
      .trim();

  if (!output) {
    throw new Error(
      "Gemini returned an empty response."
    );
  }

  return output;
}


// ================================
// GROQ
// ================================

async function callGroq(prompt) {
  const key = process.env.GROQ_API_KEY;

  if (!key) {
    throw new Error("GROQ_NOT_CONFIGURED");
  }

  const model =
    process.env.GROQ_MODEL ||
    "llama-3.1-8b-instant";

  const response = await fetch(
    "https://api.groq.com/openai/v1/chat/completions",
    {
      method: "POST",

      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
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
    }
  );

  const text = await response.text();

  if (!response.ok) {
    const error = new Error(
      `Groq HTTP ${response.status}: ${text}`
    );

    error.status = response.status;

    throw error;
  }

  const data = JSON.parse(text);

  const output =
    data?.choices?.[0]?.message?.content?.trim();

  if (!output) {
    throw new Error(
      "Groq returned an empty response."
    );
  }

  return output;
}


// ================================
// PROVIDER LIST
// ================================

const PROVIDERS = [
  {
    name: "Gemini",
    call: callGemini,
  },

  {
    name: "Groq",
    call: callGroq,
  },
];


// ================================
// MAIN AI FUNCTION
// ================================

export async function generateWithAI(prompt) {
  const errors = [];

  for (const provider of PROVIDERS) {
    try {
      const output =
        await provider.call(prompt);

      return {
        text: output,
        provider: provider.name,
      };

    } catch (error) {
      errors.push(
        `${provider.name}: ${
          error?.message || error
        }`
      );

      // If this provider is out of quota,
      // rate limited, temporarily unavailable,
      // or returns a server error,
      // automatically try the next provider.

      if (!isRetryableProviderError(error)) {
        throw error;
      }
    }
  }

  throw new Error(
    `All configured AI providers failed. ${errors.join(
      " | "
    )}`
  );
}


// ================================
// EXPORTS
// ================================

export {
  callGemini,
  callGroq,
  PROVIDERS,
};
