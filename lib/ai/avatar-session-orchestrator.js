import {createAvatarRuntimeState,reduceAvatarRuntime} from "./avatar-runtime-engine.js";
import {createAvatarFaceRuntime,advanceAvatarFaceRuntime,buildFaceRigCommand} from "./avatar-face-runtime.js";
import {expandAvatarFaceFrame52} from "./avatar-face-52-runtime.js";
import {createAvatarVoiceStream,appendAvatarVoiceChunk,getAvatarVoicePlaybackFrame,interruptAvatarVoice} from "./avatar-voice-runtime.js";
import {createAvatarRendererPlan,buildAvatarRenderPacket,shouldReplanAvatarRenderer} from "./avatar-renderer-adapter.js";
import {buildAvatarEventFromAgentUpdate} from "./avatar-agent-bridge.js";
import {createAvatarAudioClock,advanceAvatarAudioClock,getAvatarAudioClockFrame} from "./avatar-audio-clock.js";
import {createAvatarBodyRuntime,advanceAvatarBodyRuntime,buildAvatarBodyRigCommand} from "./avatar-body-runtime.js";
import {createAvatarSurfaceRuntime,buildAvatar2_5DSurfaceFrame,recordAvatarSurfaceFrame,recommendAvatarSurfaceDegrade} from "./avatar-surface-runtime.js";

function clean(value,max=120){return String(value||"").replace(/[\u0000-\u001f\u007f]/g," ").trim().slice(0,max);}

export function createLivingAvatarSession(manifest,{sessionId,nowMs=0,platform="generic",performanceSignals={},reducedMotion=false}={}){
  if(!manifest?.characterId)throw new Error("LIVING_CHARACTER_MANIFEST_REQUIRED");
  const id=clean(sessionId,120)||`${manifest.characterId}:session`,runtime=createAvatarRuntimeState(manifest),face=createAvatarFaceRuntime(manifest,{nowMs,reducedMotion}),voice=createAvatarVoiceStream({sessionId:id,language:manifest?.dna?.language||"en",style:manifest?.dna?.voice?.style||"natural"}),renderer=createAvatarRendererPlan(manifest,{...performanceSignals,reducedMotion});
  const audioClock=createAvatarAudioClock({sessionId:id,nowMs,playbackMs:0}),body=createAvatarBodyRuntime(manifest,{nowMs,reducedMotion}),surface=createAvatarSurfaceRuntime({characterId:manifest.characterId,renderer:renderer.renderer,targetFps:renderer.targetFps,renderScale:renderer.renderScale});
  return{contract:"laneriq-living-avatar-session-v2",sessionId:id,characterId:manifest.characterId,platform:clean(platform,20)||"generic",manifest,runtime,face,voice,audioClock,body,renderer,surface,lastTickMs:Math.max(0,Number(nowMs)||0),sequence:0};
}

export function applyLivingAvatarEvent(session,event,options={}){if(!session?.characterId)throw new Error("LIVING_AVATAR_SESSION_REQUIRED");return{...session,runtime:reduceAvatarRuntime(session.runtime,event,options),sequence:(session.sequence||0)+1};}
export function applyAgentUpdateToLivingAvatar(session,update={}){const mapped=buildAvatarEventFromAgentUpdate(update);return mapped?applyLivingAvatarEvent(session,mapped.event,mapped.options||{}):session;}
export function appendLivingAvatarVoiceChunk(session,chunk={}){if(!session?.characterId)throw new Error("LIVING_AVATAR_SESSION_REQUIRED");return{...session,voice:appendAvatarVoiceChunk(session.voice,chunk),sequence:(session.sequence||0)+1};}

export function interruptLivingAvatarSpeech(session,{atMs=0,reason="user-barge-in"}={}){
  if(!session?.characterId)throw new Error("LIVING_AVATAR_SESSION_REQUIRED");const voice=interruptAvatarVoice(session.voice,{atMs,reason});const runtime=session.runtime?.state==="speaking"?reduceAvatarRuntime(session.runtime,"AI_RESPONSE_END"):session.runtime;return{...session,voice,runtime,sequence:(session.sequence||0)+1};
}

export function recordLivingAvatarFrameTiming(session,{frameDurationMs,rendered=true}={}){
  if(!session?.characterId)throw new Error("LIVING_AVATAR_SESSION_REQUIRED");const surface=recordAvatarSurfaceFrame(session.surface,{frameDurationMs,rendered});return{session:{...session,surface},recommendation:recommendAvatarSurfaceDegrade(surface)};
}

export function tickLivingAvatarSession(session,{nowMs,playbackMs,attentionTarget,performanceSignals={},reducedMotion,buffering=false,paused=false,actionKind="",speechEnergy=.5}={}){
  if(!session?.characterId)throw new Error("LIVING_AVATAR_SESSION_REQUIRED");
  const now=Math.max(session.lastTickMs||0,Number(nowMs)||0),audioClock=advanceAvatarAudioClock(session.audioClock,{nowMs:now,reportedPlaybackMs:playbackMs,buffering,paused}),audioClockFrame=getAvatarAudioClockFrame(audioClock),voiceFrame=getAvatarVoicePlaybackFrame(session.voice,{playbackMs:audioClockFrame.playbackMs});
  let runtime=session.runtime;if(voiceFrame.speaking&&runtime.state!=="speaking")runtime=reduceAvatarRuntime(runtime,"AI_RESPONSE_START");if(!voiceFrame.speaking&&voiceFrame.finished&&runtime.state==="speaking")runtime=reduceAvatarRuntime(runtime,"AI_RESPONSE_END");
  let renderer=session.renderer;const signals={...performanceSignals,reducedMotion:typeof reducedMotion==="boolean"?reducedMotion:renderer?.adaptation?.reducedMotion};if(shouldReplanAvatarRenderer(renderer,signals))renderer=createAvatarRendererPlan(session.manifest,signals);
  const face=advanceAvatarFaceRuntime(session.face,{nowMs:now,behaviorState:runtime.state,emotion:runtime.emotion,viseme:voiceFrame.viseme,visemeWeight:voiceFrame.visemeWeight,attentionTarget,reducedMotion:signals.reducedMotion});
  const body=advanceAvatarBodyRuntime(session.body,{nowMs:now,state:runtime.state,emotion:runtime.emotion,speechEnergy,actionKind,reducedMotion:signals.reducedMotion}),faceCommand=buildFaceRigCommand(face.frame,{maxChannels:renderer.maxFaceChannels}),face52=renderer.maxFaceChannels>=52?expandAvatarFaceFrame52(face.frame):null,bodyCommand=buildAvatarBodyRigCommand(body),renderPacket=buildAvatarRenderPacket({plan:renderer,runtimeState:runtime,faceFrame:face.frame,nowMs:now}),surfaceFrame=buildAvatar2_5DSurfaceFrame({renderPacket,bodyCommand,faceCommand});
  const surface=session.surface?.renderer===renderer.renderer?session.surface:createAvatarSurfaceRuntime({characterId:session.characterId,renderer:renderer.renderer,targetFps:renderer.targetFps,renderScale:renderer.renderScale});
  return{session:{...session,runtime,face,body,audioClock,renderer,surface,lastTickMs:now,sequence:(session.sequence||0)+1},frame:{timestampMs:now,state:runtime.state,emotion:runtime.emotion,audioClock:audioClockFrame,voice:voiceFrame,face:face.frame,faceCommand,face52,body:bodyCommand,render:renderPacket,surface:surfaceFrame}};
}
