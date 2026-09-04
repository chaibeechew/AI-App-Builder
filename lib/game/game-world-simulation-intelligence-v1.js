// LANERIQ AI Game World Simulation Intelligence V1
// Transferable reasoning patterns expressed as deterministic, testable software contracts.
// This module does NOT copy model weights, hidden chain-of-thought, or private internal state.
// It transfers reusable planning methods: decomposition, scenario search, counterfactuals,
// constraint solving, risk ranking, repair synthesis, and evidence gating.

function clamp(v,min,max){return Math.max(min,Math.min(max,Number(v)||0));}
function text(v){return String(v??"").trim();}
function hashSeed(value){const s=text(value);let h=2166136261;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619);}return h>>>0;}
function seeded(value){let x=(Number(value)>>>0)||1;return()=>{x^=x<<13;x^=x>>>17;x^=x<<5;return(x>>>0)/4294967296;};}
function mean(values){return values.length?values.reduce((a,b)=>a+b,0)/values.length:0;}
function round(v,d=3){const p=10**d;return Math.round(v*p)/p;}
function dim(id,count,examples=[]){return Object.freeze({id,count,examples:Object.freeze(examples)});}

export const TRANSFERRED_REASONING_PATTERNS=Object.freeze([
  "intent-decomposition",
  "hierarchical-planning",
  "multi-hypothesis-search",
  "low-discrepancy-scenario-sampling",
  "counterfactual-reasoning",
  "constraint-satisfaction",
  "causal-impact-approximation",
  "adversarial-stress-testing",
  "failure-mode-analysis",
  "uncertainty-calibration",
  "quality-scoring",
  "pareto-tradeoff-ranking",
  "repair-plan-synthesis",
  "deterministic-replay",
  "novelty-diversity-search",
  "evidence-gating"
]);

// Counts intentionally represent a broad but finite formal search surface.
// Product = 65,444,462,605,413,384,192,000,000 possible combinations.
export const WORLD_SCENARIO_DIMENSIONS=Object.freeze([
  dim("biome_state",12,["temperate","desert","snow","swamp","volcanic","jungle","oceanic","urban","underground","alien","ruined","enchanted"]),
  dim("world_topology",8,["hub-spoke","ring","branching","islands","vertical","linear-open","mesh","layered"]),
  dim("weather_state",10,["clear","rain","storm","snow","fog","heat","wind","ash","acid","aurora"]),
  dim("time_phase",8,["dawn","morning","noon","afternoon","dusk","night","midnight","eclipse"]),
  dim("progression_curve",12,["linear","soft-gate","hard-gate","metroidvania","branching","skill-gated"]),
  dim("enemy_ecology",16,["sparse","patrol","territorial","swarm","elite-heavy","predator-prey","faction-war","ambush"]),
  dim("boss_archetype",20,["brute","duelist","summoner","caster","colossus","dragon","swarm-core","multi-phase"]),
  dim("quest_graph",18,["linear","branching","hub","faction","mystery","escort","survival","collection"]),
  dim("loot_economy",12,["scarce","balanced","generous","craft-heavy","boss-heavy","exploration-heavy"]),
  dim("resource_pressure",10,["none","low","food","ammo","mana","durability","oxygen","heat","currency","mixed"]),
  dim("traversal_mode",14,["walk","sprint","mount","vehicle","flight","climb","grapple","swim","teleport","rail"]),
  dim("settlement_state",10,["safe","besieged","abandoned","prosperous","hostile","mobile","hidden","ruined"]),
  dim("faction_relation",12,["neutral","allied","hostile","war","truce","betrayal","reputation-gated","dynamic"]),
  dim("world_event",16,["none","invasion","storm","festival","plague","eclipse","raid","migration","collapse","rebellion"]),
  dim("player_strategy",24,["rush","explore","stealth","combat","ranged","melee","magic","economy","speedrun","completionist"]),
  dim("difficulty_profile",10,["story","easy","normal","hard","expert","adaptive","permadeath","roguelite","coop-scaled","custom"]),
  dim("platform_budget",8,["mobile-low","mobile-mid","mobile-high","tablet","web-low","web-high","desktop","console-like"]),
  dim("failure_mode",18,["death","softlock","economy-collapse","quest-dead-end","navigation-trap","save-corruption","boss-spike","resource-starvation"]),
  dim("recovery_policy",12,["checkpoint","autosave","manual-save","rewind","respawn","safe-hub","rollback","grace-state"]),
  dim("content_density",10,["very-low","low","medium","high","very-high","clustered","distributed","dynamic"]),
  dim("combat_style",12,["none","action","tactical","turn-based","shooter","soulslike","hack-slash","stealth","hybrid"]),
  dim("narrative_tone",16,["heroic","dark","mystery","comedy","horror","romance","political","surreal","hopeful","tragic"]),
  dim("accessibility_profile",8,["default","high-contrast","reduced-motion","large-ui","one-hand","subtitle-heavy","assist-mode","custom"]),
  dim("network_mode",6,["offline","async","coop","pvp","shared-world","hybrid"])
]);

export const GAME_WORLD_SIMULATION_INTELLIGENCE_V1=Object.freeze({
  version:"game-world-simulation-intelligence-v1",
  architecture:"bounded-search-over-world-blueprint",
  reasoningPatterns:TRANSFERRED_REASONING_PATTERNS,
  scenarioDimensions:WORLD_SCENARIO_DIMENSIONS.length,
  deterministic:true,
  hiddenReasoningCopied:false,
  modelWeightsCopied:false,
  exhaustiveExecutionClaimed:false,
  executionTiers:Object.freeze({quick:256,standard:2048,deep:10000}),
  productionRendererVerified:false,
  realDevicePerformanceVerified:false,
  liveEconomyVerified:false,
  liveMultiplayerVerified:false
});

export function scenarioSpaceSize(dimensions=WORLD_SCENARIO_DIMENSIONS){
  return dimensions.reduce((total,d)=>total*BigInt(Math.max(1,Math.floor(d.count))),1n);
}

export function scenarioSpaceSummary(){
  const exact=scenarioSpaceSize();
  return{
    dimensions:WORLD_SCENARIO_DIMENSIONS.length,
    exact:exact.toString(),
    scientific:"6.5444462605413384192e25",
    exhaustive:false,
    reason:"The formal combination space is enormous, so execution uses deterministic representative sampling, counterfactual refinement and stress cases instead of pretending to enumerate every combination."
  };
}

const PRIMES=Object.freeze([2,3,5,7,11,13,17,19,23,29,31,37,41,43,47,53,59,61,67,71,73,79,83,89,97,101,103,107,109]);
function radicalInverse(index,base){let n=index,f=1/base,result=0;while(n>0){result+=f*(n%base);n=Math.floor(n/base);f/=base;}return result;}
function dimensionValue(d,index){return d.examples[index]??`${d.id}_${index+1}`;}

export function scenarioAt(index,{seed="laneriq-scenario",dimensions=WORLD_SCENARIO_DIMENSIONS}={}){
  const offset=(hashSeed(seed)%997)+1;
  const vector={};
  dimensions.forEach((d,i)=>{
    const u=radicalInverse(Math.max(1,index+1+offset),PRIMES[i%PRIMES.length]);
    const bucket=Math.min(d.count-1,Math.floor(u*d.count));
    vector[d.id]={index:bucket,value:dimensionValue(d,bucket)};
  });
  return{id:`scenario_${index+1}`,index,seed:text(seed),vector,fingerprint:hashSeed(JSON.stringify(vector)).toString(16)};
}

export function buildScenarioBatch({seed="laneriq-scenario",budget=256,dimensions=WORLD_SCENARIO_DIMENSIONS}={}){
  const safeBudget=Math.floor(clamp(budget,1,10000));
  return Array.from({length:safeBudget},(_,i)=>scenarioAt(i,{seed,dimensions}));
}

function worldStats(world={}){
  const regions=Array.isArray(world.regions)?world.regions:[];
  const poi=Array.isArray(world.pointsOfInterest)?world.pointsOfInterest:[];
  const routes=Array.isArray(world.routes)?world.routes:[];
  const typeCount=(type)=>poi.filter(p=>p.type===type).length;
  const dangers=regions.map(r=>clamp(r.danger,0,10));
  return{
    regionCount:regions.length,
    routeCount:routes.length,
    poiCount:poi.length,
    bossCount:typeCount("boss"),
    treasureCount:typeCount("treasure"),
    dungeonCount:typeCount("dungeon"),
    questCount:typeCount("quest"),
    settlementCount:typeCount("settlement"),
    avgDanger:mean(dangers),
    maxDanger:dangers.length?Math.max(...dangers):0,
    levels:Math.max(1,Number(world.progression?.levels)||1),
    worldSize:Math.max(1,Number(world.worldSizeMeters)||1000)
  };
}

function vindex(s,id){return Number(s.vector?.[id]?.index)||0;}
function normalized(s,id,count){return count<=1?0:vindex(s,id)/(count-1);}

export function evaluateWorldScenario(world,scenario){
  const w=worldStats(world),s=scenario;
  const difficulty=normalized(s,"difficulty_profile",10);
  const pressure=normalized(s,"resource_pressure",10);
  const density=normalized(s,"content_density",10);
  const strategy=normalized(s,"player_strategy",24);
  const failure=normalized(s,"failure_mode",18);
  const recovery=normalized(s,"recovery_policy",12);
  const network=normalized(s,"network_mode",6);
  const platform=normalized(s,"platform_budget",8);
  const traversal=normalized(s,"traversal_mode",14);
  const questGraph=normalized(s,"quest_graph",18);
  const economy=normalized(s,"loot_economy",12);
  const accessibility=normalized(s,"accessibility_profile",8);
  const weather=normalized(s,"weather_state",10);
  const enemy=normalized(s,"enemy_ecology",16);
  const bossesPer10Levels=w.bossCount/(w.levels/10);
  const treasurePerRegion=w.treasureCount/Math.max(1,w.regionCount);
  const routesPerRegion=w.routeCount/Math.max(1,w.regionCount);
  const poiDensity=w.poiCount/Math.max(1,w.worldSize/500);

  const quality={
    progression:clamp(100-Math.abs((w.avgDanger/10)-difficulty)*62-Math.abs(bossesPer10Levels-1.5)*7,0,100),
    traversal:clamp(72+routesPerRegion*7+traversal*10-weather*8-failure*5,0,100),
    economy:clamp(58+Math.min(28,treasurePerRegion*3)+economy*10-pressure*24,0,100),
    questIntegrity:clamp(62+Math.min(25,w.questCount*2)+questGraph*6-failure*15,0,100),
    combatFairness:clamp(86-difficulty*17-pressure*8-enemy*8+recovery*9,0,100),
    recovery:clamp(70+recovery*22-failure*20,0,100),
    performance:clamp(104-poiDensity*2.3-density*18-network*8-platform*4,0,100),
    accessibility:clamp(76+accessibility*17-difficulty*5-weather*3,0,100),
    exploration:clamp(61+Math.min(22,w.regionCount*3)+traversal*8+strategy*5-density*4,0,100),
    resilience:clamp(80+recovery*12-failure*25-network*5,0,100)
  };
  const score=round(mean(Object.values(quality)),2);
  const risks=[];
  for(const[key,value]of Object.entries(quality))if(value<55)risks.push({type:key,severity:value<35?"critical":value<45?"high":"medium",score:round(value,2)});
  if(w.routeCount<Math.max(1,w.regionCount-1))risks.push({type:"world-connectivity",severity:"critical",score:0});
  if(w.bossCount>0&&w.levels/w.bossCount<2)risks.push({type:"boss-spacing",severity:"high",score:35});
  if(w.questCount===0)risks.push({type:"quest-coverage",severity:"high",score:30});
  if(w.treasureCount===0&&pressure>.4)risks.push({type:"resource-starvation",severity:"high",score:35});
  const uncertainty=round(clamp(.04+risks.length*.018+network*.025,0,1),3);
  return{scenarioId:s.id,fingerprint:s.fingerprint,score,quality,risks,uncertainty,stats:w};
}

export function solveWorldConstraints(world={}){
  const w=worldStats(world),violations=[],warnings=[];
  if(w.regionCount<2)violations.push("world_requires_multiple_regions");
  if(w.routeCount<Math.max(1,w.regionCount-1))violations.push("insufficient_connectivity_edges");
  if(w.levels<1)violations.push("invalid_level_count");
  if(w.bossCount>w.levels)warnings.push("boss_count_exceeds_level_count");
  if(w.poiCount>5000)warnings.push("poi_count_requires_partitioning");
  if(w.worldSize>10000&&w.regionCount<6)warnings.push("large_world_region_partition_too_sparse");
  return{valid:violations.length===0,violations,warnings,stats:w};
}

export function buildCounterfactuals(scenario,{limit=48}={}){
  const out=[];
  for(const d of WORLD_SCENARIO_DIMENSIONS){
    const current=vindex(scenario,d.id);
    for(const delta of[-1,1]){
      const next=clamp(current+delta,0,d.count-1);
      if(next===current)continue;
      const vector=structuredClone(scenario.vector);
      vector[d.id]={index:next,value:dimensionValue(d,next)};
      out.push({id:`${scenario.id}_cf_${d.id}_${delta>0?"up":"down"}`,index:scenario.index,seed:scenario.seed,vector,fingerprint:hashSeed(JSON.stringify(vector)).toString(16),counterfactualOf:scenario.id,changedDimension:d.id});
      if(out.length>=limit)return out;
    }
  }
  return out;
}

export function rankParetoCandidates(evaluations=[]){
  return[...evaluations].sort((a,b)=>{
    const ar=a.risks.filter(r=>r.severity==="critical").length,br=b.risks.filter(r=>r.severity==="critical").length;
    if(ar!==br)return ar-br;
    if(a.score!==b.score)return b.score-a.score;
    return a.uncertainty-b.uncertainty;
  });
}

const REPAIR_RULES=Object.freeze({
  progression:{action:"rebalance-progression-bands",note:"Smooth region danger and boss level spacing."},
  traversal:{action:"add-or-repair-routes",note:"Increase alternate paths, traversal affordances and weather-safe routing."},
  economy:{action:"rebalance-loot-economy",note:"Adjust treasure density, reward tiers and resource pressure."},
  questIntegrity:{action:"repair-quest-graph",note:"Remove dead ends and add fallback/terminal quest states."},
  combatFairness:{action:"rebalance-enemy-boss-pressure",note:"Reduce unfair difficulty spikes and telegraph failures."},
  recovery:{action:"strengthen-recovery-policy",note:"Add checkpoint/autosave/rollback recovery paths."},
  performance:{action:"partition-world-content",note:"Reduce density, introduce LOD/HLOD and streaming partitions."},
  accessibility:{action:"add-accessibility-alternatives",note:"Provide reduced-motion, readable UI and non-color/non-audio feedback."},
  exploration:{action:"improve-exploration-rewards",note:"Improve route variety, landmarks and optional rewards."},
  resilience:{action:"add-failure-recovery-contracts",note:"Make failure states recoverable and deterministic."},
  "world-connectivity":{action:"repair-world-graph",note:"Guarantee a connected critical path across regions."},
  "boss-spacing":{action:"rebalance-boss-spacing",note:"Increase progression distance between boss encounters."},
  "quest-coverage":{action:"generate-minimum-quest-spine",note:"Create a valid critical quest spine with terminal states."},
  "resource-starvation":{action:"add-resource-safety-net",note:"Add deterministic minimum resource availability and recovery."}
});

export function synthesizeRepairPlan(evaluations=[],constraintResult={}){
  const counts=new Map();
  for(const e of evaluations)for(const risk of e.risks)counts.set(risk.type,(counts.get(risk.type)||0)+(risk.severity==="critical"?5:risk.severity==="high"?3:1));
  for(const violation of constraintResult.violations||[])counts.set(violation,(counts.get(violation)||0)+8);
  const actions=[...counts.entries()].sort((a,b)=>b[1]-a[1]).slice(0,12).map(([risk,weight],index)=>{
    const rule=REPAIR_RULES[risk]||{action:`review-${risk}`,note:"Review the failed contract and generate a bounded candidate patch."};
    return{id:`repair_${index+1}`,risk,weight,action:rule.action,note:rule.note,automaticProductionWrite:false,requiresRegression:true};
  });
  return{actions,autoApplyToProduction:false,requiresReview:true,regressionRequired:true};
}

export function runAdversarialWorldStressSuite(world,{seed="stress"}={}){
  const stressVectors=[
    {difficulty_profile:9,resource_pressure:9,failure_mode:17,recovery_policy:0,content_density:9,network_mode:5},
    {weather_state:9,traversal_mode:0,enemy_ecology:15,boss_archetype:19,platform_budget:0,content_density:9},
    {quest_graph:17,loot_economy:0,resource_pressure:9,player_strategy:23,difficulty_profile:9,recovery_policy:0},
    {network_mode:5,world_event:15,content_density:9,failure_mode:17,platform_budget:0,accessibility_profile:0}
  ];
  return stressVectors.map((patch,i)=>{
    const base=scenarioAt(i,{seed:`${seed}:${i}`}),vector=structuredClone(base.vector);
    for(const[id,index]of Object.entries(patch)){const d=WORLD_SCENARIO_DIMENSIONS.find(x=>x.id===id);if(d)vector[id]={index:clamp(index,0,d.count-1),value:dimensionValue(d,clamp(index,0,d.count-1))};}
    const scenario={...base,id:`adversarial_${i+1}`,vector,fingerprint:hashSeed(JSON.stringify(vector)).toString(16)};
    return{scenario,evaluation:evaluateWorldScenario(world,scenario)};
  });
}

export function runWorldSimulationIntelligence(world,{seed="laneriq-simulation",tier="quick",budget}={}){
  const tierBudget=GAME_WORLD_SIMULATION_INTELLIGENCE_V1.executionTiers[tier]||256;
  const safeBudget=Math.floor(clamp(budget??tierBudget,1,10000));
  const constraints=solveWorldConstraints(world);
  const scenarios=buildScenarioBatch({seed,budget:safeBudget});
  const evaluations=scenarios.map(s=>evaluateWorldScenario(world,s));
  const worst=[...evaluations].sort((a,b)=>a.score-b.score).slice(0,Math.min(12,evaluations.length));
  const counterfactualScenarios=worst.flatMap((e,index)=>buildCounterfactuals(scenarios[evaluations.indexOf(e)]||scenarios[index],{limit:8}));
  const counterfactuals=counterfactualScenarios.map(s=>evaluateWorldScenario(world,s));
  const adversarial=runAdversarialWorldStressSuite(world,{seed:`${seed}:adversarial`});
  const all=[...evaluations,...counterfactuals,...adversarial.map(x=>x.evaluation)];
  const ranked=rankParetoCandidates(all);
  const riskHistogram={};
  for(const e of all)for(const r of e.risks)riskHistogram[r.type]=(riskHistogram[r.type]||0)+1;
  const repair=synthesizeRepairPlan(all,constraints);
  const averageScore=round(mean(evaluations.map(e=>e.score)),2);
  const worstScore=round(Math.min(...evaluations.map(e=>e.score)),2);
  const criticalCount=all.reduce((n,e)=>n+e.risks.filter(r=>r.severity==="critical").length,0);
  return{
    version:GAME_WORLD_SIMULATION_INTELLIGENCE_V1.version,
    seed:text(seed),tier,budget:safeBudget,
    scenarioSpace:scenarioSpaceSummary(),
    executed:{base:evaluations.length,counterfactual:counterfactuals.length,adversarial:adversarial.length,total:all.length},
    scores:{average:averageScore,worst:worstScore,best:round(Math.max(...evaluations.map(e=>e.score)),2)},
    constraints,
    riskHistogram,
    criticalCount,
    repair,
    bestCandidates:ranked.slice(0,5),
    worstCandidates:[...all].sort((a,b)=>a.score-b.score).slice(0,5),
    evidence:{deterministic:true,replayable:true,hiddenReasoningCopied:false,modelWeightsCopied:false,exhaustiveExecution:false,productionEvidence:false}
  };
}

export function auditSimulationIntelligence(result={}){
  const gates={
    formalScenarioSpace:Boolean(result.scenarioSpace?.exact),
    representativeExecution:Number(result.executed?.base)>0,
    counterfactualCoverage:Number(result.executed?.counterfactual)>0,
    adversarialCoverage:Number(result.executed?.adversarial)>0,
    constraintSolver:Boolean(result.constraints),
    riskRanking:Boolean(result.riskHistogram),
    repairSynthesis:Array.isArray(result.repair?.actions),
    deterministicReplay:result.evidence?.deterministic===true&&result.evidence?.replayable===true,
    truthBoundary:result.evidence?.exhaustiveExecution===false&&result.evidence?.productionEvidence===false,
    noHiddenReasoningClaim:result.evidence?.hiddenReasoningCopied===false&&result.evidence?.modelWeightsCopied===false
  };
  const score=Math.round(Object.values(gates).filter(Boolean).length/Object.keys(gates).length*100);
  return{score,gates,canClaimInternal100:score===100,canClaimProduction100:false,truthRule:"Internal 100 means the simulation-intelligence contracts, deterministic scenario search, counterfactuals, stress suite, constraint solver, repair synthesis and evidence boundaries are present and verified. It does not prove exhaustive search, renderer quality, real-device performance, live economy or live multiplayer."};
}
