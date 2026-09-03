import { buildGenerationCandidateBudget, evaluateGenerationCandidatePool } from "./generation-candidate-orchestrator.js";
import { expandZeroCostIndustrySpecification } from "./zero-cost-industry-expander.js";
import { normalizeAppSpec } from "../generator/runtime-guard.js";

export const RUNTIME_OUTCOME_SELECTOR_VERSION=2;

function isGame(specification){return specification?.productType==="mobile_game"||specification?.game?.enabled===true;}
function normalized(specification){return normalizeAppSpec(specification||{});}
function freezeRanking(ranking=[]){return ranking.map(item=>({id:item.id,sourceKind:item.sourceKind,provider:item.provider,qualityScore:item.qualityScore,decision:item.decision,rankingScore:item.rankingScore,duplicatePenalty:item.duplicatePenalty,hardBlockers:[...(item.hardBlockers||[])]}));}

export function applyRuntimeOutcomeIntelligence(result,prompt,{requestedCandidates=3,costMode="free"}={}){
  if(!result?.specification||isGame(result.specification))return result;
  const budget=buildGenerationCandidateBudget({costMode,requestedCandidates});
  const primary=normalized(result.specification);
  const candidates=[
    {id:"primary",provider:result.aiProvider||"unknown",sourceKind:"primary-provider",specification:primary},
    {id:"local-structural-shadow-1",provider:"laneriq-local-transform",sourceKind:"zero-cost-structural-shadow",specification:normalized(expandZeroCostIndustrySpecification(primary,prompt,{variationIndex:1}))},
    {id:"local-structural-shadow-2",provider:"laneriq-local-transform",sourceKind:"zero-cost-structural-shadow",specification:normalized(expandZeroCostIndustrySpecification(primary,prompt,{variationIndex:2}))},
    {id:"local-structural-shadow-3",provider:"laneriq-local-transform",sourceKind:"zero-cost-structural-shadow",specification:normalized(expandZeroCostIndustrySpecification(primary,prompt,{variationIndex:3}))},
    {id:"local-structural-shadow-4",provider:"laneriq-local-transform",sourceKind:"zero-cost-structural-shadow",specification:normalized(expandZeroCostIndustrySpecification(primary,prompt,{variationIndex:4}))},
  ].slice(0,budget.targetCandidates);
  const pool=evaluateGenerationCandidatePool(candidates);
  const selectedRanking=pool.ranking.find(item=>item.id===pool.selectedCandidateId)||pool.ranking[0]||null;
  return {
    ...result,
    specification:pool.selectedSpecification,
    intelligence:{
      ...(result.intelligence||{}),
      qualityCandidates:{
        version:RUNTIME_OUTCOME_SELECTOR_VERSION,
        enabled:true,
        mode:"runtime-guarded-primary-plus-zero-cost-local-structural-shadows",
        normalizationMode:"runtime-guard-before-quality-judge",
        candidateCount:pool.candidateCount,
        uniqueCandidateCount:pool.uniqueCandidateCount,
        selectedCandidateId:pool.selectedCandidateId,
        selectedProvider:pool.selectedProvider,
        selectedSourceKind:pool.selectedSourceKind,
        selectedQualityScore:pool.selectedQualityScore,
        selectedDecision:pool.selectedDecision,
        selectedHardBlockers:[...(selectedRanking?.hardBlockers||[])],
        productionEligibleByJudge:pool.productionEligibleByJudge,
        requiresSelfHeal:pool.requiresSelfHeal,
        targetCandidates:budget.targetCandidates,
        maxMeteredRemoteCalls:budget.maxMeteredRemoteCalls,
        paidShadowCalls:0,
        ranking:freezeRanking(pool.ranking),
        privacySafe:true,
        storesRawUserPrompt:false,
        evidenceBoundary:"Runtime generation outcome ranking only. External-provider LIVE, Production deployment, browser, physical-device and store evidence remain separate.",
      },
    },
  };
}

export const RUNTIME_OUTCOME_SELECTOR_POLICY=Object.freeze({
  version:RUNTIME_OUTCOME_SELECTOR_VERSION,
  normalProductOnly:true,
  gamePathPreserved:true,
  defaultCandidates:3,
  maximumCandidates:5,
  mandatoryRuntimeGuardBeforeJudging:true,
  zeroCostStructuralShadows:true,
  paidShadowCalls:0,
  rawUserPromptStorage:false,
  selectedHardBlockersObservable:true,
  sharedByProductionAndCi:true,
});
