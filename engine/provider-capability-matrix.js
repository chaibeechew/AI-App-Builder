// Public provider capability matrix for Autonomous AI routing.
// This records publicly documented API capabilities and integration patterns.
// It does not copy proprietary weights, hidden prompts, private benchmarks,
// credentials, or confidential implementation details.

export const PUBLIC_AI_PROVIDER_MATRIX = {
  openai: { text: true, vision: true, audio: true, tools: true, structuredOutput: true },
  anthropic: { text: true, vision: true, audio: false, tools: true, structuredOutput: true },
  google: { text: true, vision: true, audio: true, tools: true, structuredOutput: true },
  xai: { text: true, vision: true, audio: false, tools: true, structuredOutput: true },
  deepseek: { text: true, vision: false, audio: false, tools: true, structuredOutput: true },
  mistral: { text: true, vision: true, audio: true, tools: true, structuredOutput: true },
  cohere: { text: true, vision: false, audio: false, tools: true, structuredOutput: true },
  groq: { text: true, vision: true, audio: true, tools: true, structuredOutput: true },
  cerebras: { text: true, vision: false, audio: false, tools: true, structuredOutput: true },
  meta: { text: true, vision: true, audio: false, tools: true, structuredOutput: true },
  qwen: { text: true, vision: true, audio: true, tools: true, structuredOutput: true },
  openrouter: { routing: true, fallbacks: true, multiModel: true, toolAwareRouting: true },
};

export const AUTONOMOUS_TASK_POLICY = {
  planning: ["openai", "anthropic", "google"],
  coding: ["openai", "anthropic", "google", "deepseek"],
  vision: ["google", "openai", "anthropic", "qwen"],
  voice: ["openai", "google", "mistral", "groq"],
  fastGeneration: ["groq", "cerebras", "google"],
  fallback: ["openrouter", "google", "openai", "groq"],
};

export function getProviderCapabilities(provider) {
  return PUBLIC_AI_PROVIDER_MATRIX[provider] || {};
}

export function chooseProvider(task, configuredProviders = []) {
  const preferred = AUTONOMOUS_TASK_POLICY[task] || AUTONOMOUS_TASK_POLICY.fallback;
  return preferred.find((provider) => configuredProviders.includes(provider)) || configuredProviders[0] || null;
}
