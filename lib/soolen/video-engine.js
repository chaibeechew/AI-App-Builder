const TASKS=new Set(["create","edit-video","animate-photo","restyle-photo","real-to-cartoon","cartoon-to-real","real-video-to-cartoon","cartoon-video-to-real"]);
const MODES=new Set(["real","animation"]);
const VOICE_SOURCES=new Set(["ai","upload","original"]);

export class SoolenVideoEngineError extends Error{
  constructor(message,code="SOOLEN_VIDEO_ENGINE_ERROR",status=500){super(message);this.name="SoolenVideoEngineError";this.code=code;this.status=status;}
}

export function getSoolenVideoCapabilities(){
  return {
    engine:"soolen-ai",
    tasks:[...TASKS],
    modes:[...MODES],
    voiceSources:[...VOICE_SOURCES],
    durations:[10,30,60],
    audio:{aiVoice:true,uploadedAuthorizedVoice:true,keepOriginalVoice:true,backgroundMusic:true},
    video:{textToVideo:true,imageToVideo:true,videoToVideo:true,realToCartoon:true,cartoonToReal:true},
    finishing:{captions:true,music:true,mp4:true}
  };
}

export function validateSoolenVideoInput(input={}){
  if(!String(input.prompt||"").trim())throw new SoolenVideoEngineError("Please describe what you want Soolen AI to create or change.","INVALID_PROMPT",400);
  if(!TASKS.has(input.task))throw new SoolenVideoEngineError("Unsupported Soolen AI video task.","INVALID_TASK",400);
  if(!MODES.has(input.mode))throw new SoolenVideoEngineError("Unsupported video mode.","INVALID_MODE",400);
  if(!VOICE_SOURCES.has(input.voiceSource))throw new SoolenVideoEngineError("Unsupported voice source.","INVALID_VOICE_SOURCE",400);
  if(![10,30,60].includes(Number(input.duration)))throw new SoolenVideoEngineError("Duration must be 10, 30 or 60 seconds.","INVALID_DURATION",400);
  return true;
}

function addField(form,key,value){if(value!==undefined&&value!==null)form.set(key,String(value));}

export async function generateSoolenVideo(input){
  validateSoolenVideoInput(input);

  // This endpoint belongs to infrastructure controlled by Soolen AI. It can run
  // open-weight/self-hosted image, video, speech and audio models on Soolen-owned
  // hardware or any machine the owner controls. The public product never needs a
  // third-party media-app account.
  const runtimeUrl=process.env.SOOLEN_VIDEO_RUNTIME_URL;
  if(!runtimeUrl){
    throw new SoolenVideoEngineError(
      "Soolen AI Video Engine is ready in the app, but its self-hosted generation runtime has not been connected yet.",
      "SOOLEN_VIDEO_RUNTIME_NOT_CONFIGURED",
      503
    );
  }

  const form=new FormData();
  for(const key of ["prompt","task","mode","duration","language","voiceSource","voice","style","music","captions","userId","transformation"]){addField(form,key,input[key]);}
  if(input.referenceImage instanceof File&&input.referenceImage.size)form.set("referenceImage",input.referenceImage,input.referenceImage.name);
  if(input.sourceVideo instanceof File&&input.sourceVideo.size)form.set("sourceVideo",input.sourceVideo,input.sourceVideo.name);
  if(input.voiceFile instanceof File&&input.voiceFile.size)form.set("voiceFile",input.voiceFile,input.voiceFile.name);

  const headers={};
  if(process.env.SOOLEN_VIDEO_RUNTIME_KEY)headers.Authorization=`Bearer ${process.env.SOOLEN_VIDEO_RUNTIME_KEY}`;

  let response;
  try{
    response=await fetch(runtimeUrl,{method:"POST",headers,body:form,cache:"no-store"});
  }catch(error){
    console.error("Soolen self-hosted runtime connection error:",error);
    throw new SoolenVideoEngineError("Soolen AI Video Engine cannot reach its generation runtime right now.","SOOLEN_VIDEO_RUNTIME_UNREACHABLE",503);
  }

  const raw=await response.text();
  let data={};
  try{data=raw?JSON.parse(raw):{};}catch{data={};}
  if(!response.ok){
    throw new SoolenVideoEngineError(data?.error||"Soolen AI could not start this video job.",data?.code||"SOOLEN_VIDEO_RUNTIME_ERROR",response.status>=400&&response.status<600?response.status:502);
  }

  return {
    success:true,
    engine:"soolen-ai",
    jobId:data.jobId||data.id||null,
    status:data.status||"queued",
    videoUrl:data.videoUrl||data.url||null,
    previewUrl:data.previewUrl||null,
    task:input.task,
    mode:input.mode,
    voiceSource:input.voiceSource
  };
}
