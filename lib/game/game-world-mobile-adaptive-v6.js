// LANERIQ AI Game World V6 — mobile adaptive runtime governor.
// Pure, privacy-minimized policy: no raw UA, device ID, location or cross-session fingerprint.

export const GAME_WORLD_MOBILE_ADAPTIVE_V6=Object.freeze({
  version:"game-world-mobile-adaptive-v6",
  productName:"LANERIQ AI Mobile Adaptive Runtime V6",
  rawUserAgentStored:false,
  persistentDeviceFingerprint:false,
  temperatureSensorRequired:false,
  profiles:Object.freeze(["mobile-safe","mobile-balanced","mobile-performance","desktop-balanced"])
});

const PROFILES=Object.freeze({
  "mobile-safe":Object.freeze({targetFps:30,renderScale:.65,physicsHz:30,terrainGrid:10,maxResidentChunks:4,maxNpcs:18,shadow:"off",neuralAppearance:false,postFx:"minimal"}),
  "mobile-balanced":Object.freeze({targetFps:45,renderScale:.8,physicsHz:45,terrainGrid:14,maxResidentChunks:6,maxNpcs:32,shadow:"low",neuralAppearance:false,postFx:"low"}),
  "mobile-performance":Object.freeze({targetFps:60,renderScale:1,physicsHz:60,terrainGrid:18,maxResidentChunks:9,maxNpcs:54,shadow:"medium",neuralAppearance:true,postFx:"medium"}),
  "desktop-balanced":Object.freeze({targetFps:60,renderScale:1,physicsHz:60,terrainGrid:24,maxResidentChunks:13,maxNpcs:96,shadow:"high",neuralAppearance:true,postFx:"high"})
});

function clamp(n,a,b){return Math.max(a,Math.min(b,n));}

export function classifyRuntimeDeviceV6(signals={}){
  const touch=signals.touch===true;
  const cores=clamp(Number(signals.hardwareConcurrency||4),1,32);
  const memory=clamp(Number(signals.deviceMemoryGb||4),1,32);
  const maxTexture=clamp(Number(signals.maxTextureSize||4096),1024,32768);
  const webgl2=signals.webgl2===true;
  const viewportPixels=clamp(Number(signals.viewportPixels||1280*720),320*480,7680*4320);
  let score=0;
  score+=cores>=8?2:cores>=6?1:0;
  score+=memory>=8?2:memory>=4?1:0;
  score+=maxTexture>=8192?2:maxTexture>=4096?1:0;
  score+=webgl2?2:0;
  if(viewportPixels>2560*1440)score-=1;
  if(!touch&&score>=5)return{profile:"desktop-balanced",score,signalsUsed:["touch","hardwareConcurrency","deviceMemoryGb","maxTextureSize","webgl2","viewportPixels"]};
  if(score>=6)return{profile:"mobile-performance",score,signalsUsed:["touch","hardwareConcurrency","deviceMemoryGb","maxTextureSize","webgl2","viewportPixels"]};
  if(score>=3)return{profile:"mobile-balanced",score,signalsUsed:["touch","hardwareConcurrency","deviceMemoryGb","maxTextureSize","webgl2","viewportPixels"]};
  return{profile:"mobile-safe",score,signalsUsed:["touch","hardwareConcurrency","deviceMemoryGb","maxTextureSize","webgl2","viewportPixels"]};
}

export function createAdaptiveRuntimeBudgetV6({profile="mobile-balanced",override={}}={}){
  const base=PROFILES[profile]||PROFILES["mobile-balanced"];
  return{profile,...base,...override,qualityScale:1,pressure:"normal",history:[],privacy:{rawUserAgentStored:false,persistentDeviceFingerprint:false,locationCollected:false}};
}

export function applyRuntimeFeedbackV6(budget={},sample={}){
  const fps=clamp(Number(sample.fps||0),0,240);
  const longFrameRatio=clamp(Number(sample.longFrameRatio||0),0,1);
  const target=Number(budget.targetFps||45);
  const severe=fps>0&&fps<target*.62||longFrameRatio>.32;
  const pressured=fps>0&&fps<target*.82||longFrameRatio>.16;
  const healthy=fps>=target*.96&&longFrameRatio<.05;
  let quality=Number(budget.qualityScale||1),pressure="normal";
  if(severe){quality-=.16;pressure="high";}
  else if(pressured){quality-=.08;pressure="elevated";}
  else if(healthy){quality+=.035;pressure="normal";}
  quality=clamp(quality,.5,1.08);
  const renderScale=clamp(Number(budget.renderScale||.8)*quality,.5,1.05);
  const maxResidentChunks=Math.max(2,Math.round(Number(budget.maxResidentChunks||6)*(quality<.7?.65:quality<.86?.82:1)));
  const maxNpcs=Math.max(8,Math.round(Number(budget.maxNpcs||32)*(quality<.7?.55:quality<.86?.75:1)));
  return{...budget,qualityScale:quality,pressure,renderScale,maxResidentChunks,maxNpcs,history:[...(budget.history||[]).slice(-9),{fps,longFrameRatio,qualityScale:quality,pressure}]};
}

export function buildThermalPressureProxyV6(samples=[]){
  const recent=samples.slice(-6);
  if(recent.length<3)return{state:"insufficient-evidence",measuredTemperature:false,confidence:0};
  const first=Number(recent[0].fps||0),last=Number(recent.at(-1).fps||0);
  const degradation=first>0?clamp((first-last)/first,0,1):0;
  const longFrames=recent.reduce((s,x)=>s+Number(x.longFrameRatio||0),0)/recent.length;
  const state=degradation>.28&&longFrames>.18?"sustained-performance-pressure":degradation>.15?"possible-pressure":"stable";
  return{state,degradation,longFrameRatio:longFrames,measuredTemperature:false,confidence:state==="sustained-performance-pressure"?.7:state==="possible-pressure"?.45:.35,truth:"performance proxy only; not device temperature"};
}

export function auditMobileAdaptiveV6(budget={}){
  const gates={boundedFps:[30,45,60].includes(Number(budget.targetFps)),boundedRenderScale:Number(budget.renderScale)>=.5&&Number(budget.renderScale)<=1.1,boundedPhysics:Number(budget.physicsHz)>=30&&Number(budget.physicsHz)<=60,boundedChunks:Number(budget.maxResidentChunks)>=2&&Number(budget.maxResidentChunks)<=16,privacy:budget.privacy?.rawUserAgentStored===false&&budget.privacy?.persistentDeviceFingerprint===false};
  const passed=Object.values(gates).filter(Boolean).length;
  return{score:Math.round(passed/Object.keys(gates).length*100),gates,internal100:passed===Object.keys(gates).length,realThermalVerified:false};
}
