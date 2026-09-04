import assert from "node:assert/strict";
import {
  GAME_WORLD_REASONING_ORCHESTRATOR_V1,
  decomposeWorldIntent,
  buildWorldHypotheses,
  evaluateWorldHypothesis,
  rankWorldHypotheses,
  runWorldReasoningOrchestration,
  auditWorldReasoningOrchestration
} from "../lib/game/game-world-reasoning-orchestrator-v1.js";

const ok=(name,fn)=>{fn();console.log(`✓ ${name}`);};
const input={prompt:"Mobile open world fantasy RPG with castle, quests, treasure and bosses",seed:"reasoning-100",levelCount:24,treasureCount:30,bossCount:4,hypothesisCount:4,simulationBudget:48};

ok("Reasoning Orchestrator exposes auditable stages without private chain-of-thought",()=>{
  assert.ok(GAME_WORLD_REASONING_ORCHESTRATOR_V1.stages.length>=8);
  assert.equal(GAME_WORLD_REASONING_ORCHESTRATOR_V1.exposesPrivateChainOfThought,false);
  assert.equal(GAME_WORLD_REASONING_ORCHESTRATOR_V1.productionAutoWrite,false);
});

ok("Intent decomposition extracts explicit world objectives",()=>{
  const intent=decomposeWorldIntent(input.prompt);
  for(const objective of ["large-world-exploration","boss-progression","quest-narrative","reward-economy","mobile-performance"])assert.ok(intent.objectives.includes(objective));
  assert.equal(intent.constraints.productionEvidenceSeparate,true);
});

ok("Multi-hypothesis generation is deterministic, bounded and strategy-diverse",()=>{
  const a=buildWorldHypotheses(input),b=buildWorldHypotheses(input);
  assert.deepEqual(a,b);assert.equal(a.length,4);
  assert.equal(new Set(a.map(x=>x.strategy)).size,4);
});

ok("Each hypothesis compiles a real World Project and receives Simulation Intelligence evidence",()=>{
  const hypothesis=buildWorldHypotheses({...input,hypothesisCount:2})[0];
  const evaluated=evaluateWorldHypothesis(hypothesis,{simulationBudget:32});
  assert.ok(evaluated.project.blueprint.id);
  assert.ok(evaluated.simulation.executed.total>0);
  assert.equal(evaluated.audit.score,100);
  assert.ok(Number.isFinite(evaluated.selectionScore));
});

ok("Ranking prefers constraint-valid, lower-critical-risk candidates before raw score",()=>{
  const hypotheses=buildWorldHypotheses({...input,hypothesisCount:3});
  const candidates=hypotheses.map(x=>evaluateWorldHypothesis(x,{simulationBudget:32}));
  const ranked=rankWorldHypotheses(candidates);
  assert.equal(ranked.length,3);
  for(let i=1;i<ranked.length;i++)assert.ok(ranked[i-1].simulation.criticalCount<=ranked[i].simulation.criticalCount||ranked[i-1].selectionScore>=ranked[i].selectionScore);
});

ok("Full orchestration performs hypothesis search, simulation judge, selection and repair planning",()=>{
  const result=runWorldReasoningOrchestration(input);
  assert.equal(result.hypothesisCount,4);
  assert.equal(result.candidates.length,4);
  assert.equal(result.candidates[0].rank,1);
  assert.ok(result.selected.world.blueprint.id);
  assert.ok(result.selected.simulation.executed.total>0);
  assert.equal(result.improvementPlan.productionWrite,false);
  assert.equal(result.evidence.selectionBasedOnAuditableMetrics,true);
  assert.equal(result.evidence.privateChainOfThoughtExposed,false);
  assert.equal(result.evidence.modelWeightsTransferred,false);
});

ok("Same orchestration inputs reproduce the same selected world and evidence",()=>{
  const a=runWorldReasoningOrchestration({...input,hypothesisCount:3,simulationBudget:32});
  const b=runWorldReasoningOrchestration({...input,hypothesisCount:3,simulationBudget:32});
  assert.deepEqual(a,b);
});

ok("Reasoning Orchestrator reaches 100 internal contract coverage without claiming Production 100",()=>{
  const result=runWorldReasoningOrchestration({...input,hypothesisCount:3,simulationBudget:32});
  const audit=auditWorldReasoningOrchestration(result);
  assert.equal(audit.score,100);
  assert.equal(audit.canClaimInternal100,true);
  assert.equal(audit.canClaimProduction100,false);
});
