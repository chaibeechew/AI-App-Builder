import { createSuperBrainJob, extractReusableExperience, metaEvaluate } from "./super-brain.js";
import { autonomousRepairLoop } from "./critic-engine.js";
import { routeDecision, chooseSpecialist } from "./decision-router.js";
import { createMemoryBrain } from "./memory-engine.js";
import { runEngineeringPhase } from "./engineering-coordinator.js";

function stageName(stage){return typeof stage==="string"?stage:String(stage?.name||stage?.id||"stage");}

// Super Brain Adult Mode = reason -> route -> specialists -> execute -> test -> critic -> repair -> verify -> engineering -> safe learning.
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
  try {
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

    const engineering = await runEngineeringPhase({
      goal: input.goal || input.prompt || "",
      existing: input.existingFiles || [],
      failures: reviewed.status === "verified" ? [] : ["generation-verification-failed"],
      maxRepairs: input.maxEngineeringRepairs ?? 3,
    }, handlers.engineering || {});

    const safeExperience = extractReusableExperience({
      privateDataIncluded: false,
      outcome: {
        category: input.taskType || "app-build",
        strategy: `${decision.selected?.id || "authorized-default"}:${brainJob.plan?.stages?.map(stageName).join("->") || "super-brain-loop"}`,
        success: reviewed.status === "verified",
        failureCode: reviewed.status === "verified" ? "" : "NEEDS_ATTENTION",
        performanceClass: input.device?.tier || "unknown",
      },
    });
    memory.learnMethod(safeExperience);
    const reusableMemory=memory.reusable();
    return {
      mode: "super-brain-adult",
      status: reviewed.status,
      brainJob,
      decision,
      specialists,
      result: reviewed.result,
      criticHistory: reviewed.history,
      engineering,
      experience: safeExperience,
      meta: metaEvaluate(reusableMemory),
      privacy: memory.policy,
      requiresHumanAttention: reviewed.status !== "verified",
    };
  } finally {
    memory.clearPrivateTaskMemory();
  }
}

export function adultModeAcceptance(result = {}) {
  return result.status === "verified" && result.requiresHumanAttention === false;
}
