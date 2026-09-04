// LANERIQ AI Game World Hybrid 3D V3
// Gameplay geometry remains mesh/nav/physics; visual reconstruction may use splat/neural layers.

function text(v){return String(v??"").trim();}
function clamp(v,min,max){return Math.max(min,Math.min(max,Number(v)||0));}

export const GAME_WORLD_HYBRID_3D_V3=Object.freeze({
  version:"game-world-hybrid-3d-v3",
  representations:Object.freeze(["gameplay-mesh","collision-proxy","navmesh","visual-splat","neural-appearance-optional","impostor-fallback"]),
  deterministicPlanning:true,
  live3dgsProviderVerified:false,
  productionRendererVerified:false
});

export function buildHybridWorldRepresentation({project,pcg,spatial,deviceClass="balanced"}={}){
  const blueprint=project?.blueprint||{};
  const regions=Array.isArray(blueprint.regions)?blueprint.regions:[];
  const chunkPlan=pcg?.chunks||{};
  const chunkCount=Math.max(1,Number(chunkPlan.chunkCount)||regions.length||1);
  const deviceBudget={low:{splatBudget:250000,meshTriangles:350000},balanced:{splatBudget:750000,meshTriangles:1000000},high:{splatBudget:1800000,meshTriangles:2500000}}[deviceClass]||{splatBudget:750000,meshTriangles:1000000};
  const layers=[
    {id:"gameplay-mesh",role:"physics-and-interaction",required:true,editable:true},
    {id:"collision-proxy",role:"collision",required:true,editable:true},
    {id:"navmesh",role:"navigation",required:true,editable:true},
    {id:"visual-splat",role:"high-frequency-appearance",required:false,editable:false,providerOptional:true},
    {id:"neural-appearance",role:"optional-render-enhancement",required:false,editable:false,providerOptional:true},
    {id:"impostor-fallback",role:"distance-and-legacy-fallback",required:true,editable:false}
  ];
  const chunks=Array.from({length:chunkCount},(_,index)=>({
    id:`hybrid_chunk_${index+1}`,
    mesh:{enabled:true,triangleBudget:Math.floor(deviceBudget.meshTriangles/chunkCount),collision:true,nav:true},
    splat:{enabled:true,pointBudget:Math.floor(deviceBudget.splatBudget/chunkCount),streaming:true,lod:index%4},
    fallback:{impostor:true,webgl2Compatible:true},
    spatialNodeCount:(spatial?.nodes||[]).filter((_,i)=>i%chunkCount===index).length
  }));
  return{
    version:GAME_WORLD_HYBRID_3D_V3.version,
    worldId:text(blueprint.id||project?.id),
    deviceClass,
    layers,
    chunks,
    budgets:deviceBudget,
    renderingPolicy:{gameplayTruthSource:"gameplay-mesh",visualTruthSource:"mesh-plus-optional-splat",physicsNeverDependsOnSplat:true,navNeverDependsOnSplat:true},
    streaming:{progressive:true,chunked:true,lodRings:Number(chunkPlan.lodRings)||4,backgroundDecodeContract:"worker-or-wasm-ready"},
    evidence:{live3dgsProviderVerified:false,realDeviceSplatPerformanceVerified:false,productionRendererVerified:false}
  };
}

export function auditHybridWorldRepresentation(result={}){
  const layerIds=new Set((result.layers||[]).map(x=>x.id));
  const gates={
    gameplayMesh:layerIds.has("gameplay-mesh"),
    collision:layerIds.has("collision-proxy"),
    navmesh:layerIds.has("navmesh"),
    optionalSplat:layerIds.has("visual-splat"),
    fallback:layerIds.has("impostor-fallback"),
    chunks:Array.isArray(result.chunks)&&result.chunks.length>0,
    physicsSeparated:result.renderingPolicy?.physicsNeverDependsOnSplat===true,
    boundedBudgets:Number(result.budgets?.meshTriangles)>0&&Number(result.budgets?.splatBudget)>0,
    truthBoundary:result.evidence?.productionRendererVerified===false&&result.evidence?.realDeviceSplatPerformanceVerified===false
  };
  const score=Math.round(Object.values(gates).filter(Boolean).length/Object.keys(gates).length*100);
  return{score,gates,canClaimInternal100:score===100,canClaimProduction100:false};
}

export function createHybrid3DProviderContract(){
  return{
    version:"hybrid-3d-provider-contract-v1",
    inputs:["image","video","multi-view","panorama","existing-mesh"],
    outputs:["splat-stream","proxy-mesh","camera-calibration","quality-metadata"],
    requiredEvidence:["provider-name","model-version","asset-license","quality-score","latency-ms"],
    providerNeutral:true,
    noProviderRequiredForCoreRuntime:true
  };
}
