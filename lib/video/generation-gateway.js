import { assertRuntimeUrlAllowed } from '../soolen/security-policy.js';
import { getSoolenCostMode } from '../soolen/cost-policy.js';
import { getCreativeMediaTask, validateCreativeMediaRequest } from '../ai/creative-media-control-plane.js';

export const VIDEO_GENERATION_LIMITS=Object.freeze({startTimeoutMs:45000,statusTimeoutMs:15000,maxOutputLength:4000,maxJobIdLength:160,maxReferences:8,maxPromptLength:4000});
const JOB_ID=/^[A-Za-z0-9._:-]{1,160}$/;
const REQUEST_ID=/^[A-Za-z0-9._:-]{1,160}$/;
const OPAQUE_ASSET_ID=/^[A-Za-z0-9._:-]{1,180}$/;

export class VideoGenerationGatewayError extends Error{
  constructor(message,code='VIDEO_GENERATION_GATEWAY_ERROR',status=502){super(message);this.name='VideoGenerationGatewayError';this.code=code;this.status=status;}
}
function clean(value,max=2000){return String(value||'').replace(/[\u0000-\u001f\u007f]/g,'').trim().slice(0,max);}
function withTimeout(ms){const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),ms);return{signal:controller.signal,done:()=>clearTimeout(timer)};}
function safeJson(raw){try{return raw?JSON.parse(raw):{};}catch{return{};}}
function costClass(value){const raw=clean(value||'metered',30).toLowerCase();return['zero','free','low','metered','premium'].includes(raw)?raw:'metered';}
function allowedCost(value,mode){if(mode==='paid'||mode==='balanced')return value!=='premium'||String(process.env.VIDEO_GENERATION_PREMIUM_ALLOWED||'').toLowerCase()==='true';if(mode==='free')return value==='zero'||value==='free';return value==='zero';}
function checkedEndpoint(value,code){try{return assertRuntimeUrlAllowed(clean(value,2000));}catch(error){throw new VideoGenerationGatewayError('The configured video generation runtime is not allowed.',code,error?.status||500);}}
function capabilitySet(){return new Set(String(process.env.VIDEO_GENERATION_CAPABILITIES||'').split(',').map(v=>clean(v,100).toLowerCase()).filter(Boolean));}
function outputHostAllowlist(){const allow=new Set(String(process.env.VIDEO_GENERATION_OUTPUT_HOST_ALLOWLIST||'').split(',').map(v=>v.trim().toLowerCase()).filter(Boolean));for(const raw of [process.env.VIDEO_GENERATION_ENDPOINT,process.env.VIDEO_GENERATION_STATUS_ENDPOINT]){try{const url=new URL(String(raw||'').replace('{jobId}','job'));if(url.protocol==='https:')allow.add(url.hostname.toLowerCase());}catch{}}return allow;}
function normalizeOutput(value){const raw=clean(value,VIDEO_GENERATION_LIMITS.maxOutputLength);if(!raw)return null;let url;try{url=new URL(raw);}catch{return null;}if(url.protocol!=='https:'||url.username||url.password||!outputHostAllowlist().has(url.hostname.toLowerCase()))return null;return url.toString();}
function normalizeStatus(value,fallback='queued'){const raw=clean(value,40).toLowerCase();if(['ready','complete','completed','succeeded','success','done'].includes(raw))return'completed';if(['running','processing','rendering','generating','in_progress','in-progress'].includes(raw))return'running';if(['error','errored','failed','cancelled','canceled'].includes(raw))return'failed';if(['pending','accepted','queued'].includes(raw))return'queued';return fallback;}
function safeAssetIds(value){return (Array.isArray(value)?value:[]).map(v=>typeof v==='string'?v:v?.assetId).map(v=>clean(v,180)).filter(v=>OPAQUE_ASSET_ID.test(v)).slice(0,VIDEO_GENERATION_LIMITS.maxReferences);}
function safeNumber(value,min,max){const n=Number(value);return Number.isFinite(n)?Math.max(min,Math.min(max,n)):null;}

export function getVideoGenerationConfig(){
  const provider=clean(process.env.VIDEO_GENERATION_PROVIDER||'',80);const endpoint=clean(process.env.VIDEO_GENERATION_ENDPOINT||'',2000);const statusEndpoint=clean(process.env.VIDEO_GENERATION_STATUS_ENDPOINT||'',2000);const klass=costClass(process.env.VIDEO_GENERATION_COST_CLASS);const mode=getSoolenCostMode();const connected=Boolean(provider&&endpoint);const capabilities=[...capabilitySet()];const allowed=allowedCost(klass,mode);
  return{provider:provider||'provider-neutral',endpoint:endpoint||null,statusEndpoint:statusEndpoint||null,costClass:klass,costMode:mode,connected,configured:connected&&allowed,blockedByCostPolicy:connected&&!allowed,capabilities};
}

export function buildVideoGenerationPayload({task,input={},requestId}={}){
  const validation=validateCreativeMediaRequest({task,input});if(!validation.ok)throw new VideoGenerationGatewayError('Video generation request is incomplete.',validation.code||'VIDEO_GENERATION_INPUT_REQUIRED',400);
  const spec=getCreativeMediaTask(validation.task);if(spec?.modality!=='video')throw new VideoGenerationGatewayError('This task is not a video-generation task.','VIDEO_GENERATION_TASK_INVALID',400);
  const stable=clean(requestId,160);if(!REQUEST_ID.test(stable))throw new VideoGenerationGatewayError('A stable video generation request id is required.','VIDEO_GENERATION_REQUEST_ID_INVALID',400);
  return{
    schemaVersion:1,requestId:stable,idempotencyKey:stable,task:validation.task,capability:spec.capability,
    input:{
      prompt:clean(input.prompt,VIDEO_GENERATION_LIMITS.maxPromptLength),negativePrompt:clean(input.negativePrompt,2000)||null,
      referenceImageAssetIds:safeAssetIds(input.referenceImages),referenceVideoAssetIds:safeAssetIds(input.referenceVideos),
      firstFrameAssetId:safeAssetIds([input.firstFrame])[0]||null,lastFrameAssetId:safeAssetIds([input.lastFrame])[0]||null,
      audioAssetId:safeAssetIds([input.audio])[0]||null,styleReferenceAssetId:safeAssetIds([input.styleReference])[0]||null,
      durationSeconds:safeNumber(input.durationSeconds,1,180),extendSeconds:safeNumber(input.extendSeconds,1,60),
      aspectRatio:clean(input.aspectRatio,20)||null,resolution:clean(input.resolution,30)||null,fps:safeNumber(input.fps,1,120),
      camera:clean(input.camera,200)||null,motion:clean(input.motion,300)||null,motionStrength:safeNumber(input.motionStrength,0,100),
      seed:Number.isInteger(Number(input.seed))?Number(input.seed):null,continuity:clean(input.continuity,300)||null,
      identityId:clean(input.identityId,160)||null,productId:clean(input.productId,160)||null,language:clean(input.language,40)||null,
    },
    output:{container:'mp4',durableCaptureRequired:true,qualityEvidenceRequired:true}
  };
}

function headers(requestId=''){const value={'Content-Type':'application/json',Accept:'application/json'};const token=clean(process.env.VIDEO_GENERATION_TOKEN||'',4000);if(token)value.Authorization=`Bearer ${token}`;if(REQUEST_ID.test(clean(requestId,160)))value['Idempotency-Key']=clean(requestId,160);return value;}

export async function startVideoGeneration({task,input={},requestId}={}){
  const config=getVideoGenerationConfig();if(config.blockedByCostPolicy)throw new VideoGenerationGatewayError('Connected video generation is blocked by the active cost policy.','VIDEO_GENERATION_COST_POLICY_BLOCKED',403);if(!config.configured)return{configured:false,started:false,status:'draft',jobId:null,outputPath:null,provider:null};
  const payload=buildVideoGenerationPayload({task,input,requestId});if(!capabilitySet().has(payload.capability))throw new VideoGenerationGatewayError('The connected video provider does not advertise this capability.','VIDEO_GENERATION_CAPABILITY_UNAVAILABLE',422);
  const endpoint=checkedEndpoint(config.endpoint,'VIDEO_GENERATION_ENDPOINT_INVALID');const timeout=withTimeout(VIDEO_GENERATION_LIMITS.startTimeoutMs);let response;
  try{response=await fetch(endpoint,{method:'POST',headers:headers(payload.requestId),body:JSON.stringify(payload),cache:'no-store',redirect:'error',signal:timeout.signal});}catch(error){if(error?.name==='AbortError')throw new VideoGenerationGatewayError('The connected video provider timed out.','VIDEO_GENERATION_TIMEOUT',504);throw new VideoGenerationGatewayError('The connected video provider is unavailable.','VIDEO_GENERATION_UNREACHABLE',503);}finally{timeout.done();}
  const data=safeJson(await response.text());if(!response.ok)throw new VideoGenerationGatewayError('The connected video provider rejected the request.',clean(data?.code,100)||'VIDEO_GENERATION_REJECTED',response.status>=400&&response.status<600?response.status:502);
  const outputPath=normalizeOutput(data?.outputUrl||data?.videoUrl||data?.url);const rawJob=clean(data?.jobId||data?.id||data?.generationId,VIDEO_GENERATION_LIMITS.maxJobIdLength);const jobId=JOB_ID.test(rawJob)?rawJob:null;let status=normalizeStatus(data?.status,outputPath?'completed':'queued');if(outputPath)status='completed';if(!jobId&&!outputPath)throw new VideoGenerationGatewayError('The connected video provider returned no usable job or approved output.','VIDEO_GENERATION_INVALID_RESPONSE',502);
  return{configured:true,started:true,status,jobId,outputPath,provider:config.provider,capability:payload.capability,liveEvidence:false};
}

export async function checkVideoGenerationStatus({jobId}={}){
  const config=getVideoGenerationConfig();if(!config.configured||!config.statusEndpoint)return{checked:false,status:null,outputPath:null,jobId,provider:config.provider};const raw=clean(jobId,160);if(!JOB_ID.test(raw))throw new VideoGenerationGatewayError('Video generation job id is invalid.','VIDEO_GENERATION_JOB_ID_INVALID',400);
  const url=checkedEndpoint(String(config.statusEndpoint).includes('{jobId}')?String(config.statusEndpoint).replaceAll('{jobId}',encodeURIComponent(raw)):`${config.statusEndpoint}${String(config.statusEndpoint).includes('?')?'&':'?'}jobId=${encodeURIComponent(raw)}`,'VIDEO_GENERATION_STATUS_ENDPOINT_INVALID');const timeout=withTimeout(VIDEO_GENERATION_LIMITS.statusTimeoutMs);let response;
  try{response=await fetch(url,{method:'GET',headers:headers(),cache:'no-store',redirect:'error',signal:timeout.signal});}catch(error){if(error?.name==='AbortError')throw new VideoGenerationGatewayError('Video generation status check timed out.','VIDEO_GENERATION_STATUS_TIMEOUT',504);throw new VideoGenerationGatewayError('Video generation status service is unavailable.','VIDEO_GENERATION_STATUS_UNREACHABLE',503);}finally{timeout.done();}
  const data=safeJson(await response.text());if(!response.ok)throw new VideoGenerationGatewayError('Unable to check the connected video generation job.',clean(data?.code,100)||'VIDEO_GENERATION_STATUS_ERROR',response.status>=400&&response.status<600?response.status:502);const outputPath=normalizeOutput(data?.outputUrl||data?.videoUrl||data?.url);return{checked:true,status:normalizeStatus(data?.status,outputPath?'completed':'running'),outputPath,jobId:raw,provider:config.provider,liveEvidence:false};
}
