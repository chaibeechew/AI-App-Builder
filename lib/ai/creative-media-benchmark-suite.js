import { getCreativeMediaTask } from './creative-media-control-plane.js';

const freeze=value=>Object.freeze(value);
const CASES=freeze([
  freeze({id:'img-t2i',task:'image.generate',critical:true,minSamples:5,metrics:freeze({promptAdherence:88,composition:85,detail:85})}),
  freeze({id:'img-i2i',task:'image.image-to-image',critical:true,minSamples:5,metrics:freeze({promptAdherence:86,composition:85,referenceFidelity:88})}),
  freeze({id:'img-identity',task:'image.identity-series',critical:true,minSamples:6,metrics:freeze({characterConsistency:90,faceConsistency:90,detail:84})}),
  freeze({id:'img-product',task:'image.product-series',critical:true,minSamples:6,metrics:freeze({productConsistency:92,brandConsistency:90,detail:86})}),
  freeze({id:'vid-t2v',task:'video.generate',critical:true,minSamples:5,metrics:freeze({promptAdherence:86,motionQuality:84,temporalConsistency:86,cameraCoherence:84})}),
  freeze({id:'vid-i2v',task:'video.image-to-video',critical:true,minSamples:5,metrics:freeze({referenceFidelity:88,motionQuality:84,temporalConsistency:86})}),
  freeze({id:'vid-first-last',task:'video.first-last-frame',critical:false,minSamples:4,metrics:freeze({endpointFidelity:90,temporalConsistency:85,motionQuality:82})}),
  freeze({id:'vid-character',task:'video.character-consistency',critical:true,minSamples:6,metrics:freeze({characterConsistency:90,faceConsistency:90,temporalConsistency:86})}),
  freeze({id:'vid-product',task:'video.product-consistency',critical:true,minSamples:6,metrics:freeze({productConsistency:92,objectConsistency:90,temporalConsistency:86})}),
  freeze({id:'vid-lipsync',task:'video.lipsync',critical:true,minSamples:5,metrics:freeze({lipSyncQuality:90,audioVideoSync:92,faceConsistency:88})}),
  freeze({id:'audio-generate',task:'video.audio-generate',critical:false,minSamples:5,metrics:freeze({promptAdherence:86,audioQuality:86,syncReadiness:85})}),
  freeze({id:'vid-upscale',task:'video.upscale',critical:false,minSamples:4,metrics:freeze({detailRetention:88,artifactControl:90,temporalConsistency:88})}),
]);

function clean(v,max=120){return String(v||'').trim().slice(0,max);}
function caps(value){return new Set((Array.isArray(value)?value:[]).map(v=>clean(v).toLowerCase()).filter(Boolean));}
function number(v){const n=Number(v);return Number.isFinite(n)?Math.max(0,Math.min(100,n)):0;}

export const CREATIVE_MEDIA_BENCHMARK_CASES=CASES;

export function buildCreativeMediaBenchmarkPlan({providerId='',providerCapabilities=[],caseIds=[]}={}){
  const provider=clean(providerId,120);const advertised=caps(providerCapabilities);const wanted=new Set((Array.isArray(caseIds)?caseIds:[]).map(v=>clean(v).toLowerCase()).filter(Boolean));
  const selected=CASES.filter(row=>!wanted.size||wanted.has(row.id));const cases=[];
  for(const row of selected){const spec=getCreativeMediaTask(row.task);if(!spec)continue;cases.push(freeze({...row,capability:spec.capability,modality:spec.modality,providerAdvertisesCapability:advertised.has(spec.capability),realOutputEvidenceRequired:true}));}
  return freeze({ok:Boolean(provider),providerId:provider||null,cases:freeze(cases),supportedCases:cases.filter(row=>row.providerAdvertisesCapability).length,totalCases:cases.length,truth:freeze({benchmarkPlanIsNotExecution:true,advertisedCapabilityIsNotPassingEvidence:true,liveEvidenceRequired:true})});
}

export function assessCreativeMediaBenchmarkCase({caseId='',samples=[]}={}){
  const definition=CASES.find(row=>row.id===clean(caseId,120).toLowerCase());if(!definition)return freeze({ok:false,code:'MEDIA_BENCHMARK_CASE_UNSUPPORTED'});
  const rows=Array.isArray(samples)?samples:[];const blockers=[];if(rows.length<definition.minSamples)blockers.push('insufficient-samples');
  let liveSamples=0;const metricAverages={};
  for(const metric of Object.keys(definition.metrics)){const values=rows.map(row=>number(row?.metrics?.[metric]));metricAverages[metric]=values.length?Number((values.reduce((a,b)=>a+b,0)/values.length).toFixed(2)):0;if(metricAverages[metric]<definition.metrics[metric])blockers.push(`metric-below-threshold:${metric}`);}
  for(const row of rows){if(row?.liveProviderVerified===true&&row?.contentSha256&&row?.outputAssetId)liveSamples+=1;}
  if(liveSamples<definition.minSamples)blockers.push('insufficient-live-evidence-samples');
  const passed=blockers.length===0;return freeze({ok:true,caseId:definition.id,task:definition.task,critical:definition.critical,samples:rows.length,liveSamples,metricAverages:freeze(metricAverages),thresholds:definition.metrics,passed,blockers:freeze([...new Set(blockers)]),truth:freeze({passedRequiresRealLiveSamples:true})});
}
