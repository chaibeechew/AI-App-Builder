import { assessGenerationQuality } from "./generation-quality-judge.js";
import { buildGenerationOutcomeDescriptor, buildGenerationOutcomeFingerprint } from "./generation-outcome-intelligence.js";
import { LOGICAL_WORKER_CAPACITY, buildAgentComputeBudget } from "./zero-cost-compute-fabric.js";

export const GENERATION_CANDIDATE_ORCHESTRATOR_VERSION=1;
export const GENERATION_CANDIDATE_TARGET=3;
export const GENERATION_CANDIDATE_MAX=5;

function list(value){return Array.isArray(value)?value:[];}
function object(value){return value&&typeof value==="object"&&!Array.isArray(value)?value:{};}
function clamp(value,min=0,max=100){const number=Number(value);return Number.isFinite(number)?Math.max(min,Math.min(max,number)):0;}
function clean(value,max=120){return String(value||"").trim().slice(0,max);}
function freezeDeep(value){if(Array.isArray(value)){value.forEach(freezeDeep);return Object.freeze(value);}if(value&&typeof value==="object"){Object.values(value).forEach(freezeDeep);return Object.freeze(value);}return value;}

export function buildGenerationCandidateBudget({costMode="free",requestedCandidates=GENERATION_CANDIDATE_TARGET}={}){
  const mode=String(costMode||"free").toLowerCase();
  const target=Math.max(1,Math.min(GENERATION_CANDIDATE_MAX,Number(requestedCandidates)||GENERATION_CANDIDATE_TARGET));
  const free=mode==="free"||mode==="zero"||mode==="zero-cost";
  const fabricBudget=buildAgentComputeBudget({
    complexity:target>=5?"complex":target>=3?"standard":"trivial",
    requestedAgents:target,
    requiresIndependentVerification:target>1,
    costMode:mode==="zero-cost"?"zero":mode,
  });
  return freezeDeep({
    version:GENERATION_CANDIDATE_ORCHESTRATOR_VERSION,
    mode:free?"zero-cost-first":"controlled-provider-budget",
    targetCandidates:target,
    maxCandidates:Math.min(GENERATION_CANDIDATE_MAX,fabricBudget.maxActiveAgents),
    maxMeteredRemoteCalls:free?1:Math.min(2,target),
    localShadowCandidates:Math.max(0,target-(free?1:Math.min(2,target))),
    parallelMeteredCalls:false,
    stopWhenAccepted:true,
    providerFallbackStillAllowed:true,
    computeFabricV2:true,
    logicalWorkerCapacity:fabricBudget.logicalWorkerCapacity,
    maxActiveAgents:fabricBudget.maxActiveAgents,
    maxAgentTreeDepth:fabricBudget.maxTreeDepth,
    maxChildrenPerAgent:fabricBudget.maxChildrenPerAgent,
    recursiveFanoutUnlimited:false,
    rule:free
      ?"Use at most one free-tier/remote success path under the existing provider hard-stop policy; fill extra comparison slots only with zero-cost/local or already-produced candidates. Recursive agent fan-out remains bounded by Compute Fabric v2."
      :"Keep remote candidate calls bounded, keep recursive agent fan-out bounded by Compute Fabric v2, and stop as soon as a production-eligible candidate is available.",
  });
}

export function buildShadowCandidateInstruction(index=1){
  const slot=Math.max(1,Math.min(GENERATION_CANDIDATE_MAX,Number(index)||1));
  const axes=[
    "Change the page responsibility map and navigation grammar while preserving requested capabilities.",
    "Use a materially different composition, action distribution and workflow entry point; avoid cosmetic-only variation.",
    "Prefer a different LIUI interaction model and information hierarchy while preserving customer data semantics.",
    "Explore a different mobile-first flow and recovery-state strategy without adding unrelated features.",
    "Reframe the primary customer journey with a distinct structural rhythm and original visual hierarchy.",
  ];
  return `LANERIQ INTERNAL CANDIDATE ${slot}: ${axes[(slot-1)%axes.length]} Preserve security, accessibility, customer-selected brand/theme choices and all explicit requirements. Return the full specification only.`;
}

function normalizeCandidate(candidate,index){
  const item=object(candidate);
  const specification=object(item.specification||item.spec||candidate);
  return {
    id:clean(item.id||`candidate-${index+1}`,80),
    provider:clean(item.provider||"unknown",60),
    sourceKind:clean(item.sourceKind||"generated",60),
    specification,
    index,
  };
}

function decisionBoost(decision){if(decision==="accept")return 6;if(decision==="optimize")return 1;return-12;}
function blockerPenalty(blockers){return Math.min(24,list(blockers).length*8);}
function completenessTieBreak(judge){
  const dimension=list(judge?.dimensions).find(item=>item?.id==="productCompleteness");
  return clamp(dimension?.score||0)/100;
}

export function evaluateGenerationCandidatePool(candidates=[],options={}){
  const normalized=list(candidates).slice(0,GENERATION_CANDIDATE_MAX).map(normalizeCandidate).filter(item=>Object.keys(item.specification).length>0);
  if(!normalized.length)throw new Error("At least one generation candidate is required.");
  const descriptors=normalized.map(item=>buildGenerationOutcomeDescriptor(item.specification));
  const fingerprints=normalized.map((item,index)=>buildGenerationOutcomeFingerprint(descriptors[index]));
  const duplicateCounts=new Map();
  for(const fingerprint of fingerprints)duplicateCounts.set(fingerprint,(duplicateCounts.get(fingerprint)||0)+1);
  const rows=normalized.map((item,index)=>{
    const referenceDescriptors=descriptors.filter((_,otherIndex)=>otherIndex!==index);
    const judge=assessGenerationQuality(item.specification,{benchmarkCase:options.benchmarkCase,referenceDescriptors});
    const duplicatePenalty=(duplicateCounts.get(fingerprints[index])||0)>1?10:0;
    const rankingScore=Number((judge.score+decisionBoost(judge.decision)-blockerPenalty(judge.hardBlockers)-duplicatePenalty+completenessTieBreak(judge)).toFixed(2));
    return {
      id:item.id,
      provider:item.provider,
      sourceKind:item.sourceKind,
      fingerprint:fingerprints[index],
      qualityScore:judge.score,
      decision:judge.decision,
      productionEligibleByJudge:judge.productionEligibleByJudge,
      hardBlockers:[...judge.hardBlockers],
      rankingScore,
      duplicatePenalty,
      judge,
      specification:item.specification,
      index:item.index,
    };
  }).sort((a,b)=>b.rankingScore-a.rankingScore||b.qualityScore-a.qualityScore||a.index-b.index);
  const selected=rows[0];
  const accepted=rows.filter(row=>row.decision==="accept").length;
  const uniqueFingerprints=new Set(rows.map(row=>row.fingerprint)).size;
  const ranking=Object.freeze(rows.map(row=>Object.freeze({id:row.id,provider:row.provider,sourceKind:row.sourceKind,fingerprint:row.fingerprint,qualityScore:row.qualityScore,decision:row.decision,rankingScore:row.rankingScore,duplicatePenalty:row.duplicatePenalty,hardBlockers:Object.freeze([...row.hardBlockers])})));
  return Object.freeze({
    version:GENERATION_CANDIDATE_ORCHESTRATOR_VERSION,
    candidateCount:rows.length,
    uniqueCandidateCount:uniqueFingerprints,
    acceptedCandidateCount:accepted,
    selectedCandidateId:selected.id,
    selectedProvider:selected.provider,
    selectedSourceKind:selected.sourceKind,
    selectedFingerprint:selected.fingerprint,
    selectedQualityScore:selected.qualityScore,
    selectedDecision:selected.decision,
    productionEligibleByJudge:selected.productionEligibleByJudge,
    requiresSelfHeal:selected.decision!=="accept",
    selectedSpecification:selected.specification,
    ranking,
    privacySafe:true,
    storesRawUserPrompt:false,
    methodology:"laneriq-candidate-orchestrator-v1-quality-judge-plus-structural-diversity",
    evidenceBoundary:"Candidate ranking is internal CODE/runtime evidence. It does not prove external-provider availability, Production deployment, browser, device, store or legal originality clearance.",
  });
}

export function buildCandidateSelfHealDirective(pool){
  const result=object(pool);
  if(result.selectedDecision==="accept")return "Selected candidate already satisfies the Automatic Quality Judge acceptance gate; preserve working behavior and do not regenerate unnecessarily.";
  const row=list(result.ranking).find(item=>item.id===result.selectedCandidateId)||result.ranking?.[0]||{};
  const blockers=list(row.hardBlockers).join(", ")||"quality score below acceptance threshold";
  return `Selected candidate requires ${result.selectedDecision||"optimization"}. Repair or structurally replan only verified gaps. Blocking evidence: ${blockers}. Preserve explicit requirements, working features, customer branding and Secure-by-Default MAX boundaries.`;
}

export const GENERATION_CANDIDATE_ORCHESTRATOR_POLICY=freezeDeep({
  version:GENERATION_CANDIDATE_ORCHESTRATOR_VERSION,
  targetCandidates:GENERATION_CANDIDATE_TARGET,
  maxCandidates:GENERATION_CANDIDATE_MAX,
  zeroCostFirst:true,
  freeModeMaxMeteredRemoteCalls:1,
  duplicateFingerprintPenalty:true,
  automaticQualityJudgeRequired:true,
  selfHealBelowAccept:true,
  rawUserPromptStorage:false,
  directProviderCalls:false,
  computeFabricV2Required:true,
  logicalWorkerCapacity:LOGICAL_WORKER_CAPACITY,
  recursiveFanoutUnlimited:false,
  activation:"runtime-integrated-by-autonomous-engine; additional comparison slots are zero-cost local shadows and all agent fan-out is bounded by Compute Fabric v2",
});