import { getCreativeMediaTask } from './creative-media-control-plane.js';

const freeze=value=>Object.freeze(value);
const SAFE_ID=/^[A-Za-z0-9][A-Za-z0-9:_-]{2,191}$/;
const FORBIDDEN=/^(?:https?:|data:|blob:|file:)/i;

function clean(value){return String(value??'').trim();}
function safeId(value,label){const id=clean(value);if(!id||FORBIDDEN.test(id)||!SAFE_ID.test(id))throw new Error(`${label}_INVALID`);return id;}
function stable(value){
  if(Array.isArray(value)) return `[${value.map(stable).join(',')}]`;
  if(value&&typeof value==='object') return `{${Object.keys(value).sort().map(k=>`${JSON.stringify(k)}:${stable(value[k])}`).join(',')}}`;
  return JSON.stringify(value);
}
function fnv1a(value){let h=0x811c9dc5;for(const ch of String(value)){h^=ch.charCodeAt(0);h=Math.imul(h,0x01000193)>>>0;}return h.toString(16).padStart(8,'0');}

export function buildCreativeMediaExecutionSession({
  ownerScopeId,
  requestId,
  taskId,
  inputAssetIds=[],
  costMode='zero',
  premiumPermission=false,
  dispatchAuthorized=false,
}={}){
  const owner=safeId(ownerScopeId,'MEDIA_EXECUTION_OWNER_SCOPE');
  const request=safeId(requestId,'MEDIA_EXECUTION_REQUEST');
  const task=clean(taskId);
  if(!getCreativeMediaTask(task)) throw new Error(`MEDIA_EXECUTION_TASK_UNAVAILABLE:${task}`);
  const assets=[...new Set((Array.isArray(inputAssetIds)?inputAssetIds:[]).map(v=>safeId(v,'MEDIA_EXECUTION_ASSET')))];
  if(assets.length>24) throw new Error('MEDIA_EXECUTION_ASSET_LIMIT_EXCEEDED');
  const mode=clean(costMode||'zero').toLowerCase();
  if(!['zero','free','standard'].includes(mode)) throw new Error('MEDIA_EXECUTION_COST_MODE_UNSUPPORTED');
  const canDispatch=dispatchAuthorized===true;
  const premiumAllowed=mode==='standard'&&premiumPermission===true&&canDispatch;
  const core={ownerScopeId:owner,requestId:request,taskId:task,inputAssetIds:assets,costMode:mode};
  return freeze({
    sessionId:`mediaexec_${fnv1a(stable(core))}`,
    ...core,
    state:'queued',
    dispatchAuthorized:canDispatch,
    premiumAllowed,
    surprisePaidSpendAllowed:false,
    ownerScopeValidated:false,
    inputSecurityValidated:false,
    providerInvoked:false,
    durableResultCaptured:false,
    productionVerified:false,
  });
}
