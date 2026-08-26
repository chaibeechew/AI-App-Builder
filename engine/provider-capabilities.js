// Publicly documented capability patterns only. No private weights, hidden prompts,
// proprietary source code, or credentials are copied into this project.

export const providerCapabilities = {
  openai: { tasks: ["reasoning", "coding", "vision", "structured_output", "tool_calling", "embeddings"] },
  anthropic: { tasks: ["reasoning", "coding", "long_context", "vision", "tool_use"] },
  google: { tasks: ["reasoning", "coding", "vision", "multimodal", "long_context", "structured_output"] },
  xai: { tasks: ["reasoning", "coding", "vision", "tool_calling"] },
  deepseek: { tasks: ["reasoning", "coding", "structured_output"] },
  mistral: { tasks: ["reasoning", "coding", "vision", "embeddings", "ocr"] },
  cohere: { tasks: ["rag", "retrieval", "reranking", "embeddings", "generation"] },
  groq: { tasks: ["fast_inference", "coding", "reasoning", "tool_calling"] },
  cerebras: { tasks: ["fast_inference", "generation", "reasoning"] },
  meta: { tasks: ["open_model_inference", "reasoning", "coding", "vision"] },
  qwen: { tasks: ["reasoning", "coding", "vision", "multilingual", "tool_calling"] },
  openrouter: { tasks: ["provider_routing", "fallback", "model_selection"] },
};

export const publicPatterns = {
  agentLoop: ["plan", "act", "observe", "evaluate", "retry"],
  rag: ["retrieve", "rerank", "ground", "generate", "cite"],
  toolUse: ["select_tool", "validate_arguments", "execute", "observe_result"],
  structuredGeneration: ["schema", "generate", "validate", "repair"],
  multimodal: ["ingest", "normalize", "analyze", "ground", "generate"],
  modelRouting: ["capability", "latency", "cost", "policy", "fallback"],
  continuousImprovement: ["collect_feedback", "evaluate", "update_knowledge", "regression_test"],
};

export function providersForTask(task) {
  return Object.entries(providerCapabilities)
    .filter(([, value]) => value.tasks.includes(task))
    .map(([provider]) => provider);
}

export function buildProviderPlan(task, constraints = {}) {
  const candidates = providersForTask(task);
  return candidates.sort((a, b) => {
    const preferred = constraints.preferred || [];
    return preferred.indexOf(a) - preferred.indexOf(b);
  });
}
