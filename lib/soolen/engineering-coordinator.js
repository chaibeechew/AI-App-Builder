import { runSoftwareEngineerBrain } from "./software-engineer-brain.js";

// Optional engineering phase for materialized/source-code workflows.
// It is skipped safely when no code-creation handler is connected.
export async function runEngineeringPhase(input = {}, handlers = {}) {
  if (typeof handlers.create !== "function") {
    return {
      status: "not-connected",
      enabled: false,
      reason: "code-creator-handler-not-connected",
      requiresSandboxBeforeAcceptance: true,
    };
  }
  const result = await runSoftwareEngineerBrain(input, handlers);
  return {
    ...result,
    enabled: true,
    requiresSandboxBeforeAcceptance: true,
  };
}
