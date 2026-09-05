// LANERIQ AI Game World V9 — real-device evidence admission without browser self-attestation.
import {evaluateGameWorldSupplyChainV8} from "./game-world-supply-chain-v8.js";

export const GAME_WORLD_REAL_DEVICE_V9=Object.freeze({
  version:"game-world-real-device-v9",
  evidenceModel:"consent-first-signed-native-attestation",
  rawIdentifiersStored:false,
  exactTemperatureRequired:false,
  productionAutoWrite:false
});

const median=a=>{const x=[...a].sort((a,b)=>a-b);return x.length?x[Math.floor(x.length/2)]:0;};

export function createRealDeviceSessionV9(input={}){
  return{
    consent:Boolean(input.consent),
    platform:["ios","android"].includes(String(input.platform))?String(input.platform):"unknown",
    sessionNonce:String(input.sessionNonce||""),
    samples:[],
    attestation:null,
    coarse:{gpuClass:"unknown",memoryClass:"unknown",thermalState:"unknown"},
    privacy:{rawUserAgentStored:false,ipStored:false,locationStored:false,advertisingIdStored:false,persistentFingerprintStored:false}
  };
}

export function recordRealDeviceSampleV9(session,input={}){
  if(!session?.consent)return session;
  const samples=[...(session.samples||[]),{
    fps:Math.max(0,Math.min(240,Number(input.fps||0))),
    frameMs:Math.max(0,Math.min(1000,Number(input.frameMs||0))),
    residentChunks:Math.max(0,Math.min(4096,Number(input.residentChunks||0))),
    renderScale:Math.max(.25,Math.min(2,Number(input.renderScale||1))),
    thermalState:["nominal","fair","serious","critical","unknown"].includes(input.thermalState)?input.thermalState:"unknown"
  }].slice(-120);
  return{...session,samples,coarse:{...session.coarse,gpuClass:String(input.gpuClass||session.coarse.gpuClass),memoryClass:String(input.memoryClass||session.coarse.memoryClass),thermalState:samples.at(-1)?.thermalState||"unknown"}};
}

export function attachNativeAttestationV9(session,input={}){
  const platform=String(input.platform||"");
  const signed=Boolean(input.signed)&&Boolean(input.signature)&&Boolean(input.keyId)&&Boolean(input.nonceMatch);
  const validPlatform=platform===session.platform&&["ios","android"].includes(platform);
  return{...session,attestation:{platform,keyId:String(input.keyId||""),signed,nonceMatch:Boolean(input.nonceMatch),verified:signed&&validPlatform}};
}

export function summarizeRealDeviceV9(session={}){
  const fps=(session.samples||[]).map(x=>x.fps).filter(x=>x>0);
  const measured=session.consent===true&&fps.length>=5;
  const attested=session.attestation?.verified===true;
  const ios=attested&&session.platform==="ios";
  const android=attested&&session.platform==="android";
  return{
    sampleCount:fps.length,
    medianFps:Math.round(median(fps)),
    foregroundDeviceMeasured:measured,
    nativeDeviceAttested:attested,
    realIosDeviceVerified:ios&&measured,
    realAndroidDeviceVerified:android&&measured,
    hardwareGpuClassMeasured:measured&&session.coarse?.gpuClass!=="unknown",
    thermalStateObserved:measured&&session.coarse?.thermalState!=="unknown",
    measuredDeviceTemperature:false
  };
}

export function compileRealDeviceV9(input={}){
  const supply=evaluateGameWorldSupplyChainV8(input.supplyChain||{});
  const session=input.session||createRealDeviceSessionV9({});
  const evidence=summarizeRealDeviceV9(session);
  return{
    version:GAME_WORLD_REAL_DEVICE_V9.version,
    supplyChain:supply,
    evidence,
    readiness:{internal100:true,production100:false},
    truth:{
      realDeviceEvidenceHarnessExecutable:true,
      nativeAttestationRequired:true,
      realIosDeviceVerified:evidence.realIosDeviceVerified,
      realAndroidDeviceVerified:evidence.realAndroidDeviceVerified,
      measuredDeviceTemperature:false,
      productionDeploymentVerified:false
    }
  };
}
