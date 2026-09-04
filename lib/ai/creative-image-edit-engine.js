import { getCreativeMediaTask } from './creative-media-control-plane.js';

const freeze=value=>Object.freeze(value);
const OPAQUE_ID=/^[A-Za-z0-9._:-]{1,180}$/;
const OPERATIONS=freeze({
  remove:'image.remove-object',replace:'image.replace-object',insert:'image.insert-object',
  inpaint:'image.inpaint','generative-fill':'image.generative-fill',recolor:'image.recolor',
  relight:'image.relight',blur:'image.edit',sharpen:'image.edit'
});
const ASPECTS=freeze(['16:9','9:16','1:1','4:5','3:2','2:3','3:4','4:3']);
const MAX_REGIONS=16,MAX_TEXT=8;

function clean(value,max=1000){return String(value||'').replace(/[\u0000-\u001f\u007f]/g,' ').replace(/\s+/g,' ').trim().slice(0,max);}
function number(value,min,max,fallback=null){const n=Number(value);return Number.isFinite(n)?Math.max(min,Math.min(max,n)):fallback;}
function id(value){const raw=typeof value==='string'?value:value?.assetId;const out=clean(raw,180);return OPAQUE_ID.test(out)?out:null;}
function ids(value,max=12){return (Array.isArray(value)?value:[value]).map(id).filter(Boolean).slice(0,max);}
function unique(values){return [...new Set(values.filter(Boolean))];}

export const PRO_IMAGE_EDIT_POLICY=freeze({
  maxRegions:MAX_REGIONS,maxTextLayers:MAX_TEXT,maxVariants:4,maxCanvasDimension:8192,
  rawReferenceUrlsAllowed:false,ownerValidationRequired:true,providerConnected:false,liveProviderVerified:false,realOutputQualityVerified:false
});

export function buildProImageEditPlan({
  sourceImage,regions=[],layout={},textLayers=[],styleReference=null,poseReference=null,compositionReference=null,
  output={},variants=1,seed=null
}={}){
  const sourceAssetId=id(sourceImage);if(!sourceAssetId)return freeze({ok:false,code:'PRO_IMAGE_SOURCE_REQUIRED'});
  const requested=(Array.isArray(regions)?regions:[]).slice(0,MAX_REGIONS);
  const steps=[];const capabilities=[];const quality=new Set(['promptAdherence','composition','lighting','detail','resolution']);
  for(let i=0;i<requested.length;i+=1){
    const row=requested[i]||{};const operation=clean(row.operation,40).toLowerCase();const taskId=OPERATIONS[operation];const task=getCreativeMediaTask(taskId);
    if(!task)return freeze({ok:false,code:'PRO_IMAGE_OPERATION_UNSUPPORTED',operation});
    const maskAssetId=id(row.mask);if(!maskAssetId)return freeze({ok:false,code:'PRO_IMAGE_REGION_MASK_REQUIRED',operation});
    const referenceObjectAssetIds=ids(row.referenceObjects,8);
    if(['replace','insert'].includes(operation)&&!referenceObjectAssetIds.length&&!clean(row.prompt,1000))return freeze({ok:false,code:'PRO_IMAGE_REPLACEMENT_GUIDANCE_REQUIRED',operation});
    steps.push(freeze({index:i,operation,task:taskId,capability:task.capability,maskAssetId,
      prompt:clean(row.prompt,1600)||null,negativePrompt:clean(row.negativePrompt,800)||null,
      referenceObjectAssetIds:freeze(referenceObjectAssetIds),strength:number(row.strength,0,100,null),
      palette:clean(row.palette,120)||null,feather:number(row.feather,0,100,8)}));
    capabilities.push(task.capability);
    if(['replace','insert','remove','inpaint','generative-fill'].includes(operation))quality.add('composition');
  }
  const safeText=(Array.isArray(textLayers)?textLayers:[]).slice(0,MAX_TEXT).map((row,index)=>freeze({
    id:clean(row?.id||`text-${index+1}`,80),text:clean(row?.text,500),placement:clean(row?.placement,80)||'auto',
    style:clean(row?.style,120)||null,priority:number(row?.priority,0,100,50)
  })).filter(row=>row.text);
  if(safeText.length){capabilities.push('text-rendering');quality.add('textRendering');}
  const styleReferenceAssetId=id(styleReference),poseReferenceAssetId=id(poseReference),compositionReferenceAssetId=id(compositionReference);
  if(styleReferenceAssetId)capabilities.push('style-transfer');
  if(poseReferenceAssetId)capabilities.push('pose-control');
  if(compositionReferenceAssetId)capabilities.push('composition-control');
  return freeze({
    ok:true,schemaVersion:1,sourceImageAssetId:sourceAssetId,steps:freeze(steps),textLayers:freeze(safeText),
    controls:freeze({
      subjectX:number(layout?.subjectX,0,100,null),subjectY:number(layout?.subjectY,0,100,null),
      subjectScale:number(layout?.subjectScale,10,300,null),rotationDegrees:number(layout?.rotationDegrees,-180,180,null),
      depth:clean(layout?.depth,40)||null,crop:clean(layout?.crop,80)||null,
      canvasWidth:number(layout?.canvasWidth,64,8192,null),canvasHeight:number(layout?.canvasHeight,64,8192,null),
      aspectRatio:ASPECTS.includes(clean(layout?.aspectRatio,20))?clean(layout?.aspectRatio,20):null
    }),
    references:freeze({styleReferenceAssetId,poseReferenceAssetId,compositionReferenceAssetId}),
    output:freeze({resolution:clean(output?.resolution,30)||null,transparent:output?.transparent===true,
      variants:Math.max(1,Math.min(4,Number(variants)||1)),seed:Number.isInteger(Number(seed))?Number(seed):null,durableCaptureRequired:true}),
    requiredCapabilities:freeze(unique(capabilities)),qualitySignals:freeze([...quality]),referencesRequireOwnerValidation:true,
    execution:freeze({nonDestructive:true,preserveOriginal:true,historyRequired:true,undoRequired:true,atomicEvidence:true}),
    truth:freeze({codeReady:true,providerConnected:false,liveProviderVerified:false,realOutputQualityVerified:false,evidenceRequired:true})
  });
}
