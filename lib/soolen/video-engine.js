import {createSoolenChunkPlan,createContinuityManifest,SOOLEN_DEFAULT_CHUNK_SECONDS} from "./device-engine.js";
import {createDataHandlingPolicy,enforceAutonomousSecurity,assertRuntimeUrlAllowed,sanitizeDeviceCapabilities,SoolenSecurityError} from "./security-policy.js";

const TASKS=new Set(["create","edit-video","animate-photo","restyle-photo","real-to-cartoon","cartoon-to-real","real-video-to-cartoon","cartoon-video-to-real"]);
const MODES=new Set(["real","animation"]);
const VOICE_SOURCES=new Set(["ai","upload","original"]);
const EXECUTION_TARGETS=new Set(["device","company-pool","soolen-cloud-optional"]);

export class SoolenVideoEngineError extends Error{
  constructor(message,code="SOOLEN_VIDEO_ENGINE_ERROR",status=500){super(message);this.name="SoolenVideoEngineError";this.code=code;this.status=status;}
}

function normalizeSecurityError(error){
  if(error instanceof SoolenSecurityError)return new SoolenVideoEngineError(error.message,error.code,error.status);
  return error;
}

export function getSoolenVideoCapabilities(){
  return {
    engine:"soolen-ai",
    architecture:"device-first",
    tasks:[...TASKS],
    modes:[...MODES],
    voiceSources:[...VOICE_SOURCES],
    duration:{fixedLimit:false,presets:[15,30,60,180],defaultChunkSeconds:SOOLEN_DEFAULT_CHUNK_SECONDS},
    executionTargets:[...EXECUTION_TARGETS],
    audio:{aiVoice:true,uploadedAuthorizedVoice:true,keepOriginalVoice:true,backgroundMusic:true},
    video:{textToVideo:true,imageToVideo:true,videoToVideo:true,realToCartoon:true,cartoonToReal:true,chunkedRendering:true,continuityManifest:true},
    finishing:{captions:true,music:true,merge:true,mp4:true},
    privacy:{localFirst:true,persistRawMedia:false,crossUserPrivateCompute:false,rawMediaTelemetry:false},
    costModel:{mandatoryCloudGpuPerGeneration:false,localFirst:true}
  };
}

export function validateSoolenVideoInput(input={}){
  if(!String(input.prompt||"").trim())throw new SoolenVideoEngineError("Please describe what you want Soolen AI to create or change.","INVALID_PROMPT",400);
  if(!TASKS.has(input.task))throw new SoolenVideoEngineError("Unsupported Soolen AI video task.","INVALID_TASK",400);
  if(!MODES.has(input.mode))throw new SoolenVideoEngineError("Unsupported video mode.","INVALID_MODE",400);
  if(!VOICE_SOURCES.has(input.voiceSource))throw new SoolenVideoEngineError("Unsupported voice source.","INVALID_VOICE_SOURCE",400);
  const duration=Number(input.duration);
  if(!Number.isFinite(duration)||duration<=0)throw new SoolenVideoEngineError("Duration must be greater than 0 seconds.","INVALID_DURATION",400);
  if(input.executionTarget&&!EXECUTION_TARGETS.has(input.executionTarget))throw new SoolenVideoEngineError("Unsupported execution target.","INVALID_EXECUTION_TARGET",400);
  return true;
}

function addField(form,key,value){if(value!==undefined&&value!==null)form.set(key,String(value));}

export function planSoolenVideoJob(input={}){
  validateSoolenVideoInput(input);
  try{
    enforceAutonomousSecurity({
      executionTarget:input.executionTarget||"device",
      shareSpareCompute:Boolean(input.shareSpareCompute),
      sharePrivateRawContent:false,
      backgroundCompute:false,
      crossUserCompute:false
    });
  }catch(error){throw normalizeSecurityError(error);}
  const capabilities=sanitizeDeviceCapabilities(input.deviceCapabilities||{});
  const chunkPlan=createSoolenChunkPlan({durationSeconds:Number(input.duration),capabilities,preferredChunkSeconds:Number(input.preferredChunkSeconds)||SOOLEN_DEFAULT_CHUNK_SECONDS});
  const continuityManifest=createContinuityManifest({visualStyle:input.style||null,referenceAssets:[input.referenceImage?"referenceImage":null,input.sourceVideo?"sourceVideo":null].filter(Boolean),voices:[input.voice||input.voiceSource].filter(Boolean)});
  const dataPolicy=createDataHandlingPolicy({executionTarget:input.executionTarget||"device",hasPrivateMedia:Boolean(input.referenceImage||input.sourceVideo),hasUploadedVoice:Boolean(input.voiceFile),shareSpareCompute:Boolean(input.shareSpareCompute)});
  return {engine:"soolen-ai",architecture:"device-first",executionTarget:input.executionTarget||"device",deviceCapabilities:capabilities,chunkPlan,continuityManifest,dataPolicy,finishing:{merge:true,music:Boolean(input.music),captions:Boolean(input.captions),container:"mp4"}};
}

export async function generateSoolenVideo(input){
  const plan=planSoolenVideoJob(input);
  if((input.executionTarget||"device")==="device"){
    return {success:true,engine:"soolen-ai",architecture:"device-first",status:"planned-local",executionTarget:"device",localExecutionRequired:true,plan,jobId:null,videoUrl:null,previewUrl:null,task:input.task,mode:input.mode,voiceSource:input.voiceSource};
  }

  const rawRuntimeUrl=process.env.SOOLEN_VIDEO_RUNTIME_URL;
  if(!rawRuntimeUrl)throw new SoolenVideoEngineError("This optional Soolen compute target has not been connected yet. You can use Device Compute instead.","SOOLEN_VIDEO_RUNTIME_NOT_CONFIGURED",503);
  let runtimeUrl;
  try{runtimeUrl=assertRuntimeUrlAllowed(rawRuntimeUrl);}catch(error){throw normalizeSecurityError(error);}

  const form=new FormData();
  for(const key of ["prompt","task","mode","duration","language","voiceSource","voice","style","music","captions","userId","transformation","executionTarget"]){addField(form,key,input[key]);}
  addField(form,"soolenPlan",JSON.stringify(plan));
  if(input.referenceImage instanceof File&&input.referenceImage.size)form.set("referenceImage",input.referenceImage,input.referenceImage.name);
  if(input.sourceVideo instanceof File&&input.sourceVideo.size)form.set("sourceVideo",input.sourceVideo,input.sourceVideo.name);
  if(input.voiceFile instanceof File&&input.voiceFile.size)form.set("voiceFile",input.voiceFile,input.voiceFile.name);

  const headers={};
  if(process.env.SOOLEN_VIDEO_RUNTIME_KEY)headers.Authorization=`Bearer ${process.env.SOOLEN_VIDEO_RUNTIME_KEY}`;

  let response;
  try{response=await fetch(runtimeUrl,{method:"POST",headers,body:form,cache:"no-store",redirect:"error"});}
  catch(error){console.error("Soolen runtime connection failed.");throw new SoolenVideoEngineError("Soolen AI cannot reach the selected compute runtime right now.","SOOLEN_VIDEO_RUNTIME_UNREACHABLE",503);}

  const raw=await response.text();let data={};try{data=raw?JSON.parse(raw):{};}catch{data={};}
  if(!response.ok)throw new SoolenVideoEngineError(data?.error||"Soolen AI could not start this video job.",data?.code||"SOOLEN_VIDEO_RUNTIME_ERROR",response.status>=400&&response.status<600?response.status:502);
  return {success:true,engine:"soolen-ai",architecture:"device-first",jobId:data.jobId||data.id||null,status:data.status||"queued",videoUrl:data.videoUrl||data.url||null,previewUrl:data.previewUrl||null,executionTarget:input.executionTarget||"company-pool",plan,task:input.task,mode:input.mode,voiceSource:input.voiceSource};
}
