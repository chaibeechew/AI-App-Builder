import { normalizeAppSpec } from "./runtime-guard.js";
import { selfTestGeneratedApp } from "./self-test.js";
import { buildAppExplanation } from "./app-explanation.js";

export function prepareGeneratedApp(input) {
  const spec = normalizeAppSpec(input);
  const test = selfTestGeneratedApp(spec);
  if (!test.ok) {
    return { status: "needs_fix", spec, test, explanation: buildAppExplanation(spec) };
  }
  return {
    status: "ready_for_preview",
    spec: test.normalizedSpec,
    test,
    explanation: buildAppExplanation(test.normalizedSpec),
  };
}
