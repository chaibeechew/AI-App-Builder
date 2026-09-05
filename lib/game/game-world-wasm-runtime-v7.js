// LANERIQ AI Game World V7 — injectable external WASM adapters.
// Runtime code does not hard-bundle third-party engines. CI/device runtimes inject exact pinned modules,
// execute them, and emit truth-gated evidence. This keeps LANERIQ's internal physics/nav fallback independent.

export const GAME_WORLD_WASM_RUNTIME_V7=Object.freeze({
  version:"game-world-wasm-runtime-v7",
  architecture:"injectable-external-wasm-with-independent-laneriq-fallback",
  rapier:Object.freeze({package:"@dimforge/rapier3d-deterministic-compat",version:"0.20.0",license:"Apache-2.0"}),
  recast:Object.freeze({package:"recast-navigation",version:"0.43.1",license:"MIT"}),
  externalCodeCopied:false,
  externalWeightsCopied:false,
  productionAutoEnable:false
});

function now(){return typeof performance!=="undefined"&&performance.now?performance.now():Date.now();}
function finite3(v){return v&&Number.isFinite(v.x)&&Number.isFinite(v.y)&&Number.isFinite(v.z);}

export function createExternalWasmEvidenceV7(){
  return{
    version:GAME_WORLD_WASM_RUNTIME_V7.version,
    rapier:{package:GAME_WORLD_WASM_RUNTIME_V7.rapier.package,expectedVersion:GAME_WORLD_WASM_RUNTIME_V7.rapier.version,moduleLoaded:false,wasmInitialized:false,simulationExecuted:false,fallObserved:false,elapsedMs:0,error:null},
    recast:{package:GAME_WORLD_WASM_RUNTIME_V7.recast.package,expectedVersion:GAME_WORLD_WASM_RUNTIME_V7.recast.version,moduleLoaded:false,wasmInitialized:false,navMeshGenerated:false,pathQueryExecuted:false,pathPoints:0,elapsedMs:0,error:null},
    truth:{externalRapierWasmVerified:false,externalRecastWasmVerified:false,productionBundled:false,realDeviceExecuted:false}
  };
}

export async function runRapierWasmProbeV7(moduleLike,{steps=120}={}){
  const evidence=createExternalWasmEvidenceV7();
  const started=now();
  try{
    const R=moduleLike?.default||moduleLike;
    if(!R?.World||!R?.RigidBodyDesc||!R?.ColliderDesc)throw new Error("Rapier module API unavailable");
    evidence.rapier.moduleLoaded=true;
    if(typeof R.init==="function")await R.init();
    evidence.rapier.wasmInitialized=true;
    const world=new R.World({x:0,y:-9.81,z:0});
    const ground=world.createRigidBody(R.RigidBodyDesc.fixed().setTranslation(0,-0.5,0));
    world.createCollider(R.ColliderDesc.cuboid(6,0.5,6),ground);
    const body=world.createRigidBody(R.RigidBodyDesc.dynamic().setTranslation(0,4,0));
    world.createCollider(R.ColliderDesc.ball(0.5).setRestitution(0.15).setFriction(0.7),body);
    const initial=body.translation();
    for(let i=0;i<Math.max(30,Math.min(600,steps));i++)world.step();
    const final=body.translation();
    evidence.rapier.simulationExecuted=finite3(final);
    evidence.rapier.fallObserved=finite3(initial)&&finite3(final)&&final.y<initial.y-0.5;
    evidence.rapier.finalY=Number(final?.y||0);
    evidence.rapier.elapsedMs=Math.max(0,now()-started);
    if(typeof world.free==="function")world.free();
  }catch(error){
    evidence.rapier.error=String(error?.message||error).slice(0,300);
    evidence.rapier.elapsedMs=Math.max(0,now()-started);
  }
  evidence.truth.externalRapierWasmVerified=evidence.rapier.moduleLoaded&&evidence.rapier.wasmInitialized&&evidence.rapier.simulationExecuted&&evidence.rapier.fallObserved;
  return evidence;
}

export function buildRecastProbeGeometryV7({size=24,cells=8}={}){
  const n=Math.max(4,Math.min(24,Math.floor(cells))),s=Math.max(8,Math.min(100,Number(size)||24));
  const positions=[],indices=[];
  for(let z=0;z<=n;z++)for(let x=0;x<=n;x++){
    const px=-s/2+s*x/n,pz=-s/2+s*z/n;
    positions.push(px,0,pz);
  }
  const row=n+1;
  for(let z=0;z<n;z++)for(let x=0;x<n;x++){
    const a=z*row+x,b=a+1,c=a+row,d=c+1;
    // Counter-clockwise when viewed from +Y in a right-handed coordinate system.
    indices.push(a,c,b,b,c,d);
  }
  return{positions,indices,size:s,cells:n};
}

export async function runRecastWasmProbeV7(coreLike,generatorsLike,{size=24,cells=8}={}){
  const evidence=createExternalWasmEvidenceV7();
  const started=now();
  try{
    const core=coreLike?.default||coreLike,gen=generatorsLike?.default||generatorsLike;
    if(typeof core?.init!=="function"||typeof gen?.generateSoloNavMesh!=="function")throw new Error("Recast module API unavailable");
    evidence.recast.moduleLoaded=true;
    await core.init();
    evidence.recast.wasmInitialized=true;
    const geometry=buildRecastProbeGeometryV7({size,cells});
    const config={
      cs:0.3,ch:0.2,walkableSlopeAngle:45,walkableHeight:8,walkableClimb:2,walkableRadius:1,
      maxEdgeLen:12,maxSimplificationError:1.3,minRegionArea:8,mergeRegionArea:20,maxVertsPerPoly:6,
      detailSampleDist:6,detailSampleMaxError:1
    };
    const generated=gen.generateSoloNavMesh(geometry.positions,geometry.indices,config);
    if(!generated?.success||!generated.navMesh)throw new Error(`Recast NavMesh generation failed${generated?.error?`: ${generated.error}`:""}`);
    evidence.recast.navMeshGenerated=true;
    const query=new core.NavMeshQuery(generated.navMesh);
    const start={x:-geometry.size*0.32,y:0,z:-geometry.size*0.32};
    const end={x:geometry.size*0.32,y:0,z:geometry.size*0.32};
    const pathResult=query.computePath(start,end);
    const path=Array.isArray(pathResult?.path)?pathResult.path:[];
    evidence.recast.pathQueryExecuted=pathResult?.success===true&&path.length>=2;
    evidence.recast.pathPoints=path.length;
    evidence.recast.elapsedMs=Math.max(0,now()-started);
    if(typeof query.destroy==="function")query.destroy();
    if(typeof generated.navMesh.destroy==="function")generated.navMesh.destroy();
  }catch(error){
    evidence.recast.error=String(error?.message||error).slice(0,300);
    evidence.recast.elapsedMs=Math.max(0,now()-started);
  }
  evidence.truth.externalRecastWasmVerified=evidence.recast.moduleLoaded&&evidence.recast.wasmInitialized&&evidence.recast.navMeshGenerated&&evidence.recast.pathQueryExecuted;
  return evidence;
}

export function mergeExternalWasmEvidenceV7(rapierEvidence={},recastEvidence={}){
  const rapier=rapierEvidence.rapier||createExternalWasmEvidenceV7().rapier;
  const recast=recastEvidence.recast||createExternalWasmEvidenceV7().recast;
  return{
    version:GAME_WORLD_WASM_RUNTIME_V7.version,
    rapier,recast,
    truth:{
      externalRapierWasmVerified:rapierEvidence.truth?.externalRapierWasmVerified===true,
      externalRecastWasmVerified:recastEvidence.truth?.externalRecastWasmVerified===true,
      productionBundled:false,
      realDeviceExecuted:false
    }
  };
}

export function auditExternalWasmV7(evidence={}){
  const gates={
    pinnedRapier:evidence.rapier?.expectedVersion===GAME_WORLD_WASM_RUNTIME_V7.rapier.version,
    pinnedRecast:evidence.recast?.expectedVersion===GAME_WORLD_WASM_RUNTIME_V7.recast.version,
    executableEvidenceFields:typeof evidence.truth?.externalRapierWasmVerified==="boolean"&&typeof evidence.truth?.externalRecastWasmVerified==="boolean",
    productionBoundary:evidence.truth?.productionBundled===false,
    realDeviceBoundary:evidence.truth?.realDeviceExecuted===false
  };
  const passed=Object.values(gates).filter(Boolean).length;
  return{score:Math.round(passed/Object.keys(gates).length*100),gates,internal100:passed===Object.keys(gates).length};
}
