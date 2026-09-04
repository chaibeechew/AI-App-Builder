import { getCreativeMediaTask } from './creative-media-control-plane.js';

const freeze=value=>Object.freeze(value);
const OPAQUE_ID=/^[A-Za-z0-9._:-]{1,180}$/;
const LANG=/^[A-Za-z]{2,3}(?:-[A-Za-z0-9]{2,8})?$/;
const AUDIO_MODES=freeze(['voiceover','dialogue','music','sfx','mix','lipsync','avatar-speech','native-audio']);
const VOICE_SOURCES=freeze(['synthetic','user-owned','consented-reference']);
const EMOTIONS=freeze(['neutral','warm','happy','sad','excited','calm','serious','empathetic','energetic','cinematic']);
const MAX_TRANSCRIPT=8000;
const MAX_SFX=32;

function clean(value,max=1000){return String(value||'').replace(/[\u0000-\u001f\u007f]/g,' ').replace(/\s+/g,' ').trim().slice(0,max);}
function number(value,min,max,fallback=null){const n=Number(value);return Number.isFinite(n)?Math.max(min,Math.min(max,n)):fallback;}
function assetId(value){const raw=typeof value==='string'?value:value?.assetId;const id=clean(raw,180);return OPAQUE_ID.test(id)?id:null;}
function unique(values){return [...new Set(values.filter(Boolean))];}
function validLanguage(value){const v=clean(value||'en',24);return LANG.test(v)?v:'en';}

export const CREATIVE_AUDIO_POLICY=freeze({
  maxDurationSeconds:600,maxTranscriptChars:MAX_TRANSCRIPT,maxSfxCues:MAX_SFX,maxTracks:32,
  voiceCloneRequiresExplicitConsent:true,minorVoiceRequiresGuardianConsent:true,
  rawVoiceReferenceUrlsAllowed:false,providerConnected:false,liveProviderVerified:false,realOutputQualityVerified:false
});

export function buildCreativeAudioPlan({
  mode='voiceover',durationSeconds=30,language='en',transcript='',voice={},music={},sfx=[],
  sourceAudio=null,sourceVideo=null,consent={}
}={}){
  const normalizedMode=AUDIO_MODES.includes(clean(mode,40).toLowerCase())?clean(mode,40).toLowerCase():'voiceover';
  const duration=number(durationSeconds,1,CREATIVE_AUDIO_POLICY.maxDurationSeconds,30);
  const text=clean(transcript,MAX_TRANSCRIPT);
  const sourceType=VOICE_SOURCES.includes(clean(voice?.sourceType,40).toLowerCase())?clean(voice?.sourceType,40).toLowerCase():'synthetic';
  const voiceReferenceAssetId=assetId(voice?.referenceAssetId);
  const sourceAudioAssetId=assetId(sourceAudio);
  const sourceVideoAssetId=assetId(sourceVideo);
  const requiresVoice=['voiceover','dialogue','lipsync','avatar-speech','native-audio','mix'].includes(normalizedMode)&&Boolean(text||voiceReferenceAssetId);
  const requiresVoiceConsent=sourceType==='consented-reference';
  if(requiresVoiceConsent&&(!voiceReferenceAssetId||consent?.voiceConsent!==true||consent?.likenessConsent!==true)){
    return freeze({ok:false,code:'CREATIVE_AUDIO_VOICE_CONSENT_REQUIRED',mode:normalizedMode});
  }
  if(requiresVoiceConsent&&consent?.isMinor===true&&consent?.guardianConsent!==true){
    return freeze({ok:false,code:'CREATIVE_AUDIO_GUARDIAN_CONSENT_REQUIRED',mode:normalizedMode});
  }
  if(['voiceover','dialogue','lipsync','avatar-speech'].includes(normalizedMode)&&!text&&!sourceAudioAssetId){
    return freeze({ok:false,code:'CREATIVE_AUDIO_TRANSCRIPT_OR_AUDIO_REQUIRED',mode:normalizedMode});
  }
  if(normalizedMode==='lipsync'&&!sourceVideoAssetId)return freeze({ok:false,code:'CREATIVE_AUDIO_LIPSYNC_VIDEO_REQUIRED',mode:normalizedMode});
  const safeSfx=(Array.isArray(sfx)?sfx:[]).slice(0,MAX_SFX).map((cue,index)=>freeze({
    id:clean(cue?.id||`sfx-${index+1}`,80),
    prompt:clean(cue?.prompt,500),
    atSeconds:number(cue?.atSeconds,0,duration,0),
    durationSeconds:number(cue?.durationSeconds,0.1,60,2),
    gainDb:number(cue?.gainDb,-60,12,0)
  })).filter(cue=>cue.prompt);
  const voiceTrack=requiresVoice?freeze({
    kind:'voice',sourceType,referenceAssetId:voiceReferenceAssetId,
    language:validLanguage(language),transcript:text||null,
    speed:number(voice?.speed,0.5,2,1),pitchSemitones:number(voice?.pitchSemitones,-12,12,0),
    emotion:EMOTIONS.includes(clean(voice?.emotion,40).toLowerCase())?clean(voice?.emotion,40).toLowerCase():'neutral',
    gainDb:number(voice?.gainDb,-60,12,0)
  }):null;
  const musicTrack=(normalizedMode==='music'||normalizedMode==='mix'||music?.enabled===true)?freeze({
    kind:'music',prompt:clean(music?.prompt,1000),genre:clean(music?.genre,80)||null,
    bpm:number(music?.bpm,40,220,null),key:clean(music?.key,24)||null,
    instrumental:music?.instrumental!==false,gainDb:number(music?.gainDb,-60,12,-10)
  }):null;
  const capabilities=[];
  if(voiceTrack)capabilities.push(sourceType==='consented-reference'?'consented-voice-reference':'text-to-speech');
  if(musicTrack)capabilities.push('music-generation');
  if(safeSfx.length)capabilities.push('sfx-generation');
  if(normalizedMode==='lipsync')capabilities.push(getCreativeMediaTask('video.lipsync')?.capability||'lip-sync');
  if(normalizedMode==='avatar-speech')capabilities.push(getCreativeMediaTask('video.avatar-speech')?.capability||'avatar-speech');
  if(normalizedMode==='mix'||normalizedMode==='native-audio'||sourceAudioAssetId)capabilities.push('audio-mix');
  return freeze({
    ok:true,schemaVersion:1,mode:normalizedMode,durationSeconds:duration,language:validLanguage(language),
    sourceAudioAssetId,sourceVideoAssetId,tracks:freeze([voiceTrack,musicTrack,...safeSfx].filter(Boolean)),
    mix:freeze({targetLufs:number(music?.targetLufs,-24,-8,-14),peakDbfs:number(music?.peakDbfs,-6,-0.1,-1),
      ducking:music?.ducking!==false,fadeInMs:number(music?.fadeInMs,0,10000,250),fadeOutMs:number(music?.fadeOutMs,0,10000,500)}),
    requiredCapabilities:freeze(unique(capabilities)),referencesRequireOwnerValidation:true,
    consent:freeze({voiceConsent:consent?.voiceConsent===true,likenessConsent:consent?.likenessConsent===true,guardianConsent:consent?.guardianConsent===true}),
    truth:freeze({codeReady:true,providerConnected:false,liveProviderVerified:false,realOutputQualityVerified:false,evidenceRequired:true})
  });
}

export function buildLipSyncAlignmentPlan({videoAssetId,audioAssetId,language='en',speakerId='',maxDriftMs=120,phonemeStrength=75}={}){
  const video=assetId(videoAssetId),audio=assetId(audioAssetId);
  if(!video||!audio)return freeze({ok:false,code:'CREATIVE_AUDIO_LIPSYNC_ASSETS_REQUIRED'});
  return freeze({ok:true,schemaVersion:1,task:'video.lipsync',capability:getCreativeMediaTask('video.lipsync')?.capability||'lip-sync',
    videoAssetId:video,audioAssetId:audio,language:validLanguage(language),speakerId:clean(speakerId,120)||null,
    maxDriftMs:number(maxDriftMs,20,500,120),phonemeStrength:number(phonemeStrength,0,100,75),
    qualitySignals:freeze(['lipSyncQuality','audioVideoSync','speechIntelligibility','pronunciation']),
    referencesRequireOwnerValidation:true,truth:freeze({providerConnected:false,liveProviderVerified:false,realOutputQualityVerified:false})
  });
}
