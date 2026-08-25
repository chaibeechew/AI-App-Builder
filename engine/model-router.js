export function getProvider() {
  return (process.env.AI_PROVIDER || "ollama").toLowerCase();
}

export function getModel() {
  const provider = getProvider();

  if (provider === "openai") {
    return process.env.OPENAI_MODEL || "gpt-5.6";
  }

  if (provider === "deepseek") {
    return process.env.DEEPSEEK_MODEL || "deepseek-chat";
  }

  if (provider === "gemini") {
    return process.env.GEMINI_MODEL || "gemini";
  }

  return process.env.OLLAMA_MODEL || "llama3.2:3b";
}

export function getProviderConfig() {
  const provider = getProvider();

  return {
    provider,
    model: getModel(),
    local: provider === "ollama",
  };
}