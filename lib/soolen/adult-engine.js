import { createSuperBrainJob, extractReusableExperience, metaEvaluate } from "./super-brain.js";
import { autonomousRepairLoop } from "./critic-engine.js";

// Adult Mode = understand -> plan -> act -> test -> critic -> repair -> verify -> safe experience.
export async function runSoolenAdultMode(input = {}, handlers = {}) {
  const brainJob = createSuperBrainJob(input);
  if (typeof handlers.execute !== "function") throw new Error("SOOLEN_EXECUTE_HANDLER_REQUIRED");

  const execution = await handlers.execute(brainJob);
  const reviewed = await autonomousRepairLoop({
    initialResult: execution,
    requirements: input.requirements || {},
    maxRepairs: input.maxRepairs ?? 3,
    verify: handlers.verify,
    repair: async (repairContext) => {
      if (typeof handlers.repair !== "function") return repairContext.result;
      return handlers.repair({ brainJob, ...repairContext });
    },
  });

  const safeExperience = extractReusableExperience({
    privateDataIncluded: false,
    outcome: {
      category: input.taskType || "app-build",
      strategy: brainJob.plan?.stages?.map((x) => x.name).join("->") || "adult-loop",
      success: reviewed.status === "verified",
      failureCode: reviewed.status === "verified" ? "" : "NEEDS_ATTENTION",
      performanceClass: input.device?.tier || "unknown",
    },
  });

  return {
    mode: "adult",
    status: reviewed.status,
    brainJob,
    result: reviewed.result,
    criticHistory: reviewed.history,
    experience: safeExperience,
    meta: metaEvaluate([safeExperience]),
    requiresHumanAttention: reviewed.status !== "verified",
  };
}

export function adultModeAcceptance(result = {}) {
  return result.status === "verified" && result.requiresHumanAttention === false;
}
