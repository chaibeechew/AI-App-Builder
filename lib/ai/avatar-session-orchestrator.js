import {createAvatarRuntimeState,reduceAvatarRuntime} from "./avatar-runtime-engine.js";
import {createAvatarFaceRuntime,advanceAvatarFaceRuntime} from "./avatar-face-runtime.js";
import {createAvatarVoiceStream,appendAvatarVoiceChunk,getAvatarVoicePlaybackFrame,interruptAvatarVoice} from "./avatar-voice-runtime.js";
import {createAvatarRendererPlan,buildAvatarRenderPacket,shouldReplanAvatarRenderer} from "./avatar-renderer-adapter.js";
import {buildAvatarEventFromAgentUpdate} from "./avatar-agent-bridge.js";

function clean(value,max=120){return String(value||"").replace(/[\u0000-\u001f\u007f]/g," ").trim().slice(0,max);}

export function createLivingAvatarSession(manifest,{sessionId,nowMs=0,platform="generic",performanceSignals={},reducedMotion=false}={}){
  if(!manifest?.characterId)throw new Error("LIVING_CHARACTER_MANIFEST_REQUIRED");
  const id=clean(sessionId,120)||`${manifest.characterId}:session`;
  const runtime=createAvatarRuntimeState(manifest);
  const face=createAvatarFaceRuntime(manifest,{nowMs,reducedMotion});
  const voice=createAvatarVoiceStream({sessionId:id,language:manifest?.dna?.language||"en",style:manifest?.dna?.voice?.style||"natural"});
  const renderer=createAvatarRendererPlan(manifest,{...performanceSignals,reducedMotion});
  return{
    contract:"laneriq-living-avatar-session-v1",
    sessionId:id,
    characterId:manifest.characterId,
    platform:clean(platform,20)||"generic",
    manifest,
    runtime,
    face,
    voice,
    renderer,
    lastTickMs:Math.max(0,Number(nowMs)||0),
    sequence:0
  };
}

export function applyLivingAvatarEvent(session,event,options={}){
  if(!session?.characterId)throw new Error("LIVING_AVATAR_SESSION_REQUIRED");
  return{...session,runtime:reduceAvatarRuntime(session.runtime,event,options),sequence:(session.sequence||0)+1};
}

export function applyAgentUpdateToLivingAvatar(session,update={}){
  const mapped=buildAvatarEventFromAgentUpdate(update);
  if(!mapped)return session;
  return applyLivingAvatarEvent(session,mapped.event,mapped.options||{});
}

export function appendLivingAvatarVoiceChunk(session,chunk={}){
  if(!session?.characterId)throw new Error("LIVING_AVATAR_SESSION_REQUIRED");
  return{...session,voice:appendAvatarVoiceChunk(session.voice,chunk),sequence:(session.sequence||0)+1};
}

export function interruptLivingAvatarSpeech(session,{atMs=0,reason="user-barge-in"}={}){
  if(!session?.characterId)throw new Error("LIVING_AVATAR_SESSION_REQUIRED");
  const voice=interruptAvatarVoice(session.voice,{atMs,reason});
  const runtime=session.runtime?.state==="speaking"?reduceAvatarRuntime(session.runtime,"AI_RESPONSE_END"):session.runtime;
  return{...session,voice,runtime,sequence:(session.sequence||0)+1};
}

export function tickLivingAvatarSession(session,{nowMs,playbackMs,attentionTarget,performanceSignals={},reducedMotion}={}){
  if(!session?.characterId)throw new Error("LIVING_AVATAR_SESSION_REQUIRED");
  const now=Math.max(session.lastTickMs||0,Number(nowMs)||0);
  const voiceFrame=getAvatarVoicePlaybackFrame(session.voice,{playbackMs:Number.isFinite(Number(playbackMs))?Number(playbackMs):now});
  let runtime=session.runtime;
  if(voiceFrame.speaking&&runtime.state!=="speaking")runtime=reduceAvatarRuntime(runtime,"AI_RESPONSE_START");
  if(!voiceFrame.speaking&&voiceFrame.finished&&runtime.state==="speaking")runtime=reduceAvatarRuntime(runtime,"AI_RESPONSE_END");
  let renderer=session.renderer;
  const signals={...performanceSignals,reducedMotion:typeof reducedMotion==="boolean"?reducedMotion:renderer?.adaptation?.reducedMotion};
  if(shouldReplanAvatarRenderer(renderer,signals))renderer=createAvatarRendererPlan(session.manifest,signals);
  const face=advanceAvatarFaceRuntime(session.face,{nowMs:now,behaviorState:runtime.state,emotion:runtime.emotion,viseme:voiceFrame.viseme,visemeWeight:voiceFrame.visemeWeight,attentionTarget,reducedMotion:signals.reducedMotion});
  const renderPacket=buildAvatarRenderPacket({plan:renderer,runtimeState:runtime,faceFrame:face.frame,nowMs:now});
  return{
    session:{...session,runtime,face,renderer,lastTickMs:now,sequence:(session.sequence||0)+1},
    frame:{timestampMs:now,state:runtime.state,emotion:runtime.emotion,voice:voiceFrame,face:face.frame,render:renderPacket}
  };
}
