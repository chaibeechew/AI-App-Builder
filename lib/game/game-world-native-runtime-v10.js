// LANERIQ AI Game World V10 — native runtime bridge contracts for iOS/Android/Desktop.
import {compileRealDeviceV9} from "./game-world-real-device-v9.js";

export const GAME_WORLD_NATIVE_RUNTIME_V10=Object.freeze({
  version:"game-world-native-runtime-v10",
  platforms:Object.freeze(["ios","android","desktop"]),
  bridgeModel:"capability-negotiated-signed-native-bridge",
  browserFallback:true,
  productionAutoWrite:false
});

const CAPABILITIES=Object.freeze(["secure-storage","lifecycle","haptics","controller","filesystem-cache","device-compute","graphics-surface","native-attestation"]);

export function createNativeBridgeContractV10(input={}){
  const platform=GAME_WORLD_NATIVE_RUNTIME_V10.platforms.includes(input.platform)?input.platform:"unknown";
  const declared=new Set(Array.isArray(input.capabilities)?input.capabilities:[]);
  const capabilities=Object.fromEntries(CAPABILITIES.map(k=>[k,declared.has(k)]));
  return{
    platform,
    bridgeVersion:String(input.bridgeVersion||"1"),
    signedHandshake:Boolean(input.signedHandshake),
    capabilities,
    lifecycle:{foreground:true,suspended:false,backgroundBudgetMs:Math.max(0,Math.min(30000,Number(input.backgroundBudgetMs||0)))},
    storage:{encryptedAtRest:Boolean(input.encryptedAtRest),perUserNamespace:true},
    graphics:{backend:String(input.graphicsBackend||"browser"),hardwareSurfaceVerified:Boolean(input.hardwareSurfaceVerified)},
    compute:{maxSharePercent:Math.max(0,Math.min(5,Number(input.maxSharePercent||0))),userControllable:true,thermalStopRequired:true},
    truth:{nativeAppExecuted:false,storeBuildVerified:false}
  };
}

export function validateNativeBridgeV10(bridge={}){
  const required=["secure-storage","lifecycle","graphics-surface","native-attestation"];
  const missing=required.filter(k=>bridge.capabilities?.[k]!==true);
  if(!bridge.signedHandshake)missing.push("signed-handshake");
  if(!bridge.storage?.encryptedAtRest)missing.push("encrypted-storage");
  const admitted=bridge.platform!=="unknown"&&missing.length===0;
  return{admitted,missing,score:admitted?100:Math.max(0,100-missing.length*15)};
}

export function planNativeLifecycleV10(bridge={},event="foreground"){
  const e=String(event);
  if(e==="suspend"||e==="background")return{pauseWorldSimulation:true,flushCheckpoint:true,releaseGpuTransient:true,keepNetworkAlive:false};
  if(e==="memory-warning")return{evictFarChunks:true,reduceRenderScale:true,virtualizeNpcs:true,flushCheckpoint:false};
  if(e==="thermal-serious")return{reducePhysicsHz:true,reduceNpcs:true,reduceGpuLoad:true,stopCommunityCompute:true};
  return{resumeWorldSimulation:true,restoreCheckpoint:true,reacquireGraphicsSurface:true};
}

export function compileNativeRuntimeV10(input={}){
  const v9=compileRealDeviceV9(input.v9||{});
  const bridge=createNativeBridgeContractV10(input.bridge||{});
  const validation=validateNativeBridgeV10(bridge);
  return{
    version:GAME_WORLD_NATIVE_RUNTIME_V10.version,
    v9,
    bridge,
    validation,
    lifecyclePlans:{background:planNativeLifecycleV10(bridge,"background"),memoryWarning:planNativeLifecycleV10(bridge,"memory-warning"),thermalSerious:planNativeLifecycleV10(bridge,"thermal-serious")},
    readiness:{internal100:true,production100:false},
    truth:{
      nativeBridgeContractExecutable:true,
      nativeBridgeAdmitted:validation.admitted,
      nativeAppExecuted:false,
      realHardwareGraphicsSurfaceVerified:false,
      storeBuildVerified:false,
      productionDeploymentVerified:false
    }
  };
}
