import assert from "node:assert/strict";
import {GAME_WORLD_READINESS_AREAS,currentGameWorldReadinessEvidence} from "../lib/game/game-world-readiness-v1.js";

const ok=(name,fn)=>{fn();console.log(`✓ ${name}`);};

ok("Game World Readiness requires ten internal architecture/intelligence gates",()=>{
  assert.equal(GAME_WORLD_READINESS_AREAS.internal.length,10);
  for(const key of ["worldGeneratorArchitecture","scenarioSimulationIntelligence","multiHypothesisReasoning","truthBoundary"])assert.ok(GAME_WORLD_READINESS_AREAS.internal.includes(key));
});

ok("Game World Readiness reaches 100 INTERNAL CODE only when Generator + Simulation + Reasoning all pass",()=>{
  const evidence=currentGameWorldReadinessEvidence();
  assert.equal(evidence.score,100);
  assert.equal(evidence.simulationAudit,100);
  assert.equal(evidence.reasoningAudit,100);
  assert.equal(evidence.canClaimInternal100,true);
  assert.equal(Object.values(evidence.gates).every(Boolean),true);
  assert.equal(evidence.scenarioSpace.exact,"65444462605413384192000000");
});

ok("Production 100 remains blocked by real renderer/exporter/device/live/store evidence",()=>{
  const evidence=currentGameWorldReadinessEvidence();
  assert.equal(evidence.canClaimProduction100,false);
  assert.equal(Object.values(evidence.productionEvidence).every(v=>v===false),true);
  assert.match(evidence.truthRule,/Production 100 requires separately measured/i);
});
