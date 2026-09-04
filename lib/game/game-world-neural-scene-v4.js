// LANERIQ AI Game World Neural Scene V4
// Editable gameplay truth + optional neural appearance; no live neural renderer claim.

function clamp(v,min,max){return Math.max(min,Math.min(max,Number(v)||0));}

export const GAME_WORLD_NEURAL_SCENE_V4=Object.freeze({
  version:"game-world-neural-scene-v4",
  representations:Object.freeze(["semantic-mesh","collision","navmesh","occupancy-grid","signed-distance-field","gaussian-appearance-optional","radiance-field-optional","impostor-fallback"]),
  gameplayTruthIndependentOfNeuralAppearance:true,
  dynamicStaticSeparation:true,
  liveNeuralRendererVerified:false
});

export function buildNeuralSceneV4({v3,reconstruction,deviceClass="balanced"}={}){
  const baseChunks=v3?.hybrid?.chunks||[];
  const budget={low:{appearancePoints:220000,occupancyCells:32768,sdfResolution:64},balanced:{appearancePoints:700000,occupancyCells:131072,sdfResolution:128},high:{appearancePoints:1800000,occupancyCells:524288,sdfResolution:256}}[deviceClass]||{appearancePoints:700000,occupancyCells:131072,sdfResolution:128};
  const chunks=(baseChunks.length?baseChunks:[{id:"hybrid_chunk_1"}]).map((chunk,index)=>({
    id:`neural_${chunk.id||index+1}`,
    sourceChunkId:chunk.id||`chunk_${index+1}`,
    gameplay:{semanticMesh:true,collision:true,navmesh:true,editable:true},
    spatial:{occupancyGrid:true,sdf:true,occupancyCellBudget:Math.floor(budget.occupancyCells/Math.max(baseChunks.length,1)),sdfResolution:budget.sdfResolution},
    appearance:{gaussianOptional:true,radianceFieldOptional:true,pointBudget:Math.floor(budget.appearancePoints/Math.max(baseChunks.length,1)),streaming:true},
    fallback:{meshMaterial:true,impostor:true}
  }));
  return{
    version:GAME_WORLD_NEURAL_SCENE_V4.version,
    deviceClass,
    layers:[
      {id:"semantic-mesh",truth:"gameplay",required:true,editable:true},
      {id:"collision",truth:"physics",required:true,editable:true},
      {id:"navmesh",truth:"navigation",required:true,editable:true},
      {id:"occupancy-grid",truth:"spatial-query",required:true,editable:false},
      {id:"signed-distance-field",truth:"proximity-and-contact",required:true,editable:false},
      {id:"neural-appearance",truth:"visual-only",required:false,editable:false},
      {id:"fallback",truth:"visual-fallback",required:true,editable:false}
    ],
    chunks,
    budgets:budget,
    reconstructionBinding:{frameCount:reconstruction?.frames?.length||0,realCaptureUsed:reconstruction?.evidence?.realCaptureUsed===true,liveReconstructionVerified:false},
    policy:{physicsNeverDependsOnNeuralAppearance:true,navNeverDependsOnNeuralAppearance:true,semanticEditsApplyToMeshFirst:true,appearanceRegenerationIsOptional:true},
    evidence:{liveGaussianRendererVerified:false,liveRadianceFieldVerified:false,realDevicePerformanceVerified:false,productionRendererVerified:false}
  };
}

export function auditNeuralSceneV4(scene={}){
  const ids=new Set((scene.layers||[]).map(x=>x.id));
  const gates={
    semanticMesh:ids.has("semantic-mesh"),
    collision:ids.has("collision"),
    navmesh:ids.has("navmesh"),
    occupancy:ids.has("occupancy-grid"),
    sdf:ids.has("signed-distance-field"),
    optionalNeural:ids.has("neural-appearance"),
    chunks:Array.isArray(scene.chunks)&&scene.chunks.length>0,
    boundedBudget:Number(scene.budgets?.appearancePoints)>0&&Number(scene.budgets?.occupancyCells)>0,
    truthSeparated:scene.policy?.physicsNeverDependsOnNeuralAppearance===true&&scene.policy?.navNeverDependsOnNeuralAppearance===true,
    truthBoundary:scene.evidence?.productionRendererVerified===false&&scene.evidence?.realDevicePerformanceVerified===false
  };
  const score=Math.round(Object.values(gates).filter(Boolean).length/Object.keys(gates).length*100);
  return{score,gates,canClaimInternal100:score===100,canClaimProduction100:false};
}

export function createNeuralSceneProviderContract(){
  return{
    version:"neural-scene-provider-contract-v1",
    capabilities:["multi-view-to-gaussian","multi-view-to-radiance-field","mesh-conditioned-appearance","appearance-update","depth-or-normal-export"],
    requiredControls:["quality-score","license-metadata","latency-budget","memory-budget","fallback-artifact"],
    providerNeutral:true,
    mandatoryForGameplay:false,
    liveVerified:false
  };
}
