import { getCreativeDeliveryPreset } from './creative-media-delivery-presets.js';

const freeze=value=>Object.freeze(value);
function n(v){const x=Number(v);return Number.isFinite(x)?x:null;}
function clean(v){return String(v||'').trim().toLowerCase();}

export function assessCreativeMediaDelivery({artifact={},masteringPlan={},presetId='',evidence={}}={}){
  const plan=masteringPlan&&typeof masteringPlan==='object'?masteringPlan:{};const modality=clean(plan.modality||artifact.modality);
  const preset=presetId?getCreativeDeliveryPreset(presetId):null;const violations=[];const warnings=[];
  if(plan.ok!==true)violations.push('mastering-plan-invalid');
  if(!['image','video','audio'].includes(modality))violations.push('modality-invalid');
  if(artifact.valid!==true)violations.push('artifact-invalid');
  if(!(n(artifact.bytes)>0))violations.push('artifact-bytes-invalid');
  if(!String(artifact.sha256||'').match(/^[a-f0-9]{64}$/i))violations.push('content-hash-missing-or-invalid');
  if(evidence.safetyPassed!==true)violations.push('safety-evidence-missing');
  if(evidence.provenanceVerified!==true)violations.push('provenance-evidence-missing');
  if(evidence.outputValidated!==true)violations.push('output-validation-missing');
  if(evidence.ownerValidated!==true)violations.push('owner-validation-missing');
  if(modality==='video'){
    if(!(n(artifact.durationSeconds)>0))violations.push('video-duration-invalid');
    if(!(n(artifact.width)>0&&n(artifact.height)>0))violations.push('video-dimensions-invalid');
    if(!(n(artifact.fps)>0))violations.push('video-fps-invalid');
    if(preset){if(n(artifact.durationSeconds)>n(preset.maxDurationSeconds))violations.push('preset-duration-exceeded');if(n(artifact.bytes)>n(preset.maxFileBytes))violations.push('preset-file-size-exceeded');if(clean(artifact.container)!==clean(preset.container))violations.push('preset-container-mismatch');if(clean(artifact.videoCodec)!==clean(preset.videoCodec))warnings.push('preset-video-codec-mismatch');}
    if(n(artifact.audioDriftMs)!=null&&Math.abs(n(artifact.audioDriftMs))>120)violations.push('audio-video-drift-exceeded');
    if(n(artifact.truePeakDbfs)!=null&&n(artifact.truePeakDbfs)>-0.1)violations.push('audio-true-peak-clipping-risk');
  }else if(modality==='image'){
    if(!(n(artifact.width)>0&&n(artifact.height)>0))violations.push('image-dimensions-invalid');
    if(preset&&n(artifact.bytes)>n(preset.maxFileBytes))violations.push('preset-file-size-exceeded');
  }else if(modality==='audio'){
    if(!(n(artifact.durationSeconds)>0))violations.push('audio-duration-invalid');if(!(n(artifact.sampleRate)>0))violations.push('audio-sample-rate-invalid');if(!(n(artifact.channels)>0))violations.push('audio-channels-invalid');
    if(n(artifact.truePeakDbfs)!=null&&n(artifact.truePeakDbfs)>-0.1)violations.push('audio-true-peak-clipping-risk');
  }
  if(preset&&!preset.externalRequirementVerified)warnings.push('platform-requirement-reverification-required');
  const pass=violations.length===0;
  return freeze({ok:true,pass,productionEligible:pass&&evidence.productionShaVerified===true&&evidence.runtimeVerified===true,modality,presetId:preset?.id||null,violations:freeze([...new Set(violations)]),warnings:freeze([...new Set(warnings)]),evidence:freeze({safetyPassed:evidence.safetyPassed===true,provenanceVerified:evidence.provenanceVerified===true,outputValidated:evidence.outputValidated===true,ownerValidated:evidence.ownerValidated===true,productionShaVerified:evidence.productionShaVerified===true,runtimeVerified:evidence.runtimeVerified===true}),truth:freeze({platformCertification:false,storeAcceptanceVerified:false,realPlaybackQualityVerified:false}),rule:'Delivery QC can mark a code artifact internally eligible only from explicit artifact and evidence inputs; it never implies platform certification, store acceptance, or real-device playback quality.'});
}
