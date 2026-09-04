import { assertRuntimeUrlAllowed } from '../soolen/security-policy.js';
import { getImageGenerationConfig, ImageGenerationGatewayError, IMAGE_GENERATION_LIMITS, normalizeGeneratedImageValue } from './image-generation-gateway.js';
import { getCreativeMediaTask, validateCreativeMediaRequest } from './creative-media-control-plane.js';

const REQUEST_ID=/^[A-Za-z0-9._:-]{1,160}$/;
const OPAQUE_ASSET_ID=/^[A-Za-z0-9._:-]{1,180}$/;
const MAX_REFERENCES=12;
function clean(value,max=2000){return String(value||'').replace(/[\u0000-\u001f\u007f]/g,'').trim().slice(0,max);}
function safeJson(raw){try{return raw?JSON.parse(raw):{};}catch{return{};}}
function withTimeout(ms){const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),ms);return{signal:controller.signal,done:()=>clearTimeout(timer)};}
function capabilitySet(){return new Set(String(process.env.IMAGE_GENERATION_CAPABILITIES||'').split(',').map(v=>clean(v,100).toLowerCase()).filter(Boolean));}
function safeAssetIds(value){return (Array.isArray(value)?value:[]).map(v=>typeof v==='string'?v:v?.assetId).map(v=>clean(v,180)).filter(v=>OPAQUE_ASSET_ID.test(v)).slice(0,MAX_REFERENCES);}
function safeNumber(value,min,max){const n=Number(value);return Number.isFinite(n)?Math.max(min,Math.min(max,n)):null;}
function checkedEndpoint(value){try{return assertRuntimeUrlAllowed(clean(value,2000));}catch(error){throw new ImageGenerationGatewayError('The configured image runtime is not allowed.','IMAGE_GENERATION_ENDPOINT_INVALID',error?.status||500);}}

export function getCreativeImageGenerationConfig(){const base=getImageGenerationConfig();return{...base,capabilities:[...capabilitySet()]};}

export function buildCreativeImagePayload({task,input={},requestId}={}){
  const validation=validateCreativeMediaRequest({task,input});if(!validation.ok)throw new ImageGenerationGatewayError('Creative image request is incomplete.',validation.code||'CREATIVE_IMAGE_INPUT_REQUIRED',400);const spec=getCreativeMediaTask(validation.task);if(spec?.modality!=='image')throw new ImageGenerationGatewayError('This task is not an image task.','CREATIVE_IMAGE_TASK_INVALID',400);
  const stable=clean(requestId,160);if(!REQUEST_ID.test(stable))throw new ImageGenerationGatewayError('A stable image request id is required.','CREATIVE_IMAGE_REQUEST_ID_INVALID',400);
  const seed=Number(input.seed);const count=Math.min(IMAGE_GENERATION_LIMITS.maxCount,Math.max(1,Number(input.count)||1));
  return{
    schemaVersion:2,requestId:stable,idempotencyKey:stable,task:validation.task,capability:spec.capability,
    input:{
      prompt:clean(input.prompt,4000),negativePrompt:clean(input.negativePrompt,2000)||null,
      referenceImageAssetIds:safeAssetIds(input.referenceImages),referenceObjectAssetIds:safeAssetIds(input.referenceObjects),referenceBackgroundAssetIds:safeAssetIds(input.referenceBackgrounds),
      maskAssetId:safeAssetIds([input.mask])[0]||null,styleReferenceAssetId:safeAssetIds([input.styleReference])[0]||null,poseReferenceAssetId:safeAssetIds([input.poseReference])[0]||null,compositionReferenceAssetId:safeAssetIds([input.compositionReference])[0]||null,lightingReferenceAssetId:safeAssetIds([input.lightingReference])[0]||null,
      identityId:clean(input.identityId,160)||null,productId:clean(input.productId,160)||null,brandKitId:clean(input.brandKitId,160)||null,
      style:clean(input.style,100)||null,palette:clean(input.palette,100)||null,aspectRatio:clean(input.aspectRatio,20)||null,resolution:clean(input.resolution,30)||null,
      width:safeNumber(input.width,64,IMAGE_GENERATION_LIMITS.maxDimension),height:safeNumber(input.height,64,IMAGE_GENERATION_LIMITS.maxDimension),strength:safeNumber(input.strength,0,100),scale:safeNumber(input.scale,1,8),
      seed:Number.isInteger(seed)?seed:null,count,transparent:input.transparent===true,canvas:input.canvas&&typeof input.canvas==='object'?input.canvas:null,expand:input.expand&&typeof input.expand==='object'?input.expand:null,
      controls:{denoise:input.denoise===true,deblur:input.deblur===true,faceEnhance:input.faceEnhance===true,edgeRefine:input.edgeRefine===true,relight:input.relight===true}
    },
    output:{formats:input.transparent===true?['png']:['png','webp'],durableCaptureRequired:true,qualityEvidenceRequired:true,provenanceRequired:true}
  };
}

export async function generateCreativeImage({task,input={},requestId}={}){
  const config=getCreativeImageGenerationConfig();if(config.blockedByCostPolicy)throw new ImageGenerationGatewayError('Connected image generation is blocked by the active cost policy.','IMAGE_GENERATION_COST_POLICY_BLOCKED',403);if(!config.configured)return{configured:false,generated:false,provider:null,images:[],capability:null,liveEvidence:false};
  const payload=buildCreativeImagePayload({task,input,requestId});if(!capabilitySet().has(payload.capability))throw new ImageGenerationGatewayError('The connected image provider does not advertise this capability.','IMAGE_GENERATION_CAPABILITY_UNAVAILABLE',422);
  const endpoint=checkedEndpoint(config.endpoint);const headers={'Content-Type':'application/json',Accept:'application/json','Idempotency-Key':payload.requestId};const token=clean(process.env.IMAGE_GENERATION_TOKEN||'',4000);if(token)headers.Authorization=`Bearer ${token}`;const timeout=withTimeout(IMAGE_GENERATION_LIMITS.timeoutMs);let response;
  try{response=await fetch(endpoint,{method:'POST',headers,body:JSON.stringify(payload),cache:'no-store',redirect:'error',signal:timeout.signal});}catch(error){if(error?.name==='AbortError')throw new ImageGenerationGatewayError('The connected image runtime timed out.','IMAGE_GENERATION_TIMEOUT',504);throw new ImageGenerationGatewayError('The connected image runtime is unavailable.','IMAGE_GENERATION_UNREACHABLE',503);}finally{timeout.done();}
  const data=safeJson(await response.text());if(!response.ok)throw new ImageGenerationGatewayError('The connected image runtime rejected the request.',clean(data?.code,100)||'IMAGE_GENERATION_REJECTED',response.status>=400&&response.status<600?response.status:502);
  const candidates=Array.isArray(data?.images)?data.images:Array.isArray(data?.outputs)?data.outputs:[data?.image||data?.url].filter(Boolean);const images=candidates.slice(0,payload.input.count).map((item,index)=>{const image=normalizeGeneratedImageValue(item);if(!image)return null;return{id:clean(item?.id,120)||`creative-${index+1}`,image,width:safeNumber(item?.width,1,IMAGE_GENERATION_LIMITS.maxDimension),height:safeNumber(item?.height,1,IMAGE_GENERATION_LIMITS.maxDimension),providerEvidence:item?.evidence&&typeof item.evidence==='object'?item.evidence:null};}).filter(Boolean);if(!images.length)throw new ImageGenerationGatewayError('The connected image runtime returned no usable approved image output.','IMAGE_GENERATION_INVALID_RESPONSE',502);
  return{configured:true,generated:true,provider:config.provider,capability:payload.capability,images,liveEvidence:false};
}
