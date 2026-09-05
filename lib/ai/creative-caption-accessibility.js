const freeze=value=>Object.freeze(value);
const OPAQUE_ID=/^[A-Za-z0-9._:-]{1,180}$/;
const LANG=/^[A-Za-z]{2,3}(?:-[A-Za-z0-9]{2,8})?$/;
const FORMATS=['vtt','srt','sidecar-json','burn-in'];
const DIRECTIONS=['ltr','rtl','auto'];

function clean(v,max=2000){return String(v||'').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g,'').trim().slice(0,max);}
function id(v){const raw=typeof v==='string'?v:v?.assetId;const out=clean(raw,180);return OPAQUE_ID.test(out)?out:null;}
function num(v,min,max,fallback=null){const n=Number(v);return Number.isFinite(n)?Math.max(min,Math.min(max,n)):fallback;}
function lang(v){const out=clean(v||'en',24);return LANG.test(out)?out:'en';}

export const CREATIVE_CAPTION_POLICY=freeze({maxCues:5000,maxLanguages:20,maxCueChars:500,minCueDurationMs:250,maxCueDurationMs:15000,rawMediaUrlsAllowed:false});

export function buildCaptionTrack({language='en',format='vtt',direction='auto',cues=[],sdh=false,burnInStyle={}}={}){
  const safe=(Array.isArray(cues)?cues:[]).slice(0,CREATIVE_CAPTION_POLICY.maxCues).map((cue,index)=>{
    const startMs=Math.round(num(cue?.startMs,0,86400000,0));const endMs=Math.round(num(cue?.endMs,0,86400000,startMs));const text=clean(cue?.text,500);
    return {index,startMs,endMs,text,speaker:clean(cue?.speaker,80)||null,kind:clean(cue?.kind,40)||'speech'};
  });
  if(!safe.length)return freeze({ok:false,code:'CREATIVE_CAPTION_CUES_REQUIRED'});
  let lastEnd=-1;
  for(const cue of safe){
    if(!cue.text)return freeze({ok:false,code:'CREATIVE_CAPTION_TEXT_REQUIRED',cueIndex:cue.index});
    const duration=cue.endMs-cue.startMs;if(duration<250||duration>15000)return freeze({ok:false,code:'CREATIVE_CAPTION_DURATION_INVALID',cueIndex:cue.index});
    if(cue.startMs<lastEnd)return freeze({ok:false,code:'CREATIVE_CAPTION_OVERLAP_INVALID',cueIndex:cue.index});
    lastEnd=cue.endMs;
  }
  return freeze({ok:true,schemaVersion:1,language:lang(language),format:FORMATS.includes(clean(format,30).toLowerCase())?clean(format,30).toLowerCase():'vtt',direction:DIRECTIONS.includes(clean(direction,10).toLowerCase())?clean(direction,10).toLowerCase():'auto',sdh:sdh===true,cues:freeze(safe.map(freeze)),burnInStyle:freeze({safeAreaPercent:num(burnInStyle?.safeAreaPercent,0,20,8),maxLines:Math.round(num(burnInStyle?.maxLines,1,4,2)),fontScale:num(burnInStyle?.fontScale,0.5,2,1),highContrast:burnInStyle?.highContrast!==false}),quality:freeze({timingValidated:true,overlapValidated:true,textPresent:true}),truth:freeze({codeReady:true,languageQualityVerified:false,accessibilityReviewVerified:false,evidenceRequired:true})});
}

export function buildMediaAccessibilityPlan({mediaAssetId,captionTracks=[],audioDescriptionTrack=null,transcriptAssetId=null,signLanguageVideoAssetId=null}={}){
  const media=id(mediaAssetId);if(!media)return freeze({ok:false,code:'CREATIVE_ACCESSIBILITY_MEDIA_REQUIRED'});
  const tracks=(Array.isArray(captionTracks)?captionTracks:[]).slice(0,20);
  const languages=new Set();for(const track of tracks){if(track?.ok!==true)return freeze({ok:false,code:'CREATIVE_ACCESSIBILITY_CAPTION_TRACK_INVALID'});if(languages.has(track.language))return freeze({ok:false,code:'CREATIVE_ACCESSIBILITY_DUPLICATE_LANGUAGE'});languages.add(track.language);}
  return freeze({ok:true,schemaVersion:1,mediaAssetId:media,captionTracks:freeze(tracks),audioDescriptionAssetId:id(audioDescriptionTrack),transcriptAssetId:id(transcriptAssetId),signLanguageVideoAssetId:id(signLanguageVideoAssetId),accessibility:freeze({captions:Boolean(tracks.length),sdh:tracks.some(t=>t.sdh===true),audioDescription:Boolean(id(audioDescriptionTrack)),transcript:Boolean(id(transcriptAssetId)),signLanguage:Boolean(id(signLanguageVideoAssetId))}),sourceOwnershipValidationRequired:true,truth:freeze({codeReady:true,accessibilityComplianceCertified:false,humanLanguageReviewVerified:false,evidenceRequired:true})});
}
