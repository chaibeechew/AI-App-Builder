const CHARACTER_SCHEMA_VERSION=3;

export const CHARACTER_STATES=Object.freeze(["idle","listening","thinking","speaking","acting","success","concerned"]);

export const CHARACTER_TRANSITIONS=Object.freeze({
  idle:["listening","thinking","acting"],
  listening:["thinking","idle","concerned"],
  thinking:["speaking","acting","concerned","idle"],
  speaking:["listening","acting","success","concerned","idle"],
  acting:["success","concerned","speaking","idle"],
  success:["idle","listening","speaking"],
  concerned:["thinking","speaking","idle"]
});

const TYPE_PERSONA={profile:"warm",game:"confident",npc:"expressive",presenter:"clear",mascot:"playful"};
const PERSONAS=new Set(["warm","confident","expressive","clear","playful","calm","professional","energetic"]);
const VOICE_STYLES=new Set(["natural","warm","confident","clear","playful","calm","energetic"]);
const MOTION_PROFILES=new Set(["subtle","natural","expressive"]);
const LANGUAGE=/^[A-Za-z]{2,3}(?:-[A-Za-z0-9]{2,8})?$/;
function clean(value,max=80){return String(value||"").replace(/[\u0000-\u001f\u007f]/g," ").trim().slice(0,max);}
function allowed(value,set,fallback){const v=clean(value,40).toLowerCase();return set.has(v)?v:fallback;}

export function normalizeCharacterOptions({type="profile",persona,voiceStyle,motionProfile,language}={}){
  const fallbackPersona=TYPE_PERSONA[type]||"warm";
  return{persona:allowed(persona,PERSONAS,fallbackPersona),voiceStyle:allowed(voiceStyle,VOICE_STYLES,fallbackPersona==="professional"?"clear":fallbackPersona),motionProfile:allowed(motionProfile,MOTION_PROFILES,type==="mascot"?"expressive":"natural"),language:LANGUAGE.test(clean(language,24))?clean(language,24):"en"};
}

export function getAvatarRuntimeProfiles(){
  return{
    eco:{targetFps:24,renderScale:0.72,maxFaceChannels:18,secondaryMotion:false,particles:false,preferredRenderer:"2.5d",thermalPolicy:"reduce-before-hot"},
    balanced:{targetFps:30,renderScale:0.9,maxFaceChannels:32,secondaryMotion:true,particles:false,preferredRenderer:"lightweight-3d",thermalPolicy:"adaptive"},
    performance:{targetFps:60,renderScale:1,maxFaceChannels:52,secondaryMotion:true,particles:true,preferredRenderer:"3d",thermalPolicy:"adaptive"}
  };
}

export function canTransitionCharacter(from,to){const current=CHARACTER_STATES.includes(from)?from:"idle";return Boolean(CHARACTER_TRANSITIONS[current]?.includes(to));}

export function buildLivingCharacterManifest({characterId,type="profile",style="cinematic",persona,voiceStyle,motionProfile,language="en",continuityKey=""}={}){
  const id=clean(characterId,96);if(!id)throw new Error("CHARACTER_ID_REQUIRED");
  const options=normalizeCharacterOptions({type,persona,voiceStyle,motionProfile,language}),runtimeProfiles=getAvatarRuntimeProfiles();
  return{
    schema:"laneriq.living-character",schemaVersion:CHARACTER_SCHEMA_VERSION,characterId:id,
    dna:{archetype:clean(type,32)||"profile",visualStyle:clean(style,40)||"cinematic",persona:options.persona,language:options.language,voice:{style:options.voiceStyle,providerNeutral:true},motion:{profile:options.motionProfile},continuity:{key:clean(continuityKey,96),anchorMode:"private-asset-first",rules:["preserve-identity","preserve-face-structure","preserve-signature-traits","allow-outfit-variation"]}},
    behavior:{initialState:"idle",states:CHARACTER_STATES,transitions:CHARACTER_TRANSITIONS,emotions:["neutral","warm","focused","excited","concerned"],semanticMotion:true},
    interfaces:{
      faceRig:{contract:"blendshape-v1",channels:["blink-left","blink-right","jaw-open","mouth-smile","mouth-frown","brow-up","brow-down","eye-look-x","eye-look-y","head-yaw","head-pitch","head-roll","breath"]},
      faceRuntime:{contract:"procedural-face-runtime-v1",blink:true,gaze:true,microExpression:true,headMotion:true,reducedMotionAware:true},
      advancedFace:{contract:"laneriq-face-52-v1",channels:52,performanceProfilePreferred:true,rendererNeutral:true},
      lipSync:{contract:"viseme-timeline-v1",streaming:true,localPreferred:true},gaze:{contract:"target-vector-v1",attentionAware:true},
      voice:{contract:"tts-stream-v1",providerRouted:true,style:options.voiceStyle,language:options.language,bargeIn:true,jitterBuffer:true},
      audioClock:{contract:"laneriq-avatar-audio-clock-v1",driftCorrection:true,jitterAware:true,hardResync:true},
      body:{contract:"laneriq-avatar-body-runtime-v1",gestureRuntime:true,reducedMotionAware:true,bodyRigContract:"laneriq-avatar-body-rig-v1"},
      renderer:{contract:"laneriq-avatar-renderer-v1",modes:["2.5d","lightweight-3d","3d"],adaptiveLod:true},
      surfaceRuntime:{contract:"laneriq-avatar-surface-runtime-v1",actual2_5dFramePacket:true,frameBudgetFeedback:true,nativeAdapterContract:true},
      mobileSurface:{contract:"laneriq-mobile-avatar-surface-v1",continuousRendering:"in-app-only",backgroundStateOnly:true},
      persistence:{contract:"laneriq-character-persistence-v1",ownerScoped:true,optimisticRevision:true,serviceRoleOnlyStorage:true,rawMemoryStored:false},
      continuity:{contract:"laneriq-character-continuity-v1",encryptedOwnerSessionTransportRequired:true,rawAssetIncluded:false,persistentMemoryIncluded:false},
      memory:{contract:"character-memory-v1",ownerScoped:true,optInPersistentMemory:true,userConfirmedWrites:true,sensitiveMemoryBlocked:true},
      agent:{contract:"laneriq-agent-action-v1",stateAware:true,executionAuthority:"laneriq-agent",avatarAuthority:"presentation-only"},
      session:{contract:"laneriq-living-avatar-session-v2",voiceFaceBodyRendererOrchestration:true},
      production:{contract:"laneriq-avatar-production-quality-v1",failClosed:true,truthLedger:true,recoverySnapshot:true}
    },
    runtime:{defaultProfile:"balanced",profiles:runtimeProfiles,adaptiveThermal:true,adaptiveBattery:true,reducedMotionSupported:true,interruptionSupported:true,localFirst:["idle-motion","blink","gaze","micro-expression","basic-viseme-playback","state-transitions","body-gesture-runtime","audio-clock","2.5d-surface-frame","renderer-lod-selection"],remoteEligible:["high-fidelity-render","neural-animation","voice-synthesis","generative-motion"]},
    readiness:{
      characterDNA:true,stateEngine:true,emotionContract:true,faceRigContract:true,proceduralFaceRuntime:true,face52Runtime:true,lipSyncContract:true,streamingVoiceRuntime:true,voiceBargeInRuntime:true,audioClockRuntime:true,bodyGestureRuntime:true,adaptiveRendererAdapter:true,surface2_5dRuntime:true,mobileSurfaceContract:true,persistenceApiCode:true,crossDeviceContinuityCode:true,memoryContract:true,agentMemoryBridge:true,sessionOrchestratorV2:true,productionQualityGate:true,mobileRuntimeProfiles:true,
      persistenceMigrationApplied:false,crossDeviceEncryptedHandoffLive:false,realtime3DRenderer:false,liveVoiceProvider:false,motionGenerator:false,physicalDeviceBenchmark:false
    }
  };
}
