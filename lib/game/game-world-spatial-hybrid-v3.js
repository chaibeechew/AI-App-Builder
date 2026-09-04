// LANERIQ AI Game World Spatial + Hybrid V3
// Integrates V2 world intelligence with spatial reasoning, physical cascades, hybrid 3D and NPC/motion contracts.

import {compileLatestGameWorldV2} from "./game-world-latest-tech-transfer-v2.js";
import {buildSpatialSceneGraph,auditSpatialIntelligence} from "./game-world-spatial-intelligence-v3.js";
import {predictWorldEventCascade,auditPhysicalReasoning} from "./game-world-physical-reasoning-v3.js";
import {buildHybridWorldRepresentation,auditHybridWorldRepresentation,createHybrid3DProviderContract} from "./game-world-hybrid-3d-v3.js";
import {buildPortableSceneStage,auditPortableSceneStage} from "./game-world-portable-scene-v3.js";
import {buildNpcIntelligencePackage,auditNpcMotionIntelligence,createNpcMotionProviderContract} from "./game-world-npc-motion-intelligence-v3.js";

export const GAME_WORLD_SPATIAL_HYBRID_V3=Object.freeze({
  version:"game-world-spatial-hybrid-v3",
  productName:"LANERIQ AI Game World V3",
  layers:Object.freeze(["spatial-intelligence","physical-reasoning","hybrid-3d","portable-scene","npc-motion-intelligence"]),
  architecture:"v2-world-model-plus-spatial-physical-hybrid-runtime",
  independentImplementation:true,
  proprietaryWeightsCopied:false,
  proprietaryCodeCopied:false,
  hiddenReasoningCopied:false
});

export function compileSpatialHybridGameWorldV3(input={}){
  const v2=compileLatestGameWorldV2(input);
  const project=v2.selectedWorld;
  const spatial=buildSpatialSceneGraph(project,{cellMeters:input.spatialCellMeters||128});
  const anchor=project?.blueprint?.regions?.[0]?.id||spatial.nodes?.[0]?.id||"world";
  const physical=predictWorldEventCascade({
    worldModel:v2.worldModel,
    spatial,
    event:input.counterfactualEvent||{type:"route-blocked",anchorId:anchor,payload:{source:"v3-bootstrap-counterfactual"}}
  });
  const hybrid=buildHybridWorldRepresentation({project,pcg:v2.pcg,spatial,deviceClass:input.deviceClass||"balanced"});
  const portableScene=buildPortableSceneStage({project,spatial,hybrid});
  const npcMotion=buildNpcIntelligencePackage({project,spatial,physical});
  const audits={
    spatial:auditSpatialIntelligence(spatial),
    physical:auditPhysicalReasoning(physical),
    hybrid3d:auditHybridWorldRepresentation(hybrid),
    portableScene:auditPortableSceneStage(portableScene),
    npcMotion:auditNpcMotionIntelligence(npcMotion)
  };
  const newLayers100=Object.values(audits).every(audit=>audit.score===100);
  const internal100=v2.readiness?.internal100===true&&newLayers100;
  return{
    version:GAME_WORLD_SPATIAL_HYBRID_V3.version,
    v2,
    project,
    spatial,
    physical,
    hybrid,
    portableScene,
    npcMotion,
    providerContracts:{hybrid3d:createHybrid3DProviderContract(),npcMotion:createNpcMotionProviderContract()},
    audits,
    readiness:{v2Internal100:v2.readiness?.internal100===true,newLayers100,internalScore:internal100?100:Math.round((Object.values(audits).reduce((s,a)=>s+a.score,0)/5+Number(v2.readiness?.internalScore||0))/2),internal100,production100:false},
    truth:{
      independentImplementation:true,
      proprietaryWeightsCopied:false,
      proprietaryCodeCopied:false,
      hiddenReasoningCopied:false,
      liveSpatialWorldModelProviderVerified:false,
      live3dgsProviderVerified:false,
      realOpenUsdComplianceVerified:false,
      realEngineImportVerified:false,
      liveMotionModelVerified:false,
      liveNpcModelVerified:false,
      realDeviceHybrid3dPerformanceVerified:false,
      productionDeploymentVerified:false
    }
  };
}

export function summarizeSpatialHybridGameWorldV3(result={}){
  return{
    version:result.version,
    worldId:result.project?.blueprint?.id,
    spatialNodes:result.spatial?.nodes?.length||0,
    spatialRelations:result.spatial?.relations?.length||0,
    physicalRisk:result.physical?.riskScore||0,
    hybridChunks:result.hybrid?.chunks?.length||0,
    portablePrims:result.portableScene?.stage?.prims?.length||0,
    npcArchetypes:result.npcMotion?.archetypes?.length||0,
    v2Internal100:result.readiness?.v2Internal100===true,
    v3Internal100:result.readiness?.internal100===true,
    production100:false
  };
}
