import { applyWorldEvent } from '../reality/world-state.js';
import { buildRealityIntelligencePlan } from '../reality/reality-intelligence-engine.js';
import { prepareCreativeMediaHardenedRun } from '../ai/creative-media-intelligence-engine.js';
import { createRealityContext } from './reality-context.js';
import { appendWorldEvent,verifyWorldEventLog } from './world-event-log.js';
import { buildCreativeWorldContext,proposeCreativeWorldUpdate } from './creative-world-bridge.js';
import { compileExecutableRealityPlan,validateExecutableRealityPlan } from './executable-reality-compiler.js';
import { assessActionAuthority } from './action-authority.js';
import { summarizeUnifiedIntelligenceCore,UNIFIED_TRUTH_LEVELS } from './unified-intelligence-contract.js';

const freeze=value=>Object.freeze(value);
const clean=(value,max=240)=>String(value??'').replace(/[\u0000-\u001f\u007f]/g,'').trim().slice(0,max);
const list=value=>Array.isArray(value)?value:[];

export function planUnifiedIntelligenceTask({
  intent,targets=['world'],constraints={},worldState,
  intelligenceNodes=[],providers=[],costMode='zero',premiumAllowed=false,
  causalModel=null,counterfactual=null,scenarios=null,objectives=null,
  creativeTask=null,creativeInput={},creativeOptions={},
  authorization={},action={},securityAssessment={},claimType='simulation'
}={}){
  if(!worldState?.worldId||!worldState?.projectId)throw new Error('UNIFIED_CORE_WORLD_STATE_REQUIRED');
  const context=createRealityContext({
    worldId:worldState.worldId,worldVersion:worldState.version,projectId:worldState.projectId,
    branchId:constraints?.branchId||'main',characterId:constraints?.characterId,assetId:constraints?.assetId,
    sceneId:constraints?.sceneId,timelineId:constraints?.timelineId,evidenceId:constraints?.evidenceId,
  });
  const executable=compileExecutableRealityPlan({intent,targets,constraints,context,costMode,premiumAllowed});
  const dagValidation=validateExecutableRealityPlan(executable);
  const reality=buildRealityIntelligencePlan({intent,targets,constraints,worldState,intelligenceNodes,costMode,premiumAllowed,causalModel,counterfactual,scenarios,objectives,claimType,evidence:{},authorization,action});
  let creative=null;
  if(creativeTask){
    const bridge=buildCreativeWorldContext({context,worldState,task:creativeTask,input:creativeInput});
    const prepared=prepareCreativeMediaHardenedRun({task:creativeTask,input:bridge.input,providers,costMode,premiumAllowed,allowMultiCandidateSpend:creativeOptions.allowMultiCandidateSpend===true,likenessConsent:creativeOptions.likenessConsent===true,maxCandidates:creativeOptions.maxCandidates||3,preferredProviderId:creativeOptions.preferredProviderId||null,context:bridge.continuityContext});
    creative=freeze({bridge,prepared});
  }
  let authority=null;
  if(constraints?.actionable===true||constraints?.physicalAction===true||action?.external===true){authority=assessActionAuthority({action,authorization,evidence:constraints?.actionEvidence||{},securityAssessment});}
  const blockers=[...list(executable.blockers),...list(reality.blockers)];
  if(!dagValidation.ok)blockers.push(`dag:${dagValidation.reason}`);
  if(creative&&!creative.prepared.ok)blockers.push(creative.prepared.candidatePlan?.reason||creative.prepared.reason||'creative-media-not-dispatchable');
  if(authority&&!authority.allowed)blockers.push(...authority.blockers);
  const unique=[...new Set(blockers)];const canDispatch=unique.length===0&&dagValidation.ok&&reality.canExecute===true&&(!creative||creative.prepared.ok===true)&&(!authority||authority.allowed===true);
  return freeze({
    schemaVersion:1,core:summarizeUnifiedIntelligenceCore(),context,executable,dagValidation,reality,creative,authority,
    blockers:freeze(unique),canDispatch,
    truth:canDispatch?UNIFIED_TRUTH_LEVELS.CODE_READY:UNIFIED_TRUTH_LEVELS.EVIDENCE_REQUIRED,
    next:'Dispatch only through the adapters named by the executable DAG; observed outputs must return through Evidence Ledger and Event Log before world state can advance.',
  });
}

export function admitUnifiedCreativeResult({context,worldState,eventLog,evidenceLedger,result,evidenceIds=[],eventId,entityId=null,entityKind='asset',attributes={}}={}){
  if(!eventLog||eventLog.headVersion!==worldState?.version)throw new Error('UNIFIED_CORE_EVENT_LOG_WORLD_VERSION_MISMATCH');
  const verifiedBefore=verifyWorldEventLog(eventLog);if(!verifiedBefore.ok)throw new Error('UNIFIED_CORE_EVENT_LOG_TAMPERED');
  const proposal=proposeCreativeWorldUpdate({context,worldState,result,evidenceLedger,evidenceIds,eventId,entityId,entityKind,attributes});
  if(!proposal.allowed)return freeze({allowed:false,truth:proposal.truth,proposal,worldState,eventLog});
  const nextLog=appendWorldEvent(eventLog,proposal.logEvent);const nextWorld=applyWorldEvent(worldState,proposal.worldEvent);
  if(nextLog.headVersion!==nextWorld.version)throw new Error('UNIFIED_CORE_WORLD_EVENT_VERSION_DIVERGENCE');
  const verifiedAfter=verifyWorldEventLog(nextLog);if(!verifiedAfter.ok)throw new Error('UNIFIED_CORE_EVENT_LOG_POST_APPEND_INVALID');
  return freeze({allowed:true,truth:UNIFIED_TRUTH_LEVELS.OBSERVED_VERIFIED,proposal,worldState:nextWorld,eventLog:nextLog,canonicalEntityId:proposal.canonicalEntityId,providerIndependentIdentity:true});
}
