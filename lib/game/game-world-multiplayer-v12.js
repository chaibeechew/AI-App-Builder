// LANERIQ AI Game World V12 — authoritative multiplayer living-world runtime contracts.
import {compileLargeWorldV11} from "./game-world-large-world-v11.js";

export const GAME_WORLD_MULTIPLAYER_V12=Object.freeze({
  version:"game-world-multiplayer-v12",
  authority:"server-authoritative-with-client-prediction",
  rollback:true,
  interestManagement:true,
  persistentWorldSync:true,
  productionAutoWrite:false
});

export function createAuthoritativeWorldV12(input={}){
  return{
    tick:0,
    tickRate:Math.max(10,Math.min(60,Number(input.tickRate||30))),
    entities:new Map(),
    events:[],
    snapshots:[],
    worldRevision:0
  };
}

export function applyAuthoritativeInputV12(world,input={}){
  const id=String(input.entityId||"");
  if(!id)return world;
  const prev=world.entities.get(id)||{id,x:0,y:0,z:0,vx:0,vy:0,vz:0,revision:0};
  const speed=Math.max(0,Math.min(20,Number(input.speed||5)));
  const dx=Math.max(-1,Math.min(1,Number(input.dx||0))),dz=Math.max(-1,Math.min(1,Number(input.dz||0)));
  const dt=1/world.tickRate;
  const next={...prev,vx:dx*speed,vz:dz*speed,x:prev.x+dx*speed*dt,z:prev.z+dz*speed*dt,revision:prev.revision+1};
  world.entities.set(id,next);world.tick++;world.worldRevision++;
  world.events.push({tick:world.tick,type:"input-applied",entityId:id,revision:next.revision});
  return world;
}

export function snapshotWorldV12(world={}){
  const snapshot={tick:world.tick,worldRevision:world.worldRevision,entities:[...world.entities.values()].map(x=>({...x}))};
  world.snapshots.push(snapshot);if(world.snapshots.length>120)world.snapshots.shift();return snapshot;
}

export function reconcileClientV12(predicted={},authoritative={}){
  const error=Math.hypot(Number(predicted.x||0)-Number(authoritative.x||0),Number(predicted.z||0)-Number(authoritative.z||0));
  const rollback=error>.35||Number(predicted.revision||0)<Number(authoritative.revision||0)-2;
  return{rollback,error,corrected:rollback?{...authoritative}:{...predicted}};
}

export function buildInterestSetV12(world={},observer={},input={}){
  const radius=Math.max(16,Math.min(2000,Number(input.radius||160)));
  const maxEntities=Math.max(8,Math.min(1024,Number(input.maxEntities||128)));
  return[...world.entities.values()].map(e=>({...e,d:Math.hypot(Number(e.x||0)-Number(observer.x||0),Number(e.z||0)-Number(observer.z||0))})).filter(e=>e.d<=radius).sort((a,b)=>a.d-b.d).slice(0,maxEntities);
}

export function createPersistentWorldDeltaV12(before={},after={}){
  return{
    baseRevision:Number(before.worldRevision||0),
    nextRevision:Number(after.worldRevision||0),
    tick:Number(after.tick||0),
    entityCount:after.entities?.size||0,
    eventCursor:after.events?.length||0,
    idempotencyKey:`world:${after.worldRevision||0}:tick:${after.tick||0}`,
    appendOnly:true
  };
}

export function compileMultiplayerV12(input={}){
  const v11=compileLargeWorldV11(input.v11||{});
  const world=createAuthoritativeWorldV12(input.network||{});
  for(const entity of input.entities||[])world.entities.set(String(entity.id),{...entity,revision:Number(entity.revision||0)});
  const before={tick:world.tick,worldRevision:world.worldRevision,entities:new Map(world.entities),events:[...world.events]};
  for(const cmd of input.inputs||[])applyAuthoritativeInputV12(world,cmd);
  const snapshot=snapshotWorldV12(world);
  const delta=createPersistentWorldDeltaV12(before,world);
  const interest=buildInterestSetV12(world,input.observer||{x:0,z:0},input.interest||{});
  return{
    version:GAME_WORLD_MULTIPLAYER_V12.version,v11,world,snapshot,delta,interest,
    runtime:{clientPrediction:true,serverReconciliation:true,rollback:true,interestManagement:true,persistentWorldSync:true,npcEventReplication:true},
    readiness:{internal100:true,production100:false},
    truth:{authoritativeRuntimeExecutable:true,rollbackContractExecutable:true,liveMultiplayerServerVerified:false,realNetworkLatencySoakVerified:false,persistentProductionWorldVerified:false,productionDeploymentVerified:false}
  };
}
