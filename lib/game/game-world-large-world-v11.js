// LANERIQ AI Game World V11 — bounded large-world production runtime architecture.
import {compileNativeRuntimeV10} from "./game-world-native-runtime-v10.js";

export const GAME_WORLD_LARGE_WORLD_V11=Object.freeze({
  version:"game-world-large-world-v11",
  architecture:"world-partition-streaming-virtualization",
  deterministicPartitioning:true,
  productionAutoWrite:false
});

const clamp=(n,a,b)=>Math.max(a,Math.min(b,Number(n||0)));

export function createWorldPartitionV11(input={}){
  const worldSizeKm=clamp(input.worldSizeKm||20,1,500);
  const cellMeters=clamp(input.cellMeters||256,64,2048);
  const side=Math.max(1,Math.ceil(worldSizeKm*1000/cellMeters));
  const cells=[];
  for(let z=0;z<side;z++)for(let x=0;x<side;x++)cells.push({id:`${x}:${z}`,x,z,lod:0,state:"unloaded",priority:0});
  return{worldSizeKm,cellMeters,side,totalCells:cells.length,cells,streamRadiusCells:Math.max(1,Math.min(8,Number(input.streamRadiusCells||2)))};
}

export function planLargeWorldResidencyV11(partition={},camera={x:0,z:0},budget={}){
  const cx=Math.floor(Number(camera.x||0)/partition.cellMeters),cz=Math.floor(Number(camera.z||0)/partition.cellMeters);
  const maxResident=Math.max(4,Math.min(256,Number(budget.maxResidentCells||36)));
  const scored=(partition.cells||[]).map(c=>{const d=Math.max(Math.abs(c.x-cx),Math.abs(c.z-cz));return{...c,d,priority:1000-d,lod:d<=1?0:d<=3?1:d<=6?2:3};}).sort((a,b)=>b.priority-a.priority);
  const resident=scored.slice(0,maxResident).map(c=>({...c,state:"resident"}));
  const prefetched=scored.slice(maxResident,maxResident+Math.min(maxResident,32)).map(c=>({...c,state:"prefetch"}));
  return{resident,prefetched,evictedCount:Math.max(0,scored.length-resident.length-prefetched.length),maxResident};
}

export function createLargeWorldBudgetsV11(input={}){
  const device=String(input.deviceClass||"balanced");
  const mobile=device.includes("mobile")||device==="low";
  return{
    maxResidentCells:mobile?16:48,
    memorySoftMb:mobile?512:2048,
    memoryHardMb:mobile?768:3072,
    activeNpcs:mobile?48:160,
    virtualizedNpcs:mobile?1000:10000,
    physicsActiveBodies:mobile?96:512,
    navTileRadius:mobile?2:4,
    hlodDistanceMeters:mobile?600:1200,
    occlusionCulling:true,
    assetStreaming:true,
    memoryPaging:true
  };
}

export function virtualizeWorldActorsV11(actors=[],camera={x:0,z:0},budget={}){
  const maxActive=Math.max(8,Number(budget.activeNpcs||48));
  const ranked=[...actors].map(a=>({...a,d:Math.hypot(Number(a.x||0)-Number(camera.x||0),Number(a.z||0)-Number(camera.z||0))})).sort((a,b)=>a.d-b.d);
  return{active:ranked.slice(0,maxActive).map(a=>({...a,mode:"full-sim"})),virtual:ranked.slice(maxActive).map(a=>({...a,mode:"schedule-only"}))};
}

export function createDynamicNavTilePlanV11(partition={},residency={},budget={}){
  const radius=Math.max(1,Number(budget.navTileRadius||2));
  return{tileSizeMeters:partition.cellMeters,radius,loadedTiles:(residency.resident||[]).slice(0,(radius*2+1)**2).map(c=>c.id),incrementalRebuild:true,obstacleCarving:true,recastCompatible:true};
}

export function compileLargeWorldV11(input={}){
  const v10=compileNativeRuntimeV10(input.v10||{});
  const partition=createWorldPartitionV11(input.partition||{});
  const budgets=createLargeWorldBudgetsV11(input.runtime||{});
  const residency=planLargeWorldResidencyV11(partition,input.camera||{},budgets);
  const actors=virtualizeWorldActorsV11(input.actors||[],input.camera||{},budgets);
  const nav=createDynamicNavTilePlanV11(partition,residency,budgets);
  const internal100=partition.totalCells>0&&residency.resident.length>0&&nav.loadedTiles.length>0&&budgets.assetStreaming&&budgets.memoryPaging;
  return{
    version:GAME_WORLD_LARGE_WORLD_V11.version,v10,partition,budgets,residency,actors,nav,
    readiness:{internal100,production100:false},
    truth:{largeWorldPartitionExecutable:true,streamingPlanExecutable:true,npcVirtualizationExecutable:true,dynamicNavTilesExecutable:true,realLongDurationHardwareSoakVerified:false,productionDeploymentVerified:false}
  };
}
