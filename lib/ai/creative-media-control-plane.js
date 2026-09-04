const freeze = value => Object.freeze(value);

export const CREATIVE_MEDIA_TRUTH_LEVELS = freeze({
  CODE_READY: 'CODE_READY',
  CI_READY: 'CI_READY',
  PREVIEW_READY: 'PREVIEW_READY',
  PROVIDER_READY: 'PROVIDER_READY',
  PRODUCTION_LIVE_VERIFIED: 'PRODUCTION_LIVE_VERIFIED',
  EVIDENCE_REQUIRED: 'EVIDENCE_REQUIRED',
});

export const CREATIVE_MEDIA_JOB_STATES = freeze([
  'draft', 'queued', 'running', 'completed', 'failed', 'blocked_by_policy', 'cancelled',
]);

export const CREATIVE_MEDIA_TASKS = freeze({
  'image.generate': freeze({ modality:'image', capability:'text-to-image', required:['prompt'], optional:['negativePrompt','style','seed','width','height','aspectRatio','count'], outputs:['image'], async:false, localFallback:true }),
  'image.image-to-image': freeze({ modality:'image', capability:'image-to-image', required:['prompt','referenceImages'], optional:['strength','style','seed','width','height','aspectRatio'], outputs:['image'], async:false, localFallback:false }),
  'image.inpaint': freeze({ modality:'image', capability:'inpaint', required:['prompt','referenceImages','mask'], optional:['negativePrompt','strength','seed'], outputs:['image'], async:false, localFallback:false }),
  'image.outpaint': freeze({ modality:'image', capability:'outpaint', required:['prompt','referenceImages'], optional:['canvas','seed','style'], outputs:['image'], async:false, localFallback:false }),
  'image.remove-object': freeze({ modality:'image', capability:'object-remove', required:['referenceImages','mask'], optional:['prompt'], outputs:['image'], async:false, localFallback:false }),
  'image.replace-object': freeze({ modality:'image', capability:'object-replace', required:['prompt','referenceImages','mask'], optional:['referenceObjects','strength'], outputs:['image'], async:false, localFallback:false }),
  'image.remove-background': freeze({ modality:'image', capability:'background-remove', required:['referenceImages'], optional:[], outputs:['image','alpha-mask'], async:false, localFallback:false }),
  'image.replace-background': freeze({ modality:'image', capability:'background-replace', required:['prompt','referenceImages'], optional:['referenceBackgrounds','style'], outputs:['image'], async:false, localFallback:false }),
  'image.upscale': freeze({ modality:'image', capability:'image-upscale', required:['referenceImages'], optional:['scale','targetWidth','targetHeight','denoise'], outputs:['image'], async:true, localFallback:false }),
  'image.variation': freeze({ modality:'image', capability:'image-variation', required:['referenceImages'], optional:['prompt','strength','seed','count'], outputs:['image'], async:false, localFallback:false }),
  'image.identity-series': freeze({ modality:'image', capability:'identity-consistency', required:['prompt','referenceImages'], optional:['identityId','styleReference','poseReference','compositionReference','count'], outputs:['image'], async:true, localFallback:false, consent:'likeness' }),
  'image.product-series': freeze({ modality:'image', capability:'product-consistency', required:['prompt','referenceImages'], optional:['productId','styleReference','compositionReference','count'], outputs:['image'], async:true, localFallback:false }),

  'video.generate': freeze({ modality:'video', capability:'text-to-video', required:['prompt'], optional:['negativePrompt','durationSeconds','aspectRatio','camera','motion','seed','audio'], outputs:['video'], async:true, localFallback:false }),
  'video.image-to-video': freeze({ modality:'video', capability:'image-to-video', required:['prompt','referenceImages'], optional:['durationSeconds','aspectRatio','camera','motion','seed','audio'], outputs:['video'], async:true, localFallback:false }),
  'video.video-to-video': freeze({ modality:'video', capability:'video-to-video', required:['referenceVideos'], optional:['prompt','styleReference','strength','camera','audio'], outputs:['video'], async:true, localFallback:false }),
  'video.first-last-frame': freeze({ modality:'video', capability:'first-last-frame', required:['firstFrame','lastFrame'], optional:['prompt','durationSeconds','camera','motion'], outputs:['video'], async:true, localFallback:false }),
  'video.extend': freeze({ modality:'video', capability:'video-extend', required:['referenceVideos'], optional:['prompt','extendSeconds','continuity'], outputs:['video'], async:true, localFallback:false }),
  'video.loop': freeze({ modality:'video', capability:'video-loop', required:['referenceVideos'], optional:['loopSeconds','transitionStrength'], outputs:['video'], async:true, localFallback:false }),
  'video.reframe': freeze({ modality:'video', capability:'video-reframe', required:['referenceVideos'], optional:['aspectRatio','subjectTracking','safeArea'], outputs:['video'], async:true, localFallback:false }),
  'video.upscale': freeze({ modality:'video', capability:'video-upscale', required:['referenceVideos'], optional:['scale','targetResolution','frameInterpolation','denoise'], outputs:['video'], async:true, localFallback:false }),
  'video.lipsync': freeze({ modality:'video', capability:'lip-sync', required:['referenceVideos','audio'], optional:['language','speakerId','phonemeStrength'], outputs:['video'], async:true, localFallback:false, consent:'likeness' }),
  'video.avatar-speech': freeze({ modality:'video', capability:'avatar-speech', required:['referenceImages','audio'], optional:['prompt','language','speakerId','emotion'], outputs:['video'], async:true, localFallback:false, consent:'likeness' }),
  'video.audio-generate': freeze({ modality:'audio', capability:'audio-generation', required:['prompt'], optional:['durationSeconds','music','sfx','voice'], outputs:['audio'], async:true, localFallback:false }),
  'video.timeline-render': freeze({ modality:'video', capability:'timeline-render', required:['timeline'], optional:['subtitles','music','voiceOver','logo','aspectRatio'], outputs:['video'], async:true, localFallback:false }),
});

export const CREATIVE_MEDIA_CONTROL_SURFACES = freeze({
  identity: freeze(['identityId','referenceImages','referenceObjects','styleReference','poseReference','compositionReference']),
  image: freeze(['negativePrompt','seed','strength','mask','canvas','width','height','aspectRatio','count','scale','denoise']),
  cinema: freeze(['camera','motion','firstFrame','lastFrame','durationSeconds','extendSeconds','continuity','subjectTracking','safeArea']),
  audio: freeze(['audio','voice','speakerId','music','sfx','language','emotion','subtitles','voiceOver']),
});

function cleanTask(value){return String(value||'').trim().toLowerCase();}
function nonEmpty(value){
  if(Array.isArray(value)) return value.length>0;
  if(value && typeof value==='object') return Object.keys(value).length>0;
  return value!==undefined && value!==null && String(value).trim()!=='';
}
function normalizeCapabilities(value){
  if(Array.isArray(value)) return new Set(value.map(v=>String(v||'').trim().toLowerCase()).filter(Boolean));
  if(value && typeof value==='object') return new Set(Object.entries(value).filter(([,enabled])=>Boolean(enabled)).map(([key])=>key.toLowerCase()));
  return new Set();
}

export function getCreativeMediaTask(task){
  return CREATIVE_MEDIA_TASKS[cleanTask(task)] || null;
}

export function listCreativeMediaTasks({modality}={}){
  const wanted=String(modality||'').trim().toLowerCase();
  return Object.entries(CREATIVE_MEDIA_TASKS)
    .filter(([,spec])=>!wanted||spec.modality===wanted)
    .map(([id,spec])=>({id,...spec}));
}

export function validateCreativeMediaRequest({task,input={}}={}){
  const id=cleanTask(task);
  const spec=getCreativeMediaTask(id);
  if(!spec) return {ok:false,task:id||null,code:'CREATIVE_MEDIA_TASK_UNSUPPORTED',missing:[]};
  const source=input && typeof input==='object' ? input : {};
  const missing=spec.required.filter(key=>!nonEmpty(source[key]));
  return {ok:missing.length===0,task:id,code:missing.length?'CREATIVE_MEDIA_INPUT_REQUIRED':null,missing,capability:spec.capability,modality:spec.modality};
}

export function buildCreativeMediaExecutionPlan({
  task,
  input={},
  providerCapabilities=[],
  providerConnected=false,
  providerProductionEvidence=false,
  costPolicyAllowed=true,
  likenessConsent=false,
}={}){
  const validation=validateCreativeMediaRequest({task,input});
  if(!validation.ok) return {...validation,execution:'blocked',jobState:'blocked_by_policy',truth:CREATIVE_MEDIA_TRUTH_LEVELS.CODE_READY};
  const spec=getCreativeMediaTask(validation.task);
  if(spec.consent==='likeness'&&!likenessConsent){
    return {...validation,ok:false,code:'CREATIVE_MEDIA_LIKENESS_CONSENT_REQUIRED',execution:'blocked',jobState:'blocked_by_policy',truth:CREATIVE_MEDIA_TRUTH_LEVELS.CODE_READY};
  }
  if(!costPolicyAllowed){
    return {...validation,ok:false,code:'CREATIVE_MEDIA_COST_POLICY_BLOCKED',execution:'blocked',jobState:'blocked_by_policy',truth:CREATIVE_MEDIA_TRUTH_LEVELS.PROVIDER_READY};
  }
  const caps=normalizeCapabilities(providerCapabilities);
  const providerSupports=caps.has(spec.capability);
  if(providerConnected && providerSupports){
    return {...validation,execution:'provider',jobState:spec.async?'queued':'running',providerSupports:true,truth:providerProductionEvidence?CREATIVE_MEDIA_TRUTH_LEVELS.PRODUCTION_LIVE_VERIFIED:CREATIVE_MEDIA_TRUTH_LEVELS.EVIDENCE_REQUIRED};
  }
  if(spec.localFallback){
    return {...validation,execution:'local-fallback',jobState:'running',providerSupports:false,truth:CREATIVE_MEDIA_TRUTH_LEVELS.CODE_READY,note:'Local fallback is not external-model LIVE evidence.'};
  }
  return {...validation,ok:false,code:providerConnected?'CREATIVE_MEDIA_PROVIDER_CAPABILITY_MISSING':'CREATIVE_MEDIA_PROVIDER_NOT_CONNECTED',execution:'blocked',jobState:'draft',providerSupports:false,truth:CREATIVE_MEDIA_TRUTH_LEVELS.EVIDENCE_REQUIRED};
}

export function summarizeCreativeMediaReadiness({providerCapabilities=[],providerConnected=false,verifiedCapabilities=[]}={}){
  const caps=normalizeCapabilities(providerCapabilities);
  const verified=normalizeCapabilities(verifiedCapabilities);
  const tasks=listCreativeMediaTasks().map(task=>({
    id:task.id,
    modality:task.modality,
    capability:task.capability,
    codeReady:true,
    providerReady:providerConnected&&caps.has(task.capability),
    liveVerified:providerConnected&&caps.has(task.capability)&&verified.has(task.capability),
  }));
  return freeze({
    codeReady:tasks.length,
    providerReady:tasks.filter(t=>t.providerReady).length,
    liveVerified:tasks.filter(t=>t.liveVerified).length,
    total:tasks.length,
    tasks,
    rule:'CODE READY, PROVIDER READY and PRODUCTION LIVE VERIFIED are separate evidence states.',
  });
}
