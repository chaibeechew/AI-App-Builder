import { getCreativeMediaTask } from './creative-media-control-plane.js';

const freeze=value=>Object.freeze(value);
const COST_CLASSES=freeze(['zero','free','low','metered','premium']);
const PROVIDER_ID=/^[A-Za-z0-9._:-]{1,120}$/;

function clean(v,max=200){return String(v||'').replace(/[\u0000-\u001f\u007f]/g,'').trim().slice(0,max);}
function num(v,min,max,fallback=0){const n=Number(v);return Number.isFinite(n)?Math.max(min,Math.min(max,n)):fallback;}
function capabilities(value){return [...new Set((Array.isArray(value)?value:[]).map(v=>clean(v,120).toLowerCase()).filter(Boolean))];}

export const MEDIA_PROVIDER_QUALIFICATION_POLICY=freeze({
  minObservedRuns:5,minSuccessRate:0.95,minDurableRate:1,minSafetyRate:1,minProvenanceRate:1,minOwnerValidationRate:1,minQualityPassRate:0.9,maxP95LatencyMs:180000,
  providerClaimsNeverEqualLiveEvidence:true,secretsForbidden:true
});

export function assessCreativeMediaProvider({provider={},taskIds=[],observations={}}={}){
  const providerId=clean(provider?.id,120);if(!PROVIDER_ID.test(providerId))return freeze({ok:false,code:'MEDIA_PROVIDER_ID_INVALID'});
  const advertised=capabilities(provider?.capabilities);const requested=(Array.isArray(taskIds)?taskIds:[]).map(v=>clean(v,120).toLowerCase()).filter(Boolean);
  const unsupported=[];const requiredCapabilities=[];
  for(const taskId of requested){const spec=getCreativeMediaTask(taskId);if(!spec){unsupported.push(taskId);continue;}requiredCapabilities.push(spec.capability);}
  if(unsupported.length)return freeze({ok:false,code:'MEDIA_PROVIDER_TASK_UNSUPPORTED',tasks:freeze(unsupported)});
  const covered=[...new Set(requiredCapabilities)].filter(cap=>advertised.includes(cap));
  const missing=[...new Set(requiredCapabilities)].filter(cap=>!advertised.includes(cap));
  const runs=Math.floor(num(observations?.realRuns,0,1000000,0));const successes=Math.floor(num(observations?.successfulRuns,0,runs,0));
  const durable=Math.floor(num(observations?.durableOutputs,0,successes,0));const safe=Math.floor(num(observations?.safetyPassedRuns,0,successes,0));
  const provenance=Math.floor(num(observations?.provenanceVerifiedRuns,0,successes,0));const owner=Math.floor(num(observations?.ownerValidatedRuns,0,successes,0));const quality=Math.floor(num(observations?.qualityPassedRuns,0,successes,0));
  const rates=freeze({success:runs?successes/runs:0,durable:successes?durable/successes:0,safety:successes?safe/successes:0,provenance:successes?provenance/successes:0,ownerValidation:successes?owner/successes:0,qualityPass:successes?quality/successes:0});
  const p95LatencyMs=num(observations?.p95LatencyMs,0,3600000,3600000);const blockers=[];
  if(missing.length)blockers.push('capability-coverage-incomplete');if(runs<MEDIA_PROVIDER_QUALIFICATION_POLICY.minObservedRuns)blockers.push('insufficient-real-runs');
  if(rates.success<MEDIA_PROVIDER_QUALIFICATION_POLICY.minSuccessRate)blockers.push('success-rate-below-threshold');if(rates.durable<1)blockers.push('durable-output-gap');if(rates.safety<1)blockers.push('safety-evidence-gap');if(rates.provenance<1)blockers.push('provenance-gap');if(rates.ownerValidation<1)blockers.push('owner-validation-gap');if(rates.qualityPass<MEDIA_PROVIDER_QUALIFICATION_POLICY.minQualityPassRate)blockers.push('quality-rate-below-threshold');if(p95LatencyMs>MEDIA_PROVIDER_QUALIFICATION_POLICY.maxP95LatencyMs)blockers.push('latency-above-threshold');
  const qualified=blockers.length===0;const costClass=COST_CLASSES.includes(clean(provider?.costClass,30).toLowerCase())?clean(provider.costClass,30).toLowerCase():'metered';
  return freeze({ok:true,providerId,costClass,advertisedCapabilities:freeze(advertised),requiredCapabilities:freeze([...new Set(requiredCapabilities)]),coveredCapabilities:freeze(covered),missingCapabilities:freeze(missing),observedRuns:runs,rates,p95LatencyMs,qualifiedForMediaCanary:qualified,liveProviderVerified:false,blockers:freeze(blockers),truth:freeze({providerManifestObserved:true,providerClaimsAreNotLiveEvidence:true,qualificationIsNotProductionLive:true,evidenceRequired:true})});
}
