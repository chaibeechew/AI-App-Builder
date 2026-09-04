const MAX_SUBJECTS=16;
const MAX_WINDOWS=128;
const LOOP_MODES=new Set(['none','seamless','ping-pong']);
function clean(value,max=100){return String(value ?? '').replace(/\s+/g,' ').trim().slice(0,max);}
function bounded(value,min,max,fallback){const n=Number(value);return Number.isFinite(n)?Math.min(max,Math.max(min,n)):fallback;}
function opaque(value){const id=String(value ?? '').trim();return /^[A-Za-z0-9][A-Za-z0-9._:-]{2,127}$/.test(id)&&!/^https?:\/\//i.test(id)&&!/^data:/i.test(id);}
export function buildCreativeMotionChoreography(input={}){
  const durationSeconds=bounded(input.durationSeconds,0.5,600,null);
  if(durationSeconds===null) return {ok:false,code:'CREATIVE_CHOREOGRAPHY_DURATION_INVALID'};
  const source=Array.isArray(input.subjects)?input.subjects:[];
  if(!source.length||source.length>MAX_SUBJECTS) return {ok:false,code:'CREATIVE_CHOREOGRAPHY_SUBJECT_COUNT_INVALID'};
  const subjects=[];
  const ids=new Set();
  let windowCount=0;
  for(let index=0;index<source.length;index+=1){
    const item=source[index]&&typeof source[index]==='object'?source[index]:{};
    const subjectId=clean(item.subjectId,80);
    if(!subjectId||ids.has(subjectId)) return {ok:false,code:'CREATIVE_CHOREOGRAPHY_SUBJECT_ID_INVALID',index};
    ids.add(subjectId);
    if(item.referenceAssetId&&!opaque(item.referenceAssetId)) return {ok:false,code:'CREATIVE_CHOREOGRAPHY_REFERENCE_ID_INVALID',index};
    if(item.trackingAssetId&&!opaque(item.trackingAssetId)) return {ok:false,code:'CREATIVE_CHOREOGRAPHY_TRACKING_ID_INVALID',index};
    const rawWindows=Array.isArray(item.windows)?item.windows:[];
    windowCount+=rawWindows.length;
    if(windowCount>MAX_WINDOWS) return {ok:false,code:'CREATIVE_CHOREOGRAPHY_WINDOW_LIMIT_EXCEEDED'};
    const windows=[];
    for(let w=0;w<rawWindows.length;w+=1){
      const win=rawWindows[w]&&typeof rawWindows[w]==='object'?rawWindows[w]:{};
      const startSeconds=bounded(win.startSeconds,0,durationSeconds,null);
      const endSeconds=bounded(win.endSeconds,0,durationSeconds,null);
      if(startSeconds===null||endSeconds===null||endSeconds<=startSeconds) return {ok:false,code:'CREATIVE_CHOREOGRAPHY_WINDOW_INVALID',index,window:w};
      windows.push({
        windowId:`${subjectId}-window-${String(w+1).padStart(3,'0')}`,
        startSeconds,
        endSeconds,
        action:clean(win.action||'move',160),
        targetSubjectId:clean(win.targetSubjectId,80)||null,
        preserveIdentity:win.preserveIdentity!==false,
        preserveGeometry:win.preserveGeometry!==false,
        freeze:win.freeze===true,
      });
    }
    subjects.push({
      subjectId,
      referenceAssetId:item.referenceAssetId||null,
      trackingAssetId:item.trackingAssetId||null,
      role:clean(item.role||'subject',80),
      priority:Math.round(bounded(item.priority,0,100,50)),
      collisionGroup:clean(item.collisionGroup||'default',60),
      preserveIdentity:item.preserveIdentity!==false,
      preserveGeometry:item.preserveGeometry!==false,
      windows,
    });
  }
  const allIds=new Set(subjects.map(s=>s.subjectId));
  for(const subject of subjects)for(const win of subject.windows){
    if(win.targetSubjectId&&!allIds.has(win.targetSubjectId)) return {ok:false,code:'CREATIVE_CHOREOGRAPHY_TARGET_SUBJECT_MISSING',subjectId:subject.subjectId,targetSubjectId:win.targetSubjectId};
  }
  const loopMode=clean(input.loopMode||'none',30).toLowerCase();
  if(!LOOP_MODES.has(loopMode)) return {ok:false,code:'CREATIVE_CHOREOGRAPHY_LOOP_MODE_INVALID'};
  const separation=bounded(input.minimumSubjectSeparation,0,1,0);
  return {
    ok:true,
    schemaVersion:'creative-motion-choreography.v1',
    durationSeconds,
    subjectCount:subjects.length,
    windowCount,
    subjects,
    constraints:{
      minimumSubjectSeparation:separation,
      collisionAvoidance:input.collisionAvoidance!==false,
      occlusionPreservation:input.occlusionPreservation!==false,
      loopMode,
      loopBoundaryContinuityRequired:loopMode!=='none',
    },
    cameraMotionIncluded:false,
    failClosedOnMissingSubject:true,
    providerNeutral:true,
    providerNativeSupportVerified:false,
    truth:'CODE_READY',
  };
}
