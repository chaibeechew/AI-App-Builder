const freeze=value=>Object.freeze(value);
const SAFE_ASSET_ID=/^[A-Za-z0-9][A-Za-z0-9:_-]{2,127}$/;
const FORBIDDEN_REF=/^(?:https?:|data:|blob:|file:)/i;

export const CREATIVE_AGENT_CONTRACT_VERSION='creative-agent/v1';

function clean(value){return String(value??'').trim();}
function bool(value){return value===true;}

export function normalizeCreativeAgentAssetIds(values=[]){
  if(!Array.isArray(values)) throw new Error('CREATIVE_AGENT_ASSET_IDS_INVALID');
  const out=[];
  for(const raw of values){
    const id=clean(raw);
    if(!id) continue;
    if(FORBIDDEN_REF.test(id)||!SAFE_ASSET_ID.test(id)) throw new Error('CREATIVE_AGENT_OWNER_SCOPED_ASSET_REQUIRED');
    if(!out.includes(id)) out.push(id);
  }
  return freeze(out);
}

export function buildCreativeAgentContract({
  brief={},
  assetIds=[],
  brandKitId=null,
  identityId=null,
  productId=null,
  publicRelease=false,
  regulatedClaims=false,
  likeness=false,
  costMode='zero',
  qualityTarget=88,
  maxAttempts=3,
}={}){
  const source=brief&&typeof brief==='object'?brief:{};
  const modality=clean(source.modality||'').toLowerCase();
  if(!['image','video','mixed'].includes(modality)) throw new Error('CREATIVE_AGENT_MODALITY_REQUIRED');
  const family=clean(source.family||source.creativeFamily||'general');
  const normalizedAssets=normalizeCreativeAgentAssetIds(assetIds);
  const mode=clean(costMode||'zero').toLowerCase();
  if(!['zero','free','standard'].includes(mode)) throw new Error('CREATIVE_AGENT_COST_MODE_UNSUPPORTED');
  const attempts=Math.max(1,Math.min(4,Math.trunc(Number(maxAttempts)||3)));
  const target=Math.max(70,Math.min(100,Number(qualityTarget)||88));
  const approvalReasons=[];
  if(bool(likeness)||clean(identityId)) approvalReasons.push('likeness');
  if(bool(publicRelease)&&clean(brandKitId)) approvalReasons.push('public-brand-release');
  if(bool(regulatedClaims)) approvalReasons.push('regulated-claim');
  if(bool(publicRelease)) approvalReasons.push('external-publish');
  return freeze({
    version:CREATIVE_AGENT_CONTRACT_VERSION,
    family,
    modality,
    goal:clean(source.goal||'create'),
    platform:clean(source.platform||'unspecified'),
    deliverable:clean(source.deliverable||'media-candidate'),
    assetIds:normalizedAssets,
    brandKitId:clean(brandKitId)||null,
    identityId:clean(identityId)||null,
    productId:clean(productId)||null,
    costMode:mode,
    qualityTarget:target,
    maxAttempts:attempts,
    approvalReasons:freeze([...new Set(approvalReasons)]),
    privateChainOfThoughtStored:false,
    providerInvocationAllowed:false,
    automaticPublishAllowed:false,
  });
}
