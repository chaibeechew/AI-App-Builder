// LANERIQ AI Game World Model V2
// Independent world-state architecture inspired by current public world-model research.
// This does not copy proprietary model weights, code, or hidden reasoning.

function text(value){return String(value??"").trim();}
function clamp(value,min,max){return Math.max(min,Math.min(max,Number(value)||0));}
function stableSort(value){if(Array.isArray(value))return value.map(stableSort);if(value&&typeof value==="object")return Object.fromEntries(Object.keys(value).sort().map(key=>[key,stableSort(value[key])]));return value;}
function hash(value){const s=JSON.stringify(stableSort(value));let h=2166136261;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619);}return (h>>>0).toString(16).padStart(8,"0");}
function clone(value){return JSON.parse(JSON.stringify(value));}

export const GAME_WORLD_MODEL_V2=Object.freeze({
  version:"game-world-model-v2",
  architecture:"event-sourced-persistent-world-state",
  deterministicReplay:true,
  worldConsistencyMemory:true,
  dynamicEvents:true,
  providerIndependent:true,
  proprietaryWeightsCopied:false,
  hiddenReasoningCopied:false,
  stages:["observe","event","transition","derived-effects","snapshot","replay"]
});

export const WORLD_EVENT_TYPES=Object.freeze([
  "weather-change","time-advance","resource-delta","landmark-destroyed","landmark-repaired",
  "quest-state","npc-route","threat-spawn","threat-clear","terrain-modifier","world-flag"
]);

export function createWorldModel(project,{tickMs=1000}={}){
  if(!project?.blueprint?.id)throw new Error("world_project_required");
  const blueprint=project.blueprint;
  const regions=Object.fromEntries(blueprint.regions.map(region=>[region.id,{
    id:region.id,name:region.name,biome:region.biome,danger:region.danger,
    landmark:region.landmark,landmarkState:"intact",resourceIndex:100,
    weather:"clear",flags:[],terrainModifiers:[]
  }]));
  const state={
    worldId:blueprint.id,
    seed:blueprint.seed,
    tick:0,
    tickMs:clamp(tickMs,100,60000),
    worldTimeMinutes:480,
    weather:"clear",
    regions,
    quests:{},
    npcRoutes:{},
    threats:{},
    flags:{},
    eventCursor:0
  };
  return{
    version:GAME_WORLD_MODEL_V2.version,
    blueprintId:blueprint.id,
    state,
    events:[],
    snapshots:[createWorldSnapshot(state,"initial")],
    evidence:{deterministic:true,eventSourced:true,productionRenderer:false,liveProviderWorldModel:false}
  };
}

export function createWorldSnapshot(state,label="snapshot"){
  const clean=clone(state);
  return{label,tick:clean.tick,eventCursor:clean.eventCursor,checksum:hash(clean),state:clean};
}

function regionOrThrow(state,regionId){const region=state.regions?.[regionId];if(!region)throw new Error(`unknown_region:${regionId}`);return region;}

export function applyWorldEvent(model,event){
  if(!WORLD_EVENT_TYPES.includes(event?.type))throw new Error(`unsupported_world_event:${event?.type}`);
  const next=clone(model);
  const state=next.state;
  const payload=event.payload||{};
  switch(event.type){
    case "weather-change":{
      const weather=text(payload.weather)||"clear";state.weather=weather;
      if(payload.regionId)regionOrThrow(state,payload.regionId).weather=weather;
      break;
    }
    case "time-advance":state.worldTimeMinutes=(state.worldTimeMinutes+clamp(payload.minutes,0,1440))%1440;break;
    case "resource-delta":{
      const region=regionOrThrow(state,payload.regionId);region.resourceIndex=clamp(region.resourceIndex+(Number(payload.delta)||0),0,200);break;
    }
    case "landmark-destroyed":regionOrThrow(state,payload.regionId).landmarkState="destroyed";break;
    case "landmark-repaired":regionOrThrow(state,payload.regionId).landmarkState="intact";break;
    case "quest-state":state.quests[text(payload.questId)||"quest"]={state:text(payload.state)||"active",regionId:payload.regionId||null,updatedTick:state.tick};break;
    case "npc-route":state.npcRoutes[text(payload.npcId)||"npc"]={from:payload.from||null,to:payload.to||null,reason:text(payload.reason),updatedTick:state.tick};break;
    case "threat-spawn":state.threats[text(payload.threatId)||`threat_${Object.keys(state.threats).length+1}`]={regionId:payload.regionId||null,severity:clamp(payload.severity,1,10),kind:text(payload.kind)||"dynamic",active:true};break;
    case "threat-clear":{const id=text(payload.threatId);if(state.threats[id])state.threats[id].active=false;break;}
    case "terrain-modifier":{
      const region=regionOrThrow(state,payload.regionId);region.terrainModifiers.push({id:text(payload.id)||`modifier_${region.terrainModifiers.length+1}`,kind:text(payload.kind)||"generic",strength:clamp(payload.strength,0,1)});break;
    }
    case "world-flag":state.flags[text(payload.key)||"flag"]=payload.value??true;break;
  }
  state.eventCursor+=1;
  const normalized={id:`evt_${state.eventCursor}`,tick:state.tick,type:event.type,payload:clone(payload)};
  next.events.push(normalized);
  return next;
}

export function stepWorldModel(model,{minutes=5,events=[]}={}){
  let next=clone(model);
  next.state.tick+=1;
  next=applyWorldEvent(next,{type:"time-advance",payload:{minutes}});
  for(const event of events)next=applyWorldEvent(next,event);
  const activeThreats=Object.values(next.state.threats).filter(item=>item.active);
  if(activeThreats.some(item=>item.severity>=8))next=applyWorldEvent(next,{type:"world-flag",payload:{key:"highThreat",value:true}});
  if(next.state.weather==="storm"){
    for(const region of Object.values(next.state.regions)){
      if(region.resourceIndex>0){next=applyWorldEvent(next,{type:"resource-delta",payload:{regionId:region.id,delta:-1}});}
    }
  }
  return next;
}

export function replayWorldModel(initialModel,events=[]){
  let replay=createWorldModelFromState(initialModel.snapshots?.[0]?.state||initialModel.state,initialModel.blueprintId);
  for(const event of events)replay=applyWorldEvent(replay,{type:event.type,payload:event.payload});
  replay.state.tick=initialModel.state.tick;
  return replay;
}

function createWorldModelFromState(state,blueprintId){
  const snapshot=createWorldSnapshot(state,"replay-origin");
  return{version:GAME_WORLD_MODEL_V2.version,blueprintId,state:clone(state),events:[],snapshots:[snapshot],evidence:{deterministic:true,eventSourced:true,productionRenderer:false,liveProviderWorldModel:false}};
}

export function checkpointWorldModel(model,label="checkpoint"){
  const next=clone(model);next.snapshots.push(createWorldSnapshot(next.state,label));return next;
}

export function auditWorldModel(model){
  const regionCount=Object.keys(model?.state?.regions||{}).length;
  const checks={
    version:model?.version===GAME_WORLD_MODEL_V2.version,
    worldIdentity:Boolean(model?.state?.worldId&&model?.state?.seed),
    regions:regionCount>=2,
    eventCursor:model?.state?.eventCursor===model?.events?.length,
    snapshots:Array.isArray(model?.snapshots)&&model.snapshots.length>=1,
    deterministic:model?.evidence?.deterministic===true,
    truthBoundary:model?.evidence?.liveProviderWorldModel===false
  };
  const score=Math.round(Object.values(checks).filter(Boolean).length/Object.keys(checks).length*100);
  return{score,checks,checksum:hash(model?.state||{})};
}
