const freeze = value => Object.freeze(value);

export const CREATIVE_MEDIA_TRUTH_LEVELS = freeze({
  CODE_READY: 'CODE_READY',
  CI_READY: 'CI_READY',
  PREVIEW_READY: 'PREVIEW_READY',
  PROVIDER_READY: 'PROVIDER_READY',
  PROVIDER_CONNECTED: 'PROVIDER_CONNECTED',
  LIVE_PROVIDER_VERIFIED: 'LIVE_PROVIDER_VERIFIED',
  BROWSER_VERIFIED: 'BROWSER_VERIFIED',
  PRODUCTION_VERIFIED: 'PRODUCTION_VERIFIED',
  PRODUCTION_LIVE_VERIFIED: 'PRODUCTION_LIVE_VERIFIED',
  REAL_OUTPUT_QUALITY_VERIFIED: 'REAL_OUTPUT_QUALITY_VERIFIED',
  EVIDENCE_REQUIRED: 'EVIDENCE_REQUIRED',
});

export const CREATIVE_MEDIA_JOB_STATES = freeze([
  'draft', 'queued', 'running', 'quality-check', 'retrying', 'completed', 'failed', 'blocked_by_policy', 'cancelled',
]);

const task = value => freeze(value);
export const CREATIVE_MEDIA_TASKS = freeze({
  'image.generate': task({ modality:'image', capability:'text-to-image', required:['prompt'], optional:['negativePrompt','style','seed','width','height','resolution','aspectRatio','count','transparent'], outputs:['image'], async:false, localFallback:true }),
  'image.image-to-image': task({ modality:'image', capability:'image-to-image', required:['prompt','referenceImages'], optional:['strength','style','seed','resolution','aspectRatio','count'], outputs:['image'], async:false, localFallback:false }),
  'image.edit': task({ modality:'image', capability:'image-edit', required:['prompt','referenceImages'], optional:['mask','strength','style','seed','resolution','aspectRatio'], outputs:['image'], async:false, localFallback:false }),
  'image.generative-fill': task({ modality:'image', capability:'generative-fill', required:['prompt','referenceImages','mask'], optional:['negativePrompt','strength','seed'], outputs:['image'], async:false, localFallback:false }),
  'image.inpaint': task({ modality:'image', capability:'inpaint', required:['prompt','referenceImages','mask'], optional:['negativePrompt','strength','seed'], outputs:['image'], async:false, localFallback:false }),
  'image.outpaint': task({ modality:'image', capability:'outpaint', required:['prompt','referenceImages'], optional:['canvas','expand','seed','style'], outputs:['image'], async:false, localFallback:false }),
  'image.remove-object': task({ modality:'image', capability:'object-remove', required:['referenceImages','mask'], optional:['prompt'], outputs:['image'], async:false, localFallback:false }),
  'image.replace-object': task({ modality:'image', capability:'object-replace', required:['prompt','referenceImages','mask'], optional:['referenceObjects','strength'], outputs:['image'], async:false, localFallback:false }),
  'image.insert-object': task({ modality:'image', capability:'object-insert', required:['prompt','referenceImages'], optional:['mask','referenceObjects','compositionReference','strength'], outputs:['image'], async:false, localFallback:false }),
  'image.remove-background': task({ modality:'image', capability:'background-remove', required:['referenceImages'], optional:['transparent'], outputs:['image','alpha-mask'], async:false, localFallback:false }),
  'image.replace-background': task({ modality:'image', capability:'background-replace', required:['prompt','referenceImages'], optional:['referenceBackgrounds','style','relight'], outputs:['image'], async:false, localFallback:false }),
  'image.style-transfer': task({ modality:'image', capability:'style-transfer', required:['referenceImages','styleReference'], optional:['prompt','strength','seed'], outputs:['image'], async:false, localFallback:false }),
  'image.upscale': task({ modality:'image', capability:'image-upscale', required:['referenceImages'], optional:['scale','targetWidth','targetHeight','resolution','denoise'], outputs:['image'], async:true, localFallback:false }),
  'image.restore': task({ modality:'image', capability:'image-restore', required:['referenceImages'], optional:['denoise','deblur','scratchRepair','faceEnhance','resolution'], outputs:['image'], async:true, localFallback:false }),
  'image.relight': task({ modality:'image', capability:'relight', required:['referenceImages'], optional:['prompt','lightingReference','strength'], outputs:['image'], async:false, localFallback:false }),
  'image.recolor': task({ modality:'image', capability:'recolor', required:['referenceImages'], optional:['prompt','palette','mask','strength'], outputs:['image'], async:false, localFallback:false }),
  'image.transparent-png': task({ modality:'image', capability:'transparent-png', required:['referenceImages'], optional:['edgeRefine'], outputs:['image','alpha-mask'], async:false, localFallback:false }),
  'image.variation': task({ modality:'image', capability:'image-variation', required:['referenceImages'], optional:['prompt','strength','seed','count'], outputs:['image'], async:false, localFallback:false }),
  'image.identity-series': task({ modality:'image', capability:'identity-consistency', required:['prompt','referenceImages'], optional:['identityId','styleReference','poseReference','compositionReference','count','seed'], outputs:['image'], async:true, localFallback:false, consent:'likeness' }),
  'image.face-consistency': task({ modality:'image', capability:'face-consistency', required:['prompt','referenceImages'], optional:['identityId','poseReference','compositionReference','count'], outputs:['image'], async:true, localFallback:false, consent:'likeness' }),
  'image.product-series': task({ modality:'image', capability:'product-consistency', required:['prompt','referenceImages'], optional:['productId','styleReference','compositionReference','count','seed'], outputs:['image'], async:true, localFallback:false }),
  'image.brand-consistency': task({ modality:'image', capability:'brand-consistency', required:['prompt'], optional:['referenceImages','brandKitId','styleReference','palette','count'], outputs:['image'], async:true, localFallback:false }),
  'image.prompt-enhance': task({ modality:'image', capability:'prompt-enhancement', required:['prompt'], optional:['negativePrompt','style','intent','constraints'], outputs:['prompt'], async:false, localFallback:true }),

  'video.generate': task({ modality:'video', capability:'text-to-video', required:['prompt'], optional:['negativePrompt','durationSeconds','aspectRatio','resolution','fps','camera','motion','motionStrength','seed','audio'], outputs:['video'], async:true, localFallback:false }),
  'video.image-to-video': task({ modality:'video', capability:'image-to-video', required:['prompt','referenceImages'], optional:['durationSeconds','aspectRatio','resolution','fps','camera','motion','motionStrength','seed','audio'], outputs:['video'], async:true, localFallback:false }),
  'video.reference-video': task({ modality:'video', capability:'reference-image-video', required:['prompt','referenceImages'], optional:['identityId','productId','styleReference','durationSeconds','camera','motion'], outputs:['video'], async:true, localFallback:false }),
  'video.video-to-video': task({ modality:'video', capability:'video-to-video', required:['referenceVideos'], optional:['prompt','styleReference','strength','camera','audio','resolution','fps'], outputs:['video'], async:true, localFallback:false }),
  'video.first-last-frame': task({ modality:'video', capability:'first-last-frame', required:['firstFrame','lastFrame'], optional:['prompt','durationSeconds','camera','motion','motionStrength'], outputs:['video'], async:true, localFallback:false }),
  'video.character-consistency': task({ modality:'video', capability:'character-consistency-video', required:['prompt','referenceImages'], optional:['identityId','styleReference','durationSeconds','camera','motion'], outputs:['video'], async:true, localFallback:false, consent:'likeness' }),
  'video.product-consistency': task({ modality:'video', capability:'product-consistency-video', required:['prompt','referenceImages'], optional:['productId','styleReference','durationSeconds','camera','motion'], outputs:['video'], async:true, localFallback:false }),
  'video.scene-generate': task({ modality:'video', capability:'scene-generation', required:['prompt'], optional:['referenceImages','sceneId','shotId','durationSeconds','camera','motion','continuity'], outputs:['video'], async:true, localFallback:false }),
  'video.extend': task({ modality:'video', capability:'video-extend', required:['referenceVideos'], optional:['prompt','extendSeconds','continuity'], outputs:['video'], async:true, localFallback:false }),
  'video.variation': task({ modality:'video', capability:'video-variation', required:['referenceVideos'], optional:['prompt','strength','seed','camera','motion'], outputs:['video'], async:true, localFallback:false }),
  'video.restyle': task({ modality:'video', capability:'video-restyle', required:['referenceVideos'], optional:['prompt','styleReference','strength'], outputs:['video'], async:true, localFallback:false }),
  'video.object-edit': task({ modality:'video', capability:'video-object-edit', required:['referenceVideos'], optional:['prompt','mask','referenceObjects','strength'], outputs:['video'], async:true, localFallback:false }),
  'video.background-replace': task({ modality:'video', capability:'video-background-replace', required:['referenceVideos'], optional:['prompt','referenceBackgrounds','styleReference'], outputs:['video'], async:true, localFallback:false }),
  'video.loop': task({ modality:'video', capability:'video-loop', required:['referenceVideos'], optional:['loopSeconds','transitionStrength'], outputs:['video'], async:true, localFallback:false }),
  'video.reframe': task({ modality:'video', capability:'video-reframe', required:['referenceVideos'], optional:['aspectRatio','subjectTracking','safeArea'], outputs:['video'], async:true, localFallback:false }),
  'video.upscale': task({ modality:'video', capability:'video-upscale', required:['referenceVideos'], optional:['scale','targetResolution','frameInterpolation','denoise','fps'], outputs:['video'], async:true, localFallback:false }),
  'video.lipsync': task({ modality:'video', capability:'lip-sync', required:['referenceVideos','audio'], optional:['language','speakerId','phonemeStrength'], outputs:['video'], async:true, localFallback:false, consent:'likeness' }),
  'video.avatar-speech': task({ modality:'video', capability:'avatar-speech', required:['referenceImages','audio'], optional:['prompt','language','speakerId','emotion','durationSeconds'], outputs:['video'], async:true, localFallback:false, consent:'likeness' }),
  'video.audio-generate': task({ modality:'audio', capability:'audio-generation', required:['prompt'], optional:['durationSeconds','music','sfx','voice','language'], outputs:['audio'], async:true, localFallback:false }),
  'video.audio-attach': task({ modality:'video', capability:'audio-attach', required:['referenceVideos','audio'], optional:['volume','ducking','trim','syncOffsetMs'], outputs:['video'], async:true, localFallback:false }),
  'video.caption-integrate': task({ modality:'video', capability:'caption-integration', required:['referenceVideos','subtitles'], optional:['language','style','safeArea'], outputs:['video'], async:true, localFallback:false }),
  'video.storyboard': task({ modality:'video', capability:'multi-shot-storyboard', required:['prompt'], optional:['referenceImages','durationSeconds','aspectRatio','sceneCount','continuity'], outputs:['storyboard'], async:true, localFallback:true }),
  'video.thumbnail': task({ modality:'image', capability:'video-thumbnail', required:['referenceVideos'], optional:['prompt','timestampSeconds','style','aspectRatio'], outputs:['image'], async:false, localFallback:false }),
  'video.timeline-render': task({ modality:'video', capability:'timeline-render', required:['timeline'], optional:['subtitles','music','voiceOver','logo','aspectRatio','resolution','fps'], outputs:['video'], async:true, localFallback:false }),
});

export const CREATIVE_MEDIA_CONTROL_SURFACES = freeze({
  identity: freeze(['identityId','productId','brandKitId','referenceImages','referenceObjects','styleReference','poseReference','compositionReference','lightingReference']),
  image: freeze(['negativePrompt','seed','strength','mask','canvas','expand','width','height','resolution','aspectRatio','count','scale','denoise','deblur','faceEnhance','transparent','edgeRefine']),
  cinema: freeze(['camera','motion','motionStrength','firstFrame','lastFrame','durationSeconds','extendSeconds','continuity','subjectTracking','safeArea','resolution','fps','seed']),
  audio: freeze(['audio','voice','speakerId','music','sfx','language','emotion','subtitles','voiceOver','volume','ducking','syncOffsetMs']),
  workflow: freeze(['history','retry','undo','versionHistory','assetLibrary','appBuilderInsert','qualityJudge','providerEvidence']),
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

export function getCreativeMediaTask(taskId){
  return CREATIVE_MEDIA_TASKS[cleanTask(taskId)] || null;
}

export function listCreativeMediaTasks({modality}={}){
  const wanted=String(modality||'').trim().toLowerCase();
  return Object.entries(CREATIVE_MEDIA_TASKS)
    .filter(([,spec])=>!wanted||spec.modality===wanted)
    .map(([id,spec])=>({id,...spec}));
}

export function validateCreativeMediaRequest({task:taskId,input={}}={}){
  const id=cleanTask(taskId);
  const spec=getCreativeMediaTask(id);
  if(!spec) return {ok:false,task:id||null,code:'CREATIVE_MEDIA_TASK_UNSUPPORTED',missing:[]};
  const source=input && typeof input==='object' ? input : {};
  const missing=spec.required.filter(key=>!nonEmpty(source[key]));
  return {ok:missing.length===0,task:id,code:missing.length?'CREATIVE_MEDIA_INPUT_REQUIRED':null,missing,capability:spec.capability,modality:spec.modality};
}

export function buildCreativeMediaExecutionPlan({
  task:taskId,
  input={},
  providerCapabilities=[],
  providerConnected=false,
  providerProductionEvidence=false,
  verifiedOutputCount=0,
  costPolicyAllowed=true,
  likenessConsent=false,
}={}){
  const validation=validateCreativeMediaRequest({task:taskId,input});
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
    const hasRealOutputEvidence=providerProductionEvidence===true&&Number(verifiedOutputCount)>0;
    return {...validation,execution:'provider',jobState:spec.async?'queued':'running',providerSupports:true,truth:hasRealOutputEvidence?CREATIVE_MEDIA_TRUTH_LEVELS.LIVE_PROVIDER_VERIFIED:CREATIVE_MEDIA_TRUTH_LEVELS.PROVIDER_CONNECTED};
  }
  if(spec.localFallback){
    return {...validation,execution:'local-fallback',jobState:'running',providerSupports:false,truth:CREATIVE_MEDIA_TRUTH_LEVELS.CODE_READY,note:'Local fallback is not external-model LIVE evidence.'};
  }
  return {...validation,ok:false,code:providerConnected?'CREATIVE_MEDIA_PROVIDER_CAPABILITY_MISSING':'CREATIVE_MEDIA_PROVIDER_NOT_CONNECTED',execution:'blocked',jobState:'draft',providerSupports:false,truth:CREATIVE_MEDIA_TRUTH_LEVELS.EVIDENCE_REQUIRED};
}

export function summarizeCreativeMediaReadiness({providerCapabilities=[],providerConnected=false,verifiedCapabilities=[]}={}){
  const caps=normalizeCapabilities(providerCapabilities);
  const verified=normalizeCapabilities(verifiedCapabilities);
  const tasks=listCreativeMediaTasks().map(item=>({
    id:item.id,
    modality:item.modality,
    capability:item.capability,
    codeReady:true,
    providerReady:providerConnected&&caps.has(item.capability),
    liveVerified:providerConnected&&caps.has(item.capability)&&verified.has(item.capability),
  }));
  return freeze({
    codeReady:tasks.length,
    providerReady:tasks.filter(t=>t.providerReady).length,
    liveVerified:tasks.filter(t=>t.liveVerified).length,
    total:tasks.length,
    tasks,
    rule:'CODE READY, PROVIDER READY, PROVIDER CONNECTED, LIVE PROVIDER VERIFIED, BROWSER VERIFIED, PRODUCTION VERIFIED and REAL OUTPUT QUALITY VERIFIED are separate evidence states.',
  });
}
