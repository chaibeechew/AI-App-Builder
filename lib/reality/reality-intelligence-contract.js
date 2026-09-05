const freeze=value=>Object.freeze(value);

export const REALITY_INTELLIGENCE_VERSION='0.1.0';

export const REALITY_TRUTH_LEVELS=freeze({
  CODE_READY:'CODE_READY',
  CI_READY:'CI_READY',
  SIMULATION_ONLY:'SIMULATION_ONLY',
  EVIDENCE_REQUIRED:'EVIDENCE_REQUIRED',
  EXTERNAL_MODEL_CONNECTED:'EXTERNAL_MODEL_CONNECTED',
  LIVE_WORLD_VERIFIED:'LIVE_WORLD_VERIFIED',
  REALITY_ACTION_AUTHORIZED:'REALITY_ACTION_AUTHORIZED',
});

export const REALITY_CAPABILITIES=freeze({
  WORLD_STATE:'world-state',
  CAUSAL_PLAN:'causal-plan',
  COUNTERFACTUAL_PLAN:'counterfactual-plan',
  REALITY_COMPILE:'reality-compile',
  MULTIVERSE_SEARCH:'multiverse-search',
  INTELLIGENCE_FABRIC:'intelligence-fabric',
  TRUST_GOVERNANCE:'trust-governance',
  PHYSICAL_ACTION:'physical-action',
});

export const REALITY_POLICY=freeze({
  failClosed:true,
  simulationIsNotPrediction:true,
  providerSelfReportIsNotEvidence:true,
  physicalActionRequiresExplicitAuthorization:true,
  irreversibleActionRequiresHumanApproval:true,
  provenanceRequiredForVerifiedClaims:true,
  uncertaintyRequiredForForecastLikeClaims:true,
  premiumRequiresExplicitPermission:true,
  privateWorldStateStaysProjectScoped:true,
});

export function summarizeRealityIntelligenceFoundation(){
  return freeze({
    version:REALITY_INTELLIGENCE_VERSION,
    truth:REALITY_TRUTH_LEVELS.CODE_READY,
    implemented:freeze([
      REALITY_CAPABILITIES.WORLD_STATE,
      REALITY_CAPABILITIES.CAUSAL_PLAN,
      REALITY_CAPABILITIES.COUNTERFACTUAL_PLAN,
      REALITY_CAPABILITIES.REALITY_COMPILE,
      REALITY_CAPABILITIES.MULTIVERSE_SEARCH,
      REALITY_CAPABILITIES.INTELLIGENCE_FABRIC,
      REALITY_CAPABILITIES.TRUST_GOVERNANCE,
    ]),
    future:freeze([REALITY_CAPABILITIES.PHYSICAL_ACTION]),
    policy:REALITY_POLICY,
    statement:'This foundation can represent, plan, compare and govern simulated realities. It does not by itself prove causal truth, predict the real future, or authorize physical-world action.',
  });
}
