// LANERIQ AI Game World V7 — privacy-minimized foreground device evidence.
// Browser evidence is not hardware attestation. Native-bridge attestation remains a separate explicit gate.

export const GAME_WORLD_DEVICE_EVIDENCE_V7=Object.freeze({
  version:"game-world-device-evidence-v7",
  architecture:"consent-first-local-evidence-with-native-attestation-gate",
  rawUserAgentStored:false,
  ipStored:false,
  preciseLocationStored:false,
  persistentFingerprintStored:false,
  measuredTemperature:false,
  nativeAttestationRequiredForRealDeviceVerified:true
});

const ALLOWED_CLAIMS=new Set(["unknown","iphone","android","desktop","tablet"]);
function clamp(n,a,b){return Math.max(a,Math.min(b,Number(n)||0));}
function median(values){if(!values.length)return 0;const a=[...values].sort((x,y)=>x-y),m=Math.floor(a.length/2);return a.length%2?a[m]:(a[m-1]+a[m])/2;}

export function createDeviceEvidenceSessionV7({consent=false,deviceClaim="unknown",source="browser",route="/landing/game-world-v7-device-evidence"}={}){
  const claim=ALLOWED_CLAIMS.has(deviceClaim)?deviceClaim:"unknown";
  return{
    version:GAME_WORLD_DEVICE_EVIDENCE_V7.version,
    consent:consent===true,
    deviceClaim:claim,
    source:String(source).slice(0,48),
    route:String(route).slice(0,160),
    startedAt:new Date().toISOString(),
    environment:{touch:false,foreground:false,webdriver:false,graphicsApi:"unknown",rendererClass:"unknown",viewportClass:"unknown",memoryClass:"unknown",cpuClass:"unknown"},
    samples:[],
    nativeAttestation:null,
    privacy:{rawUserAgentStored:false,ipStored:false,preciseLocationStored:false,persistentFingerprintStored:false,preciseScreenSizeStored:false},
    truth:{foregroundBrowserMeasured:false,selfAttestedDevice:false,nativeDeviceAttested:false,realIosDeviceVerified:false,realAndroidDeviceVerified:false,measuredDeviceTemperature:false,thermalPressureProxyOnly:true,productionRuntimeVerified:false}
  };
}

export function recordDeviceEnvironmentV7(session={},env={}){
  if(session.consent!==true)return session;
  const renderer=["software","hardware-or-driver","unknown"].includes(env.rendererClass)?env.rendererClass:"unknown";
  const viewport=["compact","medium","large","unknown"].includes(env.viewportClass)?env.viewportClass:"unknown";
  const memory=["low","balanced","high","unknown"].includes(env.memoryClass)?env.memoryClass:"unknown";
  const cpu=["low","balanced","high","unknown"].includes(env.cpuClass)?env.cpuClass:"unknown";
  return{...session,environment:{touch:env.touch===true,foreground:env.foreground===true,webdriver:env.webdriver===true,graphicsApi:String(env.graphicsApi||"unknown").slice(0,24),rendererClass:renderer,viewportClass:viewport,memoryClass:memory,cpuClass:cpu}};
}

export function recordDeviceFrameSampleV7(session={},sample={}){
  if(session.consent!==true)return session;
  const normalized={fps:clamp(sample.fps,0,240),frameMs:clamp(sample.frameMs,0,1000),longFrameRatio:clamp(sample.longFrameRatio,0,1),renderScale:clamp(sample.renderScale||1,.25,2),residentChunks:clamp(sample.residentChunks,0,64),foreground:sample.foreground===true,elapsedMs:clamp(sample.elapsedMs,0,86_400_000)};
  return{...session,samples:[...(session.samples||[]).slice(-179),normalized]};
}

export function computeThermalPressureProxyV7(session={}){
  const samples=(session.samples||[]).filter(s=>s.foreground&&s.fps>0);
  if(samples.length<4)return{level:"insufficient",confidence:0,measuredTemperature:false,trendFpsDelta:0,longFrameRatio:0};
  const half=Math.max(2,Math.floor(samples.length/2));
  const early=median(samples.slice(0,half).map(s=>s.fps)),late=median(samples.slice(-half).map(s=>s.fps));
  const delta=late-early,long=samples.slice(-half).reduce((a,b)=>a+b.longFrameRatio,0)/half;
  let level="normal";
  if(delta<=-15||long>=.28)level="high";
  else if(delta<=-8||long>=.16)level="elevated";
  else if(delta<=-4||long>=.08)level="moderate";
  return{level,confidence:Math.min(1,samples.length/16),measuredTemperature:false,trendFpsDelta:delta,longFrameRatio:long};
}

export function attachNativeDeviceAttestationV7(session={},attestation={}){
  if(session.consent!==true)return session;
  const platform=attestation.platform==="ios"?"ios":attestation.platform==="android"?"android":"unknown";
  const valid=attestation.valid===true&&["ios","android"].includes(platform)&&String(attestation.nonce||"").length>=16&&String(attestation.signatureDigest||"").length>=16;
  return{...session,nativeAttestation:{platform,valid,provider:String(attestation.provider||"laneriq-native-bridge").slice(0,64),nonceDigest:String(attestation.nonceDigest||"").slice(0,128),signatureDigest:String(attestation.signatureDigest||"").slice(0,128)}};
}

export function finalizeDeviceEvidenceV7(session={}){
  const samples=session.samples||[],foreground=samples.filter(s=>s.foreground&&s.fps>0);
  const measured=session.consent===true&&session.environment?.foreground===true&&session.environment?.webdriver===false&&foreground.length>=3;
  const attested=session.nativeAttestation?.valid===true;
  const thermal=computeThermalPressureProxyV7(session);
  const summary={sampleCount:samples.length,foregroundSampleCount:foreground.length,medianFps:median(foreground.map(s=>s.fps)),medianFrameMs:median(foreground.map(s=>s.frameMs)),maxResidentChunks:foreground.length?Math.max(...foreground.map(s=>s.residentChunks||0)):0,thermalPressure:thermal.level};
  return{...session,completedAt:new Date().toISOString(),summary,thermalProxy:thermal,truth:{...session.truth,foregroundBrowserMeasured:measured,selfAttestedDevice:measured&&session.deviceClaim!=="unknown",nativeDeviceAttested:attested,realIosDeviceVerified:attested&&session.nativeAttestation.platform==="ios",realAndroidDeviceVerified:attested&&session.nativeAttestation.platform==="android",measuredDeviceTemperature:false,thermalPressureProxyOnly:true,productionRuntimeVerified:false}};
}

export function sanitizeDeviceEvidenceForExportV7(session={}){
  const f=finalizeDeviceEvidenceV7(session);
  return{version:f.version,deviceClaim:f.deviceClaim,source:f.source,route:f.route,startedAt:f.startedAt,completedAt:f.completedAt,environment:f.environment,summary:f.summary,thermalProxy:f.thermalProxy,nativeAttestation:f.nativeAttestation?{platform:f.nativeAttestation.platform,valid:f.nativeAttestation.valid,provider:f.nativeAttestation.provider,nonceDigest:f.nativeAttestation.nonceDigest,signatureDigest:f.nativeAttestation.signatureDigest}:null,privacy:f.privacy,truth:f.truth};
}

export function createNativeDeviceEvidenceContractV7(){
  return{
    ios:{bridge:"LANERIQ iOS runtime evidence bridge",requires:["foreground-session","signed-nonce","app-build-id","coarse-performance-samples"],temperatureSensorRequired:false},
    android:{bridge:"LANERIQ Android runtime evidence bridge",requires:["foreground-session","signed-nonce","app-build-id","coarse-performance-samples"],temperatureSensorRequired:false},
    rules:{rawDeviceIdentifierAllowed:false,advertisingIdentifierAllowed:false,preciseLocationAllowed:false,rawUserAgentAllowed:false,crossSessionFingerprintAllowed:false}
  };
}

export function auditDeviceEvidenceV7(session={}){
  const out=sanitizeDeviceEvidenceForExportV7(session);
  const gates={consentField:typeof session.consent==="boolean",privacy:out.privacy?.rawUserAgentStored===false&&out.privacy?.ipStored===false&&out.privacy?.persistentFingerprintStored===false,nativeGate:out.truth?.nativeDeviceAttested===true||(!out.truth?.realIosDeviceVerified&&!out.truth?.realAndroidDeviceVerified),thermalTruth:out.truth?.measuredDeviceTemperature===false&&out.truth?.thermalPressureProxyOnly===true,productionBoundary:out.truth?.productionRuntimeVerified===false};
  const passed=Object.values(gates).filter(Boolean).length;
  return{score:Math.round(passed/Object.keys(gates).length*100),gates,internal100:passed===Object.keys(gates).length};
}
