// LANERIQ AI Game World V6 — truthful browser runtime evidence model.
// Stores coarse capability/performance evidence only; excludes raw UA, IP, precise device ID and location.

export const GAME_WORLD_RUNTIME_EVIDENCE_V6=Object.freeze({
  version:"game-world-runtime-evidence-v6",
  evidenceKinds:Object.freeze(["browser-context","frame-performance","chunk-residency","nav-runtime","physics-runtime","mobile-adaptation"]),
  rawUserAgentStored:false,
  ipStored:false,
  locationStored:false,
  persistentFingerprintStored:false
});

function clamp(n,a,b){return Math.max(a,Math.min(b,n));}
function percentile(values,p){if(!values.length)return 0;const a=[...values].sort((x,y)=>x-y),i=Math.min(a.length-1,Math.max(0,Math.ceil(p*a.length)-1));return a[i];}

export function createRuntimeEvidenceSessionV6({worldId="world",route="/game-world-v6",source="browser"}={}){
  return{version:GAME_WORLD_RUNTIME_EVIDENCE_V6.version,sessionId:`rt_${Math.random().toString(36).slice(2,10)}`,worldId:String(worldId),route:String(route),source,startedAt:new Date().toISOString(),browser:{contextCreated:false,api:"unknown",rendererClass:"unknown",webgl2:false,maxTextureSize:0},samples:[],runtime:{residentChunks:0,navPathPoints:0,physicsBodies:0,adaptiveProfile:"unknown"},privacy:{rawUserAgentStored:false,ipStored:false,locationStored:false,persistentFingerprintStored:false},truth:{browserRuntimeVerified:false,measuredBrowserFpsVerified:false,hardwareGpuVerified:false,realDeviceFpsVerified:false,realDeviceThermalVerified:false,productionRuntimeVerified:false}};
}

export function recordBrowserContextV6(session={},evidence={}){
  const rendererClass=["software","hardware-or-driver","unknown"].includes(evidence.rendererClass)?evidence.rendererClass:"unknown";
  return{...session,browser:{contextCreated:evidence.contextCreated===true,api:String(evidence.api||"unknown").slice(0,32),rendererClass,webgl2:evidence.webgl2===true,maxTextureSize:clamp(Number(evidence.maxTextureSize||0),0,32768)},truth:{...session.truth,browserRuntimeVerified:evidence.contextCreated===true,hardwareGpuVerified:evidence.contextCreated===true&&rendererClass==="hardware-or-driver"}};
}

export function recordFrameSampleV6(session={},sample={}){
  const normalized={fps:clamp(Number(sample.fps||0),0,240),frameMs:clamp(Number(sample.frameMs||0),0,1000),longFrameRatio:clamp(Number(sample.longFrameRatio||0),0,1),residentChunks:clamp(Number(sample.residentChunks||0),0,64),renderScale:clamp(Number(sample.renderScale||1),.25,2),atMs:clamp(Number(sample.atMs||0),0,86_400_000)};
  return{...session,samples:[...(session.samples||[]).slice(-119),normalized],runtime:{...session.runtime,residentChunks:normalized.residentChunks}};
}

export function attachRuntimeSubsystemEvidenceV6(session={},runtime={}){
  return{...session,runtime:{...session.runtime,navPathPoints:Number(runtime.navPathPoints||0),physicsBodies:Number(runtime.physicsBodies||0),adaptiveProfile:String(runtime.adaptiveProfile||"unknown").slice(0,48)}};
}

export function finalizeRuntimeEvidenceV6(session={}){
  const samples=session.samples||[],fps=samples.map(x=>x.fps).filter(x=>x>0),frame=samples.map(x=>x.frameMs).filter(x=>x>0),long=samples.map(x=>x.longFrameRatio||0);
  const summary={sampleCount:samples.length,medianFps:fps.length?percentile(fps,.5):0,p10Fps:fps.length?percentile(fps,.1):0,p95FrameMs:frame.length?percentile(frame,.95):0,avgLongFrameRatio:long.length?long.reduce((a,b)=>a+b,0)/long.length:0,maxResidentChunks:samples.length?Math.max(...samples.map(x=>x.residentChunks||0)):0};
  const measuredBrowser=session.browser?.contextCreated===true;
  const sustained=samples.length>=3&&summary.medianFps>0;
  return{...session,completedAt:new Date().toISOString(),summary,truth:{...session.truth,browserRuntimeVerified:measuredBrowser,measuredBrowserFpsVerified:measuredBrowser&&sustained,realDeviceFpsVerified:false,realDeviceThermalVerified:false,productionRuntimeVerified:false},evidenceLevel:measuredBrowser&&sustained?"BROWSER_RUNTIME_MEASURED":measuredBrowser?"BROWSER_CONTEXT_MEASURED":"CODE_ONLY"};
}

export function sanitizeRuntimeEvidenceForExportV6(session={}){
  const finalized=finalizeRuntimeEvidenceV6(session);
  return{version:finalized.version,worldId:finalized.worldId,route:finalized.route,source:finalized.source,startedAt:finalized.startedAt,completedAt:finalized.completedAt,browser:finalized.browser,summary:finalized.summary,runtime:finalized.runtime,privacy:finalized.privacy,truth:finalized.truth,evidenceLevel:finalized.evidenceLevel};
}

export function auditRuntimeEvidenceV6(session={}){
  const exported=sanitizeRuntimeEvidenceForExportV6(session);const gates={privacy:exported.privacy?.rawUserAgentStored===false&&exported.privacy?.ipStored===false&&exported.privacy?.locationStored===false,contextField:typeof exported.browser?.contextCreated==="boolean",boundedSamples:(session.samples?.length||0)<=120,truthBoundary:exported.truth?.realDeviceFpsVerified===false&&exported.truth?.realDeviceThermalVerified===false&&exported.truth?.productionRuntimeVerified===false,exportNoSessionId:!("sessionId" in exported)};const passed=Object.values(gates).filter(Boolean).length;return{score:Math.round(passed/Object.keys(gates).length*100),gates,internal100:passed===Object.keys(gates).length};
}
