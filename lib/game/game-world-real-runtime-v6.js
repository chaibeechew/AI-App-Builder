// LANERIQ AI Game World V6 — V5 playable world -> adaptive mobile runtime + executable physics/nav + evidence plan.

import {compilePlayableWorldRuntimeV5} from "./game-world-playable-runtime-v5.js";
import {createAdaptiveRuntimeBudgetV6,auditMobileAdaptiveV6} from "./game-world-mobile-adaptive-v6.js";
import {buildPhysicsWorldV6,stepPhysicsWorldV6,buildDynamicNavigationV6,buildCrowdV6,stepCrowdV6,auditPhysicsNavV6} from "./game-world-physics-nav-v6.js";
import {createRuntimeEvidenceSessionV6,attachRuntimeSubsystemEvidenceV6,auditRuntimeEvidenceV6} from "./game-world-runtime-evidence-v6.js";

export const GAME_WORLD_REAL_RUNTIME_V6=Object.freeze({
  version:"game-world-real-runtime-v6",
  productName:"LANERIQ AI Game World V6",
  layers:Object.freeze(["mobile-adaptive-governor","physics-core","dynamic-navigation","crowd-runtime","browser-evidence"]),
  browserEvidenceCanUpgradeAtRuntime:true,
  externalRapierOptional:true,
  externalRecastOptional:true,
  productionAutoWrite:false
});

export function compileRealRuntimeV6(input={}){
  const v5=compilePlayableWorldRuntimeV5(input);
  const requested=String(input.runtimeProfile||((input.deviceClass||"").includes("low")?"mobile-safe":"mobile-balanced"));
  const adaptive=createAdaptiveRuntimeBudgetV6({profile:requested});
  const physics=buildPhysicsWorldV6(v5,{fixedHz:adaptive.physicsHz});
  const physicsPreview=stepPhysicsWorldV6(physics,Math.max(12,adaptive.physicsHz));
  const nav=buildDynamicNavigationV6(v5,{agentRadius:.65});
  const crowd=buildCrowdV6(nav,Math.min(adaptive.maxNpcs,24));
  const crowdPreview=stepCrowdV6(crowd,.2);
  let evidence=createRuntimeEvidenceSessionV6({worldId:v5.worldId,route:"/game-world-v6",source:"browser"});
  evidence=attachRuntimeSubsystemEvidenceV6(evidence,{navPathPoints:v5.path?.length||0,physicsBodies:physics.dynamic.length,adaptiveProfile:adaptive.profile});
  const audits={mobile:auditMobileAdaptiveV6(adaptive),physicsNav:auditPhysicsNavV6({physics,nav,crowd}),evidence:auditRuntimeEvidenceV6(evidence)};
  const newLayers100=Object.values(audits).every(a=>a.score===100);
  const internal100=v5.readiness?.v5Internal100===true&&newLayers100;
  return{
    version:GAME_WORLD_REAL_RUNTIME_V6.version,
    v5,
    worldId:v5.worldId,
    project:v5.v4?.project,
    terrain:v5.terrain,
    poi:v5.poi,
    spawn:v5.spawn,
    adaptive,
    physics,
    physicsPreview,
    nav,
    crowd,
    crowdPreview,
    evidence,
    audits,
    adapters:{
      rapier:{package:"@dimforge/rapier3d or @dimforge/rapier3d-compat",mode:"optional-wasm-adapter",liveLoaded:false},
      recast:{package:"recast-navigation",mode:"optional-wasm-navmesh-adapter",liveLoaded:false}
    },
    readiness:{v5Internal100:v5.readiness?.v5Internal100===true,newLayers100,internalScore:internal100?100:Math.round((Number(v5.readiness?.internalScore||0)+Object.values(audits).reduce((s,a)=>s+a.score,0)/3)/2),internal100,production100:false},
    truth:{
      internalPhysicsEngineExecutable:true,
      internalDynamicNavigationExecutable:true,
      browserEvidenceRecorderImplemented:true,
      headlessBrowserRuntimeVerified:false,
      hardwareGpuVerified:false,
      externalRapierVerified:false,
      externalRecastVerified:false,
      realMobileThermalVerified:false,
      realIosDeviceVerified:false,
      realAndroidDeviceVerified:false,
      productionDeploymentVerified:false
    }
  };
}

export function summarizeRealRuntimeV6(result={}){
  return{version:result.version,worldId:result.worldId,profile:result.adaptive?.profile,targetFps:result.adaptive?.targetFps,renderScale:result.adaptive?.renderScale,physicsHz:result.adaptive?.physicsHz,physicsBodies:result.physics?.dynamic?.length||0,staticColliders:result.physics?.staticObstacles?.length||0,navPolygons:result.nav?.polygons?.length||0,dynamicBlockedCells:result.nav?.blockedCells?.length||0,crowdAgents:result.crowd?.agents?.length||0,v5Internal100:result.readiness?.v5Internal100===true,v6Internal100:result.readiness?.internal100===true,production100:false};
}
