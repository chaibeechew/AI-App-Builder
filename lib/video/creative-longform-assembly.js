const MAX_SHOTS=120;
const MAX_DURATION=1800;
const TRANSITIONS=new Set(['cut','fade','dissolve','match-cut','whip']);
function clean(value,max=200){return String(value ?? '').replace(/\s+/g,' ').trim().slice(0,max);}
function validId(value){const id=String(value ?? '').trim();return /^[A-Za-z0-9][A-Za-z0-9._:-]{2,127}$/.test(id)&&!/^https?:\/\//i.test(id)&&!/^data:/i.test(id);}

export function buildCreativeLongformAssembly(input={}){
  const source=Array.isArray(input.shots)?input.shots:[];
  if(!source.length||source.length>MAX_SHOTS) return {ok:false,code:'CREATIVE_ASSEMBLY_SHOT_COUNT_INVALID'};
  let cursor=0;
  const timeline=[];
  for(let index=0;index<source.length;index+=1){
    const shot=source[index]&&typeof source[index]==='object'?source[index]:{};
    if(!validId(shot.assetId)) return {ok:false,code:'CREATIVE_ASSEMBLY_ASSET_ID_INVALID',index};
    const duration=Number(shot.durationSeconds);
    if(!Number.isFinite(duration)||duration<=0||duration>120) return {ok:false,code:'CREATIVE_ASSEMBLY_SHOT_DURATION_INVALID',index};
    const transition=clean(shot.transition || (index===0?'cut':'cut'),30).toLowerCase();
    if(!TRANSITIONS.has(transition)) return {ok:false,code:'CREATIVE_ASSEMBLY_TRANSITION_INVALID',index};
    const requestedTransition=index===0?0:Number(shot.transitionSeconds ?? (transition==='cut'?0:0.35));
    if(!Number.isFinite(requestedTransition)||requestedTransition<0||requestedTransition>Math.min(2,duration/2)) return {ok:false,code:'CREATIVE_ASSEMBLY_TRANSITION_DURATION_INVALID',index};
    const startSeconds=Number(Math.max(0,cursor-requestedTransition).toFixed(3));
    const endSeconds=Number((startSeconds+duration).toFixed(3));
    cursor=endSeconds;
    if(cursor>MAX_DURATION) return {ok:false,code:'CREATIVE_ASSEMBLY_DURATION_EXCEEDED'};
    timeline.push({
      shotId:validId(shot.shotId)?String(shot.shotId):`shot-${String(index+1).padStart(3,'0')}`,
      assetId:String(shot.assetId),
      startSeconds,
      endSeconds,
      durationSeconds:duration,
      transition,
      transitionSeconds:requestedTransition,
      audioAssetId:shot.audioAssetId&&validId(shot.audioAssetId)?String(shot.audioAssetId):null,
      captionTrackId:shot.captionTrackId&&validId(shot.captionTrackId)?String(shot.captionTrackId):null,
    });
  }
  if(input.audioTrackId&&!validId(input.audioTrackId)) return {ok:false,code:'CREATIVE_ASSEMBLY_AUDIO_ID_INVALID'};
  if(input.captionTrackId&&!validId(input.captionTrackId)) return {ok:false,code:'CREATIVE_ASSEMBLY_CAPTION_ID_INVALID'};
  return {
    ok:true,
    schemaVersion:'creative-longform-assembly.v1',
    renderTask:'video.timeline-render',
    shotCount:timeline.length,
    durationSeconds:Number(cursor.toFixed(3)),
    timeline,
    output:{
      aspectRatio:clean(input.aspectRatio || '16:9',20),
      resolution:clean(input.resolution || '1080p',30),
      fps:Math.min(120,Math.max(1,Number(input.fps)||30)),
      audioTrackId:input.audioTrackId||null,
      captionTrackId:input.captionTrackId||null,
    },
    masteringRequired:true,
    durableCaptureRequired:true,
    reopenVerificationRequired:true,
    qualityGateRequired:true,
    failClosedOnMissingAsset:true,
    providerNeutral:true,
    truth:'CODE_READY',
  };
}
