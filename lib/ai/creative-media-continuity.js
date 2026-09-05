import { getCreativeMediaTask } from './creative-media-control-plane.js';

const freeze=value=>Object.freeze(value);
const clean=value=>String(value||'').trim();
const list=value=>Array.isArray(value)?value:[];
const clamp=value=>{const n=Number(value);return Number.isFinite(n)?Math.max(0,Math.min(100,n)):null;};

export const CREATIVE_MEDIA_CONTINUITY_POLICY=freeze({
  acceptScore:88,
  optimizeScore:76,
  maxAnchors:24,
  failClosedWhenRequiredEvidenceMissing:true,
});

export const IMAGE_CONTINUITY_DIMENSIONS=freeze([
  'identitySimilarity','faceSimilarity','productSimilarity','brandStyleSimilarity','compositionContinuity','referenceFidelity',
]);
export const VIDEO_CONTINUITY_DIMENSIONS=freeze([
  'identitySimilarity','faceSimilarity','productSimilarity','objectPersistence','wardrobeConsistency','sceneConsistency','shotContinuity','referenceFidelity',
]);

function unique(values){return [...new Set(values.filter(Boolean))];}
function hasAny(value,terms){return terms.some(term=>value.includes(term));}
function safeAnchor(value,type){const id=clean(typeof value==='string'?value:value?.assetId||value?.id);return id?freeze({type,id:id.slice(0,180)}):null;}

export function buildCreativeMediaContinuityContract({task,input={},context={}}={}){
  const id=clean(task).toLowerCase();
  const spec=getCreativeMediaTask(id);
  if(!spec)return freeze({ok:false,task:id||null,required:false,dimensions:freeze([]),anchors:freeze([]),hardRequirements:freeze([])});

  const people=Boolean(context.requiresPeople)||hasAny(id,['identity','face','avatar','lipsync','character']);
  const product=Boolean(context.requiresProductConsistency)||id.includes('product');
  const brand=Boolean(context.requiresBrandConsistency)||id.includes('brand');
  const multiShot=spec.modality==='video'&&(Boolean(context.requiresShotContinuity)||hasAny(id,['scene','extend','first-last','reference-video','character-consistency','product-consistency']));
  const dimensions=[];
  if(people)dimensions.push('identitySimilarity','faceSimilarity');
  if(product)dimensions.push('productSimilarity');
  if(brand&&spec.modality==='image')dimensions.push('brandStyleSimilarity');
  if(spec.modality==='image'&&(people||product||brand))dimensions.push('compositionContinuity','referenceFidelity');
  if(spec.modality==='video'){
    if(people)dimensions.push('wardrobeConsistency');
    if(people||product)dimensions.push('objectPersistence');
    if(multiShot)dimensions.push('sceneConsistency','shotContinuity');
    if(people||product||multiShot)dimensions.push('referenceFidelity');
  }

  const anchors=[];
  for(const [type,value] of [['identity',input.identityId],['product',input.productId],['brand',input.brandKitId],['style',input.styleReference],['pose',input.poseReference],['composition',input.compositionReference]]){
    const anchor=safeAnchor(value,type);if(anchor)anchors.push(anchor);
  }
  for(const value of list(input.referenceImages)){
    const anchor=safeAnchor(value,'reference-image');if(anchor)anchors.push(anchor);
  }
  for(const value of list(input.referenceVideos)){
    const anchor=safeAnchor(value,'reference-video');if(anchor)anchors.push(anchor);
  }
  const hardRequirements=[];
  if(people&&!anchors.some(a=>['identity','reference-image','reference-video'].includes(a.type)))hardRequirements.push('identity-anchor-required');
  if(product&&!anchors.some(a=>['product','reference-image','reference-video'].includes(a.type)))hardRequirements.push('product-anchor-required');
  if(brand&&!anchors.some(a=>['brand','style','reference-image'].includes(a.type)))hardRequirements.push('brand-anchor-required');

  return freeze({
    ok:true,task:id,modality:spec.modality,required:dimensions.length>0,
    dimensions:freeze(unique(dimensions)),anchors:freeze(anchors.slice(0,CREATIVE_MEDIA_CONTINUITY_POLICY.maxAnchors)),
    hardRequirements:freeze(hardRequirements),
    rule:'Identity, product, brand and shot continuity are accepted only from measured observations bound to explicit owner-scoped anchors.',
  });
}

export function assessCreativeMediaContinuity({task,input={},observations={},context={}}={}){
  const contract=buildCreativeMediaContinuityContract({task,input,context});
  if(!contract.ok)return freeze({ok:false,task:contract.task,required:false,score:0,decision:'reject',productionEligible:false,hardBlockers:freeze(['unsupported-task']),missing:freeze([]),dimensions:freeze([]),contract});
  if(!contract.required&&contract.hardRequirements.length===0)return freeze({ok:true,task:contract.task,required:false,score:100,decision:'accept',productionEligible:true,hardBlockers:freeze([]),missing:freeze([]),dimensions:freeze([]),contract});

  const measured=contract.dimensions.map(id=>({id,score:clamp(observations?.[id])}));
  const missing=measured.filter(row=>row.score===null).map(row=>row.id);
  const hardBlockers=[...contract.hardRequirements];
  if(missing.length&&CREATIVE_MEDIA_CONTINUITY_POLICY.failClosedWhenRequiredEvidenceMissing)hardBlockers.push('continuity-evidence-missing');
  const present=measured.filter(row=>row.score!==null);
  const score=present.length?Number((present.reduce((sum,row)=>sum+row.score,0)/present.length).toFixed(2)):0;
  let decision='reject';
  if(!hardBlockers.length&&score>=CREATIVE_MEDIA_CONTINUITY_POLICY.acceptScore)decision='accept';
  else if(!hardBlockers.length&&score>=CREATIVE_MEDIA_CONTINUITY_POLICY.optimizeScore)decision='optimize';
  return freeze({
    ok:true,task:contract.task,required:contract.required,score,decision,productionEligible:decision==='accept',
    hardBlockers:freeze(unique(hardBlockers)),missing:freeze(missing),dimensions:freeze(measured.map(row=>freeze(row))),contract,
  });
}

export function buildContinuityRepairGuidance({assessment}={}){
  const result=assessment&&typeof assessment==='object'?assessment:{};
  const low=list(result.dimensions).filter(row=>Number(row?.score)<CREATIVE_MEDIA_CONTINUITY_POLICY.acceptScore).map(row=>row.id);
  const hints=[];
  if(low.some(id=>['identitySimilarity','faceSimilarity'].includes(id)))hints.push('Lock the same identity reference, facial geometry, age cues, hair and distinguishing features across every candidate.');
  if(low.includes('wardrobeConsistency'))hints.push('Lock wardrobe colors, materials, accessories and garment geometry between shots.');
  if(low.some(id=>['productSimilarity','objectPersistence'].includes(id)))hints.push('Lock product silhouette, proportions, labels, logo placement and persistent object state.');
  if(low.includes('brandStyleSimilarity'))hints.push('Reapply the Brand Kit palette, typography hierarchy, logo rules and visual style reference.');
  if(low.some(id=>['sceneConsistency','shotContinuity'].includes(id)))hints.push('Carry forward scene layout, lighting direction, subject position and end-frame state into the next shot.');
  if(low.includes('referenceFidelity'))hints.push('Increase reference fidelity while preserving the requested composition and motion intent.');
  return freeze({action:hints.length?'repair-continuity':'none',hints:freeze(hints.slice(0,8)),lowDimensions:freeze(low)});
}
