// LANERIQ AI Game World Portable Scene Contract V3
// Internal canonical scene graph with adapter-ready mappings for open scene formats/engines.

function text(v){return String(v??"").trim();}

export const GAME_WORLD_PORTABLE_SCENE_V3=Object.freeze({
  version:"game-world-portable-scene-v3",
  canonicalFormat:"laneriq-scene-stage-v3",
  adapterTargets:Object.freeze(["openusd-ready","gltf-ready","godot-ready","unreal-ready","unity-ready","web-ready"]),
  claimsOpenUsdCompliance:false,
  realEngineImportVerified:false
});

export function buildPortableSceneStage({project,spatial,hybrid}={}){
  const blueprint=project?.blueprint||{};
  const prims=(spatial?.nodes||[]).map(node=>({
    path:`/World/${node.type}/${node.id}`,
    id:node.id,
    type:node.type,
    name:node.name,
    transform:{translate:[node.position?.x||0,node.position?.y||0,node.position?.z||0],rotate:[0,0,0],scale:[1,1,1]},
    metadata:{tags:node.tags||[],source:"spatial-intelligence-v3"}
  }));
  const relationships=(spatial?.relations||[]).map((r,index)=>({id:`rel_${index+1}`,type:r.type,from:r.from,to:r.to,directed:r.directed===true}));
  return{
    version:GAME_WORLD_PORTABLE_SCENE_V3.version,
    stage:{
      id:text(blueprint.id||project?.id)||"world",
      upAxis:"Y",
      metersPerUnit:1,
      prims,
      relationships,
      layers:[
        {id:"gameplay",source:"gameplay-mesh",editable:true},
        {id:"navigation",source:"navmesh",editable:true},
        {id:"appearance",source:"visual-splat-or-mesh",editable:false},
        {id:"overrides",source:"pcg-art-direction",editable:true}
      ]
    },
    hybridBindings:(hybrid?.chunks||[]).map(chunk=>({chunkId:chunk.id,mesh:true,splat:chunk.splat?.enabled===true,fallback:chunk.fallback?.impostor===true})),
    adapters:{
      openusd:{status:"schema-ready",verified:false},
      gltf:{status:"schema-ready",verified:false},
      godot:{status:"schema-ready",verified:false},
      unreal:{status:"schema-ready",verified:false},
      unity:{status:"schema-ready",verified:false},
      web:{status:"runtime-contract-ready",verified:false}
    },
    evidence:{openUsdComplianceVerified:false,realEngineImportVerified:false,portableInternalContract:true}
  };
}

export function auditPortableSceneStage(result={}){
  const gates={
    stage:Boolean(result.stage?.id),
    prims:Array.isArray(result.stage?.prims)&&result.stage.prims.length>0,
    relations:Array.isArray(result.stage?.relationships),
    layered:Array.isArray(result.stage?.layers)&&result.stage.layers.length>=4,
    hybridBindings:Array.isArray(result.hybridBindings)&&result.hybridBindings.length>0,
    adapters:Boolean(result.adapters?.godot&&result.adapters?.unreal&&result.adapters?.unity&&result.adapters?.web),
    truthBoundary:result.evidence?.realEngineImportVerified===false&&result.evidence?.openUsdComplianceVerified===false
  };
  const score=Math.round(Object.values(gates).filter(Boolean).length/Object.keys(gates).length*100);
  return{score,gates,canClaimInternal100:score===100,canClaimProduction100:false};
}
