import { assessCreativeMediaCandidate, CREATIVE_MEDIA_QUALITY_POLICY } from './creative-media-quality-judge.js';
import { assessCreativeMediaContinuity, CREATIVE_MEDIA_CONTINUITY_POLICY } from './creative-media-continuity.js';

const freeze=value=>Object.freeze(value);
const clean=value=>String(value||'').trim();
const list=value=>Array.isArray(value)?value:[];
const SHA256=/^[a-f0-9]{64}$/;

export const CREATIVE_MEDIA_OBSERVATION_POLICY=freeze({
  trustedObserverKinds:freeze(['laneriq-vision','device-vision','signed-external-vision']),
  rejectProviderSelfReport:true,
  requireArtifactHash:true,
  requireObservationHash:true,
  requireSignedEvidence:true,
  qualityWeight:0.78,
  continuityWeight:0.22,
});

function normalizeHash(value){const raw=clean(value).toLowerCase();return SHA256.test(raw)?raw:null;}
function unique(values){return [...new Set(values.filter(Boolean))];}

export function validateCreativeMediaObservationEvidence(evidence={}){
  const observerKind=clean(evidence.observerKind).toLowerCase();
  const observedBy=clean(evidence.observedBy).slice(0,160);
  const artifactHash=normalizeHash(evidence.artifactHash||evidence.sha256);
  const observationHash=normalizeHash(evidence.observationHash);
  const blockers=[];
  if(!CREATIVE_MEDIA_OBSERVATION_POLICY.trustedObserverKinds.includes(observerKind))blockers.push('untrusted-observer-kind');
  if(!observedBy)blockers.push('observer-id-missing');
  if(CREATIVE_MEDIA_OBSERVATION_POLICY.rejectProviderSelfReport&&evidence.providerSelfReported===true)blockers.push('provider-self-report-not-accepted');
  if(CREATIVE_MEDIA_OBSERVATION_POLICY.requireArtifactHash&&!artifactHash)blockers.push('artifact-hash-missing-or-invalid');
  if(CREATIVE_MEDIA_OBSERVATION_POLICY.requireObservationHash&&!observationHash)blockers.push('observation-hash-missing-or-invalid');
  if(CREATIVE_MEDIA_OBSERVATION_POLICY.requireSignedEvidence&&evidence.signedEvidence!==true)blockers.push('observation-signature-missing');
  if(evidence.safetyPassed!==true)blockers.push('safety-check-failed-or-missing');
  if(evidence.provenanceVerified!==true)blockers.push('provenance-missing');
  if(evidence.outputValidated!==true)blockers.push('output-validation-missing');
  return freeze({
    ok:blockers.length===0,observerKind,observedBy:observedBy||null,artifactHash,observationHash,
    signedEvidence:evidence.signedEvidence===true,hardBlockers:freeze(unique(blockers)),
    rule:'Provider self-reported quality is never enough; acceptance requires hash-bound measured observation evidence from a trusted observer class.',
  });
}

export function judgeRealCreativeMediaOutput({task,input={},signals={},artifact={},evidence={},continuityObservations={},context={}}={}){
  const observation=validateCreativeMediaObservationEvidence(evidence);
  const base=assessCreativeMediaCandidate({task,signals,artifact,evidence,context});
  const continuity=assessCreativeMediaContinuity({task,input,observations:continuityObservations,context});
  const blockers=unique([...list(base.hardBlockers),...list(observation.hardBlockers),...list(continuity.hardBlockers)]);
  const continuityRequired=continuity.required===true;
  const score=continuityRequired
    ? Number(((Number(base.score||0)*CREATIVE_MEDIA_OBSERVATION_POLICY.qualityWeight)+(Number(continuity.score||0)*CREATIVE_MEDIA_OBSERVATION_POLICY.continuityWeight)).toFixed(2))
    : Number(base.score||0);
  let decision='reject';
  if(!blockers.length&&base.productionEligible===true&&continuity.productionEligible===true&&score>=CREATIVE_MEDIA_QUALITY_POLICY.acceptScore)decision='accept';
  else if(!blockers.length&&score>=Math.max(CREATIVE_MEDIA_QUALITY_POLICY.optimizeScore,CREATIVE_MEDIA_CONTINUITY_POLICY.optimizeScore))decision='optimize';
  const productionEligible=decision==='accept'&&observation.ok&&base.productionEligible===true&&continuity.productionEligible===true;
  return freeze({
    ok:true,task:base.task||clean(task).toLowerCase(),modality:base.modality||null,score,decision,productionEligible,
    hardBlockers:freeze(blockers),base,continuity,observation,
    truth:productionEligible?'REAL_OUTPUT_QUALITY_VERIFIED':'EVIDENCE_REQUIRED',
  });
}
