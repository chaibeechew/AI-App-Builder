import fs from 'node:fs';

const registry=JSON.parse(fs.readFileSync(new URL('../../services/fabric/service-registry.json',import.meta.url),'utf8'));

export const SERVICE_OBSERVABILITY_POLICY=Object.freeze({version:'obs1',requiredStatuses:['healthy','degraded','down','unknown'],remoteLiveRequiresDistinctProductionEvidence:true,noSilentFallbackAfterUncertainRemoteMutation:true});

function normalizeStatus(value){const v=String(value||'unknown').toLowerCase();return SERVICE_OBSERVABILITY_POLICY.requiredStatuses.includes(v)?v:'unknown';}

export function buildServiceHealthSnapshot(statusByService={}){
  return Object.entries(registry.services).map(([id,service])=>{
    const input=statusByService?.[id]||{};
    const status=normalizeStatus(input.status);
    const mode=input.mode==='remote'?'remote':'embedded';
    const live=Boolean(input.liveVerified)&&mode==='remote'&&status==='healthy';
    return {id,root:service.root,mode,status,latencyMs:Number.isFinite(Number(input.latencyMs))?Math.max(0,Number(input.latencyMs)):null,liveVerified:live,evidenceLevel:live?'LIVE_STANDALONE':mode==='remote'?'REMOTE_READY':'CODE_EMBEDDED',safeToMutateRemotely:live&&status==='healthy'};
  });
}

export function planFabricRecovery(statusByService={}){
  const services=buildServiceHealthSnapshot(statusByService);
  const actions=services.map(service=>{
    if(service.status==='healthy')return {service:service.id,action:'none'};
    if(service.mode==='embedded')return {service:service.id,action:'stay_embedded_and_report_degraded'};
    if(service.liveVerified===false)return {service:service.id,action:'block_remote_mutation_and_require_evidence'};
    return {service:service.id,action:'quarantine_remote_mutations_and_require_operator_review'};
  });
  return {version:SERVICE_OBSERVABILITY_POLICY.version,overall:services.every(x=>x.status==='healthy')?'healthy':services.some(x=>x.status==='down')?'degraded':'attention',services,actions,evidenceLevel:'CODE_CI_CAPABILITY'};
}
