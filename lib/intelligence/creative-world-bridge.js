import { buildCreativeMediaContinuityContract } from '../ai/creative-media-continuity.js';
import { assessEvidence } from './evidence-ledger.js';
import { assertRealityContextMatches } from './reality-context.js';
import { UNIFIED_TRUTH_LEVELS } from './unified-intelligence-contract.js';

const freeze=value=>Object.freeze(value);
const clean=(value,max=240)=>String(value??'').replace(/[\u0000-\u001f\u007f]/g,'').trim().slice(0,max);
const clone=value=>JSON.parse(JSON.stringify(value));

function findEntity(worldState,id){return id?(worldState?.entities||[]).find(row=>row.id===id)||null:null;}

export function buildCreativeWorldContext({context,worldState,task,input={}}={}){
  assertRealityContextMatches(context,{worldId:worldState?.worldId,projectId:worldState?.projectId,worldVersion:worldState?.version});
  const character=findEntity(worldState,context.characterId);const asset=findEntity(worldState,context.assetId);const scene=findEntity(worldState,context.sceneId);
  const bridgedInput={...input};
  if(context.characterId&&!bridgedInput.identityId)bridgedInput.identityId=context.characterId;
  if(context.assetId&&!bridgedInput.productId)bridgedInput.productId=context.assetId;
  const continuityContext={
    requiresPeople:Boolean(character)||Boolean(context.characterId),
    requiresProductConsistency:Boolean(asset)||Boolean(context.assetId),
    requiresShotContinuity:Boolean(scene)||Boolean(context.sceneId),
    worldId:context.worldId,worldVersion:context.worldVersion,sceneId:context.sceneId||null,
  };
  const continuityContract=buildCreativeMediaContinuityContract({task,input:bridgedInput,context:continuityContext});
  return freeze({
    context,input:freeze(bridgedInput),continuityContext:freeze(continuityContext),continuityContract,
    anchors:freeze({character:character?freeze(clone(character)):null,asset:asset?freeze(clone(asset)):null,scene:scene?freeze(clone(scene)):null}),
    providerIndependentIdentity:true,truth:UNIFIED_TRUTH_LEVELS.CODE_READY,
    rule:'Canonical world entity IDs remain stable when generation providers change. Providers render the world; they do not own its identity.',
  });
}

export function proposeCreativeWorldUpdate({context,worldState,result,evidenceLedger,evidenceIds=[],eventId,entityId=null,entityKind='asset',attributes={}}={}){
  assertRealityContextMatches(context,{worldId:worldState?.worldId,projectId:worldState?.projectId,worldVersion:worldState?.version});
  const winner=result?.winner;const judgement=winner?.judgement;
  const artifactHash=judgement?.observation?.artifactHash||winner?.artifactHash||null;
  const accepted=result?.ok===true&&result?.status==='completed'&&result?.truth==='REAL_OUTPUT_QUALITY_VERIFIED'&&judgement?.productionEligible===true;
  if(!accepted)return freeze({allowed:false,truth:UNIFIED_TRUTH_LEVELS.EVIDENCE_REQUIRED,blockers:freeze(['creative-output-not-real-output-quality-verified'])});
  const assessed=assessEvidence(evidenceLedger,{evidenceIds,minimumLevel:'SIGNED_OBSERVED',artifactHash});
  if(!assessed.ok)return freeze({allowed:false,truth:UNIFIED_TRUTH_LEVELS.EVIDENCE_REQUIRED,blockers:freeze(['creative-evidence-ledger-requirement-not-met']),evidence:assessed});
  const canonicalId=clean(entityId||context.characterId||context.assetId,160);if(!canonicalId)return freeze({allowed:false,truth:UNIFIED_TRUTH_LEVELS.EVIDENCE_REQUIRED,blockers:freeze(['canonical-world-entity-id-required']),evidence:assessed});
  const previous=findEntity(worldState,canonicalId);const entity={
    id:canonicalId,kind:clean(previous?.kind||entityKind,80)||'asset',label:clean(previous?.label||canonicalId,160)||canonicalId,
    attributes:{...(previous?.attributes||{}),...clone(attributes),lastCreativeArtifactHash:artifactHash,lastCreativeEvidenceIds:[...evidenceIds],lastProviderId:clean(winner?.providerId,160)||null},
    revision:Number(previous?.revision)||1,
  };
  const logEvent=freeze({eventId:clean(eventId,160),expectedVersion:worldState.version,type:'entity.upsert',actorType:'creative-media',reason:'accepted-observed-creative-output',reversible:true,evidenceRefs:freeze([...evidenceIds]),patch:freeze({entity})});
  return freeze({allowed:true,truth:UNIFIED_TRUTH_LEVELS.OBSERVED_VERIFIED,evidence:assessed,worldEvent:freeze({eventId:logEvent.eventId,type:'entity.upsert',entity,reason:logEvent.reason,actorType:logEvent.actorType}),logEvent,canonicalEntityId:canonicalId,providerIndependentIdentity:true});
}
