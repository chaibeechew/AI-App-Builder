// LANERIQ AI WebGPU Runtime Planner V2
// Browser/runtime capability plan with deterministic fallbacks.
// Does not claim a real GPU benchmark until browser/device evidence is collected.

function clamp(value,min,max){return Math.max(min,Math.min(max,Number(value)||0));}
function clone(value){return JSON.parse(JSON.stringify(value));}

export const GAME_WORLD_WEBGPU_RUNTIME_V2=Object.freeze({
  version:"game-world-webgpu-runtime-v2",
  architecture:"webgpu-first-progressive-runtime",
  webgpuPreferred:true,
  webgl2Fallback:true,
  cpuFallback:true,
  transformBatching:true,
  chunkStreaming:true,
  realDeviceGpuVerified:false
});

export function planWebGpuWorldRuntime(project,{targetFps=60,deviceClass="balanced",chunkMeters=256,maxVisibleChunks=36}={}){
  if(!project?.blueprint?.id)throw new Error("world_project_required");
  const quality=deviceClass==="low"?"performance":deviceClass==="high"?"quality":"balanced";
  const target=clamp(targetFps,30,120);
  const entityCount=Number(project.scene?.entityCount)||Object.keys(project.scene?.entities||{}).length||project.blueprint.regions.length;
  const transformCapacity=Math.max(1024,Math.ceil(entityCount/1024)*1024);
  const visible=clamp(maxVisibleChunks,9,144);
  return{
    version:GAME_WORLD_WEBGPU_RUNTIME_V2.version,
    worldId:project.blueprint.id,
    target:{fps:target,frameBudgetMs:Number((1000/target).toFixed(2)),quality,deviceClass},
    renderer:{preferred:"webgpu",fallbacks:["webgl2","cpu-safe-preview"],wgslReady:true,compatibilityModeReady:true},
    gpuData:{
      transformCapacity,
      transformUpdate:"batched-dynamic-small-data",
      instanceData:"storage-buffer-or-vertex-buffer",
      terrain:"chunked-mesh",
      visibility:"frustum-plus-distance",
      culling:"gpu-ready",
      materialStrategy:"atlas-plus-bind-group-pooling"
    },
    streaming:{chunkMeters:clamp(chunkMeters,64,1024),maxVisibleChunks:visible,prefetchRing:2,lodRings:4,eviction:"distance-plus-recency"},
    scheduling:{mainThread:["input","ui","lightweight-world-events"],workerReady:["pcg","visibility-prep","asset-decode"],gpu:["terrain","instances","lighting","post"]},
    budget:{maxDrawGroups:quality==="performance"?128:quality==="quality"?512:256,maxDynamicLights:quality==="performance"?8:quality==="quality"?48:24,maxShadowCasters:quality==="performance"?12:quality==="quality"?96:48},
    evidence:{compileContract:"internal",realBrowserWebGpu:false,realDeviceFps:false,thermalVerified:false}
  };
}

export function createWebGpuCapabilityProbeContract(){
  return{
    version:"webgpu-capability-probe-v2",
    browserSignals:["navigator.gpu","adapter","device","limits","features"],
    probes:["preferred-canvas-format","max-buffer-size","max-bind-groups","timestamp-query-optional","texture-compression","compatibility-mode"],
    privacyRule:"store capability class and benchmark aggregates only; do not fingerprint raw device identity",
    fallbackOrder:["webgpu","webgl2","cpu-safe-preview"]
  };
}

export function createEngineExportAdapters(){
  return{
    version:"game-world-engine-adapters-v2",
    godot:{target:"Godot 4.7.x",status:"schema-ready",outputs:["scene-manifest","terrain-chunks","navigation-data","world-events","asset-manifest"]},
    unreal:{target:"Unreal Engine 5.8",status:"schema-ready",outputs:["pcg-graph-manifest","mesh-terrain-manifest","world-partition-chunks","scene-manifest"]},
    unity:{target:"Unity 6+ AI-tool-compatible workflow",status:"schema-ready",outputs:["scene-manifest","agent-tool-contract","asset-manifest","world-events"]},
    web:{target:"WebGPU/WebGL2",status:"runtime-plan-ready",outputs:["runtime-manifest","chunk-plan","gpu-data-layout"]},
    truth:{actualEditorImportVerified:false,storeBuildVerified:false}
  };
}

export function createNeuralRenderingExtensionContract(){
  return{
    version:"neural-rendering-extension-contract-v1",
    role:"optional-appearance-layer",
    inputs:["color","depth","motion","normals","material-hints"],
    outputs:["enhanced-frame"],
    providerModes:["local-supported-gpu","external-provider-adapter","disabled"],
    mandatoryForCoreRuntime:false,
    fallback:"standard-raster-or-engine-renderer",
    proprietaryModelBundled:false,
    liveProviderVerified:false
  };
}

export function auditWebGpuRuntimePlan(plan){
  const checks={
    version:plan?.version===GAME_WORLD_WEBGPU_RUNTIME_V2.version,
    progressive:plan?.renderer?.preferred==="webgpu"&&plan?.renderer?.fallbacks?.length>=2,
    frameBudget:Number(plan?.target?.frameBudgetMs)>0,
    streaming:Number(plan?.streaming?.maxVisibleChunks)>=9,
    batching:plan?.gpuData?.transformUpdate==="batched-dynamic-small-data",
    deviceTruth:plan?.evidence?.realDeviceFps===false&&plan?.evidence?.thermalVerified===false
  };
  return{score:Math.round(Object.values(checks).filter(Boolean).length/Object.keys(checks).length*100),checks};
}

export function cloneRuntimePlan(plan){return clone(plan);}
