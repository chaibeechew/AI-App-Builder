import {
  getProvider,
  getModel,
} from "./model-router.js";

async function callOllama(messages) {
  const baseUrl =
    process.env.OLLAMA_BASE_URL ||
    "http://localhost:11434";

  const response = await fetch(
    `${baseUrl}/api/chat`,
    {
      method: "POST",

      headers: {
        "Content-Type":
          "application/json",
      },

      body: JSON.stringify({
        model: getModel(),

        messages,

        stream: false,
      }),
    }
  );

  if (!response.ok) {
    throw new Error(
      `Ollama request failed: ${response.status}`
    );
  }

  const data =
    await response.json();

  return (
    data?.message?.content ||
    ""
  );
}

export async function generateWithAI(
  prompt
) {
  const provider =
    getProvider();

  const systemPrompt = `
You are the AI App Builder engine.

Convert the user's app idea into
a safe structured application
specification.

Never create phishing,
credential theft,
fraudulent impersonation,
malware, or systems designed
to steal sensitive information.

The human user has final
approval authority.

User request:
${prompt}
`;

  const messages = [
    {
      role: "system",
      content: systemPrompt,
    },

    {
      role: "user",
      content: prompt,
    },
  ];

  if (provider === "ollama") {
    return callOllama(messages);
  }

  throw new Error(
    `Provider "${provider}" is not connected yet.`
  );
}