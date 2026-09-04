import { getCreativeMediaTask } from './creative-media-control-plane.js';
import { getCreativeCampaignPlatformSpec } from './creative-campaign-platform-specs.js';

const freeze=value=>Object.freeze(value);
const SAFE_ID=/^[A-Za-z0-9][A-Za-z0-9:_-]{2,127}$/;
const FORBIDDEN=/^(?:https?:|data:|blob:|file:)/i;

function clean(value){return String(value??'').trim();}
function stable(value){
  if(Array.isArray(value)) return `[${value.map(stable).join(',')}]`;
  if(value&&typeof value==='object') return `{${Object.keys(value).sort().map(k=>`${JSON.stringify(k)}:${stable(value[k])}`).join(',')}}`;
  return JSON.stringify(value);
}
function fnv1a(value){let h=0x811c9dc5;for(const ch of String(value)){h^=ch.charCodeAt(0);h=Math.imul(h,0x01000193)>>>0;}return h.toString(16).padStart(8,'0');}
function optionalId(value,label){const id=clean(value);if(!id)return null;if(FORBIDDEN.test(id)||!SAFE_ID.test(id))throw new Error(`${label}_INVALID`);return id;}

export function compileCreativeCampaign({
  brief={},
  targets=[],
  brandProfileId=null,
  identityProfileId=null,
  productProfileId=null,
  costMode='zero',
  masterAssetIds=[],
}={}){
  const source=brief&&typeof brief==='object'?brief:{};
  const prompt=clean(source.prompt||source.concept||source.summary);
  if(prompt.length<3) throw new Error('CREATIVE_CAMPAIGN_BRIEF_REQUIRED');
  const requested=[...new Set((Array.isArray(targets)?targets:[]).map(v=>clean(v).toLowerCase()).filter(Boolean))];
  if(requested.length===0) throw new Error('CREATIVE_CAMPAIGN_TARGET_REQUIRED');
  if(requested.length>12) throw new Error('CREATIVE_CAMPAIGN_TARGET_LIMIT_EXCEEDED');
  const assets=[...new Set((Array.isArray(masterAssetIds)?masterAssetIds:[]).map(v=>optionalId(v,'CREATIVE_CAMPAIGN_ASSET')).filter(Boolean))];
  const profiles=freeze({
    brandProfileId:optionalId(brandProfileId,'CREATIVE_CAMPAIGN_BRAND_PROFILE'),
    identityProfileId:optionalId(identityProfileId,'CREATIVE_CAMPAIGN_IDENTITY_PROFILE'),
    productProfileId:optionalId(productProfileId,'CREATIVE_CAMPAIGN_PRODUCT_PROFILE'),
  });
  const deliverables=requested.map((target,index)=>{
    const spec=getCreativeCampaignPlatformSpec(target);
    if(!spec) throw new Error(`CREATIVE_CAMPAIGN_TARGET_UNSUPPORTED:${target}`);
    if(!getCreativeMediaTask(spec.task)) throw new Error(`CREATIVE_CAMPAIGN_MEDIA_TASK_UNAVAILABLE:${spec.task}`);
    const continuityRequired=Boolean(profiles.brandProfileId||profiles.identityProfileId||profiles.productProfileId);
    return freeze({
      id:`deliverable-${index+1}`,
      target,
      mediaKind:spec.kind,
      task:spec.task,
      aspectRatio:spec.aspectRatio,
      width:spec.width,
      height:spec.height,
      durationSeconds:spec.durationSeconds||null,
      safeInsetPct:spec.safeInsetPct,
      deliverySurface:spec.delivery,
      prompt,
      continuityRequired,
      qualityEvidenceRequired:true,
      provenanceRequired:true,
      providerInvocation:false,
      autoPublish:false,
    });
  });
  const core={prompt,targets:requested,profiles,costMode:clean(costMode||'zero').toLowerCase(),masterAssetIds:assets,deliverables};
  return freeze({
    campaignId:`campaign_${fnv1a(stable(core))}`,
    ...core,
    compileOnly:true,
    providerInvocationAllowed:false,
    automaticPublishAllowed:false,
    privateChainOfThoughtStored:false,
  });
}
