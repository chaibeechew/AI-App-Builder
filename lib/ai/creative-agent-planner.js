import { getCreativeMediaTask } from './creative-media-control-plane.js';
import { buildCreativeAgentContract } from './creative-agent-contract.js';

const freeze=value=>Object.freeze(value);

function fnv1a(value){
  let hash=0x811c9dc5;
  for(const ch of String(value)){
    hash^=ch.charCodeAt(0);
    hash=Math.imul(hash,0x01000193)>>>0;
  }
  return hash.toString(16).padStart(8,'0');
}
function stable(value){
  if(Array.isArray(value)) return `[${value.map(stable).join(',')}]`;
  if(value&&typeof value==='object'){
    return `{${Object.keys(value).sort().map(k=>`${JSON.stringify(k)}:${stable(value[k])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}
function unique(values){return [...new Set(values.filter(Boolean))];}

function chooseImageTask(contract){
  if(contract.identityId) return 'image.identity-series';
  if(contract.productId) return 'image.product-series';
  if(contract.brandKitId) return 'image.brand-consistency';
  if(contract.assetIds.length) return 'image.image-to-image';
  return 'image.generate';
}
function chooseVideoTask(contract){
  if(contract.identityId&&contract.assetIds.length) return 'video.character-consistency';
  if(contract.productId&&contract.assetIds.length) return 'video.product-consistency';
  if(contract.assetIds.length) return 'video.reference-video';
  return 'video.scene-generate';
}

export function buildCreativeAgentPlan(input={}){
  const contract=buildCreativeAgentContract(input);
  const requested=[];
  if(contract.modality==='image'||contract.modality==='mixed') requested.push(chooseImageTask(contract));
  if(contract.modality==='video'||contract.modality==='mixed') requested.push('video.storyboard',chooseVideoTask(contract),'video.timeline-render','video.thumbnail');
  const taskIds=unique(requested);
  for(const taskId of taskIds){
    if(!getCreativeMediaTask(taskId)) throw new Error(`CREATIVE_AGENT_TASK_UNAVAILABLE:${taskId}`);
  }
  const steps=[
    {id:'validate-brief',kind:'validation',requires:[]},
    {id:'prepare-assets',kind:'asset-preparation',requires:['validate-brief']},
    {id:'plan-media-tasks',kind:'planning',requires:['prepare-assets']},
    {id:'generate-candidates',kind:'generation-request',requires:['plan-media-tasks']},
    {id:'quality-judge',kind:'quality-gate',requires:['generate-candidates']},
    {id:'retry-or-fallback',kind:'recovery-gate',requires:['quality-judge']},
  ];
  if(contract.approvalReasons.length){
    steps.push({id:'human-approval',kind:'approval-gate',requires:['retry-or-fallback']});
    steps.push({id:'persist-assets',kind:'durable-persistence',requires:['human-approval']});
  }else{
    steps.push({id:'persist-assets',kind:'durable-persistence',requires:['retry-or-fallback']});
  }
  steps.push({id:'build-delivery-pack',kind:'delivery',requires:['persist-assets']});
  const planCore={contract,taskIds,steps};
  return freeze({
    planId:`cap_${fnv1a(stable(planCore))}`,
    ...planCore,
    executionAuthority:'planner-only',
    providerInvocation:false,
    automaticPublish:false,
  });
}
