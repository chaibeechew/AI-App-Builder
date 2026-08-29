// Soolen AI Super Brain
// Core orchestration architecture. Customer private data is task-use-only by default.

export const SOOLEN_BRAIN_VERSION = "0.1.0";

export const BRAIN_MODULES = Object.freeze({
  reasoning: "reasoning",
  memory: "memory",
  experience: "experience",
  planner: "planner",
  specialists: "specialists",
  critic: "critic",
  device: "device",
  meta: "meta",
});

export const CUSTOMER_DATA_POLICY = Object.freeze({
  defaultUse: "current-task-only",
  trainGlobalModels: false,
  crossCustomerReuse: false,
  persistRawPrivateData: false,
  persistRawPrompt: false,
  learnReusableMethod: true,
  requireExplicitOptInForGlobalLearning: true,
});

function cleanText(value, max = 12000) {
  return String(value || "").trim().slice(0, max);
}

function now() {
  return new Date().toISOString();
}

export function createBrainContext(input = {}) {
  return {
    id: input.id || `soolen-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    createdAt: now(),
    goal: cleanText(input.goal),
    taskType: cleanText(input.taskType || "app-build", 100),
    executionTarget: input.executionTarget || "device",
    customerDataPolicy: { ...CUSTOMER_DATA_POLICY },
    permissions: {
      network: false,
      backgroundCompute: false,
      sharedCompute: false,
      privateDataReuse: false,
      ...(input.permissions || {}),
    },
    device: input.device || null,
    projectMemory: input.projectMemory || {},
    privateTaskContext: input.privateTaskContext || null,
  };
}

export function reason(context) {
  if (!context?.goal) throw new Error("SOOLEN_GOAL_REQUIRED");
  return {
    goal: context.goal,
    intent: context.taskType,
    constraints: [
      "user-authorized-scope-only",
      "privacy-by-default",
      "device-first",
      "sandbox-required-for-executable-work",
    ],
    confidence: "needs-validation",
  };
}

export function plan(context, reasoning) {
  const appBuild = context.taskType === "app-build";
  const stages = appBuild
    ? ["understand", "architecture", "data-model", "ui", "implementation", "test", "security-review", "repair", "verify", "preview", "package"]
    : ["understand", "storyboard", "job-graph", "render", "validate", "repair", "merge", "finish", "verify", "export"];

  return {
    id: `${context.id}-plan`,
    reasoning,
    stages: stages.map((name, index) => ({ id: index + 1, name, status: "pending" })),
    retryPolicy: { strategy: "affected-work-only", maxRetriesPerStage: 3 },
    executionTarget: context.executionTarget,
  };
}

export function selectSpecialists(planInput) {
  const names = planInput.stages.map((s) => s.name);
  const specialists = new Set(["planner", "security", "testing"]);
  if (names.includes("implementation")) specialists.add("coding");
  if (names.includes("ui")) specialists.add("ui-ux");
  if (names.includes("data-model")) specialists.add("database");
  if (names.includes("render")) specialists.add("media");
  if (names.includes("finish")) specialists.add("audio-captions");
  return [...specialists];
}

export function criticReview(result = {}) {
  const checks = {
    completed: result.completed === true,
    testsPassed: result.testsPassed === true,
    securityPassed: result.securityPassed === true,
    privacyPassed: result.privacyPassed === true,
    outputVerified: result.outputVerified === true,
  };
  const failed = Object.entries(checks).filter(([, ok]) => !ok).map(([name]) => name);
  return { passed: failed.length === 0, checks, failed, action: failed.length ? "repair" : "accept" };
}

export function extractReusableExperience({ outcome, privateDataIncluded = false } = {}) {
  // Never return raw customer content. Experience must be method-level metadata only.
  return {
    createdAt: now(),
    reusable: !privateDataIncluded,
    category: cleanText(outcome?.category || "general", 100),
    strategy: cleanText(outcome?.strategy || "", 1000),
    success: outcome?.success === true,
    failureCode: cleanText(outcome?.failureCode || "", 100),
    performanceClass: cleanText(outcome?.performanceClass || "", 100),
    containsCustomerRawData: false,
  };
}

export function metaEvaluate(experiences = []) {
  const safe = experiences.filter((x) => x && x.containsCustomerRawData !== true);
  const grouped = new Map();
  for (const item of safe) {
    const key = item.strategy || "unknown";
    const value = grouped.get(key) || { attempts: 0, successes: 0 };
    value.attempts += 1;
    if (item.success) value.successes += 1;
    grouped.set(key, value);
  }
  return [...grouped.entries()]
    .map(([strategy, v]) => ({ strategy, ...v, successRate: v.attempts ? v.successes / v.attempts : 0 }))
    .sort((a, b) => b.successRate - a.successRate);
}

export function createSuperBrainJob(input = {}) {
  const context = createBrainContext(input);
  const reasoning = reason(context);
  const jobPlan = plan(context, reasoning);
  return {
    brainVersion: SOOLEN_BRAIN_VERSION,
    context,
    reasoning,
    plan: jobPlan,
    specialists: selectSpecialists(jobPlan),
    loop: ["reason", "plan", "act", "test", "critic", "repair", "verify", "extract-safe-experience", "meta-evaluate"],
    status: "planned",
  };
}
