const FREE_FIRST_PROVIDERS = [
  {
    provider: "ollama",
    model: process.env.OLLAMA_MODEL || "llama3.2:3b",
    local: true,
    priority: 1,
    enabled: () => Boolean(process.env.OLLAMA_BASE_URL),
  },
  {
    provider: "gemini",
    model: process.env.GEMINI_MODEL || "gemini-2.5-flash",
    local: false,
    priority: 2,
    enabled: () => Boolean(process.env.GEMINI_API_KEY),
  },
  {
    provider: "groq",
    model: process.env.GROQ_MODEL || "llama-3.3-70b-versatile",
    local: false,
    priority: 3,
    enabled: () => Boolean(process.env.GROQ_API_KEY),
  },
  {
    provider: "cerebras",
    model: process.env.CEREBRAS_MODEL || "llama-3.3-70b",
    local: false,
    priority: 4,
    enabled: () => Boolean(process.env.CEREBRAS_API_KEY),
  },
  {
    provider: "deepseek",
    model: process.env.DEEPSEEK_MODEL || "deepseek-chat",
    local: false,
    priority: 5,
    enabled: () => Boolean(process.env.DEEPSEEK_API_KEY),
  },
  {
    provider: "xai",
    model: process.env.XAI_MODEL || "grok-4-1-fast-non-reasoning",
    local: false,
    priority: 6,
    enabled: () => Boolean(process.env.XAI_API_KEY),
  },
  {
    provider: "openai",
    model: process.env.OPENAI_MODEL || "gpt-5.6",
    local: false,
    priority: 7,
    enabled: () => Boolean(process.env.OPENAI_API_KEY),
  },
];

export function getProvider() {
  const configured = (process.env.AI_PROVIDER || "").trim().toLowerCase();

  if (configured && configured !== "auto") {
    return configured;
  }

  const available = FREE_FIRST_PROVIDERS
    .filter((item) => item.enabled())
    .sort((a, b) => a.priority - b.priority);

  return available[0]?.provider || null;
}

export function getModel() {
  const provider = getProvider();

  const config = FREE_FIRST_PROVIDERS.find(
    (item) => item.provider === provider
  );

  return config?.model || null;
}

export function getProviderConfig() {
  const provider = getProvider();

  const config = FREE_FIRST_PROVIDERS.find(
    (item) => item.provider === provider
  );

  return {
    provider,
    model: config?.model || null,
    local: config?.local || false,
    priority: config?.priority ?? 99,
  };
}

export function getAvailableProviders() {
  return FREE_FIRST_PROVIDERS
    .filter((item) => item.enabled())
    .sort((a, b) => a.priority - b.priority)
    .map(({ provider, model, local, priority }) => ({
      provider,
      model,
      local,
      priority,
    }));
}
