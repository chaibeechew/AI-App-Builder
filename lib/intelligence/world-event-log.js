import crypto from 'node:crypto';
import { createRealityContext } from './reality-context.js';
import { UNIFIED_TRUTH_LEVELS } from './unified-intelligence-contract.js';

const freeze=value=>Object.freeze(value);
const clone=value=>JSON.parse(JSON.stringify(value));
const clean=(value,max=240)=>String(value??'').replace(/[\u0000-\u001f\u007f]/g,'').trim().slice(0,max);
const ID=/^[A-Za-z0-9._:-]{1,160}$/;
const SHA=/^[a-f0-9]{64}$/;

function canonical(value){
  if(Array.isArray(value))return value.map(canonical);
  if(value&&typeof value==='object')return Object.fromEntries(Object.keys(value).sort().map(key=>[key,canonical(value[key])]));
  return value;
}
function digest(value){return crypto.createHash('sha256').update(JSON.stringify(canonical(value))).digest('hex');}
function safeId(value,code){const id=clean(value,160);if(!ID.test(id))throw new Error(code);return id;}
function freezeLog(log){return freeze({...log,events:freeze(log.events.map(row=>freeze({...row,evidenceRefs:freeze([...row.evidenceRefs]),patch:freeze(clone(row.patch))})))});}

export function createWorldEventLog({context,genesisHash=null}={}){
  const bound=createRealityContext(context);
  const seed=genesisHash&&SHA.test(clean(genesisHash,64).toLowerCase())?clean(genesisHash,64).toLowerCase():digest({worldId:bound.worldId,projectId:bound.projectId,branchId:bound.branchId,version:bound.worldVersion});
  return freezeLog({
    schemaVersion:1,worldId:bound.worldId,projectId:bound.projectId,branchId:bound.branchId,
    baseVersion:bound.worldVersion,headVersion:bound.worldVersion,genesisHash:seed,headHash:seed,
    events:[],truth:UNIFIED_TRUTH_LEVELS.CODE_READY,appendOnly:true,privacyScope:'project',
  });
}

export function appendWorldEvent(log,event={}){
  if(!log?.worldId||!Array.isArray(log.events)||!SHA.test(String(log.headHash||'')))throw new Error('UNIFIED_EVENT_LOG_INVALID');
  const eventId=safeId(event.eventId,'UNIFIED_EVENT_ID_INVALID');
  if(log.events.some(row=>row.eventId===eventId))throw new Error('UNIFIED_EVENT_REPLAY');
  const expectedVersion=Math.floor(Number(event.expectedVersion));
  if(expectedVersion!==log.headVersion)throw new Error('UNIFIED_EVENT_VERSION_CONFLICT');
  const type=safeId(event.type,'UNIFIED_EVENT_TYPE_INVALID');
  const patch=event.patch&&typeof event.patch==='object'&&!Array.isArray(event.patch)?clone(event.patch):{};
  const evidenceRefs=[...new Set((Array.isArray(event.evidenceRefs)?event.evidenceRefs:[]).map(value=>clean(value,160)).filter(value=>ID.test(value)))].slice(0,64);
  const core={
    eventId,type,worldId:log.worldId,projectId:log.projectId,branchId:log.branchId,
    parentVersion:log.headVersion,version:log.headVersion+1,previousHash:log.headHash,
    actorType:clean(event.actorType||'system',40)||'system',reason:clean(event.reason,240)||null,
    reversible:event.reversible!==false,evidenceRefs,patch,
  };
  const eventHash=digest(core);
  const row={...core,eventHash};
  return freezeLog({...log,headVersion:row.version,headHash:eventHash,events:[...log.events,row]});
}

export function verifyWorldEventLog(log){
  if(!log?.worldId||!Array.isArray(log.events)||!SHA.test(String(log.genesisHash||'')))return freeze({ok:false,reason:'invalid-log'});
  let previous=log.genesisHash;let version=Math.floor(Number(log.baseVersion)||1);
  for(const row of log.events){
    const core={eventId:row.eventId,type:row.type,worldId:row.worldId,projectId:row.projectId,branchId:row.branchId,parentVersion:row.parentVersion,version:row.version,previousHash:row.previousHash,actorType:row.actorType,reason:row.reason??null,reversible:row.reversible!==false,evidenceRefs:[...(row.evidenceRefs||[])],patch:clone(row.patch||{})};
    if(row.worldId!==log.worldId||row.projectId!==log.projectId||row.branchId!==log.branchId)return freeze({ok:false,reason:'context-mismatch',eventId:row.eventId});
    if(row.parentVersion!==version||row.version!==version+1)return freeze({ok:false,reason:'version-chain-invalid',eventId:row.eventId});
    if(row.previousHash!==previous||digest(core)!==row.eventHash)return freeze({ok:false,reason:'hash-chain-invalid',eventId:row.eventId});
    previous=row.eventHash;version=row.version;
  }
  if(previous!==log.headHash||version!==log.headVersion)return freeze({ok:false,reason:'head-mismatch'});
  return freeze({ok:true,eventCount:log.events.length,headVersion:version,headHash:previous});
}

export function replayWorldEventLog({initialState,log,applyEvent}={}){
  const verified=verifyWorldEventLog(log);if(!verified.ok)throw new Error('UNIFIED_EVENT_LOG_TAMPERED');
  if(typeof applyEvent!=='function')throw new Error('UNIFIED_EVENT_APPLIER_REQUIRED');
  let state=initialState;
  for(const row of log.events)state=applyEvent(state,{eventId:row.eventId,type:row.type,...clone(row.patch),reason:row.reason,actorType:row.actorType});
  return state;
}

export function forkWorldEventLog(log,{branchId,fromVersion=log?.headVersion}={}){
  const verified=verifyWorldEventLog(log);if(!verified.ok)throw new Error('UNIFIED_EVENT_LOG_TAMPERED');
  const branch=safeId(branchId,'UNIFIED_EVENT_BRANCH_ID_INVALID');const target=Math.floor(Number(fromVersion));
  if(target<log.baseVersion||target>log.headVersion)throw new Error('UNIFIED_EVENT_FORK_VERSION_INVALID');
  const selected=log.events.filter(row=>row.version<=target);const parentHash=selected.length?selected[selected.length-1].eventHash:log.genesisHash;
  const seed=digest({forkedFromBranch:log.branchId,forkedFromVersion:target,parentHash,worldId:log.worldId,projectId:log.projectId,branchId:branch});
  return freezeLog({schemaVersion:1,worldId:log.worldId,projectId:log.projectId,branchId:branch,baseVersion:target,headVersion:target,genesisHash:seed,headHash:seed,events:[],truth:UNIFIED_TRUTH_LEVELS.CODE_READY,appendOnly:true,privacyScope:'project',forkedFrom:freeze({branchId:log.branchId,version:target,eventHash:parentHash})});
}
