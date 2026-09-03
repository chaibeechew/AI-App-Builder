import { OPERATIONAL_MODE } from "./safety-controls.js";

export const LANERIQ_SURVIVAL_ORCHESTRATOR_VERSION = "2026-09-03.1";

export const SURVIVAL_TIER = Object.freeze({
  ESSENTIAL: "essential",
  INTERACTIVE: "interactive",
  DEFERABLE: "deferable",
  NONESSENTIAL: "nonessential",
});

const TIER_POLICY = Object.freeze({
  [SURVIVAL_TIER.ESSENTIAL]: { survivalAllowed: true, degradedAllowed: true },
  [SURVIVAL_TIER.INTERACTIVE]: { survivalAllowed: true, degradedAllowed: true },
  [SURVIVAL_TIER.DEFERABLE]: { survivalAllowed: false, degradedAllowed: true },
  [SURVIVAL_TIER.NONESSENTIAL]: { survivalAllowed: false, degradedAllowed: false },
});

export function buildSurvivalPlan({
  mode = OPERATIONAL_MODE.NORMAL,
  queuePressure = "normal",
  paidRoutingAllowed = true,
  providerHealthy = true,
  errorBudgetState = "healthy",
} = {}) {
  const survival = mode === OPERATIONAL_MODE.SURVIVAL;
  const degraded = mode === OPERATIONAL_MODE.DEGRADED;
  const recovering = mode === OPERATIONAL_MODE.RECOVERY;
  const freezeHighRiskChanges = survival || errorBudgetState === "freeze_changes" || queuePressure === "emergency";

  const tierAccess = Object.freeze(Object.fromEntries(
    Object.entries(TIER_POLICY).map(([tier, policy]) => [
      tier,
      survival ? policy.survivalAllowed : degraded ? policy.degradedAllowed : true,
    ]),
  ));

  return Object.freeze({
    version: LANERIQ_SURVIVAL_ORCHESTRATOR_VERSION,
    mode,
    tierAccess,
    protectAuthAndExistingProjects: true,
    allowPaidExternalRouting: Boolean(paidRoutingAllowed) && !survival,
    allowBackgroundGeneration: !survival && !recovering && queuePressure !== "critical" && queuePressure !== "emergency",
    allowHighRiskChanges: !freezeHighRiskChanges,
    providerFailoverAdvisory: !providerHealthy,
    concurrencyMultiplier: survival ? 0.35 : degraded ? 0.65 : recovering ? 0.5 : 1,
    recoveryRequiresEvidence: true,
  });
}

export function canRunWorkloadInMode({ tier = SURVIVAL_TIER.INTERACTIVE, plan } = {}) {
  if (!TIER_POLICY[tier]) throw new Error(`LANERIQ_SURVIVAL_TIER_INVALID:${tier}`);
  if (!plan || typeof plan !== "object") throw new Error("LANERIQ_SURVIVAL_PLAN_REQUIRED");
  return Object.freeze({
    allowed: Boolean(plan.tierAccess?.[tier]),
    tier,
    mode: plan.mode,
    reason: plan.tierAccess?.[tier] ? "tier_allowed" : "tier_paused_for_resilience",
  });
}

export function publicSurvivalOrchestratorPolicy() {
  return Object.freeze({
    version: LANERIQ_SURVIVAL_ORCHESTRATOR_VERSION,
    tiers: Object.values(SURVIVAL_TIER),
    protectsExistingProjects: true,
    pausesNonessentialBeforeEssential: true,
    recoveryRequiresEvidence: true,
    fixedInfrastructureCostRequired: false,
  });
}
