import { UNIFIED_TRUTH_LEVELS } from './unified-intelligence-contract.js';

const freeze=value=>Object.freeze(value);
const clean=(value,max=160)=>String(value??'').replace(/[\u0000-\u001f\u007f]/g,'').trim().slice(0,max);
const ID=/^[A-Za-z0-9._:-]{1,160}$/;
const FORBIDDEN=/(raw.?prompt|promptText|private|secret|password|token|api.?key|credential|user.?id|email|phone|file.?content|media.?bytes|chat.?content|voice.?sample|image.?data|video.?data)/i;
const clamp=(value,min=0,max=100)=>{const n=Number(value);return Number.isFinite(n)?Math.max(min,Math.min(max,n)):0;};

function assertNoPrivateFields(value,path='root',depth=0){
  if(depth>6)throw new Error('UNIFIED_CAPABILITY_MEMORY_DEPTH_LIMIT');
  if(!value||typeof value!=='object')return;
  for(const [key,item] of Object.entries(value)){if(FORBIDDEN.test(key))throw new Error('UNIFIED_CAPABILITY_MEMORY_PRIVATE_FIELD_FORBIDDEN');if(item&&typeof item==='object')assertNoPrivateFields(item,`${path}.${key}`,depth+1);}
}
function safeId(value,code){const id=clean(value);if(!ID.test(id))throw new Error(code);return id;}
function freezeState(state){return freeze({...state,entries:freeze(Object.fromEntries(Object.entries(state.entries).map(([key,row])=>[key,freeze(row)])))});}

export function createCapabilityMemory(){return freezeState({schemaVersion:1,entries:{},privacyMode:'sanitized-aggregate-only',rawPromptsStored:false,rawMediaStored:false,userIdentityStored:false,truth:UNIFIED_TRUTH_LEVELS.CODE_READY});}

export function recordCapabilityObservation(state,input={}){
  if(!state?.entries)throw new Error('UNIFIED_CAPABILITY_MEMORY_INVALID');assertNoPrivateFields(input);
  const moduleId=safeId(input.moduleId,'UNIFIED_CAPABILITY_MODULE_ID_INVALID');const task=safeId(input.task,'UNIFIED_CAPABILITY_TASK_INVALID');const key=`${moduleId}::${task}`;
  const previous=state.entries[key]||{moduleId,task,sampleCount:0,successCount:0,qualityMean:0,latencyMeanMs:0,verifiedOutputCount:0,lastObservedAt:null};
  const sampleCount=previous.sampleCount+1;const success=input.success===true;const quality=clamp(input.qualityScore);const latency=Math.max(0,Math.min(3_600_000,Number(input.latencyMs)||0));
  const qualityMean=Number((((previous.qualityMean*previous.sampleCount)+quality)/sampleCount).toFixed(3));const latencyMeanMs=Number((((previous.latencyMeanMs*previous.sampleCount)+latency)/sampleCount).toFixed(3));
  const next={...previous,sampleCount,successCount:previous.successCount+(success?1:0),successRate:Number(((previous.successCount+(success?1:0))/sampleCount).toFixed(4)),qualityMean,latencyMeanMs,verifiedOutputCount:previous.verifiedOutputCount+(input.verifiedOutput===true?1:0),lastObservedAt:clean(input.observedAt,40)||new Date().toISOString()};
  return freezeState({...state,entries:{...state.entries,[key]:next}});
}

export function capabilityMemoryScore(state,{moduleId,task,now=Date.now(),maxAgeMs=30*24*60*60*1000}={}){
  const key=`${clean(moduleId)}::${clean(task)}`;const row=state?.entries?.[key];if(!row)return freeze({available:false,score:0,reason:'no-sanitized-history'});
  const age=Number.isFinite(Date.parse(row.lastObservedAt))?Math.max(0,Number(now)-Date.parse(row.lastObservedAt)):Infinity;const fresh=age<=maxAgeMs;
  const confidence=Math.min(1,Math.log10(row.sampleCount+1)/2);const verifiedBoost=row.verifiedOutputCount>0?8:0;const latencyPenalty=Math.min(15,row.latencyMeanMs/2000);const score=fresh?Math.max(0,Math.min(100,Number(((row.qualityMean*.55+row.successRate*100*.35+verifiedBoost-latencyPenalty)*confidence).toFixed(3)))):0;
  return freeze({available:fresh,score,sampleCount:row.sampleCount,successRate:row.successRate,qualityMean:row.qualityMean,verifiedOutputCount:row.verifiedOutputCount,fresh,ageMs:age,reason:fresh?'sanitized-aggregate-history':'stale-history'});
}
