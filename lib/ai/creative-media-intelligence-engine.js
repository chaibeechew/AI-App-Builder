import { getCreativeMediaTask, validateCreativeMediaRequest } from './creative-media-control-plane.js';
import { rankCreativeMediaProviders } from './creative-media-provider-selection.js';
import { buildCreativeMediaRetryDecision, CREATIVE_MEDIA_QUALITY_POLICY } from './creative-media-quality-judge.js';
import { buildCreativeMediaContinuityContract, buildContinuityRepairGuidance } from './creative-media-continuity.js';
import { judgeRealCreativeMediaOutput } from './creative-media-observation-judge.js';
import { buildVideoCinemaPhysicsPlan, assessVideoCinemaPhysicsEvidence } from '../video/cinema-physics-engine.js';

const freeze=value=>Object.freeze(value);
const clean=value=>String(value||'').trim();
const list=value=>Array.isArray(value)?value:[];
const clamp=(value,min,max,fallback)=>{const n=Number(value);return Number.isFinite(n)?Math.max(min,Math.min(max,n)):fallback;};

export const CREATIVE_MEDIA_HARDENING_LAYERS=freeze({
  image:freeze(['live-provider-execution','multi-model-candidate-battle','real-output-judge','auto-repair-regeneration','identity-product-brand-continuity']),
  video:freeze(['live-provider-execution','multi-model-candidate-battle','real-output-judge','auto-repair-regeneration','identity-product-brand-continuity','cinema-physics-intelligence']),
});

export const CREATIVE_MEDIA_INTELLIGENCE_POLICY=freeze({
  maxCandidatesPerRound:3,
  maxRounds:3,
  maxPaidCandidatesPerRound:1,
  requireExplicitPremiumPermission:true,
  failClosedWithoutObservedEvidence:true,
  finalAcceptScore:88,
});

function providerCanMultiply(provider,{allowMultiCandidateSpend=false}={}){
  if(Number(provider?.freeQuotaRemaining||0)>0)return true;
  if(provider?.costClass==='zero'||provider?.costClass==='free')return true;
  return allowMultiCandidateSpend===true;
}
function candidateRank(decision){return decision==='accept'?3:decision==='optimize'?2:decision==='reject'?1:0;}
function numeric(value,fallback=0){const n=Number(value);return Number.isFinite(n)?n:fallback;}
function nextSeed(value,attempt){const base=Number(value);return Number.isInteger(base)?(base+7919*(attempt+1))%2147483647:null;}

export function buildCreativeMediaCandidatePlan({task,input={},providers=[],costMode='zero',premiumAllowed=false,maxCandidates=CREATIVE_MEDIA_INTELLIGENCE_POLICY.maxCandidatesPerRound,allowMultiCandidateSpend=false,likenessConsent=false,preferredProviderId=null}={}){
  const validation=validateCreativeMediaRequest({task,input});
  if(!validation.ok)return freeze({...validation,execution:'blocked',candidates:freeze([]),rejected:freeze([]),reason:validation.code});
  const spec=getCreativeMediaTask(validation.task);
  if(spec?.consent==='likeness'&&likenessConsent!==true)return freeze({...validation,ok:false,execution:'blocked',candidates:freeze([]),rejected:freeze([]),reason:'CREATIVE_MEDIA_LIKENESS_CONSENT_REQUIRED'});
  const ranking=rankCreativeMediaProviders({task:validation.task,providers,costMode,premiumAllowed});
  let eligible=[...ranking.eligible];
  if(preferredProviderId){eligible.sort((a,b)=>(a.id===preferredProviderId?-1:b.id===preferredProviderId?1:0));}
  const requested=Math.max(1,Math.min(CREATIVE_MEDIA_INTELLIGENCE_POLICY.maxCandidatesPerRound,Math.floor(Number(maxCandidates)||1)));
  const selected=[];let paidCount=0;
  for(const provider of eligible){
    const freeLike=providerCanMultiply(provider,{allowMultiCandidateSpend:false});
    if(!freeLike){
      if(paidCount>=CREATIVE_MEDIA_INTELLIGENCE_POLICY.maxPaidCandidatesPerRound)continue;
      if(selected.length>0&&!allowMultiCandidateSpend)continue;
      paidCount+=1;
    }
    selected.push(provider);
    if(selected.length>=requested)break;
  }
  return freeze({
    ...validation,execution:selected.length?'provider-battle':'blocked',candidateMode:selected.length>1?'battle':'single',
    candidates:freeze(selected.map((provider,index)=>freeze({
      index,providerId:provider.id,providerTier:provider.priorityTier,costClass:provider.costClass,freeQuotaRemaining:provider.freeQuotaRemaining,
      liveProviderVerified:provider.liveProviderVerified===true,rankingScore:provider.rankingScore,
    }))),
    rejected:ranking.rejected,selectedProviderId:selected[0]?.id||null,
    rule:'Zero/free candidates may compete within the bounded candidate budget. Metered/premium multiplication is blocked unless explicitly allowed; premium remains separately permission-gated.',
  });
}

export function compareCreativeMediaCandidates({candidates=[]}={}){
  const rows=list(candidates).filter(row=>row&&typeof row==='object').map(row=>{
    const judgement=row.judgement||{};const cinema=row.cinemaAssessment||{};
    const finalScore=Number((numeric(judgement.score)*0.9+(cinema?.ok?numeric(cinema.score)*0.1:0)).toFixed(2));
    return {...row,finalScore,productionEligible:judgement.productionEligible===true&&(cinema?.ok?cinema.productionEligible===true:true)};
  });
  rows.sort((a,b)=>Number(b.productionEligible)-Number(a.productionEligible)||candidateRank(b.judgement?.decision)-candidateRank(a.judgement?.decision)||b.finalScore-a.finalScore||numeric(b.judgement?.continuity?.score)-numeric(a.judgement?.continuity?.score)||numeric(a.latencyMs,1e9)-numeric(b.latencyMs,1e9)||String(a.providerId).localeCompare(String(b.providerId)));
  const best=rows[0]||null;const winner=best?.productionEligible===true&&best?.judgement?.decision==='accept'?best:null;
  return freeze({
    accepted:Boolean(winner),winner:winner?freeze(winner):null,bestCandidate:best?freeze(best):null,
    ranked:freeze(rows.map(row=>freeze(row))),decision:winner?'accept':'no-acceptable-candidate',
    rule:'A candidate can win only after real-output evidence, base quality, continuity and video cinema/physics gates all pass. Highest provider score alone can never win.',
  });
}

export function buildCreativeMediaRepairRecipe({task,input={},judgement={},cinemaAssessment=null,providerCandidates=[],currentProviderId='',costMode='zero',premiumAllowed=false,attempt=0}={}){
  const low=list(judgement?.base?.dimensions).filter(row=>numeric(row?.score)<CREATIVE_MEDIA_QUALITY_POLICY.acceptScore).map(row=>row.id);
  const continuityGuidance=buildContinuityRepairGuidance({assessment:judgement?.continuity});
  const promptHints=[];const negativeHints=[];
  if(low.includes('promptAdherence'))promptHints.push('Make subject, action, composition and must-keep constraints explicit.');
  if(low.some(id=>['anatomy','face','hands'].includes(id))){promptHints.push('Preserve anatomically plausible proportions, face geometry and hands.');negativeHints.push('deformed anatomy, fused fingers, asymmetrical face drift');}
  if(low.includes('textRendering'))promptHints.push('Render only the exact requested visible text with legible spelling and layout.');
  if(low.some(id=>['productConsistency','objectConsistency'].includes(id)))promptHints.push('Preserve exact product silhouette, materials, labels and logo placement.');
  if(low.some(id=>['characterConsistency','faceConsistency'].includes(id)))promptHints.push('Lock the same character identity and facial features across the entire output.');
  if(low.some(id=>['flicker','morphing','temporalConsistency','endingStability'].includes(id))){promptHints.push('Use temporally stable motion and preserve geometry through the final frame.');negativeHints.push('flicker, morphing, geometry drift, unstable ending');}
  if(low.includes('physicsPlausibility')){promptHints.push('Keep gravity, inertia, contact and collision behavior physically plausible.');negativeHints.push('teleportation, impossible collision, object merging');}
  promptHints.push(...list(continuityGuidance.hints));
  if(cinemaAssessment?.ok&&cinemaAssessment.productionEligible!==true)promptHints.push('Preserve camera intent, continuous trajectories, contact stability and end-state continuity between shots.');
  const retry=buildCreativeMediaRetryDecision({assessment:judgement,task,providerCandidates,currentProviderId,costMode,premiumAllowed,attempt,maxAttempts:CREATIVE_MEDIA_INTELLIGENCE_POLICY.maxRounds+1});
  const promptAddendum=[...new Set(promptHints)].slice(0,10).join(' ');
  const negativePromptAddendum=[...new Set(negativeHints)].slice(0,8).join(', ');
  const nextInput={...input};
  if(promptAddendum)nextInput.prompt=`${clean(input.prompt)} ${promptAddendum}`.trim().slice(0,4000);
  if(negativePromptAddendum)nextInput.negativePrompt=[clean(input.negativePrompt),negativePromptAddendum].filter(Boolean).join(', ').slice(0,2000);
  const seed=nextSeed(input.seed,attempt);if(seed!==null)nextInput.seed=seed;
  if(low.includes('referenceFidelity')||continuityGuidance.lowDimensions?.includes('referenceFidelity'))nextInput.strength=clamp(numeric(input.strength,70)+8,0,100,78);
  if(low.some(id=>['motionQuality','physicsPlausibility'].includes(id)))nextInput.motionStrength=clamp(numeric(input.motionStrength,55)-8,0,100,47);
  return freeze({action:retry.action,reason:retry.reason,nextProviderId:retry.nextProviderId||null,nextInput:freeze(nextInput),promptAddendum,negativePromptAddendum,lowDimensions:freeze(low),continuityGuidance});
}

export function prepareCreativeMediaHardenedRun({task,input={},providers=[],costMode='zero',premiumAllowed=false,allowMultiCandidateSpend=false,likenessConsent=false,maxCandidates=3,preferredProviderId=null,context={}}={}){
  const spec=getCreativeMediaTask(task);if(!spec)return freeze({ok:false,task:clean(task).toLowerCase(),reason:'CREATIVE_MEDIA_TASK_UNSUPPORTED'});
  const candidatePlan=buildCreativeMediaCandidatePlan({task,input,providers,costMode,premiumAllowed,allowMultiCandidateSpend,likenessConsent,maxCandidates,preferredProviderId});
  const continuityContract=buildCreativeMediaContinuityContract({task,input,context});
  const cinemaPlan=spec.modality==='video'?buildVideoCinemaPhysicsPlan({input,context}):null;
  return freeze({
    ok:candidatePlan.ok===true&&candidatePlan.candidates.length>0,task:clean(task).toLowerCase(),modality:spec.modality,
    layers:CREATIVE_MEDIA_HARDENING_LAYERS[spec.modality]||freeze([]),candidatePlan,continuityContract,cinemaPlan,
    truth:'CODE_READY',liveEvidenceRequired:true,
  });
}

export async function runCreativeMediaHardenedExecution({
  task,input={},requestId,providers=[],costMode='zero',premiumAllowed=false,allowMultiCandidateSpend=false,likenessConsent=false,
  maxCandidates=3,maxRounds=CREATIVE_MEDIA_INTELLIGENCE_POLICY.maxRounds,context={},executeCandidate,observeCandidate,
}={}){
  if(typeof executeCandidate!=='function'||typeof observeCandidate!=='function')return freeze({ok:false,status:'blocked',code:'CREATIVE_MEDIA_EXECUTION_ADAPTER_REQUIRED',truth:'EVIDENCE_REQUIRED'});
  const stable=clean(requestId);if(!/^[A-Za-z0-9._:-]{1,160}$/.test(stable))return freeze({ok:false,status:'blocked',code:'CREATIVE_MEDIA_REQUEST_ID_INVALID',truth:'CODE_READY'});
  let workingInput={...input};let preferredProviderId=null;const rounds=[];const boundedRounds=Math.max(1,Math.min(CREATIVE_MEDIA_INTELLIGENCE_POLICY.maxRounds,Math.floor(Number(maxRounds)||1)));
  for(let round=0;round<boundedRounds;round+=1){
    const prepared=prepareCreativeMediaHardenedRun({task,input:workingInput,providers,costMode,premiumAllowed,allowMultiCandidateSpend,likenessConsent,maxCandidates,preferredProviderId,context});
    if(!prepared.ok)return freeze({ok:false,status:'blocked',code:prepared.candidatePlan?.reason||'CREATIVE_MEDIA_NO_ELIGIBLE_PROVIDER',prepared,rounds:freeze(rounds),truth:'EVIDENCE_REQUIRED'});
    const settled=await Promise.all(prepared.candidatePlan.candidates.map(async candidate=>{
      const candidateRequestId=`${stable}:r${round+1}:c${candidate.index+1}`.slice(0,160);
      const started=Date.now();
      try{
        const output=await executeCandidate({task,input:workingInput,requestId:candidateRequestId,providerId:candidate.providerId,candidate,round,cinemaPlan:prepared.cinemaPlan,continuityContract:prepared.continuityContract});
        const observed=await observeCandidate({task,input:workingInput,requestId:candidateRequestId,providerId:candidate.providerId,candidate,round,output,cinemaPlan:prepared.cinemaPlan,continuityContract:prepared.continuityContract});
        const judgement=judgeRealCreativeMediaOutput({task,input:workingInput,signals:observed?.signals,artifact:observed?.artifact,evidence:observed?.evidence,continuityObservations:observed?.continuityObservations,context});
        const cinemaAssessment=prepared.cinemaPlan?assessVideoCinemaPhysicsEvidence({plan:prepared.cinemaPlan,observations:observed?.cinemaObservations}):null;
        return freeze({ok:true,providerId:candidate.providerId,requestId:candidateRequestId,output,judgement,cinemaAssessment,latencyMs:Math.max(0,Date.now()-started)});
      }catch(error){return freeze({ok:false,providerId:candidate.providerId,requestId:candidateRequestId,errorCode:clean(error?.code||error?.name||'CREATIVE_MEDIA_CANDIDATE_FAILED').slice(0,120),latencyMs:Math.max(0,Date.now()-started)});}
    }));
    const battle=compareCreativeMediaCandidates({candidates:settled.filter(row=>row.ok)});
    rounds.push(freeze({round:round+1,prepared,candidates:freeze(settled),battle}));
    if(battle.accepted)return freeze({ok:true,status:'completed',task:prepared.task,modality:prepared.modality,winner:battle.winner,rounds:freeze(rounds),truth:'REAL_OUTPUT_QUALITY_VERIFIED'});
    const best=battle.bestCandidate;
    if(!best)break;
    const providerCandidates=prepared.candidatePlan.candidates.map(item=>{
      const source=list(providers).find(provider=>clean(provider?.id||provider?.name)===item.providerId)||{};
      return {...source,id:item.providerId};
    });
    const repair=buildCreativeMediaRepairRecipe({task,input:workingInput,judgement:best.judgement,cinemaAssessment:best.cinemaAssessment,providerCandidates,currentProviderId:best.providerId,costMode,premiumAllowed,attempt:round});
    if(repair.action==='fail-closed'||repair.action==='accept')break;
    workingInput={...repair.nextInput};preferredProviderId=repair.nextProviderId;
  }
  return freeze({ok:false,status:'failed-quality-gate',task:clean(task).toLowerCase(),rounds:freeze(rounds),truth:'EVIDENCE_REQUIRED',rule:'No candidate is released when the measured quality, continuity, safety, provenance or cinema/physics gates do not pass.'});
}
