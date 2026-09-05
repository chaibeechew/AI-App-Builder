import { getCreativeMediaTask } from './creative-media-control-plane.js';

const freeze=value=>Object.freeze(value);
const OPAQUE_ID=/^[A-Za-z0-9._:-]{1,180}$/;
const CHANNELS=freeze(['app','website','game','ios-store','android-store','social-vertical','social-square','social-landscape','ad','presentation']);
const COST_MODES=freeze(['zero','free','balanced','paid']);

function clean(value,max=1000){return String(value||'').replace(/[\u0000-\u001f\u007f]/g,' ').replace(/\s+/g,' ').trim().slice(0,max);}
function id(value){const raw=typeof value==='string'?value:value?.assetId;const out=clean(raw,180);return OPAQUE_ID.test(out)?out:null;}
function ids(value,max=12){return (Array.isArray(value)?value:[value]).map(id).filter(Boolean).slice(0,max);}
function unique(values){return [...new Set(values.filter(Boolean))];}

const CHANNEL_RECIPES=freeze({
  app:['image.generate','video.storyboard','video.timeline-render'],
  website:['image.generate','image.brand-consistency','video.storyboard','video.timeline-render'],
  game:['image.generate','image.identity-series','video.storyboard','video.thumbnail'],
  'ios-store':['image.brand-consistency','video.storyboard','video.timeline-render'],
  'android-store':['image.brand-consistency','video.storyboard','video.timeline-render'],
  'social-vertical':['image.generate','video.generate','video.caption-integrate','video.thumbnail'],
  'social-square':['image.generate','video.generate','video.caption-integrate','video.thumbnail'],
  'social-landscape':['image.generate','video.generate','video.caption-integrate','video.thumbnail'],
  ad:['image.product-series','video.generate','video.audio-generate','video.caption-integrate','video.thumbnail'],
  presentation:['image.generate','image.brand-consistency','video.thumbnail']
});

export const CREATIVE_CAMPAIGN_POLICY=freeze({
  maxChannels:10,maxStages:40,maxReferenceAssets:12,qualityGateEveryGeneratedAsset:true,
  premiumRequiresExplicitPermission:true,providerConnected:false,liveProviderVerified:false,realOutputQualityVerified:false
});

export function buildCreativeCampaignPlan({
  goal='',channels=['website'],brandKitId='',productAssets=[],identityAssets=[],language='en',
  budgetMode='zero',premiumAllowed=false,includeVoice=true,includeMusic=true
}={}){
  const brief=clean(goal,3000);if(!brief)return freeze({ok:false,code:'CREATIVE_CAMPAIGN_GOAL_REQUIRED'});
  const selected=unique((Array.isArray(channels)?channels:[channels]).map(v=>clean(v,40).toLowerCase()).filter(v=>CHANNELS.includes(v))).slice(0,CREATIVE_CAMPAIGN_POLICY.maxChannels);
  if(!selected.length)return freeze({ok:false,code:'CREATIVE_CAMPAIGN_CHANNEL_REQUIRED'});
  const mode=COST_MODES.includes(clean(budgetMode,20).toLowerCase())?clean(budgetMode,20).toLowerCase():'zero';
  const premium=mode==='paid'||mode==='balanced'?premiumAllowed===true:false;
  const productAssetIds=ids(productAssets),identityAssetIds=ids(identityAssets);
  const stages=[];const capabilities=[];let cursor=0;
  const addStage=(taskId,channel,dependsOn=[])=>{
    const spec=getCreativeMediaTask(taskId);if(!spec)return null;
    const stage=freeze({id:`stage-${++cursor}`,channel,task:taskId,capability:spec.capability,modality:spec.modality,
      dependsOn:freeze([...dependsOn]),qualityGate:true,durableAssetRequired:spec.outputs?.some(v=>['image','video','audio'].includes(v))===true,
      providerEvidenceRequired:spec.localFallback!==true});
    stages.push(stage);capabilities.push(spec.capability);return stage.id;
  };
  const promptStage=addStage('image.prompt-enhance','global',[]);
  for(const channel of selected){
    let deps=promptStage?[promptStage]:[];
    for(const taskId of CHANNEL_RECIPES[channel]||[]){
      if(taskId==='image.product-series'&&!productAssetIds.length)continue;
      if(taskId==='image.identity-series'&&!identityAssetIds.length)continue;
      const stageId=addStage(taskId,channel,deps);if(stageId)deps=[stageId];
      if(stages.length>=CREATIVE_CAMPAIGN_POLICY.maxStages)break;
    }
    if(includeVoice&&['ad','social-vertical','social-square','social-landscape'].includes(channel)){
      const audioStage=addStage('video.audio-generate',channel,deps);if(audioStage)deps=[audioStage];
    }
  }
  if(!stages.length)return freeze({ok:false,code:'CREATIVE_CAMPAIGN_NO_VALID_STAGES'});
  return freeze({
    ok:true,schemaVersion:1,brief,channels:freeze(selected),language:clean(language,24)||'en',
    references:freeze({brandKitId:clean(brandKitId,160)||null,productAssetIds:freeze(productAssetIds),identityAssetIds:freeze(identityAssetIds)}),
    policy:freeze({budgetMode:mode,premiumAllowed:premium,includeVoice:includeVoice===true,includeMusic:includeMusic===true,
      failClosedOnQualityReject:true,retryOrder:freeze(['prompt-repair','same-provider-regenerate','provider-fallback','candidate-compare','fail-closed'])}),
    stages:freeze(stages),requiredCapabilities:freeze(unique(capabilities)),referencesRequireOwnerValidation:true,
    completion:freeze({requiresAllBlockingStages:true,requiresQualityPass:true,requiresDurableAssets:true,requiresProvenance:true}),
    truth:freeze({codeReady:true,providerConnected:false,liveProviderVerified:false,productionVerified:false,realOutputQualityVerified:false,evidenceRequired:true})
  });
}
