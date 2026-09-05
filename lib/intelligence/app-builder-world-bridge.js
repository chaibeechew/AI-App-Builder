import crypto from 'node:crypto';
import { createWorldState,applyWorldEvent } from '../reality/world-state.js';
import { createRealityContext } from './reality-context.js';
import { createWorldEventLog,appendWorldEvent,verifyWorldEventLog } from './world-event-log.js';
import { createEvidenceLedger,appendEvidence,verifyEvidenceLedger } from './evidence-ledger.js';
import { assessActionAuthority } from './action-authority.js';
import { UNIFIED_TRUTH_LEVELS } from './unified-intelligence-contract.js';

const freeze=value=>Object.freeze(value);
const clone=value=>JSON.parse(JSON.stringify(value));
const clean=(value,max=240)=>String(value??'').replace(/[\u0000-\u001f\u007f]/g,'').trim().slice(0,max);
const REQUEST_ID=/^[A-Za-z0-9._:-]{1,160}$/;
const SHA=/^[a-f0-9]{64}$/;
const MAX_ENVELOPE_BYTES=240*1024;

function canonical(value){if(Array.isArray(value))return value.map(canonical);if(value&&typeof value==='object')return Object.fromEntries(Object.keys(value).sort().map(key=>[key,canonical(value[key])]));return value;}
function digest(value){return crypto.createHash('sha256').update(typeof value==='string'?value:JSON.stringify(canonical(value))).digest('hex');}
function stableRequestId(value){const id=clean(value,160);if(!REQUEST_ID.test(id))throw new Error('APP_BUILDER_WORLD_REQUEST_ID_INVALID');return id;}
function positiveInt(value,fallback=1){const n=Math.floor(Number(value));return Number.isFinite(n)&&n>0?n:fallback;}
function verificationSnapshot(input={}){
  return freeze({
    selfTestPassed:input.selfTestPassed===true,
    selfHealPassed:input.selfHealPassed===true,
    executionPassed:input.executionPassed===true,
    executionRequired:input.executionRequired===true,
    qualityAccepted:input.qualityAccepted===true,
    qualityScore:Number.isFinite(Number(input.qualityScore))?Math.max(0,Math.min(100,Number(input.qualityScore))):null,
    releaseReady:input.releaseReady===true,
  });
}
function assertVerification(snapshot){
  if(!snapshot.selfTestPassed)throw new Error('APP_BUILDER_WORLD_SELF_TEST_REQUIRED');
  if(!snapshot.selfHealPassed)throw new Error('APP_BUILDER_WORLD_SELF_HEAL_REQUIRED');
  if(!snapshot.qualityAccepted)throw new Error('APP_BUILDER_WORLD_QUALITY_ACCEPTANCE_REQUIRED');
  if(snapshot.executionRequired&&!snapshot.executionPassed)throw new Error('APP_BUILDER_WORLD_EXECUTION_VERIFICATION_REQUIRED');
}
function appEntity({artifactHash,appVersionNo,verification}){
  return {
    id:'app-root',kind:'application',label:'LANERIQ App + Website',
    attributes:{artifactHash,appVersionNo:positiveInt(appVersionNo),verification:{...verification}},revision:1,
  };
}
function envelopeCore({identity,context,worldState,eventLog,evidenceLedger,currentArtifactHash,appVersionNo,baselineImported=false}){
  return freeze({
    schemaVersion:1,bridgeVersion:'laneriq-app-builder-world-v1',identity:freeze({...identity}),context,
    worldState,eventLog,evidenceLedger,currentArtifactHash,appVersionNo:positiveInt(appVersionNo),
    baselineImported:baselineImported===true,privacyScope:'project',providerIndependentIdentity:true,
    truth:UNIFIED_TRUTH_LEVELS.OBSERVED_VERIFIED,
  });
}

export function hashAppBuilderArtifact(specification={}){
  if(!specification||typeof specification!=='object'||Array.isArray(specification))throw new Error('APP_BUILDER_WORLD_SPECIFICATION_INVALID');
  return digest(specification);
}

export function deriveAppBuilderRealityIdentity(identitySeed){
  const requestId=stableRequestId(identitySeed);const requestHash=digest(requestId);
  return freeze({
    requestHash,
    projectId:`app-project:${requestHash.slice(0,32)}`,
    worldId:`app-world:${requestHash.slice(0,32)}`,
    branchId:'main',
  });
}

export function bootstrapAppBuilderRealityEnvelope({identitySeed,specification,appVersionNo=1,verification={}}={}){
  const identity=deriveAppBuilderRealityIdentity(identitySeed);const snapshot=verificationSnapshot(verification);assertVerification(snapshot);
  const artifactHash=hashAppBuilderArtifact(specification);const versionNo=positiveInt(appVersionNo);
  const context=createRealityContext({worldId:identity.worldId,projectId:identity.projectId,worldVersion:1,branchId:identity.branchId});
  const worldState=createWorldState({
    worldId:identity.worldId,projectId:identity.projectId,
    entities:[appEntity({artifactHash,appVersionNo:versionNo,verification:snapshot})],
    metadata:{domain:'app-builder',artifactHash,appVersionNo:versionNo,requestHash:identity.requestHash,providerIndependentIdentity:true},
  });
  const eventLog=createWorldEventLog({context});
  let evidenceLedger=createEvidenceLedger({worldId:identity.worldId,projectId:identity.projectId});
  const evidenceId=`app-evidence:${identity.requestHash.slice(0,24)}:v${versionNo}`;
  evidenceLedger=appendEvidence(evidenceLedger,{
    evidenceId,claimId:`app-version:${versionNo}`,type:'deterministic-app-builder-verification',level:'OBSERVED',
    artifactHash,observerId:'laneriq-app-builder-deterministic-verifier',sourceId:'app-builder',
    metadata:{appVersionNo:versionNo,selfTestPassed:snapshot.selfTestPassed,selfHealPassed:snapshot.selfHealPassed,executionPassed:snapshot.executionPassed,qualityAccepted:snapshot.qualityAccepted,qualityScore:snapshot.qualityScore},
  });
  const authority=assessActionAuthority({action:{external:false,irreversible:false,effects:['project-world-bootstrap'],reason:'accepted-initial-app-builder-version'},authorization:{scope:'app-builder.project-world-update'}});
  if(!authority.allowed)throw new Error(`APP_BUILDER_WORLD_AUTHORITY_BLOCKED:${authority.blockers.join(',')}`);
  const result=envelopeCore({identity,context,worldState,eventLog,evidenceLedger,currentArtifactHash:artifactHash,appVersionNo:versionNo});
  const verified=verifyAppBuilderRealityEnvelope(result);if(!verified.ok)throw new Error(`APP_BUILDER_WORLD_BOOTSTRAP_INVALID:${verified.reason}`);
  return result;
}

export function parseAppBuilderRealityEnvelope(value){
  if(!value)return null;let parsed=value;
  if(typeof value==='string'){if(Buffer.byteLength(value,'utf8')>MAX_ENVELOPE_BYTES)throw new Error('APP_BUILDER_WORLD_ENVELOPE_TOO_LARGE');try{parsed=JSON.parse(value)}catch{throw new Error('APP_BUILDER_WORLD_ENVELOPE_INVALID_JSON');}}
  if(!parsed||typeof parsed!=='object'||Array.isArray(parsed))throw new Error('APP_BUILDER_WORLD_ENVELOPE_INVALID');
  return clone(parsed);
}

export function verifyAppBuilderRealityEnvelope(input){
  let envelope;try{envelope=parseAppBuilderRealityEnvelope(input)}catch(error){return freeze({ok:false,reason:error.message});}
  if(!envelope?.identity?.worldId||!envelope?.identity?.projectId||!envelope?.worldState||!envelope?.eventLog||!envelope?.evidenceLedger)return freeze({ok:false,reason:'missing-core-state'});
  if(envelope.identity.worldId!==envelope.worldState.worldId||envelope.identity.projectId!==envelope.worldState.projectId)return freeze({ok:false,reason:'world-identity-mismatch'});
  if(envelope.eventLog.worldId!==envelope.worldState.worldId||envelope.eventLog.projectId!==envelope.worldState.projectId)return freeze({ok:false,reason:'event-log-context-mismatch'});
  if(envelope.evidenceLedger.worldId!==envelope.worldState.worldId||envelope.evidenceLedger.projectId!==envelope.worldState.projectId)return freeze({ok:false,reason:'evidence-context-mismatch'});
  const eventCheck=verifyWorldEventLog(envelope.eventLog);if(!eventCheck.ok)return freeze({ok:false,reason:`event-log:${eventCheck.reason}`});
  const evidenceCheck=verifyEvidenceLedger(envelope.evidenceLedger);if(!evidenceCheck.ok)return freeze({ok:false,reason:`evidence-ledger:${evidenceCheck.reason}`});
  if(eventCheck.headVersion!==envelope.worldState.version)return freeze({ok:false,reason:'world-event-version-divergence'});
  const artifactHash=clean(envelope.currentArtifactHash,64).toLowerCase();if(!SHA.test(artifactHash))return freeze({ok:false,reason:'artifact-hash-invalid'});
  const appRoot=(envelope.worldState.entities||[]).find(row=>row.id==='app-root');if(!appRoot||appRoot.attributes?.artifactHash!==artifactHash)return freeze({ok:false,reason:'app-root-artifact-mismatch'});
  if(positiveInt(appRoot.attributes?.appVersionNo)!==positiveInt(envelope.appVersionNo))return freeze({ok:false,reason:'app-version-mismatch'});
  if(!(envelope.evidenceLedger.entries||[]).some(row=>row.artifactHash===artifactHash))return freeze({ok:false,reason:'current-artifact-evidence-missing'});
  return freeze({ok:true,worldId:envelope.worldState.worldId,projectId:envelope.worldState.projectId,worldVersion:envelope.worldState.version,appVersionNo:positiveInt(envelope.appVersionNo),artifactHash,eventCount:eventCheck.eventCount,evidenceCount:evidenceCheck.entryCount});
}

export function advanceAppBuilderRealityEnvelope({
  existingEnvelope,legacyIdentitySeed,baseSpecification,nextSpecification,baseAppVersionNo,nextAppVersionNo,requestId,verification={}
}={}){
  const stableId=stableRequestId(requestId);const baseHash=hashAppBuilderArtifact(baseSpecification);const nextHash=hashAppBuilderArtifact(nextSpecification);
  const baseVersion=positiveInt(baseAppVersionNo);const nextVersion=positiveInt(nextAppVersionNo,baseVersion+1);
  if(nextVersion!==baseVersion+1)throw new Error('APP_BUILDER_WORLD_APP_VERSION_SEQUENCE_INVALID');
  const snapshot=verificationSnapshot(verification);assertVerification(snapshot);
  let envelope=parseAppBuilderRealityEnvelope(existingEnvelope);
  let baselineImported=false;
  if(!envelope){
    envelope=bootstrapAppBuilderRealityEnvelope({identitySeed:stableRequestId(legacyIdentitySeed||stableId),specification:baseSpecification,appVersionNo:baseVersion,verification:{...snapshot,executionRequired:false,executionPassed:true}});
    baselineImported=true;
  }else{
    const verified=verifyAppBuilderRealityEnvelope(envelope);if(!verified.ok)throw new Error(`APP_BUILDER_WORLD_EXISTING_ENVELOPE_INVALID:${verified.reason}`);
    if(envelope.currentArtifactHash!==baseHash||positiveInt(envelope.appVersionNo)!==baseVersion)throw new Error('APP_BUILDER_WORLD_BASE_MISMATCH');
  }
  let evidenceLedger=envelope.evidenceLedger;
  const requestHash=digest(stableId),evidenceId=`app-evidence:${requestHash.slice(0,24)}:v${nextVersion}`;
  evidenceLedger=appendEvidence(evidenceLedger,{
    evidenceId,claimId:`app-version:${nextVersion}`,type:'deterministic-app-builder-verification',level:'OBSERVED',artifactHash:nextHash,
    observerId:'laneriq-app-builder-deterministic-verifier',sourceId:'app-builder-modify',
    metadata:{appVersionNo:nextVersion,selfTestPassed:snapshot.selfTestPassed,selfHealPassed:snapshot.selfHealPassed,executionPassed:snapshot.executionPassed,qualityAccepted:snapshot.qualityAccepted,qualityScore:snapshot.qualityScore,releaseReady:snapshot.releaseReady},
  });
  const authority=assessActionAuthority({action:{external:false,irreversible:false,effects:['project-world-update'],reason:'accepted-app-builder-modification'},authorization:{scope:'app-builder.project-world-update'}});
  if(!authority.allowed)throw new Error(`APP_BUILDER_WORLD_AUTHORITY_BLOCKED:${authority.blockers.join(',')}`);
  const entity=appEntity({artifactHash:nextHash,appVersionNo:nextVersion,verification:snapshot});
  const eventId=`app-change:${requestHash.slice(0,28)}`;
  const logEvent={eventId,type:'entity.upsert',expectedVersion:envelope.worldState.version,actorType:'app-builder',reason:'accepted verified app modification',reversible:true,evidenceRefs:[evidenceId],patch:{entity}};
  const eventLog=appendWorldEvent(envelope.eventLog,logEvent);
  const worldState=applyWorldEvent(envelope.worldState,{eventId,type:'entity.upsert',entity,actorType:'app-builder',reason:'accepted verified app modification'});
  if(eventLog.headVersion!==worldState.version)throw new Error('APP_BUILDER_WORLD_EVENT_VERSION_DIVERGENCE');
  const context=createRealityContext({worldId:envelope.identity.worldId,projectId:envelope.identity.projectId,worldVersion:worldState.version,branchId:envelope.identity.branchId||'main'});
  const nextEnvelope=envelopeCore({identity:envelope.identity,context,worldState,eventLog,evidenceLedger,currentArtifactHash:nextHash,appVersionNo:nextVersion,baselineImported:baselineImported||envelope.baselineImported===true});
  const verified=verifyAppBuilderRealityEnvelope(nextEnvelope);if(!verified.ok)throw new Error(`APP_BUILDER_WORLD_ADVANCE_INVALID:${verified.reason}`);
  return nextEnvelope;
}

export function serializeAppBuilderRealityEnvelope(envelope){
  const verified=verifyAppBuilderRealityEnvelope(envelope);if(!verified.ok)throw new Error(`APP_BUILDER_WORLD_ENVELOPE_INVALID:${verified.reason}`);
  const json=JSON.stringify(envelope);if(Buffer.byteLength(json,'utf8')>MAX_ENVELOPE_BYTES)throw new Error('APP_BUILDER_WORLD_ENVELOPE_TOO_LARGE');return json;
}

export function summarizeAppBuilderRealityEnvelope(value){
  if(!value)return freeze({available:false,truth:UNIFIED_TRUTH_LEVELS.EVIDENCE_REQUIRED});
  const verified=verifyAppBuilderRealityEnvelope(value);if(!verified.ok)return freeze({available:true,valid:false,truth:UNIFIED_TRUTH_LEVELS.EVIDENCE_REQUIRED,reason:verified.reason});
  const envelope=parseAppBuilderRealityEnvelope(value);
  return freeze({available:true,valid:true,worldId:verified.worldId,projectId:verified.projectId,worldVersion:verified.worldVersion,appVersionNo:verified.appVersionNo,artifactHash:verified.artifactHash,eventCount:verified.eventCount,evidenceCount:verified.evidenceCount,baselineImported:envelope.baselineImported===true,providerIndependentIdentity:true,truth:UNIFIED_TRUTH_LEVELS.OBSERVED_VERIFIED});
}
