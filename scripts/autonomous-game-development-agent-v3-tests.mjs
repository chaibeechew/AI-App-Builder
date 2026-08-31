import assert from "node:assert/strict";
import fs from "node:fs";
import {
  AUTONOMOUS_GAME_DEVELOPMENT_AGENT_V3,inferAutonomousDevelopmentCapabilities,createReproBundle,
  minimizeFailureTrace,isolateRootCauses,synthesizeRegressionSuite,classifyReleaseRisk,
  proposeReviewGatedPatchPlan,buildSyntheticDeviceMatrix,validateSaveMigrationRegression,runAutonomousDevelopmentCycle
} from "../lib/game/autonomous-game-development-agent-v3.js";
import {inferGameTaxonomy} from "../lib/ai/game-taxonomy-knowledge.js";
import {currentGameCreatorEvidence,GAME_CREATOR_READINESS_AREAS} from "../lib/game/game-creator-readiness-v2.js";

const ok=(name,fn)=>{fn();console.log(`✓ ${name}`);};
const actions=["spawn","walk","pickup_key","open_gate","dash","dash","enter_boss"];
const fails=trace=>trace.includes("open_gate")&&trace.filter(x=>x==="dash").length>=2;

ok("Autonomous Development Agent V3 is deterministic, bounded and cannot auto-patch or authorize production release",()=>{
  assert.equal(AUTONOMOUS_GAME_DEVELOPMENT_AGENT_V3.deterministic,true);
  assert.equal(AUTONOMOUS_GAME_DEVELOPMENT_AGENT_V3.maxTraceActions,10000);
  assert.equal(AUTONOMOUS_GAME_DEVELOPMENT_AGENT_V3.productionAutoPatch,false);
  assert.equal(AUTONOMOUS_GAME_DEVELOPMENT_AGENT_V3.productionReleaseAuthority,false);
  const inferred=inferAutonomousDevelopmentCapabilities("Find the root cause, create a minimal repro and regression suite, then classify release blockers");
  assert.equal(inferred.matched,true);assert.match(inferred.truthRule,/Production auto-patching and release authority stay disabled/i);
});

ok("Failure bundles and bounded delta minimization reduce a long trace while preserving reproduction",()=>{
  const bundle=createReproBundle({id:"gate_bug",seed:"same",initialState:{room:"gate"},actions,failure:"soft_lock"});
  assert.equal(bundle.trace.length,actions.length);assert.equal(bundle.bounded,true);
  const minimized=minimizeFailureTrace(actions,fails);assert.equal(minimized.reproduces,true);assert.ok(minimized.minimizedLength<actions.length);assert.equal(fails(minimized.actions),true);assert.ok(minimized.passes<=20);
});

ok("Root-cause isolation distinguishes experimentally isolated causes from suspects",()=>{
  const causes=isolateRootCauses({issues:["soft_lock"],candidates:[{id:"movement_dash",area:"movement",prior:.6},{id:"gate",area:"progression",prior:.5}],testCandidate:c=>c.id==="movement_dash"?{resolved:1,observed:1}:{resolved:0,observed:1}});
  assert.equal(causes.ranked[0].id,"movement_dash");assert.equal(causes.ranked[0].status,"isolated");assert.ok(causes.isolated.includes("movement_dash"));assert.match(causes.truth,/not a proven root cause unless/i);
});

ok("Regression synthesis and patch planning remain review gated",()=>{
  const minimized=minimizeFailureTrace(actions,fails),suite=synthesizeRegressionSuite({issueId:"gate_bug",failure:"soft_lock",seed:"same",initialState:{room:"gate"},actions:minimized.actions,expectedInvariant:"boss_reachable"});
  assert.equal(suite.requiredOnEveryChange,true);assert.equal(suite.productionEvidence,false);assert.equal(suite.cases.length,1);
  const patch=proposeReviewGatedPatchPlan({issue:{id:"gate_bug",type:"soft_lock",severity:"high"},rootCause:{area:"movement"},regressionSuite:suite});
  assert.equal(patch.autoApply,false);assert.equal(patch.requiresReview,true);assert.equal(patch.productionWrite,false);assert.equal(patch.regressionSuiteId,suite.suiteId);
});

ok("Release triage fails closed on critical/high unresolved issues and synthetic devices never count as real evidence",()=>{
  const risk=classifyReleaseRisk([{id:"save",type:"save_corruption",resolved:false},{id:"ui",type:"minor_ui",severity:"low",resolved:false}]);
  assert.equal(risk.canRelease,false);assert.equal(risk.blockers.length,1);assert.equal(risk.productionReleaseAuthority,false);
  const devices=buildSyntheticDeviceMatrix({scenario:"boss"});assert.equal(devices.profiles.length,3);assert.equal(devices.productionDeviceEvidence,false);assert.ok(devices.profiles.every(x=>x.realDeviceMeasured===false));
});

ok("Save migration regression checks historical snapshots without pretending production save evidence",()=>{
  const result=validateSaveMigrationRegression({targetVersion:3,snapshots:[{id:"v1",schemaVersion:1,data:{coins:1}},{id:"v2",schemaVersion:2,data:{coins:2,inventory:[]}}],migrate:(data,from)=>from===1?{...data,inventory:[]}:from===2?{...data,settings:{}}:data,validate:data=>Array.isArray(data.inventory)&&!!data.settings});
  assert.equal(result.passed,true);assert.equal(result.results.length,2);assert.ok(result.results.every(x=>x.targetVersion===3));assert.equal(result.productionSaveEvidence,false);
});

ok("Full autonomous development cycle produces a minimized repro, isolated cause, regression and review-only patch plan",()=>{
  const cycle=runAutonomousDevelopmentCycle({issue:{id:"gate_bug",type:"soft_lock",area:"movement",severity:"high"},bundle:{id:"gate_bug",seed:"cycle",initialState:{room:"gate"},actions,failure:"soft_lock"},fails,candidates:[{id:"movement_dash",area:"movement",prior:.7},{id:"camera",area:"camera",prior:.1}],testCandidate:c=>c.id==="movement_dash"?{resolved:1,observed:1}:{resolved:0,observed:1},expectedInvariant:"boss_reachable"});
  assert.equal(cycle.readyForReviewedFix,true);assert.equal(cycle.productionAutoPatch,false);assert.equal(cycle.productionReleaseAuthority,false);assert.equal(cycle.causes.ranked[0].id,"movement_dash");assert.equal(cycle.patch.autoApply,false);assert.equal(cycle.regression.requiredOnEveryChange,true);
});

ok("SoolenAI taxonomy, Readiness and Game Builder expose V3 without faking production evidence",()=>{
  const taxonomy=inferGameTaxonomy("Create an RPG and use Autonomous Development Agent to find root cause, minimal repro, regression suite and release blockers");
  assert.equal(taxonomy.autonomousDevelopment.matched,true);assert.ok(taxonomy.systems.some(x=>x.startsWith("AUTONOMOUS DEVELOPMENT AGENT V3:")));assert.match(taxonomy.brief,/Autonomous Development Agent V3:/);
  const readiness=currentGameCreatorEvidence();assert.equal(readiness.internalCoreScore,100);assert.equal(readiness.canClaimProduction100,false);for(const key of ["autonomousDevelopmentAgentV3","autonomousDevelopmentWorkbench"])assert.ok(GAME_CREATOR_READINESS_AREAS.internal.includes(key));
  const lab=fs.readFileSync("app/game-development-lab/page.js","utf8"),layout=fs.readFileSync("app/game-builder/layout.js","utf8");assert.match(lab,/Production auto-patching and production release authority remain disabled/i);assert.match(lab,/Delta Repro Minimizer/);assert.match(layout,/Development Agent V3/);
});
