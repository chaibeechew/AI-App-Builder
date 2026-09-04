const MAX_REGIONS=32;
const MAX_PATH_POINTS=64;
const MODES=new Set(['translate','follow-path','oscillate','rotate','scale','deform','hold','freeze']);
function clean(value,max=120){return String(value ?? '').replace(/\s+/g,' ').trim().slice(0,max);}
function opaque(value){const id=String(value ?? '').trim();return /^[A-Za-z0-9][A-Za-z0-9._:-]{2,127}$/.test(id)&&!/^https?:\/\//i.test(id)&&!/^data:/i.test(id);}
function unit(value){const n=Number(value);return Number.isFinite(n)&&n>=0&&n<=1?n:null;}
function bounded(value,min,max,fallback){const n=Number(value);return Number.isFinite(n)?Math.min(max,Math.max(min,n)):fallback;}
function point(value={}){
  const x=unit(value.x),y=unit(value.y);
  if(x===null||y===null) return null;
  return {x,y,tension:bounded(value.tension,0,1,0.5)};
}
export function buildCreativeMotionMap(input={}){
  const durationSeconds=bounded(input.durationSeconds,0.5,600,null);
  if(durationSeconds===null) return {ok:false,code:'CREATIVE_MOTION_DURATION_INVALID'};
  const source=Array.isArray(input.regions)?input.regions:[];
  if(!source.length) return {ok:false,code:'CREATIVE_MOTION_REGION_REQUIRED'};
  if(source.length>MAX_REGIONS) return {ok:false,code:'CREATIVE_MOTION_REGION_LIMIT_EXCEEDED'};
  const regions=[];
  let totalPathPoints=0;
  for(let index=0;index<source.length;index+=1){
    const item=source[index]&&typeof source[index]==='object'?source[index]:{};
    const mode=clean(item.mode||'translate',40).toLowerCase();
    if(!MODES.has(mode)) return {ok:false,code:'CREATIVE_MOTION_MODE_INVALID',index};
    if(item.maskAssetId&&!opaque(item.maskAssetId)) return {ok:false,code:'CREATIVE_MOTION_MASK_ID_INVALID',index};
    if(item.trackingAssetId&&!opaque(item.trackingAssetId)) return {ok:false,code:'CREATIVE_MOTION_TRACKING_ID_INVALID',index};
    const box=item.box&&typeof item.box==='object'?item.box:null;
    let normalizedBox=null;
    if(box){
      const x=unit(box.x),y=unit(box.y),width=unit(box.width),height=unit(box.height);
      if([x,y,width,height].some(v=>v===null)||width<=0||height<=0||x+width>1.000001||y+height>1.000001) return {ok:false,code:'CREATIVE_MOTION_BOX_INVALID',index};
      normalizedBox={x,y,width,height};
    }
    const rawPath=Array.isArray(item.path)?item.path:[];
    totalPathPoints+=rawPath.length;
    if(totalPathPoints>MAX_PATH_POINTS) return {ok:false,code:'CREATIVE_MOTION_PATH_POINT_LIMIT_EXCEEDED'};
    const path=[];
    for(let p=0;p<rawPath.length;p+=1){
      const normalized=point(rawPath[p]);
      if(!normalized) return {ok:false,code:'CREATIVE_MOTION_PATH_POINT_INVALID',index,pathPoint:p};
      path.push(normalized);
    }
    if(mode==='follow-path'&&path.length<2) return {ok:false,code:'CREATIVE_MOTION_PATH_REQUIRED',index};
    const direction=item.direction&&typeof item.direction==='object'
      ? {x:bounded(item.direction.x,-1,1,0),y:bounded(item.direction.y,-1,1,0)}
      : {x:0,y:0};
    regions.push({
      motionId:`motion-${String(index+1).padStart(3,'0')}`,
      subjectId:clean(item.subjectId||`subject-${index+1}`,80),
      mode,
      box:normalizedBox,
      maskAssetId:item.maskAssetId||null,
      trackingAssetId:item.trackingAssetId||null,
      path,
      direction,
      speed:bounded(item.speed,0,4,1),
      strength:bounded(item.strength,0,1,1),
      startSeconds:bounded(item.startSeconds,0,durationSeconds,0),
      endSeconds:bounded(item.endSeconds,0,durationSeconds,durationSeconds),
      preserveIdentity:item.preserveIdentity!==false,
      preserveGeometry:item.preserveGeometry!==false,
      preserveBackground:item.preserveBackground===true,
      loop:item.loop===true,
    });
    const r=regions.at(-1);
    if(r.endSeconds<=r.startSeconds) return {ok:false,code:'CREATIVE_MOTION_TIME_RANGE_INVALID',index};
  }
  return {
    ok:true,
    schemaVersion:'creative-motion-map.v1',
    durationSeconds,
    regionCount:regions.length,
    totalPathPoints,
    regions,
    coordinateSpace:'normalized-0-1',
    cameraMotionIncluded:false,
    providerNeutral:true,
    providerNativeSupportVerified:false,
    truth:'CODE_READY',
  };
}
