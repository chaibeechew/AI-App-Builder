import { createSuperBrainJob, extractReusableExperience, metaEvaluate } from "./super-brain.js";
import { autonomousRepairLoop } from "./critic-engine.js";
import { routeDecision, chooseSpecialist } from "./decision-router.js";
import { createMemoryBrain } from "./memory-engine.js";

// Super Brain Adult Mode = reason -> route -> specialists -> execute -> test -> critic -> repair -> verify -> safe learning.
export async function runSoolenAdultMode(input = {}, handlers = {}) {
  const brainJob = createSuperBrainJob(input);
  const memory = createMemoryBrain(brainJob.context?.taskId || brainJob.id || `task-${Date.now()}`);
  const specialists = chooseSpecialist(input.taskType || "app-build");
  const decision = routeDecision({
    task: input.taskType || "app-build",
    candidates: input.executors || [],
    context: {
      privateData: Boolean(input.privateData),
      deviceFirst: true,
      zeroCloudGpuTarget: true,
      permissions: brainJob.context?.permissions || input.permissions || {},
    },
  });
  memory.rememberTask("goal", input.goal || input.prompt || "");
  memory.rememberTask("decision", decision);
  if (typeof handlers.execute !== "function") throw new Error("SOOLEN_EXECUTE_HANDLER_REQUIRED");

  const execution = await handlers.execute({ ...brainJob, decision, specialists, memory });
  const reviewed = await autonomousRepairLoop({
    initialResult: execution,
    requirements: input.requirements || {},
    maxRepairs: input.maxRepairs ?? 3,
    verify: handlers.verify,
    repair: async (repairContext) => {
      if (typeof handlers.repair !== "function") return repairContext.result;
      return handlers.repair({ brainJob, decision, specialists, memory, ...repairContext });
    },
  });

  const safeExperience = extractReusableExperience({
    privateDataIncluded: false,
    outcome: {
      category: input.taskType || "app-build",
      strategy: `${decision.selected?.id || "authorized-default"}:${brainJob.plan?.stages?.map((x) => x.name).join("->") || "super-brain-loop"}`,
      success: reviewed.status === "verified",
      failureCode: reviewed.status === "verified" ? "" : "NEEDS_ATTENTION",
      performanceClass: input.device?.tier || "unknown",
    },
  });
  memory.learnMethod(safeExperience);
  memory.clearPrivateTaskMemory();

  return {
    mode: "super-brain-adult",
    status: reviewed.status,
    brainJob,
    decision,
    specialists,
    result: reviewed.result,
    criticHistory: reviewed.history,
    experience: safeExperience,
    meta: metaEvaluate(memory.reusable()),
    privacy: memory.policy,
    requiresHumanAttention: reviewed.status !== "verified",
  };
}

export function adultModeAcceptance(result = {}) {
  return result.status === "verified" && result.requiresHumanAttention === false;
}
