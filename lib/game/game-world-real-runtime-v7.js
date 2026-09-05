// LANERIQ AI Game World V7 — V6 measured browser runtime + external WASM verification + device evidence.

import {compileRealRuntimeV6} from "./game-world-real-runtime-v6.js";
import {createExternalWasmEvidenceV7,auditExternalWasmV7} from "./game-world-wasm-runtime-v7.js";
import {createDeviceEvidenceSessionV7,auditDeviceEvidenceV7,createNativeDeviceEvidenceContractV7} from "./game-world-device-evidence-v7.js";

export const GAME_WORLD_REAL_RUNTIME_V7=Object.freeze({
  version:"game-world-real-runtime-v7",
  productName:"LANERIQ AI Game World V7",
  layers:Object.freeze(["v6-measured-runtime","external-wasm-verification","foreground-device-evidence","native-device-attestation-contract"]),
  externalWasmPinned:true,
  physicalDeviceTruthSeparated:true,
  productionAutoWrite:false
});

export function compileRealRuntimeV7(input={}){
  const v6=compileRealRuntimeV6(input);
  const wasm=createExternalWasmEvidenceV7();
  const device=createDeviceEvidenceSessionV7({consent:false,deviceClaim:"unknown",source:"browser",route:"/game-world-v7"});
  const nativeDeviceContract=createNativeDeviceEvidenceContractV7();
  const audits={wasm:auditExternalWasmV7(wasm),device:auditDeviceEvidenceV7(device)};
  const newLayers100=Object.values(audits).every(a=>a.score===100);
  const internal100=v6.readiness?.internal100===true&&newLayers100;
  return{
    version:GAME_WORLD_REAL_RUNTIME_V7.version,
    v6,
    worldId:v6.worldId,
    project:v6.project,
    terrain:v6.terrain,
    spawn:v6.spawn,
    adaptive:v6.adaptive,
    physics:v6.physics,
    nav:v6.nav,
    crowd:v6.crowd,
    wasm,
    device,
    nativeDeviceContract,
    audits,
    readiness:{v6Internal100:v6.readiness?.internal100===true,newLayers100,internalScore:internal100?100:Math.round((Number(v6.readiness?.internalScore||0)+Object.values(audits).reduce((s,a)=>s+a.score,0)/2)/2),internal100,production100:false},
    truth:{
      ...v6.truth,
      externalRapierWasmCiVerified:false,
      externalRecastWasmCiVerified:false,
      foregroundPhysicalBrowserMeasured:false,
      nativeDeviceAttestationImplemented:true,
      realIosDeviceVerified:false,
      realAndroidDeviceVerified:false,
      measuredDeviceTemperature:false,
      productionDeploymentVerified:false
    }
  };
}

export function applyV7ExecutionEvidence(result={},evidence={}){
  const wasm=evidence.wasm||result.wasm;
  const device=evidence.device||result.device;
  return{
    ...result,
    wasm,device,
    truth:{
      ...result.truth,
      externalRapierWasmCiVerified:wasm?.truth?.externalRapierWasmVerified===true,
      externalRecastWasmCiVerified:wasm?.truth?.externalRecastWasmVerified===true,
      foregroundPhysicalBrowserMeasured:device?.truth?.foregroundBrowserMeasured===true,
      realIosDeviceVerified:device?.truth?.realIosDeviceVerified===true,
      realAndroidDeviceVerified:device?.truth?.realAndroidDeviceVerified===true,
      measuredDeviceTemperature:false,
      productionDeploymentVerified:false
    }
  };
}

export function summarizeRealRuntimeV7(result={}){
  return{
    version:result.version,
    worldId:result.worldId,
    runtimeProfile:result.adaptive?.profile,
    targetFps:result.adaptive?.targetFps,
    v7Internal100:result.readiness?.internal100===true,
    rapierWasmVerified:result.truth?.externalRapierWasmCiVerified===true,
    recastWasmVerified:result.truth?.externalRecastWasmCiVerified===true,
    foregroundPhysicalBrowserMeasured:result.truth?.foregroundPhysicalBrowserMeasured===true,
    realIosDeviceVerified:result.truth?.realIosDeviceVerified===true,
    realAndroidDeviceVerified:result.truth?.realAndroidDeviceVerified===true,
    production100:false
  };
}
