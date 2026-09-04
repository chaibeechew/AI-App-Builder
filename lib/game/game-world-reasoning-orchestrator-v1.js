// LANERIQ AI Game World Reasoning Orchestrator V1
// Multi-hypothesis generation + simulation judge + bounded selection.
// Exposes decision evidence, never private chain-of-thought.

import {compileGameWorldProject,GAME_WORLD_TEMPLATES} from "./game-world-generator-v1.js";
import {runWorldSimulationIntelligence,auditSimulationIntelligence} from "./game-world-simulation-intelligence-v1.js";

function clamp(v,min,max){return Math.max(min,Math.min(max,Number(v)||0));}
function text(v){return String(v??"").trim();}
function hashSeed(value){const s=text(value);let h=2166136261;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619);}return h>>>0;}

export const GAME_WORLD_REASONING_ORCHESTRATOR_V1=Object.freeze({
  version:"game-world-reasoning-orchestrator-v1",
  stages:Object.freeze(["decompose-intent","generate-hypotheses","compile-worlds","simulate-candidates","rank-tradeoffs","select-candidate","synthesize-improvement-plan","emit-decision-evidence"]),
  strategies:Object.freeze(["balanced","exploration","challenge","mobile-first","narrative","resilience"]),
  deterministic:true,
  exposesPrivateChainOfThought:false,
  productionAutoWrite:false
});

const STRATEGIES=Object.freeze({
  balanced:{scale:"medium",levelMul:1,treasureMul:1,bossMul:1},
  exploration:{scale:"large",levelMul:1.08,treasureMul:1.35,bossMul:.9},
  challenge:{scale:"medium",levelMul:1.1,treasureMul:.85,bossMul:1.35},
  "mobile-first":{scale:"small",levelMul:.85,treasureMul:.9,bossMul:.8},
  narrative:{scale:"medium",levelMul:1.05,treasureMul:.95,bossMul:.85},
  resilience:{scale:"medium",levelMul:.95,treasureMul:1.15,bossMul:.9}
});

export function decomposeWorldIntent(prompt=""){
  const p=text(prompt);
  const objectives=[];
  if(/open.?world|large world|开放世界|開放世界/i.test(p))objectives.push("large-world-exploration");
  if(/boss|dragon|首领|首領|魔王/i.test(p))objectives.push("boss-progression");
  if(/quest|story|任务|任務|剧情|劇情/i.test(p))objectives.push("quest-narrative");
  if(/treasure|loot|chest|宝箱|寶箱|掉落/i.test(p))objectives.push("reward-economy");
  if(/mobile|iphone|android|手机|手機/i.test(p))objectives.push("mobile-performance");
  if(/survival|生存/i.test(p))objectives.push("resource-resilience");
  if(!objectives.length)objectives.push("balanced-playability");
  return{prompt:p,objectives:[...new Set(objectives)],constraints:{boundedGeneration:true,deterministicReplay:true,productionEvidenceSeparate:true}};
}

export function buildWorldHypotheses({prompt="",seed="world-reasoning",hypothesisCount=6,levelCount=24,treasureCount=30,bossCount=4,templateId=""}={}){
  const count=Math.floor(clamp(hypothesisCount,2,6));
  const strategyIds=GAME_WORLD_REASONING_ORCHESTRATOR_V1.strategies.slice(0,count);
  const templateOffset=hashSeed(`${prompt}:${seed}`)%GAME_WORLD_TEMPLATES.length;
  return strategyIds.map((strategy,index)=>{
    const profile=STRATEGIES[strategy];
    const selectedTemplate=templateId||GAME_WORLD_TEMPLATES[(templateOffset+index)%GAME_WORLD_TEMPLATES.length].id;
    return{
      id:`hypothesis_${index+1}_${strategy}`,
      strategy,
      seed:`${seed}:${strategy}:${index}`,
      prompt:text(prompt),
      options:{
        templateId:selectedTemplate,
        scale:profile.scale,
        levelCount:Math.floor(clamp(levelCount*profile.levelMul,1,100)),
        treasureCount:Math.floor(clamp(treasureCount*profile.treasureMul,0,500)),
        bossCount:Math.floor(clamp(Math.round(bossCount*profile.bossMul),0,32))
      }
    };
  });
}

function candidateScore(simulation,strategy){
  const criticalPenalty=simulation.criticalCount*2.5;
  const worstPenalty=Math.max(0,55-simulation.scores.worst)*.35;
  const performancePenalty=strategy==="mobile-first"?Math.max(0,70-(simulation.bestCandidates?.[0]?.quality?.performance||70))*.3:0;
  return Math.round((simulation.scores.average-criticalPenalty-worstPenalty-performancePenalty)*100)/100;
}

export function evaluateWorldHypothesis(hypothesis,{simulationBudget=128}={}){
  const project=compileGameWorldProject({prompt:hypothesis.prompt,seed:hypothesis.seed,...hypothesis.options});
  const simulation=runWorldSimulationIntelligence(project.blueprint,{seed:`${hypothesis.seed}:judge`,budget:Math.floor(clamp(simulationBudget,32,512))});
  const audit=auditSimulationIntelligence(simulation);
  return{
    hypothesis,
    project,
    simulation,
    audit,
    selectionScore:candidateScore(simulation,hypothesis.strategy),
    decisionEvidence:{
      strategy:hypothesis.strategy,
      averageScore:simulation.scores.average,
      worstScore:simulation.scores.worst,
      criticalCount:simulation.criticalCount,
      constraintValid:simulation.constraints.valid,
      repairCount:simulation.repair.actions.length,
      internalAudit:audit.score
    }
  };
}

export function rankWorldHypotheses(candidates=[]){
  return[...candidates].sort((a,b)=>{
    if(a.simulation.constraints.valid!==b.simulation.constraints.valid)return a.simulation.constraints.valid?-1:1;
    if(a.simulation.criticalCount!==b.simulation.criticalCount)return a.simulation.criticalCount-b.simulation.criticalCount;
    if(a.selectionScore!==b.selectionScore)return b.selectionScore-a.selectionScore;
    return b.simulation.scores.worst-a.simulation.scores.worst;
  });
}

export function synthesizeWorldImprovementPlan(candidate){
  const repairs=candidate?.simulation?.repair?.actions||[];
  const priorities=repairs.slice(0,8).map((repair,index)=>({priority:index+1,risk:repair.risk,action:repair.action,note:repair.note,applyMode:"candidate-only",requiresRegression:true}));
  return{
    priorities,
    selectedStrategy:candidate?.hypothesis?.strategy||"unknown",
    productionWrite:false,
    nextVerification:["world-contract","simulation-intelligence","game-runtime","advanced-3d","content-pipeline","next-build"]
  };
}

export function runWorldReasoningOrchestration(input={}){
  const intent=decomposeWorldIntent(input.prompt||"");
  const hypotheses=buildWorldHypotheses(input);
  const candidates=hypotheses.map(h=>evaluateWorldHypothesis(h,{simulationBudget:input.simulationBudget||128}));
  const ranked=rankWorldHypotheses(candidates);
  const selected=ranked[0];
  const improvementPlan=synthesizeWorldImprovementPlan(selected);
  return{
    version:GAME_WORLD_REASONING_ORCHESTRATOR_V1.version,
    intent,
    hypothesisCount:hypotheses.length,
    candidates:ranked.map((c,index)=>({rank:index+1,id:c.hypothesis.id,strategy:c.hypothesis.strategy,selectionScore:c.selectionScore,decisionEvidence:c.decisionEvidence,worldId:c.project.blueprint.id})),
    selected:{id:selected.hypothesis.id,strategy:selected.hypothesis.strategy,selectionScore:selected.selectionScore,world:selected.project,simulation:selected.simulation},
    improvementPlan,
    evidence:{deterministic:true,privateChainOfThoughtExposed:false,modelWeightsTransferred:false,productionAutoWrite:false,selectionBasedOnAuditableMetrics:true}
  };
}

export function auditWorldReasoningOrchestration(result={}){
  const gates={
    intentDecomposition:Array.isArray(result.intent?.objectives)&&result.intent.objectives.length>0,
    multiHypothesis:Number(result.hypothesisCount)>=2,
    simulatedCandidates:Array.isArray(result.candidates)&&result.candidates.length===result.hypothesisCount,
    rankedCandidates:result.candidates?.every((x,i)=>x.rank===i+1)===true,
    selectedCandidate:Boolean(result.selected?.world?.blueprint?.id),
    improvementPlan:Array.isArray(result.improvementPlan?.priorities),
    deterministic:result.evidence?.deterministic===true,
    auditableSelection:result.evidence?.selectionBasedOnAuditableMetrics===true,
    noPrivateReasoningClaim:result.evidence?.privateChainOfThoughtExposed===false&&result.evidence?.modelWeightsTransferred===false,
    noProductionAutoWrite:result.evidence?.productionAutoWrite===false
  };
  const score=Math.round(Object.values(gates).filter(Boolean).length/Object.keys(gates).length*100);
  return{score,gates,canClaimInternal100:score===100,canClaimProduction100:false};
}
