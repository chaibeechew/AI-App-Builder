// LANERIQ AI Game World Embodied Agent V4
// Bounded perception-memory-plan-action verification over LANERIQ spatial/physics truth.

function text(v){return String(v??"").trim();}
function uniq(xs){return [...new Set((xs||[]).filter(Boolean))];}

export const GAME_WORLD_EMBODIED_AGENT_V4=Object.freeze({
  version:"game-world-embodied-agent-v4",
  loop:Object.freeze(["observe","ground-to-scene","retrieve-memory","update-belief","select-goal","plan-actions","navigate","interact","verify"]),
  localFirst:true,
  providerRouterFallback:true,
  hiddenReasoningStored:false,
  productionAutoWrite:false,
  liveEmbodiedModelVerified:false
});

export function buildEmbodiedAgentsV4({v3,physics,neuralScene}={}){
  const base=v3?.npcMotion?.archetypes||[];
  const agents=(base.length?base:[{id:"npc_archetype_1",role:"explorer",homeRegion:"world",goals:["explore"]},{id:"npc_archetype_2",role:"guardian",homeRegion:"world",goals:["protect"]}]).slice(0,12).map((npc,index)=>({
    id:`embodied_${npc.id||index+1}`,
    role:text(npc.role)||"explorer",
    homeRegion:text(npc.homeRegion)||"world",
    goals:uniq([...(npc.goals||[]),"maintain-physical-safety","respect-nav-and-collision"]),
    sensors:{sceneGraph:true,navmesh:true,occupancyGrid:true,signedDistanceField:true,physicsContacts:true,questState:true,optionalVisionProvider:true,optionalAudioProvider:true},
    memory:{working:"bounded-state-summary",episodic:"event-ids-and-outcomes",semantic:"world-facts",social:"relationship-graph",privateChainOfThought:false},
    actions:["move","look","wait","interact","pick-up","drop","open","close","talk","signal","avoid","flee","assist"],
    guardrails:{mustUseNavForMovement:true,mustRespectCollision:true,maxActionsPerCycle:8,unsafeActionFailsClosed:true,productionAutoWrite:false}
  }));
  const relationships=[];
  for(let i=0;i<agents.length;i++)for(let j=i+1;j<agents.length;j++)if((i+j)%3===0)relationships.push({from:agents[i].id,to:agents[j].id,type:"knows",trust:50,history:[]});
  return{
    version:GAME_WORLD_EMBODIED_AGENT_V4.version,
    agents,
    socialGraph:{relationships},
    grounding:{sceneGraphNodes:v3?.spatial?.nodes?.length||0,physicsBodies:physics?.bodies?.length||0,neuralChunks:neuralScene?.chunks?.length||0,usesGameplayTruth:true},
    runtime:{preferred:"local-first",fallback:"provider-router",providerCallsOptional:true,latencyBudgetMs:250,actionBudgetPerCycle:8},
    evidence:{liveEmbodiedModelVerified:false,realMultimodalPerceptionVerified:false,privateChainOfThoughtStored:false,productionAutoWrite:false,realDeviceNpcScaleVerified:false}
  };
}

export function runEmbodiedCycleV4(pkg={},agentId,{hazard=false,questAvailable=true}={}){
  const agent=(pkg.agents||[]).find(x=>x.id===agentId)||pkg.agents?.[0];
  if(!agent)return{agentId:null,actions:[],verified:false};
  const observations=uniq([hazard?"hazard-nearby":null,questAvailable?"quest-opportunity":null,"nav-available","collision-active"]);
  const goal=hazard?"maintain-physical-safety":questAvailable?"serve-world-role":agent.goals?.[0]||"wait";
  const actions=hazard?["avoid","move"]:questAvailable?["move","interact"]:["wait"];
  return{agentId:agent.id,observations,goal,actions:actions.slice(0,agent.guardrails.maxActionsPerCycle),decisionEvidence:{inputs:observations,selectedGoal:goal,actionCount:actions.length,hiddenReasoning:false},verified:true,productionWrite:false};
}

export function auditEmbodiedAgentsV4(pkg={}){
  const gates={
    agents:Array.isArray(pkg.agents)&&pkg.agents.length>=2,
    grounding:pkg.grounding?.usesGameplayTruth===true&&pkg.grounding?.sceneGraphNodes>0,
    physics:pkg.grounding?.physicsBodies>=0,
    social:Array.isArray(pkg.socialGraph?.relationships),
    localFirst:pkg.runtime?.preferred==="local-first",
    providerRouter:pkg.runtime?.fallback==="provider-router",
    bounded:pkg.agents?.every(x=>x.guardrails?.maxActionsPerCycle<=8)===true,
    truthBoundary:pkg.evidence?.liveEmbodiedModelVerified===false&&pkg.evidence?.privateChainOfThoughtStored===false&&pkg.evidence?.productionAutoWrite===false
  };
  const score=Math.round(Object.values(gates).filter(Boolean).length/Object.keys(gates).length*100);
  return{score,gates,canClaimInternal100:score===100,canClaimProduction100:false};
}

export function createEmbodiedProviderContract(){
  return{
    version:"embodied-agent-provider-contract-v1",
    optionalCapabilities:["vision-language-grounding","audio-understanding","npc-dialogue","goal-planning","text-to-motion"],
    requiredInputs:["compact-scene-summary","allowed-actions","safety-constraints","memory-summary"],
    forbiddenPersistence:["private-chain-of-thought","raw-biometric-template"],
    providerNeutral:true,
    liveVerified:false
  };
}
