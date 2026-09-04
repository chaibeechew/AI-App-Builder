const MAX_SHOTS=60;
const MAX_DURATION_SECONDS=600;
const MIN_SHOT_SECONDS=0.5;

function clean(value,max=1200){return String(value ?? '').replace(/\s+/g,' ').trim().slice(0,max);}
function validId(value){return /^[A-Za-z0-9][A-Za-z0-9._:-]{2,127}$/.test(String(value ?? '').trim())&&!/^https?:\/\//i.test(String(value ?? ''));}
function clamp(value,min,max){return Math.min(max,Math.max(min,value));}

function allocateDurations(total,count){
  const base=Math.floor((total/count)*1000)/1000;
  const values=Array.from({length:count},()=>base);
  const used=base*count;
  values[count-1]=Number((values[count-1]+(total-used)).toFixed(3));
  return values;
}

export function buildCreativeShotPlan(input={}){
  const goal=clean(input.goal,1200);
  if(!goal) return {ok:false,code:'CREATIVE_SHOT_GOAL_REQUIRED'};
  const beats=Array.isArray(input.storyBeats)?input.storyBeats:[];
  const requested=Number(input.shotCount || beats.length || 6);
  if(!Number.isInteger(requested)||requested<1||requested>MAX_SHOTS) return {ok:false,code:'CREATIVE_SHOT_COUNT_INVALID'};
  const duration=Number(input.durationSeconds || requested*3);
  if(!Number.isFinite(duration)||duration<requested*MIN_SHOT_SECONDS||duration>MAX_DURATION_SECONDS) return {ok:false,code:'CREATIVE_SHOT_DURATION_INVALID'};
  const continuityIds=[...(Array.isArray(input.identityLocks)?input.identityLocks:[]),...(Array.isArray(input.productLocks)?input.productLocks:[])];
  if(continuityIds.some(id=>!validId(id))) return {ok:false,code:'CREATIVE_SHOT_CONTINUITY_ID_INVALID'};
  const durations=allocateDurations(duration,requested);
  let cursor=0;
  const shots=[];
  for(let index=0;index<requested;index+=1){
    const beat=beats[index]&&typeof beats[index]==='object'?beats[index]:{};
    if(beat.referenceAssetId&&!validId(beat.referenceAssetId)) return {ok:false,code:'CREATIVE_SHOT_REFERENCE_ID_INVALID'};
    const shotDuration=durations[index];
    const startSeconds=Number(cursor.toFixed(3));
    const endSeconds=Number((startSeconds+shotDuration).toFixed(3));
    cursor=endSeconds;
    shots.push({
      shotId:`shot-${String(index+1).padStart(3,'0')}`,
      order:index+1,
      task:beat.referenceAssetId?'video.image-to-video':'video.scene-generate',
      prompt:clean(beat.prompt || beat.description || `${goal}; beat ${index+1}`,1800),
      referenceAssetId:beat.referenceAssetId||null,
      durationSeconds:shotDuration,
      startSeconds,
      endSeconds,
      transitionIn:index===0?'none':clean(beat.transitionIn || 'cut',40),
      framing:clean(beat.framing || input.defaultFraming || 'adaptive',80),
      camera:clean(beat.camera || input.camera || 'adaptive',300),
      motion:clean(beat.motion || input.motion || 'adaptive',300),
      continuity:{
        identityLocks:Array.isArray(input.identityLocks)?[...input.identityLocks]:[],
        productLocks:Array.isArray(input.productLocks)?[...input.productLocks]:[],
        styleLock:clean(input.styleLock,500)||null,
        strength:clamp(Number(input.continuityStrength ?? 0.85),0,1),
      },
      qualityGateRequired:true,
      durableAssetRequired:true,
    });
  }
  return {
    ok:true,
    schemaVersion:'creative-shot-plan.v1',
    goal,
    durationSeconds:Number(cursor.toFixed(3)),
    aspectRatio:clean(input.aspectRatio || '16:9',20),
    shotCount:shots.length,
    shots,
    audioPlan:input.audioPlan&&typeof input.audioPlan==='object'?{...input.audioPlan}:null,
    failClosedOnPartialShotFailure:true,
    providerNeutral:true,
    truth:'CODE_READY',
  };
}

export function validateCreativeShotPlan(plan={}){
  if(!plan.ok||!Array.isArray(plan.shots)||plan.shots.length<1||plan.shots.length>MAX_SHOTS) return {ok:false,code:'CREATIVE_SHOT_PLAN_INVALID'};
  let cursor=0;
  for(const shot of plan.shots){
    if(!validId(shot.shotId)||Number(shot.startSeconds)!==Number(cursor.toFixed(3))||Number(shot.endSeconds)<=Number(shot.startSeconds)) return {ok:false,code:'CREATIVE_SHOT_TIMELINE_INVALID'};
    cursor=Number(shot.endSeconds);
  }
  return {ok:true,durationSeconds:Number(cursor.toFixed(3)),shotCount:plan.shots.length};
}
