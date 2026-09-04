// LANERIQ AI Persistent World Memory V2
// Event log + snapshots + branches + compaction. Storage-provider neutral by design.

function clone(value){return JSON.parse(JSON.stringify(value));}
function clamp(value,min,max){return Math.max(min,Math.min(max,Number(value)||0));}
function text(value){return String(value??"").trim();}
function checksum(value){const s=JSON.stringify(value);let h=5381;for(let i=0;i<s.length;i++)h=((h<<5)+h)^s.charCodeAt(i);return (h>>>0).toString(16);}

export const GAME_WORLD_MEMORY_V2=Object.freeze({
  version:"game-world-memory-v2",
  architecture:"append-only-events-with-snapshot-compaction",
  localFirstReady:true,
  cloudAdapterReady:true,
  deterministicReplay:true,
  branchableTimeline:true,
  liveDatabaseVerified:false
});

export function createWorldMemory(worldModel,{snapshotEvery=64,maxEvents=4096}={}){
  if(!worldModel?.state?.worldId)throw new Error("world_model_required");
  return{
    version:GAME_WORLD_MEMORY_V2.version,
    worldId:worldModel.state.worldId,
    rootSeed:worldModel.state.seed,
    config:{snapshotEvery:clamp(snapshotEvery,8,512),maxEvents:clamp(maxEvents,128,50000)},
    branches:{main:{name:"main",parent:null,baseCursor:0,events:[],snapshots:[{cursor:0,tick:worldModel.state.tick,state:clone(worldModel.state),checksum:checksum(worldModel.state)}]}},
    activeBranch:"main",
    evidence:{storage:"in-memory-contract",persistentAdapter:"provider-neutral",liveDatabase:false}
  };
}

export function appendWorldMemory(memory,event,{branch=memory.activeBranch}={}){
  const next=clone(memory);const lane=next.branches[branch];if(!lane)throw new Error(`unknown_memory_branch:${branch}`);
  lane.events.push({cursor:lane.baseCursor+lane.events.length+1,event:clone(event)});
  return next;
}

export function rememberWorldModelDelta(memory,previousModel,nextModel){
  let next=clone(memory);
  const previousCursor=previousModel?.state?.eventCursor||0;
  const delta=(nextModel?.events||[]).filter(event=>Number(event.id?.split("_")[1]||0)>previousCursor);
  for(const event of delta)next=appendWorldMemory(next,event);
  const lane=next.branches[next.activeBranch];
  if(lane.events.length>0&&lane.events.length%next.config.snapshotEvery===0){
    lane.snapshots.push({cursor:lane.baseCursor+lane.events.length,tick:nextModel.state.tick,state:clone(nextModel.state),checksum:checksum(nextModel.state)});
  }
  return compactWorldMemory(next,nextModel.state);
}

export function compactWorldMemory(memory,currentState){
  const next=clone(memory);const lane=next.branches[next.activeBranch];
  if(lane.events.length<=next.config.maxEvents)return next;
  const keep=Math.floor(next.config.maxEvents*.5);
  const removeCount=lane.events.length-keep;
  const compactCursor=lane.baseCursor+removeCount;
  lane.snapshots.push({cursor:compactCursor,tick:currentState.tick,state:clone(currentState),checksum:checksum(currentState),compacted:true});
  lane.events=lane.events.slice(removeCount);
  lane.baseCursor=compactCursor;
  return next;
}

export function branchWorldMemory(memory,name,{fromBranch=memory.activeBranch}={}){
  const branchName=text(name);if(!branchName)throw new Error("branch_name_required");
  const next=clone(memory);if(next.branches[branchName])throw new Error("branch_exists");
  const source=next.branches[fromBranch];if(!source)throw new Error(`unknown_memory_branch:${fromBranch}`);
  const latest=source.snapshots[source.snapshots.length-1];
  next.branches[branchName]={name:branchName,parent:fromBranch,baseCursor:latest.cursor,events:[],snapshots:[clone(latest)]};
  next.activeBranch=branchName;
  return next;
}

export function switchWorldMemoryBranch(memory,name){const next=clone(memory);if(!next.branches[name])throw new Error(`unknown_memory_branch:${name}`);next.activeBranch=name;return next;}

export function exportWorldMemoryBundle(memory){
  return{
    version:memory.version,
    worldId:memory.worldId,
    rootSeed:memory.rootSeed,
    activeBranch:memory.activeBranch,
    branchCount:Object.keys(memory.branches).length,
    branches:Object.fromEntries(Object.entries(memory.branches).map(([name,lane])=>[name,{parent:lane.parent,baseCursor:lane.baseCursor,eventCount:lane.events.length,snapshotCount:lane.snapshots.length,events:clone(lane.events),snapshots:clone(lane.snapshots)}])),
    checksum:checksum(memory)
  };
}

export function createWorldMemoryStorageContract(){
  return{
    version:"world-memory-storage-contract-v1",
    operations:["load","append-events","write-snapshot","list-branches","create-branch","delete-project"],
    adapters:["local-device","indexeddb","filesystem","supabase-optional","custom-provider"],
    requiredGuarantees:["per-user-ownership","idempotent-append","cursor-ordering","encrypted-transport","no-cross-project-leak"],
    liveAdapterVerified:false
  };
}

export function auditWorldMemory(memory){
  const lane=memory?.branches?.[memory?.activeBranch];
  const checks={version:memory?.version===GAME_WORLD_MEMORY_V2.version,worldId:Boolean(memory?.worldId),activeBranch:Boolean(lane),snapshot:Boolean(lane?.snapshots?.length),ordered:(lane?.events||[]).every((item,index,array)=>index===0||item.cursor>array[index-1].cursor),providerNeutral:memory?.evidence?.persistentAdapter==="provider-neutral",truthBoundary:memory?.evidence?.liveDatabase===false};
  const score=Math.round(Object.values(checks).filter(Boolean).length/Object.keys(checks).length*100);
  return{score,checks};
}
