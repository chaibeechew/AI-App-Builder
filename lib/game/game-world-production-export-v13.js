// LANERIQ AI Game World V13 — export evidence + exact-SHA Production closure.
import {compileMultiplayerV12} from "./game-world-multiplayer-v12.js";

export const GAME_WORLD_PRODUCTION_EXPORT_V13=Object.freeze({
  version:"game-world-production-export-v13",
  productName:"LANERIQ AI World Engine",
  closureRule:"github-main-sha-equals-production-sha-equals-runtime-sha-and-all-required-evidence",
  productionAutoWrite:false
});

export function createExportManifestV13(input={}){
  const worldId=String(input.worldId||"world");
  const revision=String(input.revision||"0");
  const base={worldId,revision,coordinateSystem:"right-handed-y-up",units:"meters",sceneGraph:"laneriq-portable-scene-v3",gameplayTruth:"mesh-collision-nav",appearance:"optional-neural-or-splat"};
  return{
    canonical:base,
    web:{format:"LANERIQ-WebWorld",runtime:"WebGPU/WebGL2",verified:false},
    gltf:{format:"glTF 2.x",verified:false},
    openusd:{format:"OpenUSD-stage-contract",standardsConformanceVerified:false,verified:false},
    godot:{target:"Godot 4.7.x+",adapterReady:true,editorImportVerified:false},
    unity:{target:"Unity 6+",adapterReady:true,editorImportVerified:false},
    unreal:{target:"Unreal Engine 5.8+",adapterReady:true,editorImportVerified:false}
  };
}

export function evaluateEngineExportEvidenceV13(input={}){
  const web=Boolean(input.webRuntimeVerified);
  const gltf=Boolean(input.gltfRoundTripVerified);
  const usd=Boolean(input.openUsdConformanceVerified);
  const godot=Boolean(input.godotEditorImportVerified);
  const unity=Boolean(input.unityEditorImportVerified);
  const unreal=Boolean(input.unrealEditorImportVerified);
  return{web,gltf,openUsd:usd,godot,unity,unreal,allRequired:web&&gltf&&usd&&godot&&unity&&unreal};
}

export function evaluateProductionClosureV13(input={}){
  const githubSha=String(input.githubMainSha||"");
  const productionSha=String(input.productionSha||"");
  const runtimeSha=String(input.runtimeSha||"");
  const shaExact=Boolean(githubSha)&&githubSha===productionSha&&productionSha===runtimeSha;
  const gates={
    supabase:Boolean(input.supabaseVerified),
    api:Boolean(input.apiVerified),
    browser:Boolean(input.browserVerified),
    malware:Boolean(input.malwareVerified),
    appBuilder:Boolean(input.appBuilderVerified),
    ui:Boolean(input.uiVerified),
    supplyChain:Boolean(input.supplyChainVerified),
    ios:Boolean(input.realIosDeviceVerified),
    android:Boolean(input.realAndroidDeviceVerified),
    largeWorld:Boolean(input.largeWorldSoakVerified),
    exports:Boolean(input.engineExportsVerified),
    multiplayer:input.multiplayerRequired===false?true:Boolean(input.multiplayerVerified)
  };
  const allEvidence=Object.values(gates).every(Boolean);
  const production100=shaExact&&allEvidence;
  return{githubSha,productionSha,runtimeSha,shaExact,gates,allEvidence,production100};
}

export function compileProductionWorldV13(input={}){
  const v12=compileMultiplayerV12(input.v12||{});
  const manifest=createExportManifestV13({worldId:input.worldId||v12.v11?.partition?.worldSizeKm||"world",revision:input.revision||v12.world?.worldRevision||0});
  const exportEvidence=evaluateEngineExportEvidenceV13(input.exportEvidence||{});
  const closure=evaluateProductionClosureV13({...input.closure,engineExportsVerified:input.closure?.engineExportsVerified??exportEvidence.allRequired});
  return{
    version:GAME_WORLD_PRODUCTION_EXPORT_V13.version,
    v12,manifest,exportEvidence,closure,
    layers:Object.freeze(["v8-supply-chain","v9-real-device","v10-native-runtime","v11-large-world","v12-multiplayer","v13-export-production-closure"]),
    readiness:{internal100:true,production100:closure.production100},
    truth:{production100:closure.production100,productionDeploymentVerified:closure.shaExact&&Boolean(input.closure?.browserVerified),engineExportEvidenceComplete:exportEvidence.allRequired}
  };
}
