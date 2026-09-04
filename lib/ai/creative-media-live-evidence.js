import { getCreativeMediaTask } from './creative-media-control-plane.js';

const freeze=value=>Object.freeze(value);
const ID=/^[A-Za-z0-9._:-]{1,180}$/;
const SHA40=/^[a-f0-9]{40}$/i;
const SHA256=/^[a-f0-9]{64}$/i;
function clean(v,max=300){return String(v||'').replace(/[\u0000-\u001f\u007f]/g,'').trim().slice(0,max);}
function bool(v){return v===true;}
function quality(v){const n=Number(v);return Number.isFinite(n)?Math.max(0,Math.min(100,n)):0;}

export const CREATIVE_MEDIA_LIVE_EVIDENCE_POLICY=freeze({
  minQualityScore:88,exactShaRequired:true,durableReopenRequired:true,providerResponseCaptureRequired:true,provenanceRequired:true,ownerValidationRequired:true,safetyRequired:true,
  configuredProviderNeverCountsAsLive:true,previewNeverCountsAsProduction:true
});

export function assessCreativeMediaLiveEvidence({task,providerId='',providerRunId='',outputAssetId='',contentSha256='',generatedAt='',qualityScore=0,qualityAssessmentId='',evidence={},release={}}={}){
  const taskId=clean(task,120).toLowerCase();const spec=getCreativeMediaTask(taskId);if(!spec)return freeze({ok:false,code:'MEDIA_LIVE_TASK_UNSUPPORTED',liveProviderVerified:false});
  const provider=clean(providerId,120),runId=clean(providerRunId,180),asset=clean(outputAssetId,180),assessment=clean(qualityAssessmentId,180);
  const blockers=[];
  if(!ID.test(provider))blockers.push('provider-id-missing');if(!ID.test(runId))blockers.push('provider-run-id-missing');if(!ID.test(asset))blockers.push('durable-output-asset-id-missing');if(!SHA256.test(clean(contentSha256,64)))blockers.push('content-hash-invalid');
  const time=Date.parse(String(generatedAt||''));if(!Number.isFinite(time)||time>Date.now()+300000)blockers.push('generation-time-invalid');
  if(!bool(evidence.actualProviderResponseCaptured))blockers.push('provider-response-not-captured');if(!bool(evidence.outputValidated))blockers.push('output-not-validated');if(!bool(evidence.durablePersistenceVerified))blockers.push('durable-persistence-not-verified');if(!bool(evidence.outputReopenVerified))blockers.push('durable-output-reopen-not-verified');if(!bool(evidence.provenanceVerified))blockers.push('provenance-not-verified');if(!bool(evidence.ownerScopeVerified))blockers.push('owner-scope-not-verified');if(!bool(evidence.safetyPassed))blockers.push('safety-not-verified');
  const q=quality(qualityScore);if(q<CREATIVE_MEDIA_LIVE_EVIDENCE_POLICY.minQualityScore||!ID.test(assessment))blockers.push('real-output-quality-not-verified');
  const mainSha=clean(release.mainSha,40),deploymentSha=clean(release.deploymentSha,40),runtimeSha=clean(release.runtimeSha,40);const releaseExact=SHA40.test(mainSha)&&mainSha===deploymentSha&&mainSha===runtimeSha;
  if(!releaseExact)blockers.push('production-exact-sha-not-verified');if(!bool(release.productionReady))blockers.push('production-deployment-not-ready');if(!bool(release.runtimeVerified))blockers.push('production-runtime-not-verified');
  const liveProviderVerified=blockers.length===0;return freeze({ok:true,task:taskId,capability:spec.capability,modality:spec.modality,providerId:provider||null,providerRunId:runId||null,outputAssetId:asset||null,contentSha256:SHA256.test(clean(contentSha256,64))?clean(contentSha256,64).toLowerCase():null,generatedAt:Number.isFinite(time)?new Date(time).toISOString():null,qualityScore:q,qualityAssessmentId:assessment||null,productionExactShaVerified:releaseExact,liveProviderVerified,productionLiveVerified:liveProviderVerified,realOutputQualityVerified:liveProviderVerified,blockers:freeze(blockers),truth:freeze({configuredProviderIsNotLive:true,ciIsNotLive:true,previewIsNotProduction:true,verifiedByEvidenceOnly:true})});
}
