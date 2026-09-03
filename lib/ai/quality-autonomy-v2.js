import { assessGenerationQuality } from './generation-quality-judge.js';

export const QUALITY_AUTONOMY_V2_POLICY=Object.freeze({
  version:'qa2',
  targetScore:95,
  premiumScore:98,
  maxRepairRounds:3,
  replanFloor:88,
  evidenceLevel:'CODE_CI_CAPABILITY',
  neverClaimsProduction:true,
});

function safeCandidates(value){return Array.isArray(value)?value.filter(Boolean).slice(0,8):[];}
function judge(candidate){
  const report=assessGenerationQuality(candidate?.specification||candidate||{});
  return {candidate,report,score:Number(report?.score||report?.overall||0)};
}

export function chooseBestGenerationCandidate(candidates=[]){
  const judged=safeCandidates(candidates).map(judge).sort((a,b)=>b.score-a.score);
  const best=judged[0]||null;
  const score=best?.score||0;
  const action=score>=QUALITY_AUTONOMY_V2_POLICY.targetScore?'accept':score>=QUALITY_AUTONOMY_V2_POLICY.replanFloor?'repair':'replan';
  return {
    policy:QUALITY_AUTONOMY_V2_POLICY.version,
    action,
    best,
    ranked:judged,
    targetScore:QUALITY_AUTONOMY_V2_POLICY.targetScore,
    evidenceLevel:'CODE_CI_CAPABILITY',
    productionVerified:false,
  };
}

export function planAutonomousQualityLoop({candidates=[],round=0}={}){
  const decision=chooseBestGenerationCandidate(candidates);
  const safeRound=Math.max(0,Math.min(Number(round)||0,QUALITY_AUTONOMY_V2_POLICY.maxRepairRounds));
  if(decision.action==='accept')return {...decision,round:safeRound,next:'release_candidate_review'};
  if(safeRound>=QUALITY_AUTONOMY_V2_POLICY.maxRepairRounds)return {...decision,round:safeRound,next:'human_review',reason:'repair_budget_exhausted'};
  return {...decision,round:safeRound,next:decision.action==='replan'?'generate_materially_different_candidate':'self_heal_verified_defects'};
}
