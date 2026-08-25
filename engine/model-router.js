export function getProvider() {
  return process.env.AI_PROVIDER || "ollama";
}

export function getModel() {
  return process.env.OLLAMA_MODEL || "llama3.2:3b";
}

export function getModelConfig() {
  const provider = getProvider();

  switch (provider) {
    case "openai":
      return {
        provider: "openai",
        model: process.env.OPENAI_MODEL || "gpt-5.6",
      };

    case "deepseek":
      return {
        provider: "deepseek",
        model: process.env.DEEPSEEK_MODEL || "deepseek-chat",
      };

    case "gemini":
      return {
        provider: "gemini",
        model: process.env.GEMINI_MODEL || "gemini",
      };

    case "ollama":
    default:
      return {
        provider: "ollama",
        model: process.env.OLLAMA_MODEL || "llama3.2:3b",
      };
  }
}