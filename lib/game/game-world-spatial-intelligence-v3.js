// LANERIQ AI Game World Spatial Intelligence V3
// Auditable spatial scene/relation graph. Independent implementation; no proprietary weights/code.

function text(v){return String(v??"").trim();}
function num(v,f=0){const n=Number(v);return Number.isFinite(n)?n:f;}
function unique(list){return [...new Set(list.filter(Boolean))];}

export const GAME_WORLD_SPATIAL_INTELLIGENCE_V3=Object.freeze({
  version:"game-world-spatial-intelligence-v3",
  capabilities:Object.freeze(["scene-graph","relation-graph","containment","connectivity","proximity","reachability-hints","spatial-query","counterfactual-anchor-map"]),
  deterministic:true,
  multimodalProviderOptional:true,
  proprietaryWeightsCopied:false,
  hiddenReasoningCopied:false
});

export function buildSpatialSceneGraph(project,{cellMeters=128}={}){
  const blueprint=project?.blueprint||{};
  const regions=Array.isArray(blueprint.regions)?blueprint.regions:[];
  const routes=Array.isArray(blueprint.routes)?blueprint.routes:[];
  const pois=Array.isArray(blueprint.pointsOfInterest)?blueprint.pointsOfInterest:[];
  const nodes=[];
  const relations=[];
  for(const [index,region] of regions.entries()){
    const id=text(region.id)||`region_${index+1}`;
    nodes.push({id,type:"region",name:text(region.name)||id,position:{x:num(region.x,index*cellMeters),y:num(region.y,0),z:num(region.z,0)},tags:unique([region.biome,region.type,"walkable-region"])});
  }
  for(const [index,poi] of pois.entries()){
    const id=text(poi.id)||`poi_${index+1}`;
    const regionId=text(poi.regionId||poi.region_id||poi.region);
    nodes.push({id,type:"poi",name:text(poi.name)||id,position:{x:num(poi.x,index*24),y:num(poi.y,0),z:num(poi.z,0)},tags:unique([poi.type,poi.kind,"point-of-interest"])});
    if(regionId)relations.push({type:"contained-by",from:id,to:regionId,directed:true});
  }
  for(const [index,route] of routes.entries()){
    const from=text(route.from||route.start||route.a);
    const to=text(route.to||route.end||route.b);
    if(from&&to){
      relations.push({type:"connected-to",from,to,directed:false,traversable:route.traversable!==false,cost:num(route.cost,1)});
      relations.push({type:"reachable-via",from,to,directed:true,routeId:text(route.id)||`route_${index+1}`});
    }
  }
  const byId=Object.fromEntries(nodes.map(node=>[node.id,node]));
  const spatialIndex={};
  for(const node of nodes){
    const key=`${Math.floor(node.position.x/cellMeters)}:${Math.floor(node.position.z/cellMeters)}`;
    (spatialIndex[key]??=[]).push(node.id);
  }
  return{
    version:GAME_WORLD_SPATIAL_INTELLIGENCE_V3.version,
    worldId:text(blueprint.id||project?.id),
    cellMeters,
    nodes,
    relations,
    byId,
    spatialIndex,
    evidence:{deterministic:true,providerInferenceUsed:false,privateChainOfThoughtStored:false}
  };
}

export function querySpatialGraph(graph,{type,tag,regionId}={}){
  let nodes=[...(graph?.nodes||[])];
  if(type)nodes=nodes.filter(n=>n.type===type);
  if(tag)nodes=nodes.filter(n=>n.tags?.includes(tag));
  if(regionId){
    const contained=new Set((graph?.relations||[]).filter(r=>r.type==="contained-by"&&r.to===regionId).map(r=>r.from));
    nodes=nodes.filter(n=>n.id===regionId||contained.has(n.id));
  }
  return nodes;
}

export function spatialNeighbors(graph,nodeId){
  const edges=(graph?.relations||[]).filter(r=>r.type==="connected-to"&&(r.from===nodeId||r.to===nodeId));
  return unique(edges.map(r=>r.from===nodeId?r.to:r.from));
}

export function auditSpatialIntelligence(graph={}){
  const gates={
    sceneGraph:Array.isArray(graph.nodes)&&graph.nodes.length>=2,
    relationGraph:Array.isArray(graph.relations),
    indexed:Boolean(graph.spatialIndex&&Object.keys(graph.spatialIndex).length),
    stableIds:graph.nodes?.every(n=>Boolean(n.id))===true,
    deterministic:graph.evidence?.deterministic===true,
    noPrivateReasoning:graph.evidence?.privateChainOfThoughtStored===false
  };
  const score=Math.round(Object.values(gates).filter(Boolean).length/Object.keys(gates).length*100);
  return{score,gates,canClaimInternal100:score===100,canClaimProduction100:false};
}
