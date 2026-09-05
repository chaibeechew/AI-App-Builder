import { getCreativeMediaTask } from './creative-media-control-plane.js';

const freeze=value=>Object.freeze(value);
const clamp=value=>{const n=Number(value);return Number.isFinite(n)?Math.max(0,Math.min(100,n)):0;};
const clean=value=>String(value||'').trim();

export const IMAGE_QUALITY_DIMENSIONS=freeze([
  'promptAdherence','composition','anatomy','face','hands','textRendering','lighting','detail','resolution','brandConsistency','characterConsistency','productConsistency'
]);
export const VIDEO_QUALITY_DIMENSIONS=freeze([
  'promptAdherence','motionQuality','temporalConsistency','characterConsistency','faceConsistency','objectConsistency','cameraCoherence','frameArtifacts','flicker','morphing','physicsPlausibility','lipSyncQuality','audioVideoSync','endingStability'
]);
export const AUDIO_QUALITY_DIMENSIONS=freeze([
  'promptAdherence','speechIntelligibility','voiceNaturalness','voiceConsistency','pronunciation','languageAccuracy','musicQuality','sfxQuality','noise','clipping','loudness','syncAccuracy'
]);

export const CREATIVE_MEDIA_QUALITY_POLICY=freeze({
  acceptScore:88,
  optimizeScore:76,
  hardBlockOnArtifactValidationFailure:true,
  hardBlockOnSafetyFailure:true,
  hardBlockOnMissingProvenance:true,
  hardBlockOnMissingRequiredSignals:true,
  failedCandidateCanNeverBeMarkedSuccessful:true,
  retryOrder:freeze(['prompt-repair','same-provider-regenerate','provider-fallback','candidate-compare','fail-closed']),
  premiumRequiresExplicitPermission:true,
});

const IMAGE_BASE=['promptAdherence','composition','lighting','detail','resolution'];
const VIDEO_BASE=['promptAdherence','motionQuality','temporalConsistency','cameraCoherence','frameArtifacts','flicker','morphing','physicsPlausibility','endingStability'];
const AUDIO_BASE=['promptAdherence','noise','clipping','loudness'];

function taskId(task){return clean(task).toLowerCase();}
function includesAny(value,terms){return terms.some(term=>value.includes(term));}

export function getCreativeMediaRequiredQualitySignals({task,context={}}={}){
  const id=taskId(task);const spec=getCreativeMediaTask(id);if(!spec)return[];
  const signals=spec.modality==='video'?[...VIDEO_BASE]:spec.modality==='audio'?[...AUDIO_BASE]:[...IMAGE_BASE];
  const people=Boolean(context.requiresPeople)||includesAny(id,['identity','face','avatar','lipsync','character']);
  const character=Boolean(context.requiresCharacterConsistency)||includesAny(id,['identity','character','face','avatar','lipsync']);
  const product=Boolean(context.requiresProductConsistency)||id.includes('product');
  const brand=Boolean(context.requiresBrandConsistency)||id.includes('brand');
  const text=Boolean(context.requiresTextRendering);
  if(spec.modality==='image'){
    if(people)signals.push('anatomy','face','hands');
    if(text)signals.push('textRendering');
    if(character)signals.push('characterConsistency');
    if(product)signals.push('productConsistency');
    if(brand)signals.push('brandConsistency');
  }else if(spec.modality==='video'){
    if(character)signals.push('characterConsistency','faceConsistency');
    if(product)signals.push('objectConsistency');
    if(id.includes('lipsync')||id.includes('avatar-speech')||context.requiresLipSync)signals.push('lipSyncQuality','audioVideoSync');
  }else if(spec.modality==='audio'){
    const voice=Boolean(context.requiresVoice)||context.voice===true;
    const music=Boolean(context.requiresMusic)||context.music===true;
    const sfx=Boolean(context.requiresSfx)||context.sfx===true;
    if(voice)signals.push('speechIntelligibility','voiceNaturalness','voiceConsistency','pronunciation','languageAccuracy');
    if(music)signals.push('musicQuality');
    if(sfx)signals.push('sfxQuality');
    if(context.requiresSync===true)signals.push('syncAccuracy');
  }
  return [...new Set(signals)];
}

function artifactLooksValid(artifact={},modality='image'){
  if(artifact.valid===false)return false;
  if(modality==='image'){
    if(artifact.width!=null&&Number(artifact.width)<=0)return false;
    if(artifact.height!=null&&Number(artifact.height)<=0)return false;
    if(artifact.bytes!=null&&Number(artifact.bytes)<=0)return false;
  }
  if(modality==='video'){
    if(artifact.durationSeconds!=null&&Number(artifact.durationSeconds)<=0)return false;
    if(artifact.bytes!=null&&Number(artifact.bytes)<=0)return false;
  }
  if(modality==='audio'){
    if(artifact.durationSeconds!=null&&Number(artifact.durationSeconds)<=0)return false;
    if(artifact.bytes!=null&&Number(artifact.bytes)<=0)return false;
    if(artifact.sampleRate!=null&&Number(artifact.sampleRate)<=0)return false;
    if(artifact.channels!=null&&Number(artifact.channels)<=0)return false;
  }
  return artifact.valid===true;
}

function evidenceLooksValid(evidence={}){
  return evidence.safetyPassed===true&&evidence.provenanceVerified===true&&evidence.outputValidated===true;
}

export function assessCreativeMediaCandidate({task,signals={},artifact={},evidence={},context={}}={}){
  const id=taskId(task);const spec=getCreativeMediaTask(id);
  if(!spec)return freeze({ok:false,task:id||null,decision:'reject',score:0,hardBlockers:freeze(['unsupported-task']),missingSignals:freeze([]),productionEligible:false});
  const required=getCreativeMediaRequiredQualitySignals({task:id,context});
  const missing=required.filter(key=>!Number.isFinite(Number(signals?.[key])));
  const scored=required.map(key=>({id:key,score:clamp(signals?.[key])}));
  const score=scored.length?Number((scored.reduce((sum,row)=>sum+row.score,0)/scored.length).toFixed(2)):0;
  const hardBlockers=[];
  if(!artifactLooksValid(artifact,spec.modality))hardBlockers.push('artifact-validation-failed');
  if(evidence.safetyPassed!==true)hardBlockers.push('safety-check-failed-or-missing');
  if(evidence.provenanceVerified!==true)hardBlockers.push('provenance-missing');
  if(evidence.outputValidated!==true)hardBlockers.push('output-validation-missing');
  if(missing.length)hardBlockers.push('required-quality-signals-missing');
  let decision='reject';
  if(!hardBlockers.length&&score>=CREATIVE_MEDIA_QUALITY_POLICY.acceptScore)decision='accept';
  else if(!hardBlockers.length&&score>=CREATIVE_MEDIA_QUALITY_POLICY.optimizeScore)decision='optimize';
  const productionEligible=decision==='accept'&&evidenceLooksValid(evidence)&&artifactLooksValid(artifact,spec.modality);
  return freeze({
    ok:true,task:id,modality:spec.modality,capability:spec.capability,score,decision,productionEligible,
    dimensions:freeze(scored.map(row=>freeze(row))),missingSignals:freeze([...missing]),hardBlockers:freeze([...hardBlockers]),
    evidence:freeze({artifactValidated:artifactLooksValid(artifact,spec.modality),safetyPassed:evidence.safetyPassed===true,provenanceVerified:evidence.provenanceVerified===true,outputValidated:evidence.outputValidated===true}),
    rule:'A candidate is successful only when artifact validation, safety, provenance and required media-quality signals all pass the acceptance gate.'
  });
}

function providerAvailable(provider,capability,{premiumAllowed=false,costMode='zero'}={}){
  const p=provider&&typeof provider==='object'?provider:{};
  if(!p.connected||p.available===false||p.safetyReady===false)return false;
  const caps=new Set((Array.isArray(p.capabilities)?p.capabilities:[]).map(v=>clean(v).toLowerCase()));
  if(!caps.has(clean(capability).toLowerCase()))return false;
  if(Number(p.freeQuotaRemaining||0)>0)return true;
  const cost=clean(p.costClass||'metered').toLowerCase();
  if(costMode==='zero'||costMode==='free')return cost==='zero'||cost==='free';
  if(cost==='premium')return premiumAllowed===true;
  return true;
}

export function buildCreativeMediaRetryDecision({assessment,task,providerCandidates=[],currentProviderId='',costMode='zero',premiumAllowed=false,attempt=0,maxAttempts=4}={}){
  const result=assessment&&typeof assessment==='object'?assessment:{};
  const spec=getCreativeMediaTask(task);
  if(!spec)return freeze({action:'fail-closed',reason:'unsupported-task',nextProviderId:null,attempt:Number(attempt)||0});
  if(result.productionEligible===true)return freeze({action:'accept',reason:'quality-gate-passed',nextProviderId:currentProviderId||null,attempt:Number(attempt)||0});
  const current=Math.max(0,Number(attempt)||0);if(current>=Math.max(1,Number(maxAttempts)||4))return freeze({action:'fail-closed',reason:'retry-budget-exhausted',nextProviderId:null,attempt:current});
  if(current===0)return freeze({action:'prompt-repair',reason:'quality-gate-not-accepted',nextProviderId:currentProviderId||null,attempt:current+1});
  if(current===1){
    const same=(providerCandidates||[]).find(p=>p?.id===currentProviderId);
    if(providerAvailable(same,spec.capability,{premiumAllowed,costMode}))return freeze({action:'same-provider-regenerate',reason:'bounded-provider-retry',nextProviderId:currentProviderId,attempt:current+1});
  }
  const fallback=(providerCandidates||[]).find(p=>p?.id!==currentProviderId&&providerAvailable(p,spec.capability,{premiumAllowed,costMode}));
  if(fallback)return freeze({action:'provider-fallback',reason:'alternate-capability-provider-available',nextProviderId:fallback.id,attempt:current+1});
  if(current<Math.max(1,Number(maxAttempts)||4)-1)return freeze({action:'candidate-compare',reason:'no-safe-provider-fallback',nextProviderId:null,attempt:current+1});
  return freeze({action:'fail-closed',reason:'no-acceptable-candidate',nextProviderId:null,attempt:current+1});
}
