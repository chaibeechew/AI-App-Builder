import assert from "node:assert/strict";
import fs from "node:fs";
import {
  AUTONOMOUS_GAME_DEVELOPMENT_AGENT_V4,inferAutonomousDevelopmentV4Capabilities,bisectRegression,runMutationTesting,
  findCoverageGaps,analyzeObjectLifetimes,diagnoseNetworkDesync,detectReplayDivergence,bisectPerformanceRegression,
  generateCandidateCodePatch,runAutonomousDevelopmentV4Audit
} from "../lib/game/autonomous-game-development-agent-v4.js";
import {inferGameTaxonomy} from "../lib/ai/game-taxonomy-knowledge.js";
import {currentGameCreatorEvidence,GAME_CREATOR_READINESS_AREAS} from "../lib/game/game-creator-readiness-v2.js";

const ok=(name,fn)=>{fn();console.log(`✓ ${name}`);};

ok("V4 exposes bounded diagnostic intelligence with production writes disabled",()=>{
  assert.equal(AUTONOMOUS_GAME_DEVELOPMENT_AGENT_V4.deterministic,true);
  assert.equal(AUTONOMOUS_GAME_DEVELOPMENT_AGENT_V4.productionAutoPatch,false);
  assert.equal(AUTONOMOUS_GAME_DEVELOPMENT_AGENT_V4.productionReleaseAuthority,false);
  assert.equal(AUTONOMOUS_GAME_DEVELOPMENT_AGENT_V4.realDeviceEvidence,false);
  const inferred=inferAutonomousDevelopmentV4Capabilities("Run commit bisect, mutation testing, coverage gap, memory leak, network desync, replay divergence, performance regression and candidate patch analysis");
  assert.equal(inferred.matched,true);assert.match(inferred.truthRule,/autoApply=false/i);
});

ok("Cross-version bisect isolates the first known bad revision",()=>{
  const versions=["v1","v2","v3","v4","v5","v6","v7"];
  const result=bisectRegression({versions,probe:v=>Number(v.slice(1))<5});
  assert.equal(result.isolated,true);assert.equal(result.firstBad,"v5");assert.equal(result.lastKnownGood,"v4");assert.ok(result.tested.length<=5);
});

ok("Mutation testing reports survivors and coverage finder prioritizes high-risk gaps",()=>{
  const mutation=runMutationTesting({mutants:[{id:"m1",area:"combat"},{id:"m2",area:"save"},{id:"m3",area:"network"}],runTests:m=>({killed:m.id!=="m2",tests:["core"]})});
  assert.equal(mutation.total,3);assert.equal(mutation.killed,2);assert.equal(mutation.survived,1);assert.equal(mutation.survivors[0].id,"m2");
  const coverage=findCoverageGaps({requirements:[{id:"save",risk:"critical"},{id:"combat",risk:"high"},{id:"pause",risk:"low"}],tests:[{id:"combat_test",covers:["combat"]},{id:"pause_test",covers:["pause"]}]});
  assert.equal(coverage.covered,2);assert.equal(coverage.gaps.length,1);assert.equal(coverage.gaps[0].id,"save");assert.equal(coverage.highRiskGaps.length,1);
});

ok("Object lifetime analysis flags monotonic retained growth without claiming real-device proof",()=>{
  const memory=analyzeObjectLifetimes([
    {tick:0,objects:{Projectile:{count:4,bytes:1000},Enemy:{count:10,bytes:9000}}},
    {tick:1,objects:{Projectile:{count:12,bytes:3000},Enemy:{count:10,bytes:9000}}},
    {tick:2,objects:{Projectile:{count:24,bytes:6000},Enemy:{count:10,bytes:9000}}},
    {tick:3,objects:{Projectile:{count:36,bytes:9000},Enemy:{count:10,bytes:9000}}}
  ]);
  assert.equal(memory.possibleLeak,true);assert.equal(memory.suspects[0].type,"Projectile");assert.equal(memory.realDeviceHeapProfile,false);assert.match(memory.truth,/suspect, not proof/i);
});

ok("Network desync and replay divergence isolate the earliest divergent tick",()=>{
  const auth=[{tick:1,state:{x:1,hp:100},inputSeq:1},{tick:2,state:{x:2,hp:100},inputSeq:2},{tick:3,state:{x:3,hp:90},inputSeq:3}];
  const peer=[{tick:1,state:{x:1,hp:100},inputSeq:1},{tick:2,state:{x:2,hp:100},inputSeq:2},{tick:3,state:{x:3,hp:100},inputSeq:3}];
  const desync=diagnoseNetworkDesync({authoritativeFrames:auth,peerFrames:peer});assert.equal(desync.desynced,true);assert.equal(desync.firstDivergence.tick,3);assert.ok(desync.firstDivergence.differences.some(x=>x.field==="hp"));assert.equal(desync.rootCauseProven,false);
  const replay=detectReplayDivergence({baselineFrames:[{tick:1,state:{x:1},rng:1},{tick:2,state:{x:2},rng:2},{tick:3,state:{x:3},rng:3}],replayFrames:[{tick:1,state:{x:1},rng:1},{tick:2,state:{x:2},rng:2},{tick:3,state:{x:2.9},rng:3}]});assert.equal(replay.diverged,true);assert.equal(replay.tick,3);
});

ok("Performance regression bisect isolates the first over-budget version and remains synthetic",()=>{
  const versions=[{id:"p1",frame:13},{id:"p2",frame:14},{id:"p3",frame:15},{id:"p4",frame:18},{id:"p5",frame:21}];
  const perf=bisectPerformanceRegression({versions,metric:v=>v.frame,budget:16.7});assert.equal(perf.firstBad,"p4");assert.equal(perf.lastKnownGood,"p3");assert.equal(perf.syntheticEvidence,true);assert.equal(perf.realDevicePerformanceEvidence,false);
});

ok("Candidate patches remain review-gated and never become applied diffs",()=>{
  const patch=generateCandidateCodePatch({issue:{id:"desync",type:"network_desync",area:"multiplayer"},rootCause:{area:"multiplayer",status:"isolated"},evidence:{tick:33},files:["lib/game/multiplayer-authority-v1.js"]});
  assert.equal(patch.autoApply,false);assert.equal(patch.productionWrite,false);assert.equal(patch.requiresReview,true);assert.equal(patch.diffPreview,null);assert.match(patch.truth,/not an applied Git diff/i);
});

ok("V4 audit combines diagnostic blockers while preserving production authority boundaries",()=>{
  const audit=runAutonomousDevelopmentV4Audit({
    versions:[{id:"a",good:true,frame:14},{id:"b",good:true,frame:15},{id:"c",good:false,frame:19}],versionProbe:v=>v.good,
    mutants:[{id:"m1",area:"combat"}],runMutantTests:()=>({killed:true,tests:["combat"]}),requirements:[{id:"combat",risk:"high"}],tests:[{id:"combat_test",covers:["combat"]}],
    lifetimes:[{tick:0,objects:{Enemy:{count:10,bytes:1000}}},{tick:1,objects:{Enemy:{count:10,bytes:1000}}},{tick:2,objects:{Enemy:{count:10,bytes:1000}}}],
    authoritativeFrames:[{tick:1,state:{x:1}}],peerFrames:[{tick:1,state:{x:1}}],baselineReplay:[{tick:1,state:{x:1}}],replay:[{tick:1,state:{x:1}}],performanceMetric:v=>v.frame,performanceBudget:16.7
  });
  assert.equal(audit.passed,false);assert.ok(audit.blockers.includes("regression:c"));assert.ok(audit.blockers.includes("performance_regression:c"));assert.equal(audit.productionAutoPatch,false);assert.equal(audit.productionReleaseAuthority,false);
});

ok("SoolenAI taxonomy, readiness and Game Builder expose V4 without faking production evidence",()=>{
  const taxonomy=inferGameTaxonomy("Create an action RPG and run commit bisect, mutation testing, coverage gap, network desync, replay divergence, memory leak and performance regression analysis with candidate patches");
  assert.equal(taxonomy.autonomousDevelopmentV4.matched,true);assert.ok(taxonomy.systems.some(x=>x.startsWith("AUTONOMOUS DEVELOPMENT AGENT V4:")));assert.match(taxonomy.brief,/Autonomous Development Agent V4:/);
  const readiness=currentGameCreatorEvidence();assert.equal(readiness.internalCoreScore,100);assert.equal(readiness.canClaimProduction100,false);for(const key of ["autonomousDevelopmentAgentV4","autonomousDevelopmentV4Workbench"])assert.ok(GAME_CREATOR_READINESS_AREAS.internal.includes(key));
  const lab=fs.readFileSync("app/game-autonomy-v4-lab/page.js","utf8"),layout=fs.readFileSync("app/game-builder/layout.js","utf8");assert.match(lab,/Cross-version Regression Bisect/);assert.match(lab,/production auto-patching and release authority remain disabled/i);assert.match(layout,/Development Agent V4/);
});
