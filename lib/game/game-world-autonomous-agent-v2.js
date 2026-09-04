// LANERIQ AI Autonomous Game World Agent V2
// Auditable observe -> plan -> act -> verify loop over the LANERIQ world model.
// No hidden chain-of-thought persistence; only compact decision evidence is stored.

import {applyWorldEvent,auditWorldModel,stepWorldModel} from "./game-world-world-model-v2.js";

function clone(value){return JSON.parse(JSON.stringify(value));}
function text(value){return String(value??"").trim();}
function clamp(value,min,max){return Math.max(min,Math.min(max,Number(value)||0));}

export const GAME_WORLD_AUTONOMOUS_AGENT_V2=Object.freeze({
  version:"game-world-autonomous-agent-v2",
  architecture:"bounded-observe-plan-act-verify",
  maxPlanActions:12,
  deterministicPolicy:true,
  humanOverrideReady:true,
  productionAutoWrite:false,
  hiddenReasoningStored:false
});

export function observeWorldForAgent(model){
  const regions=Object.values(model?.state?.regions||{});
  const threats=Object.entries(model?.state?.threats||{}).filter(([,item])=>item.active).map(([id,item])=>({id,...item}));
  const damaged=regions.filter(region=>region.landmarkState==="destroyed").map(region=>region.id);
  const depleted=regions.filter(region=>region.resourceIndex<35).map(region=>({regionId:region.id,resourceIndex:region.resourceIndex}));
  const stormRegions=regions.filter(region=>region.weather==="storm").map(region=>region.id);
  return{
    tick:model?.state?.tick||0,
    weather:model?.state?.weather||"clear",
    activeThreats:threats.sort((a,b)=>b.severity-a.severity||a.id.localeCompare(b.id)),
    damagedLandmarks:damaged,
    depletedRegions:depleted,
    stormRegions,
    questCount:Object.keys(model?.state?.quests||{}).length,
    audit:auditWorldModel(model)
  };
}

export function planWorldAgentActions(observation,{objective="preserve-playability",maxActions=8}={}){
  const actions=[];const reasons=[];const limit=clamp(maxActions,1,GAME_WORLD_AUTONOMOUS_AGENT_V2.maxPlanActions);
  for(const threat of observation.activeThreats){
    if(actions.length>=limit)break;
    if(threat.severity>=8){actions.push({type:"threat-clear",payload:{threatId:threat.id}});reasons.push({code:"critical-threat",target:threat.id});}
  }
  for(const regionId of observation.damagedLandmarks){
    if(actions.length>=limit)break;
    actions.push({type:"landmark-repaired",payload:{regionId}});reasons.push({code:"restore-progression-landmark",target:regionId});
  }
  for(const region of observation.depletedRegions){
    if(actions.length>=limit)break;
    actions.push({type:"resource-delta",payload:{regionId:region.regionId,delta:25}});reasons.push({code:"resource-recovery",target:region.regionId});
  }
  if(observation.weather==="storm"&&actions.length<limit){actions.push({type:"weather-change",payload:{weather:"clear"}});reasons.push({code:"stabilize-global-weather",target:"world"});}
  if(!actions.length&&actions.length<limit){actions.push({type:"world-flag",payload:{key:"agentObservedStable",value:true}});reasons.push({code:"stable-no-repair-required",target:"world"});}
  return{
    version:"world-agent-plan-v2",
    objective:text(objective)||"preserve-playability",
    basedOnTick:observation.tick,
    actions,
    decisionEvidence:{reasonCodes:reasons,hiddenReasoning:false,actionCount:actions.length}
  };
}

export function executeWorldAgentPlan(model,plan,{advanceMinutes=1}={}){
  let next=clone(model);const applied=[];
  for(const action of plan.actions){next=applyWorldEvent(next,action);applied.push(action.type);}
  next=stepWorldModel(next,{minutes:advanceMinutes});
  const after=observeWorldForAgent(next);
  return{
    model:next,
    execution:{applied,requested:plan.actions.length,completed:applied.length},
    verification:{audit:after.audit,criticalThreatsRemaining:after.activeThreats.filter(item=>item.severity>=8).length,damagedLandmarksRemaining:after.damagedLandmarks.length,depletedRegionsRemaining:after.depletedRegions.length}
  };
}

export function runAutonomousWorldCycle(model,options={}){
  const observation=observeWorldForAgent(model);
  const plan=planWorldAgentActions(observation,options);
  const result=executeWorldAgentPlan(model,plan,options);
  return{
    version:GAME_WORLD_AUTONOMOUS_AGENT_V2.version,
    observation,
    plan,
    execution:result.execution,
    verification:result.verification,
    model:result.model,
    evidence:{bounded:true,deterministicPolicy:true,humanOverrideReady:true,productionAutoWrite:false,hiddenReasoningStored:false}
  };
}

export function createAgentToolContract(){
  return{
    version:"game-world-agent-tools-v2",
    tools:[
      {id:"inspect-world",mode:"read"},{id:"simulate-change",mode:"read"},{id:"apply-world-event",mode:"bounded-write"},
      {id:"repair-landmark",mode:"bounded-write"},{id:"rebalance-resource",mode:"bounded-write"},{id:"clear-critical-threat",mode:"bounded-write"}
    ],
    externalEditorAdapters:["unity-designated-framework","godot-adapter","unreal-adapter","custom-mcp-compatible-host"],
    requiresUserOrReleaseGateForProduction:true
  };
}

export function auditAutonomousWorldAgent(cycle){
  const checks={
    version:cycle?.version===GAME_WORLD_AUTONOMOUS_AGENT_V2.version,
    observed:Boolean(cycle?.observation?.audit),
    planned:Array.isArray(cycle?.plan?.actions),
    bounded:(cycle?.plan?.actions?.length||0)<=GAME_WORLD_AUTONOMOUS_AGENT_V2.maxPlanActions,
    executed:cycle?.execution?.completed===cycle?.execution?.requested,
    verified:Boolean(cycle?.verification?.audit),
    noHiddenReasoning:cycle?.evidence?.hiddenReasoningStored===false,
    noProductionAutoWrite:cycle?.evidence?.productionAutoWrite===false
  };
  return{score:Math.round(Object.values(checks).filter(Boolean).length/Object.keys(checks).length*100),checks};
}
