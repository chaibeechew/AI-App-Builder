const MAX_KEYFRAMES=256;
const EASINGS=new Set(['linear','ease-in','ease-out','ease-in-out','step','hold','spring-soft','spring-medium']);
function clean(value,max=80){return String(value ?? '').replace(/\s+/g,' ').trim().slice(0,max);}
function finite(value){const n=Number(value);return Number.isFinite(n)?n:null;}
function bounded(value,min,max,fallback){const n=finite(value);return n===null?fallback:Math.min(max,Math.max(min,n));}
function normalizeProperties(value={}){
  const source=value&&typeof value==='object'?value:{};
  return {
    x:source.x===undefined?null:bounded(source.x,0,1,null),
    y:source.y===undefined?null:bounded(source.y,0,1,null),
    scale:source.scale===undefined?null:bounded(source.scale,0.05,8,null),
    rotationDegrees:source.rotationDegrees===undefined?null:bounded(source.rotationDegrees,-1080,1080,null),
    opacity:source.opacity===undefined?null:bounded(source.opacity,0,1,null),
    motionStrength:source.motionStrength===undefined?null:bounded(source.motionStrength,0,1,null),
    speed:source.speed===undefined?null:bounded(source.speed,0,4,null),
  };
}
export function buildCreativeTemporalKeyframes(input={}){
  const durationSeconds=bounded(input.durationSeconds,0.5,600,null);
  if(durationSeconds===null) return {ok:false,code:'CREATIVE_TEMPORAL_DURATION_INVALID'};
  const source=Array.isArray(input.keyframes)?input.keyframes:[];
  if(source.length<2) return {ok:false,code:'CREATIVE_TEMPORAL_KEYFRAMES_REQUIRED'};
  if(source.length>MAX_KEYFRAMES) return {ok:false,code:'CREATIVE_TEMPORAL_KEYFRAME_LIMIT_EXCEEDED'};
  const normalized=[];
  for(let index=0;index<source.length;index+=1){
    const item=source[index]&&typeof source[index]==='object'?source[index]:{};
    const timeSeconds=finite(item.timeSeconds);
    if(timeSeconds===null||timeSeconds<0||timeSeconds>durationSeconds) return {ok:false,code:'CREATIVE_TEMPORAL_TIME_INVALID',index};
    const easing=clean(item.easing||'linear',40).toLowerCase();
    if(!EASINGS.has(easing)) return {ok:false,code:'CREATIVE_TEMPORAL_EASING_INVALID',index};
    const subjectId=clean(item.subjectId,80);
    if(!subjectId) return {ok:false,code:'CREATIVE_TEMPORAL_SUBJECT_REQUIRED',index};
    const properties=normalizeProperties(item.properties);
    if(Object.values(properties).every(v=>v===null)) return {ok:false,code:'CREATIVE_TEMPORAL_PROPERTIES_REQUIRED',index};
    normalized.push({
      keyframeId:`kf-${String(index+1).padStart(3,'0')}`,
      subjectId,
      timeSeconds:Number(timeSeconds.toFixed(3)),
      easing,
      properties,
      holdUntilSeconds:item.holdUntilSeconds===undefined?null:bounded(item.holdUntilSeconds,timeSeconds,durationSeconds,null),
    });
  }
  normalized.sort((a,b)=>a.timeSeconds-b.timeSeconds||a.subjectId.localeCompare(b.subjectId));
  for(let index=1;index<normalized.length;index+=1){
    const prev=normalized[index-1],cur=normalized[index];
    if(prev.subjectId===cur.subjectId&&prev.timeSeconds===cur.timeSeconds) return {ok:false,code:'CREATIVE_TEMPORAL_DUPLICATE_KEYFRAME',subjectId:cur.subjectId,timeSeconds:cur.timeSeconds};
  }
  return {
    ok:true,
    schemaVersion:'creative-temporal-keyframes.v1',
    durationSeconds,
    keyframeCount:normalized.length,
    keyframes:normalized,
    subjectIds:[...new Set(normalized.map(item=>item.subjectId))],
    cameraPropertiesAllowed:false,
    providerNeutral:true,
    providerNativeSupportVerified:false,
    truth:'CODE_READY',
  };
}
