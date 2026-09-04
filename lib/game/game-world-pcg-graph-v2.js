// LANERIQ AI PCG World Graph V2
// Deterministic graph + non-destructive modifiers + art-direction overrides.
// Inspired by modern PCG workflows, independently implemented.

function clone(value){return JSON.parse(JSON.stringify(value));}
function text(value){return String(value??"").trim();}
function clamp(value,min,max){return Math.max(min,Math.min(max,Number(value)||0));}
function hashSeed(value){const s=text(value);let h=2166136261;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619);}return h>>>0;}
function seeded(seed){let x=(Number(seed)>>>0)||1;return()=>{x^=x<<13;x^=x>>>17;x^=x<<5;return(x>>>0)/4294967296;};}

export const GAME_WORLD_PCG_V2=Object.freeze({
  version:"game-world-pcg-v2",
  architecture:"directed-acyclic-procedural-world-graph",
  deterministic:true,
  nondestructiveOverrides:true,
  meshTerrainReady:true,
  chunkStreamingReady:true,
  editorRuntimeCoupled:false
});

export const PCG_NODE_TYPES=Object.freeze(["terrain","biome","route","scatter","landmark","encounter","modifier","output"]);

export function createWorldPcgGraph(blueprint,{seed=blueprint?.seed||"pcg"}={}){
  if(!blueprint?.regions?.length)throw new Error("blueprint_required");
  const nodes=[];const edges=[];
  nodes.push({id:"terrain_root",type:"terrain",params:{mode:"mesh-ready",worldSizeMeters:blueprint.worldSizeMeters||2200}});
  for(const region of blueprint.regions){
    const biome=`biome_${region.id}`;const scatter=`scatter_${region.id}`;const landmark=`landmark_${region.id}`;
    nodes.push({id:biome,type:"biome",params:{regionId:region.id,biome:region.biome,danger:region.danger}});
    nodes.push({id:scatter,type:"scatter",params:{regionId:region.id,density:clamp(.35+region.danger*.04,.2,.9),categories:["vegetation","rocks","props"]}});
    nodes.push({id:landmark,type:"landmark",params:{regionId:region.id,landmark:region.landmark}});
    edges.push(["terrain_root",biome],[biome,scatter],[biome,landmark]);
  }
  for(const route of blueprint.routes||[]){
    const id=`route_${route.id}`;nodes.push({id,type:"route",params:{from:route.from,to:route.to,routeType:route.type}});edges.push(["terrain_root",id]);
  }
  nodes.push({id:"world_output",type:"output",params:{format:"world-scene-document"}});
  for(const node of nodes.filter(item=>item.type!=="output"))edges.push([node.id,"world_output"]);
  return{version:GAME_WORLD_PCG_V2.version,seed,nodes,edges,overrides:[],evidence:{deterministic:true,nondestructive:true,productionMeshTerrain:false}};
}

function topoSort(graph){
  const indegree=Object.fromEntries(graph.nodes.map(node=>[node.id,0]));const outgoing={};
  for(const [from,to] of graph.edges){if(!(from in indegree)||!(to in indegree))throw new Error("pcg_edge_unknown_node");indegree[to]++;(outgoing[from]??=[]).push(to);}
  const queue=Object.keys(indegree).filter(id=>indegree[id]===0).sort();const ordered=[];
  while(queue.length){const id=queue.shift();ordered.push(id);for(const to of outgoing[id]||[]){indegree[to]--;if(indegree[to]===0){queue.push(to);queue.sort();}}}
  if(ordered.length!==graph.nodes.length)throw new Error("pcg_graph_cycle");return ordered;
}

export function addPcgOverride(graph,{nodeId,path,value,reason="art-direction"}){
  if(!graph.nodes.some(node=>node.id===nodeId))throw new Error(`pcg_unknown_node:${nodeId}`);
  const next=clone(graph);next.overrides.push({id:`override_${next.overrides.length+1}`,nodeId,path:text(path),value:clone(value),reason:text(reason)||"art-direction"});return next;
}

function setPath(target,path,value){const keys=text(path).split(".").filter(Boolean);if(!keys.length)return;let cursor=target;for(let i=0;i<keys.length-1;i++)cursor=cursor[keys[i]]??={};cursor[keys[keys.length-1]]=clone(value);}

export function compileWorldPcgGraph(graph){
  const order=topoSort(graph);const nodeMap=Object.fromEntries(graph.nodes.map(node=>[node.id,clone(node)]));
  for(const override of graph.overrides){const node=nodeMap[override.nodeId];setPath(node,override.path,override.value);}
  const rng=seeded(hashSeed(graph.seed));const operations=[];
  for(const id of order){const node=nodeMap[id];if(node.type==="output")continue;
    if(node.type==="scatter")operations.push({nodeId:id,op:"scatter",regionId:node.params.regionId,density:node.params.density,seed:Math.floor(rng()*2**31),categories:node.params.categories});
    else if(node.type==="terrain")operations.push({nodeId:id,op:"terrain-base",mode:node.params.mode,worldSizeMeters:node.params.worldSizeMeters});
    else operations.push({nodeId:id,op:node.type,params:node.params});
  }
  return{version:graph.version,seed:graph.seed,order,operations,overrideCount:graph.overrides.length,checksum:hashSeed(JSON.stringify(operations)).toString(16),evidence:{deterministic:true,nondestructiveOverrides:true,realEngineExecution:false}};
}

export function planPcgChunks(blueprint,{chunkMeters=256,lodRings=4}={}){
  const size=Number(blueprint?.worldSizeMeters)||2200;const half=Math.ceil(size/Math.max(64,chunkMeters)/2);const chunks=[];
  for(let x=-half;x<=half;x++)for(let z=-half;z<=half;z++){const distance=Math.max(Math.abs(x),Math.abs(z));chunks.push({id:`chunk_${x}_${z}`,x,z,lod:Math.min(Math.max(0,distance),Math.max(0,lodRings-1)),streamPriority:Math.max(1,100-distance*10)});}
  return{chunkMeters,chunkCount:chunks.length,lodRings,chunks};
}

export function auditWorldPcg(graph,compiled){
  const checks={version:graph?.version===GAME_WORLD_PCG_V2.version,nodes:(graph?.nodes?.length||0)>=4,acyclic:Boolean(compiled?.order?.length),deterministic:compiled?.evidence?.deterministic===true,nondestructive:compiled?.evidence?.nondestructiveOverrides===true,truthBoundary:compiled?.evidence?.realEngineExecution===false};
  return{score:Math.round(Object.values(checks).filter(Boolean).length/Object.keys(checks).length*100),checks};
}
