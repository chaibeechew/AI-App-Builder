const MAX_REGIONS=32;
const MAX_KEYPOINTS=128;
function clean(value,max=120){return String(value ?? '').replace(/\s+/g,' ').trim().slice(0,max);}
function opaque(value){const id=String(value ?? '').trim();return /^[A-Za-z0-9][A-Za-z0-9._:-]{2,127}$/.test(id)&&!/^https?:\/\//i.test(id)&&!/^data:/i.test(id);}
function unit(value){const n=Number(value);return Number.isFinite(n)&&n>=0&&n<=1?n:null;}

function normalizeBox(box={}){
  const x=unit(box.x),y=unit(box.y),width=unit(box.width),height=unit(box.height);
  if([x,y,width,height].some(v=>v===null)||width<=0||height<=0||x+width>1.000001||y+height>1.000001) return null;
  return {x,y,width,height};
}

export function buildCreativeSpatialControls(input={}){
  const source=Array.isArray(input.regions)?input.regions:[];
  if(source.length>MAX_REGIONS) return {ok:false,code:'CREATIVE_SPATIAL_REGION_LIMIT_EXCEEDED'};
  const regions=[];
  let keypointCount=0;
  for(let index=0;index<source.length;index+=1){
    const item=source[index]&&typeof source[index]==='object'?source[index]:{};
    const box=normalizeBox(item.box);
    if(!box) return {ok:false,code:'CREATIVE_SPATIAL_BOX_INVALID',index};
    if(item.maskAssetId&&!opaque(item.maskAssetId)) return {ok:false,code:'CREATIVE_SPATIAL_MASK_ID_INVALID',index};
    if(item.segmentationAssetId&&!opaque(item.segmentationAssetId)) return {ok:false,code:'CREATIVE_SPATIAL_SEGMENTATION_ID_INVALID',index};
    if(item.depthAssetId&&!opaque(item.depthAssetId)) return {ok:false,code:'CREATIVE_SPATIAL_DEPTH_ID_INVALID',index};
    const points=[];
    const sourcePoints=Array.isArray(item.keypoints)?item.keypoints:[];
    keypointCount+=sourcePoints.length;
    if(keypointCount>MAX_KEYPOINTS) return {ok:false,code:'CREATIVE_SPATIAL_KEYPOINT_LIMIT_EXCEEDED'};
    for(let p=0;p<sourcePoints.length;p+=1){
      const point=sourcePoints[p]&&typeof sourcePoints[p]==='object'?sourcePoints[p]:{};
      const x=unit(point.x),y=unit(point.y),confidence=point.confidence===undefined?1:unit(point.confidence);
      if(x===null||y===null||confidence===null) return {ok:false,code:'CREATIVE_SPATIAL_KEYPOINT_INVALID',index,keypoint:p};
      points.push({name:clean(point.name||`point-${p+1}`,60),x,y,confidence});
    }
    regions.push({
      regionId:clean(item.regionId||`region-${String(index+1).padStart(3,'0')}`,80),
      label:clean(item.label||`region ${index+1}`,100),
      box,
      keypoints:points,
      maskAssetId:item.maskAssetId||null,
      segmentationAssetId:item.segmentationAssetId||null,
      depthAssetId:item.depthAssetId||null,
      prompt:clean(item.prompt,800)||null,
      negativePrompt:clean(item.negativePrompt,500)||null,
      preserve:item.preserve===true,
      strength:Math.min(1,Math.max(0,Number.isFinite(Number(item.strength))?Number(item.strength):1)),
    });
  }
  if(input.poseAssetId&&!opaque(input.poseAssetId)) return {ok:false,code:'CREATIVE_SPATIAL_POSE_ID_INVALID'};
  if(input.depthAssetId&&!opaque(input.depthAssetId)) return {ok:false,code:'CREATIVE_SPATIAL_DEPTH_ID_INVALID'};
  if(input.segmentationAssetId&&!opaque(input.segmentationAssetId)) return {ok:false,code:'CREATIVE_SPATIAL_SEGMENTATION_ID_INVALID'};
  return {
    ok:true,
    schemaVersion:'creative-spatial-control.v1',
    coordinateSpace:'normalized-0-1',
    regionCount:regions.length,
    keypointCount,
    regions,
    globalGuidance:{
      poseAssetId:input.poseAssetId||null,
      depthAssetId:input.depthAssetId||null,
      segmentationAssetId:input.segmentationAssetId||null,
    },
    providerNeutral:true,
    truth:'CODE_READY',
  };
}
