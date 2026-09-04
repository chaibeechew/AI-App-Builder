// LANERIQ AI Game World Physical Reasoning V3
// Explicit state/cascade reasoning with compact evidence, not hidden chain-of-thought.

function text(v){return String(v??"").trim();}
function clamp(v,min,max){return Math.max(min,Math.min(max,Number(v)||0));}
function uniq(list){return [...new Set(list.filter(Boolean))];}

export const GAME_WORLD_PHYSICAL_REASONING_V3=Object.freeze({
  version:"game-world-physical-reasoning-v3",
  eventTypes:Object.freeze(["bridge-destroyed","route-blocked","flood","storm","resource-depleted","landmark-disabled","boss-escalation","terrain-collapse"]),
  stages:Object.freeze(["observe-state","resolve-spatial-dependencies","predict-direct-effects","propagate-cascade","rank-risks","propose-bounded-response"]),
  deterministic:true,
  privateChainOfThoughtExposed:false,
  productionAutoWrite:false
});

function affectedNeighbors(spatial,nodeId){
  const edges=(spatial?.relations||[]).filter(r=>r.type==="connected-to"&&(r.from===nodeId||r.to===nodeId));
  return uniq(edges.map(r=>r.from===nodeId?r.to:r.from));
}

export function predictWorldEventCascade({worldModel,spatial,event={}}={}){
  const type=text(event.type)||"route-blocked";
  const anchor=text(event.anchorId||event.regionId||event.nodeId||event.payload?.anchorId);
  const direct=[];
  const secondary=[];
  const repairs=[];
  const neighbors=anchor?affectedNeighbors(spatial,anchor):[];
  if(type==="bridge-destroyed"||type==="route-blocked"||type==="terrain-collapse"){
    direct.push({effect:"mobility-reduced",anchor,severity:82});
    secondary.push({effect:"npc-reroute-required",targets:neighbors,severity:70},{effect:"quest-path-risk",targets:[anchor,...neighbors],severity:64});
    repairs.push({action:"generate-alternate-route",anchor,priority:1},{action:"spawn-temporary-crossing",anchor,priority:2});
  }
  if(type==="flood"||type==="storm"){
    direct.push({effect:"traversal-hazard",anchor,severity:type==="flood"?78:58});
    secondary.push({effect:"resource-access-delay",targets:neighbors,severity:55},{effect:"npc-shelter-behavior",targets:neighbors,severity:48});
    repairs.push({action:"raise-route-cost",anchor,priority:1},{action:"activate-safe-route",anchor,priority:2});
  }
  if(type==="resource-depleted"){
    direct.push({effect:"local-resource-shortage",anchor,severity:72});
    secondary.push({effect:"economy-pressure",targets:neighbors,severity:60},{effect:"quest-opportunity",targets:[anchor],severity:40});
    repairs.push({action:"rebalance-resource-node",anchor,priority:1},{action:"create-supply-quest",anchor,priority:2});
  }
  if(type==="landmark-disabled"){
    direct.push({effect:"poi-unavailable",anchor,severity:74});
    secondary.push({effect:"navigation-reference-loss",targets:neighbors,severity:50});
    repairs.push({action:"mark-landmark-unavailable",anchor,priority:1},{action:"redirect-dependent-quests",anchor,priority:2});
  }
  if(type==="boss-escalation"){
    direct.push({effect:"threat-spike",anchor,severity:88});
    secondary.push({effect:"safe-zone-pressure",targets:neighbors,severity:68},{effect:"difficulty-spike",targets:[anchor],severity:75});
    repairs.push({action:"cap-boss-threat",anchor,priority:1},{action:"add-preboss-recovery",anchor,priority:2});
  }
  if(!direct.length){
    direct.push({effect:"world-state-change",anchor,severity:35});
    repairs.push({action:"observe-and-revalidate",anchor,priority:1});
  }
  const riskScore=Math.round(clamp(Math.max(...direct.map(x=>x.severity),0)+secondary.reduce((s,x)=>s+x.severity,0)/Math.max(secondary.length,1)*.2,0,100));
  return{
    version:GAME_WORLD_PHYSICAL_REASONING_V3.version,
    event:{type,anchor,payload:event.payload||{}},
    direct,
    secondary,
    riskScore,
    responsePlan:repairs.slice(0,6),
    assumptions:{worldTick:Number(worldModel?.tick)||0,spatialGraphAvailable:Boolean(spatial?.nodes?.length),boundedPropagation:true},
    evidence:{deterministic:true,compactDecisionEvidence:true,privateChainOfThoughtExposed:false,productionAutoWrite:false}
  };
}

export function auditPhysicalReasoning(result={}){
  const gates={
    directEffects:Array.isArray(result.direct)&&result.direct.length>0,
    cascade:Array.isArray(result.secondary),
    boundedRisk:Number.isFinite(result.riskScore)&&result.riskScore>=0&&result.riskScore<=100,
    responsePlan:Array.isArray(result.responsePlan)&&result.responsePlan.length>0,
    deterministic:result.evidence?.deterministic===true,
    noPrivateReasoning:result.evidence?.privateChainOfThoughtExposed===false,
    noProductionAutoWrite:result.evidence?.productionAutoWrite===false
  };
  const score=Math.round(Object.values(gates).filter(Boolean).length/Object.keys(gates).length*100);
  return{score,gates,canClaimInternal100:score===100,canClaimProduction100:false};
}
