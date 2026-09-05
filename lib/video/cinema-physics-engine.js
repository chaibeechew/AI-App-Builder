const freeze=value=>Object.freeze(value);
const clean=value=>String(value||'').trim();
const clamp=(value,min,max,fallback)=>{const n=Number(value);return Number.isFinite(n)?Math.max(min,Math.min(max,n)):fallback;};
const list=value=>Array.isArray(value)?value:[];

export const VIDEO_CINEMA_PHYSICS_POLICY=freeze({
  acceptScore:88,
  optimizeScore:76,
  maxShots:12,
  maxDurationSeconds:180,
  supportedFps:freeze([24,25,30,48,50,60]),
  finishingResolutions:freeze(['720p','1080p','1440p','4k']),
});

export const VIDEO_CINEMA_PHYSICS_DIMENSIONS=freeze([
  'cameraIntentMatch','motionIntentMatch','physicsPlausibility','contactStability','temporalConsistency','endingStability','audioVideoSync',
]);

function normalizeResolution(value){const raw=clean(value).toLowerCase();if(['2160p','uhd','4k'].includes(raw))return'4k';if(['1440p','2k'].includes(raw))return'1440p';if(['1080p','fhd'].includes(raw))return'1080p';return'720p';}
function nearestFps(value){const wanted=clamp(value,1,120,24);return VIDEO_CINEMA_PHYSICS_POLICY.supportedFps.reduce((best,item)=>Math.abs(item-wanted)<Math.abs(best-wanted)?item:best,24);}
function buildShots(durationSeconds,inputShots,camera,motion){
  const supplied=list(inputShots).slice(0,VIDEO_CINEMA_PHYSICS_POLICY.maxShots);
  if(supplied.length)return supplied.map((shot,index)=>freeze({
    id:clean(shot?.id)||`shot-${index+1}`,durationSeconds:clamp(shot?.durationSeconds,0.5,30,Math.max(1,durationSeconds/supplied.length)),
    camera:clean(shot?.camera)||camera,motion:clean(shot?.motion)||motion,
    transition:index===0?'start':clean(shot?.transition)||'continuity-cut',preserveEndState:index<supplied.length-1,
  }));
  const count=Math.max(1,Math.min(VIDEO_CINEMA_PHYSICS_POLICY.maxShots,Math.ceil(durationSeconds/6)));
  return Array.from({length:count},(_,index)=>freeze({
    id:`shot-${index+1}`,durationSeconds:Number((durationSeconds/count).toFixed(2)),camera,motion,
    transition:index===0?'start':'continuity-cut',preserveEndState:index<count-1,
  }));
}

export function buildVideoCinemaPhysicsPlan({input={},context={}}={}){
  const durationSeconds=clamp(input.durationSeconds,1,VIDEO_CINEMA_PHYSICS_POLICY.maxDurationSeconds,8);
  const camera=clean(input.camera)||'stable subject-aware camera with bounded acceleration';
  const motion=clean(input.motion)||'natural subject-driven motion with continuous trajectories';
  const shots=buildShots(durationSeconds,input.shots,camera,motion);
  const hasSpeech=Boolean(input.audio)||Boolean(context.requiresLipSync)||Boolean(context.requiresSpeech);
  const physics=freeze([
    'preserve gravity direction and scale','preserve inertia and acceleration continuity','preserve contact, collision and support relationships',
    'avoid teleportation, object merging and geometry morphing','preserve mass, rigidity and articulated joint plausibility','carry end-of-shot object state into the next shot',
  ]);
  return freeze({
    schemaVersion:1,durationSeconds,aspectRatio:clean(input.aspectRatio)||'16:9',resolution:normalizeResolution(input.resolution),fps:nearestFps(input.fps),
    shots:freeze(shots),physics,cameraContract:freeze({intent:camera,maxAbruptDirectionChanges:context.allowWhipPan===true?2:0,horizonStability:context.handheld===true?'bounded':'stable'}),
    motionContract:freeze({intent:motion,subjectPersistence:true,backgroundPersistence:true,endingStability:true}),
    audioContract:freeze({required:hasSpeech,lipSyncRequired:Boolean(context.requiresLipSync),audioVideoSyncRequired:hasSpeech}),
    requiredSignals:freeze([...VIDEO_CINEMA_PHYSICS_DIMENSIONS.filter(id=>id!=='audioVideoSync'||hasSpeech)]),
    finishing:freeze({upscaleAllowed:true,targetResolution:normalizeResolution(input.resolution),frameInterpolationAllowed:Boolean(input.frameInterpolation),preserveFilmGrain:Boolean(context.preserveFilmGrain)}),
  });
}

export function assessVideoCinemaPhysicsEvidence({plan,observations={}}={}){
  const required=list(plan?.requiredSignals);
  if(!required.length)return freeze({ok:false,score:0,decision:'reject',productionEligible:false,missing:freeze(['cinema-plan-required']),dimensions:freeze([])});
  const dimensions=required.map(id=>{const n=Number(observations?.[id]);return freeze({id,score:Number.isFinite(n)?Math.max(0,Math.min(100,n)):null});});
  const missing=dimensions.filter(row=>row.score===null).map(row=>row.id);
  const present=dimensions.filter(row=>row.score!==null);
  const score=present.length?Number((present.reduce((sum,row)=>sum+row.score,0)/present.length).toFixed(2)):0;
  let decision='reject';
  if(!missing.length&&score>=VIDEO_CINEMA_PHYSICS_POLICY.acceptScore)decision='accept';
  else if(!missing.length&&score>=VIDEO_CINEMA_PHYSICS_POLICY.optimizeScore)decision='optimize';
  return freeze({ok:true,score,decision,productionEligible:decision==='accept',missing:freeze(missing),dimensions:freeze(dimensions)});
}
