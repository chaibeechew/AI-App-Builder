export const SOOLEN_DEFAULT_CHUNK_SECONDS=15;

export function clampNumber(value,min,max,fallback){
  const n=Number(value);
  if(!Number.isFinite(n))return fallback;
  return Math.min(max,Math.max(min,n));
}

export function detectSoolenDeviceCapabilities(){
  if(typeof navigator==="undefined"){
    return {runtime:"server",deviceClass:"unknown",cpuThreads:null,memoryGB:null,webgpu:false,battery:null,tier:"unknown"};
  }

  const cpuThreads=Number.isFinite(navigator.hardwareConcurrency)?navigator.hardwareConcurrency:null;
  const memoryGB=Number.isFinite(navigator.deviceMemory)?navigator.deviceMemory:null;
  const webgpu=Boolean(navigator.gpu);
  const ua=String(navigator.userAgent||"");
  const mobile=/Android|iPhone|iPad|iPod|Mobile/i.test(ua);

  let tier="standard";
  if(mobile)tier="mobile-lite";
  if(!mobile&&webgpu&&(cpuThreads||0)>=8&&(memoryGB===null||memoryGB>=8))tier="desktop-gpu";
  if(!mobile&&webgpu&&(cpuThreads||0)>=16&&(memoryGB===null||memoryGB>=16))tier="high-performance";

  return {
    runtime:"browser",
    deviceClass:mobile?"mobile":"desktop",
    cpuThreads,
    memoryGB,
    webgpu,
    tier,
    userAgentHint:mobile?"mobile":"desktop"
  };
}

export async function readSoolenPowerState(){
  if(typeof navigator==="undefined"||typeof navigator.getBattery!=="function")return null;
  try{
    const battery=await navigator.getBattery();
    return {
      charging:Boolean(battery.charging),
      level:Number.isFinite(battery.level)?Math.round(battery.level*100):null
    };
  }catch{return null;}
}

export function chooseChunkSeconds(capabilities={},requested=SOOLEN_DEFAULT_CHUNK_SECONDS){
  const wanted=clampNumber(requested,5,30,SOOLEN_DEFAULT_CHUNK_SECONDS);
  if(capabilities.tier==="mobile-lite")return Math.min(wanted,5);
  if(capabilities.tier==="standard")return Math.min(wanted,10);
  if(capabilities.tier==="desktop-gpu")return Math.min(wanted,15);
  if(capabilities.tier==="high-performance")return wanted;
  return Math.min(wanted,10);
}

export function chooseRenderProfile(capabilities={}){
  switch(capabilities.tier){
    case "mobile-lite": return {resolution:"360p",parallelJobs:1,quality:"preview"};
    case "standard": return {resolution:"480p",parallelJobs:1,quality:"standard"};
    case "desktop-gpu": return {resolution:"720p",parallelJobs:2,quality:"high"};
    case "high-performance": return {resolution:"1080p",parallelJobs:4,quality:"high"};
    default: return {resolution:"480p",parallelJobs:1,quality:"standard"};
  }
}

export function createSoolenChunkPlan({durationSeconds,capabilities={},preferredChunkSeconds=SOOLEN_DEFAULT_CHUNK_SECONDS}={}){
  const duration=Math.max(1,Math.round(Number(durationSeconds)||15));
  const chunkSeconds=chooseChunkSeconds(capabilities,preferredChunkSeconds);
  const totalChunks=Math.ceil(duration/chunkSeconds);
  const profile=chooseRenderProfile(capabilities);
  const chunks=[];

  for(let index=0;index<totalChunks;index+=1){
    const start=index*chunkSeconds;
    const end=Math.min(duration,start+chunkSeconds);
    chunks.push({
      id:`scene-${String(index+1).padStart(3,"0")}`,
      index,
      startSeconds:start,
      endSeconds:end,
      durationSeconds:end-start,
      status:"pending",
      retryCount:0,
      continuity:{previousChunkId:index?`scene-${String(index).padStart(3,"0")}`:null,nextChunkId:index<totalChunks-1?`scene-${String(index+2).padStart(3,"0")}`:null}
    });
  }

  return {
    strategy:"device-first-chunked",
    durationSeconds:duration,
    preferredChunkSeconds,
    effectiveChunkSeconds:chunkSeconds,
    totalChunks,
    profile,
    chunks,
    recomputePolicy:"retry-or-regenerate-affected-chunks-only",
    mergeRequired:totalChunks>1
  };
}

export function createContinuityManifest(input={}){
  return {
    version:1,
    characters:input.characters||[],
    clothing:input.clothing||[],
    environments:input.environments||[],
    visualStyle:input.visualStyle||null,
    palette:input.palette||null,
    cameraRules:input.cameraRules||[],
    voices:input.voices||[],
    referenceAssets:input.referenceAssets||[],
    preserve:["character-consistency","clothing","environment","camera-direction","voice-assignment","scene-boundaries"]
  };
}

export function createDeviceExecutionPolicy({useThisDevice=true,shareSpareCompute=false,shareLimitPercent=5,companyPool=false}={}){
  return {
    executionTarget:useThisDevice?"device":companyPool?"company-pool":"soolen-cloud-optional",
    localFirst:Boolean(useThisDevice),
    shareSpareCompute:Boolean(shareSpareCompute),
    shareLimitPercent:shareSpareCompute?clampNumber(shareLimitPercent,1,5,5):0,
    backgroundComputeAllowed:Boolean(shareSpareCompute),
    explicitConsentRequired:true
  };
}
