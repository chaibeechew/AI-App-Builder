import { getCreativeMediaTask } from '../ai/creative-media-control-plane.js';

const freeze=value=>Object.freeze(value);
const OPAQUE_ID=/^[A-Za-z0-9._:-]{1,180}$/;
const OP_TASK=freeze({
  extend:'video.extend',loop:'video.loop',reframe:'video.reframe',upscale:'video.upscale',
  'object-edit':'video.object-edit','background-replace':'video.background-replace',
  restyle:'video.restyle','video-to-video':'video.video-to-video'
});
const ASPECTS=freeze(['16:9','9:16','1:1','4:5','3:2','2.39:1']);
const RESOLUTIONS=freeze(['720p','1080p','1440p','2160p']);
const FPS=freeze([24,25,30,48,50,60,120]);

function clean(value,max=1000){return String(value||'').replace(/[\u0000-\u001f\u007f]/g,' ').replace(/\s+/g,' ').trim().slice(0,max);}
function number(value,min,max,fallback=null){const n=Number(value);return Number.isFinite(n)?Math.max(min,Math.min(max,n)):fallback;}
function id(value){const raw=typeof value==='string'?value:value?.assetId;const out=clean(raw,180);return OPAQUE_ID.test(out)?out:null;}
function ids(value,max=8){return (Array.isArray(value)?value:[value]).map(id).filter(Boolean).slice(0,max);}
function unique(values){return [...new Set(values.filter(Boolean))];}

export const VIDEO_POST_PRODUCTION_POLICY=freeze({
  maxOperations:12,maxSourceVideos:4,maxMasks:8,maxExtendSeconds:60,maxOutputFps:120,maxUpscale:4,
  rawReferenceUrlsAllowed:false,providerConnected:false,liveProviderVerified:false,realOutputQualityVerified:false
});

export function buildVideoPostProductionPlan({referenceVideos=[],operations=[],output={}}={}){
  const sourceIds=ids(referenceVideos,VIDEO_POST_PRODUCTION_POLICY.maxSourceVideos);
  if(!sourceIds.length)return freeze({ok:false,code:'VIDEO_POST_SOURCE_REQUIRED'});
  const requested=(Array.isArray(operations)?operations:[]).slice(0,VIDEO_POST_PRODUCTION_POLICY.maxOperations);
  if(!requested.length)return freeze({ok:false,code:'VIDEO_POST_OPERATION_REQUIRED'});
  const steps=[];const capabilities=[];const quality=new Set(['temporalConsistency','frameArtifacts','flicker','endingStability']);
  for(let i=0;i<requested.length;i+=1){
    const raw=requested[i]||{};const operation=clean(raw.type,40).toLowerCase();const taskId=OP_TASK[operation];
    const task=getCreativeMediaTask(taskId);
    if(!task)return freeze({ok:false,code:'VIDEO_POST_OPERATION_UNSUPPORTED',operation});
    const maskAssetId=id(raw.mask);const referenceObjectAssetIds=ids(raw.referenceObjects,8);
    const referenceBackgroundAssetIds=ids(raw.referenceBackgrounds,4);
    if(operation==='object-edit'&&!maskAssetId&&!clean(raw.prompt,1000))return freeze({ok:false,code:'VIDEO_POST_OBJECT_EDIT_GUIDANCE_REQUIRED',operation});
    if(operation==='background-replace'&&!referenceBackgroundAssetIds.length&&!clean(raw.prompt,1000))return freeze({ok:false,code:'VIDEO_POST_BACKGROUND_REQUIRED',operation});
    const step=freeze({
      index:i,operation,task:taskId,capability:task.capability,prompt:clean(raw.prompt,2000)||null,
      maskAssetId,referenceObjectAssetIds:freeze(referenceObjectAssetIds),referenceBackgroundAssetIds:freeze(referenceBackgroundAssetIds),
      strength:number(raw.strength,0,100,null),extendSeconds:number(raw.extendSeconds,1,60,null),
      loopSeconds:number(raw.loopSeconds,1,60,null),transitionStrength:number(raw.transitionStrength,0,100,null),
      aspectRatio:ASPECTS.includes(clean(raw.aspectRatio,20))?clean(raw.aspectRatio,20):null,
      safeArea:clean(raw.safeArea,80)||null,subjectTracking:clean(raw.subjectTracking,160)||null,
      scale:number(raw.scale,1,4,null),targetResolution:RESOLUTIONS.includes(clean(raw.targetResolution,20))?clean(raw.targetResolution,20):null,
      frameInterpolation:raw.frameInterpolation===true,fps:FPS.includes(Number(raw.fps))?Number(raw.fps):null,
      denoise:number(raw.denoise,0,100,null),deblur:number(raw.deblur,0,100,null),stabilization:number(raw.stabilization,0,100,null)
    });
    steps.push(step);capabilities.push(task.capability);
    if(step.frameInterpolation)capabilities.push('frame-interpolation');
    if(step.stabilization!=null)capabilities.push('video-stabilization');
    if(operation==='object-edit')quality.add('objectConsistency');
    if(operation==='reframe')quality.add('cameraCoherence');
    if(operation==='loop')quality.add('motionQuality');
  }
  const outAspect=ASPECTS.includes(clean(output?.aspectRatio,20))?clean(output?.aspectRatio,20):null;
  const outResolution=RESOLUTIONS.includes(clean(output?.resolution,20))?clean(output?.resolution,20):null;
  const outFps=FPS.includes(Number(output?.fps))?Number(output?.fps):null;
  return freeze({
    ok:true,schemaVersion:1,sourceVideoAssetIds:freeze(sourceIds),steps:freeze(steps),
    output:freeze({aspectRatio:outAspect,resolution:outResolution,fps:outFps,container:'mp4',durableCaptureRequired:true}),
    requiredCapabilities:freeze(unique(capabilities)),qualitySignals:freeze([...quality]),referencesRequireOwnerValidation:true,
    execution:freeze({idempotencyRequired:true,atomicStepEvidence:true,partialFailure:'fail-closed',preserveOriginal:true}),
    truth:freeze({codeReady:true,providerConnected:false,liveProviderVerified:false,realOutputQualityVerified:false,evidenceRequired:true})
  });
}
