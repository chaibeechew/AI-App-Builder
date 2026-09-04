import { listCreativeMediaTasks } from './creative-media-control-plane.js';

const freeze = value => Object.freeze(value);

export const MEDIA_READINESS_STAGES = freeze([
  'CODE_READY',
  'CI_READY',
  'PROVIDER_READY',
  'PROVIDER_CONNECTED',
  'LIVE_PROVIDER_VERIFIED',
  'REAL_OUTPUT_QUALITY_VERIFIED',
]);

function normalizeSet(value){
  if(value instanceof Set) return new Set([...value].map(v=>String(v||'').trim().toLowerCase()).filter(Boolean));
  if(Array.isArray(value)) return new Set(value.map(v=>String(v||'').trim().toLowerCase()).filter(Boolean));
  if(typeof value==='string') return new Set(value.split(',').map(v=>v.trim().toLowerCase()).filter(Boolean));
  return new Set();
}

function validDigest(value){
  return /^[a-f0-9]{64}$/i.test(String(value||'').trim());
}

function validSha(value){
  return /^[a-f0-9]{40}$/i.test(String(value||'').trim());
}

export function validateMediaOutputEvidence(record={}){
  const capability=String(record.capability||'').trim().toLowerCase();
  const provider=String(record.provider||'').trim();
  const environment=String(record.environment||'').trim().toLowerCase();
  const producedAt=Date.parse(record.producedAt||'');
  const liveVerified=Boolean(
    capability &&
    provider &&
    environment==='production' &&
    Number.isFinite(producedAt) &&
    validDigest(record.outputDigest) &&
    validSha(record.productionSha) &&
    record.artifactValidated===true &&
    record.safetyPassed===true
  );
  return {
    valid:liveVerified,
    capability:capability||null,
    qualityVerified:liveVerified && record.qualityPassed===true,
  };
}

function evidenceIndex(records=[]){
  const index=new Map();
  for(const record of Array.isArray(records)?records:[]){
    const checked=validateMediaOutputEvidence(record);
    if(!checked.valid||!checked.capability) continue;
    const previous=index.get(checked.capability);
    index.set(checked.capability,{liveVerified:true,qualityVerified:Boolean(checked.qualityVerified||previous?.qualityVerified)});
  }
  return index;
}

function providerForTask(task,providers={}){
  if(task.modality==='image') return providers.image||{};
  if(task.capability==='timeline-render') return providers.videoRenderer||{};
  if(task.modality==='video'||task.modality==='audio') return providers.videoGeneration||{};
  return {};
}

function blockersFor({task,provider,providerSupports,evidence}){
  const blockers=[];
  if(!provider.configured) blockers.push('PROVIDER_NOT_CONFIGURED');
  else if(!providerSupports) blockers.push('PROVIDER_CAPABILITY_NOT_DECLARED');
  if(provider.blockedByCostPolicy) blockers.push('COST_POLICY_BLOCKED');
  if(providerSupports&&!provider.connected) blockers.push('PROVIDER_NOT_CONNECTED');
  if(!evidence?.liveVerified) blockers.push('REAL_PRODUCTION_OUTPUT_EVIDENCE_REQUIRED');
  if(evidence?.liveVerified&&!evidence?.qualityVerified) blockers.push('REAL_OUTPUT_QUALITY_EVIDENCE_REQUIRED');
  if(task.localFallback && !evidence?.liveVerified) blockers.push('LOCAL_FALLBACK_IS_NOT_LIVE_PROVIDER_EVIDENCE');
  return blockers;
}

export function buildCreativeMediaReadinessMatrix({
  providers={},
  outputEvidence=[],
  ciVerified=false,
}={}){
  const evidence=evidenceIndex(outputEvidence);
  const tasks=listCreativeMediaTasks().map(task=>{
    const provider=providerForTask(task,providers);
    const caps=normalizeSet(provider.capabilities);
    const providerSupports=Boolean(provider.configured&&caps.has(String(task.capability).toLowerCase()));
    const providerConnected=Boolean(providerSupports&&provider.connected&&!provider.blockedByCostPolicy);
    const taskEvidence=evidence.get(String(task.capability).toLowerCase())||null;
    const liveProviderVerified=Boolean(providerConnected&&taskEvidence?.liveVerified);
    const realOutputQualityVerified=Boolean(liveProviderVerified&&taskEvidence?.qualityVerified);
    return freeze({
      taskId:task.id,
      modality:task.modality,
      capability:task.capability,
      codeReady:true,
      ciReady:Boolean(ciVerified),
      providerReady:providerSupports,
      providerConnected,
      liveProviderVerified,
      realOutputQualityVerified,
      localFallback:Boolean(task.localFallback),
      blockers:blockersFor({task,provider,providerSupports,evidence:taskEvidence}),
    });
  });
  const count=key=>tasks.filter(task=>task[key]===true).length;
  return freeze({
    generatedAt:new Date().toISOString(),
    total:tasks.length,
    summary:freeze({
      codeReady:count('codeReady'),
      ciReady:count('ciReady'),
      providerReady:count('providerReady'),
      providerConnected:count('providerConnected'),
      liveProviderVerified:count('liveProviderVerified'),
      realOutputQualityVerified:count('realOutputQualityVerified'),
    }),
    tasks,
    truthRule:'CODE READY, CI READY, PROVIDER READY, PROVIDER CONNECTED, LIVE PROVIDER VERIFIED and REAL OUTPUT QUALITY VERIFIED are independent evidence stages.',
  });
}

export function filterCreativeMediaReadiness(matrix,{surface}={}){
  const wanted=String(surface||'').trim().toLowerCase();
  if(!wanted) return matrix;
  const tasks=matrix.tasks.filter(task=>wanted==='image'?task.modality==='image':wanted==='video'?(task.modality==='video'||task.modality==='audio'):task.modality===wanted);
  const count=key=>tasks.filter(task=>task[key]===true).length;
  return freeze({...matrix,total:tasks.length,summary:freeze({codeReady:count('codeReady'),ciReady:count('ciReady'),providerReady:count('providerReady'),providerConnected:count('providerConnected'),liveProviderVerified:count('liveProviderVerified'),realOutputQualityVerified:count('realOutputQualityVerified')}),tasks});
}
