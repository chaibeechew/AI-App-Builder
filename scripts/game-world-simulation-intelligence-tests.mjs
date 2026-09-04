import assert from "node:assert/strict";
import {buildWorldBlueprint} from "../lib/game/game-world-generator-v1.js";
import {
  GAME_WORLD_SIMULATION_INTELLIGENCE_V1,
  TRANSFERRED_REASONING_PATTERNS,
  WORLD_SCENARIO_DIMENSIONS,
  scenarioSpaceSize,
  scenarioSpaceSummary,
  scenarioAt,
  buildScenarioBatch,
  evaluateWorldScenario,
  solveWorldConstraints,
  buildCounterfactuals,
  runAdversarialWorldStressSuite,
  runWorldSimulationIntelligence,
  auditSimulationIntelligence
} from "../lib/game/game-world-simulation-intelligence-v1.js";

const ok=(name,fn)=>{fn();console.log(`✓ ${name}`);};
const world=buildWorldBlueprint({prompt:"Epic open world RPG with castle, dungeon, quests, 30 treasure chests and 4 bosses",seed:"simulation-100",levelCount:24,treasureCount:30,bossCount:4});

ok("Simulation Intelligence transfers reusable reasoning patterns without claiming hidden reasoning or model-weight copying",()=>{
  assert.ok(TRANSFERRED_REASONING_PATTERNS.length>=16);
  for(const key of ["intent-decomposition","counterfactual-reasoning","constraint-satisfaction","adversarial-stress-testing","repair-plan-synthesis","evidence-gating"])assert.ok(TRANSFERRED_REASONING_PATTERNS.includes(key));
  assert.equal(GAME_WORLD_SIMULATION_INTELLIGENCE_V1.hiddenReasoningCopied,false);
  assert.equal(GAME_WORLD_SIMULATION_INTELLIGENCE_V1.modelWeightsCopied,false);
  assert.equal(GAME_WORLD_SIMULATION_INTELLIGENCE_V1.exhaustiveExecutionClaimed,false);
});

ok("Formal 24-dimensional scenario space is exact and truthfully distinguished from executed simulations",()=>{
  assert.equal(WORLD_SCENARIO_DIMENSIONS.length,24);
  assert.equal(scenarioSpaceSize().toString(),"65444462605413384192000000");
  const summary=scenarioSpaceSummary();
  assert.equal(summary.exact,"65444462605413384192000000");
  assert.equal(summary.exhaustive,false);
  assert.match(summary.reason,/representative sampling/i);
});

ok("Low-discrepancy scenario generation is deterministic and bounded",()=>{
  const a=scenarioAt(17,{seed:"same"}),b=scenarioAt(17,{seed:"same"}),c=scenarioAt(18,{seed:"same"});
  assert.deepEqual(a,b);assert.notEqual(a.fingerprint,c.fingerprint);
  const batch=buildScenarioBatch({seed:"batch",budget:300});assert.equal(batch.length,300);
  assert.equal(buildScenarioBatch({budget:50000}).length,10000);
});

ok("World scenario evaluator produces quality, uncertainty and risk evidence",()=>{
  const scenario=scenarioAt(5,{seed:"evaluation"}),result=evaluateWorldScenario(world,scenario);
  assert.ok(result.score>=0&&result.score<=100);
  assert.equal(Object.keys(result.quality).length,10);
  assert.ok(result.uncertainty>=0&&result.uncertainty<=1);
  assert.ok(Array.isArray(result.risks));
});

ok("Constraint solver and counterfactual engine are deterministic and bounded",()=>{
  const constraints=solveWorldConstraints(world);assert.equal(constraints.valid,true);
  const source=scenarioAt(9,{seed:"counterfactual"}),counterfactuals=buildCounterfactuals(source,{limit:20});
  assert.ok(counterfactuals.length>0&&counterfactuals.length<=20);
  assert.ok(counterfactuals.every(x=>x.counterfactualOf===source.id&&x.changedDimension));
});

ok("Adversarial stress suite executes explicit extreme world conditions",()=>{
  const stress=runAdversarialWorldStressSuite(world,{seed:"stress"});
  assert.equal(stress.length,4);
  assert.ok(stress.every(x=>x.scenario.id.startsWith("adversarial_")&&x.evaluation.score>=0));
});

ok("Full simulation combines representative search, counterfactuals, adversarial cases, risk ranking and repair synthesis",()=>{
  const result=runWorldSimulationIntelligence(world,{seed:"full",tier:"quick",budget:256});
  assert.equal(result.executed.base,256);
  assert.ok(result.executed.counterfactual>0);
  assert.equal(result.executed.adversarial,4);
  assert.ok(result.executed.total>256);
  assert.ok(result.scores.average>=0&&result.scores.average<=100);
  assert.ok(Array.isArray(result.repair.actions));
  assert.equal(result.repair.autoApplyToProduction,false);
  assert.equal(result.evidence.exhaustiveExecution,false);
  assert.equal(result.evidence.productionEvidence,false);
});

ok("Simulation Intelligence reaches 100 internal contract coverage without claiming Production 100",()=>{
  const result=runWorldSimulationIntelligence(world,{seed:"audit",budget:128});
  const audit=auditSimulationIntelligence(result);
  assert.equal(audit.score,100);
  assert.equal(audit.canClaimInternal100,true);
  assert.equal(audit.canClaimProduction100,false);
  assert.match(audit.truthRule,/does not prove exhaustive search/i);
});

ok("Same world + same seed + same budget reproduces the same simulation evidence",()=>{
  const a=runWorldSimulationIntelligence(world,{seed:"replay",budget:96});
  const b=runWorldSimulationIntelligence(world,{seed:"replay",budget:96});
  assert.deepEqual(a,b);
});
