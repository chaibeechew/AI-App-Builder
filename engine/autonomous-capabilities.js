// Autonomous capability registry and orchestration boundary.
// This does not copy private model weights, hidden prompts, credentials, or
// proprietary internals from ChatGPT. It gives the project's Autonomous AI a
// structured way to use the capabilities implemented in this application.

export const autonomousCapabilities = {
  reasoning: { enabled: true },
  planning: { enabled: true },
  structuredOutput: { enabled: true },
  appSpecification: { enabled: true },
  runtimeNormalization: { enabled: true },
  selfTesting: { enabled: true },
  visualReferenceAnalysis: { enabled: true },
  voiceInput: { enabled: true },
  communityChat: { enabled: true },
  memory: { enabled: true },
  safety: { enabled: true },
  security: { enabled: true },
  modelRouting: { enabled: true },
};

export function getAutonomousCapabilities() {
  return Object.fromEntries(
    Object.entries(autonomousCapabilities).filter(([, value]) => value.enabled)
  );
}

export function buildAutonomousContext({ idea, referenceAnalysis, transcript, memory }) {
  return {
    idea: String(idea || "").trim(),
    referenceAnalysis: referenceAnalysis || null,
    transcript: String(transcript || "").trim() || null,
    memory: Array.isArray(memory) ? memory.slice(-20) : [],
    capabilities: getAutonomousCapabilities(),
    rules: [
      "Plan before generation.",
      "Prefer structured output over free-form code generation.",
      "Normalize generated specifications before execution.",
      "Self-test before preview or publish.",
      "Never expose secrets or private user data.",
      "Require human approval before store publishing.",
    ],
  };
}
