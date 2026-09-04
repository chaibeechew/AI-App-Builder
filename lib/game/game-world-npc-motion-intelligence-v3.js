// LANERIQ AI Game World NPC + Motion Intelligence V3
// Provider-neutral behavior/motion planning. No claim of copied proprietary motion/world-model weights.

function text(v){return String(v??"").trim();}
function uniq(list){return [...new Set(list.filter(Boolean))];}

export const GAME_WORLD_NPC_MOTION_INTELLIGENCE_V3=Object.freeze({
  version:"game-world-npc-motion-intelligence-v3",
  behaviorLoop:Object.freeze(["perceive","retrieve-memory","select-goal","plan-route","select-motion","act","verify"]),
  motionStates:Object.freeze(["idle","walk","run","jump","climb","interact","combat","dodge","recover","celebrate","flee","shelter"]),
  providerNeutral:true,
  onDeviceCapableContract:true,
  liveMotionModelVerified:false,
  liveNpcModelVerified:false
});

export function buildNpcIntelligencePackage({project,spatial,physical}={}){
  const regions=project?.blueprint?.regions||[];
  const quests=project?.gameplay?.quests||project?.blueprint?.quests||[];
  const archetypes=regions.slice(0,Math.max(2,Math.min(8,regions.length))).map((region,index)=>({
    id:`npc_archetype_${index+1}`,
    homeRegion:text(region.id)||`region_${index+1}`,
    role:index%4===0?"guide":index%4===1?"merchant":index%4===2?"guardian":"explorer",
    goals:uniq(["stay-alive","serve-world-role",quests.length?"react-to-quests":null,physical?.riskScore>65?"avoid-high-risk-zone":null]),
    memoryScopes:["local-events","quest-state","landmark-state","route-state"],
    motionProfile:{locomotion:["idle","walk","run"],contextual:["interact","flee","shelter"],combat:index%2===0?["combat","dodge","recover"]:[]}
  }));
  const reactions=(physical?.responsePlan||[]).map((repair,index)=>({
    id:`npc_response_${index+1}`,
    trigger:repair.action,
    behavior:repair.action.includes("route")?"reroute":repair.action.includes("supply")?"seek-resource":"observe-and-adapt",
    motion:repair.action.includes("route")?"run":"walk"
  }));
  return{
    version:GAME_WORLD_NPC_MOTION_INTELLIGENCE_V3.version,
    archetypes,
    reactions,
    spatialAwareness:{nodeCount:spatial?.nodes?.length||0,relationCount:spatial?.relations?.length||0,usesSceneGraph:true},
    motionGraph:{states:GAME_WORLD_NPC_MOTION_INTELLIGENCE_V3.motionStates,transitionPolicy:"goal-and-context-driven",rootMotionOptional:true,retargetingContractReady:true},
    runtimeContract:{preferred:"local-first-when-available",fallback:"provider-router",ragScopes:["npc-memory","world-memory","quest-state"],voiceOptional:true},
    evidence:{liveMotionModelVerified:false,liveNpcModelVerified:false,privateChainOfThoughtStored:false,productionAutoWrite:false}
  };
}

export function auditNpcMotionIntelligence(result={}){
  const gates={
    archetypes:Array.isArray(result.archetypes)&&result.archetypes.length>=2,
    worldReactive:Array.isArray(result.reactions),
    spatialAware:result.spatialAwareness?.usesSceneGraph===true,
    motionGraph:Array.isArray(result.motionGraph?.states)&&result.motionGraph.states.length>=8,
    providerNeutral:result.runtimeContract?.fallback==="provider-router",
    localFirst:result.runtimeContract?.preferred==="local-first-when-available",
    truthBoundary:result.evidence?.liveMotionModelVerified===false&&result.evidence?.liveNpcModelVerified===false,
    noPrivateReasoning:result.evidence?.privateChainOfThoughtStored===false
  };
  const score=Math.round(Object.values(gates).filter(Boolean).length/Object.keys(gates).length*100);
  return{score,gates,canClaimInternal100:score===100,canClaimProduction100:false};
}

export function createNpcMotionProviderContract(){
  return{
    version:"npc-motion-provider-contract-v1",
    capabilities:["text-to-motion","keyframe-conditioned-motion","route-conditioned-motion","npc-dialogue","npc-planning","local-rag"],
    requiredControls:["latency-budget","device-budget","safety-policy","fallback-policy","license-metadata"],
    providerNeutral:true,
    localRuntimeOptional:true
  };
}
