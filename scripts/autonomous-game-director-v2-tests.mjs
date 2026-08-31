import assert from "node:assert/strict";
import fs from "node:fs";
import {
  AUTONOMOUS_GAME_DIRECTOR_V2,inferAutonomousGameDirectorCapabilities,generateTestRoutes,evaluateBossStrategies,
  stressEconomy,detectSoftLocks,detectInfiniteLoops,recoverSaveSnapshot,runInputFuzz,runLongSimulation,
  analyzeDifficultyCurve,proposeRepairSuggestions,runAutonomousDirectorAudit
} from "../lib/game/autonomous-game-director-v2.js";
import {inferGameTaxonomy} from "../lib/ai/game-taxonomy-knowledge.js";
import {currentGameCreatorEvidence,GAME_CREATOR_READINESS_AREAS} from "../lib/game/game-creator-readiness-v2.js";

const ok=(name,fn)=>{fn();console.log(`✓ ${name}`);};

ok("Autonomous Game Director V2 exposes bounded deterministic QA/search contracts with production auto-patch disabled",()=>{
  assert.equal(AUTONOMOUS_GAME_DIRECTOR_V2.deterministic,true);
  assert.equal(AUTONOMOUS_GAME_DIRECTOR_V2.maxSimulationRuns,10000);
  assert.equal(AUTONOMOUS_GAME_DIRECTOR_V2.maxFuzzSteps,10000);
  assert.equal(AUTONOMOUS_GAME_DIRECTOR_V2.productionAutoPatch,false);
  const inferred=inferAutonomousGameDirectorCapabilities("Run autonomous QA, soft-lock search, fuzz testing, 10000 long-run simulations and difficulty curve analysis");
  assert.equal(inferred.matched,true);assert.match(inferred.truthRule,/Production auto-patching stays disabled/i);
});

ok("Route generation, Boss strategy matrix and economy abuse tests execute with bounded evidence",()=>{
  const routes=generateTestRoutes({nodes:["start","a","b","goal1","goal2"],edges:[{from:"start",to:"a"},{from:"a",to:"goal1"},{from:"start",to:"b"},{from:"b",to:"goal2"}],start:"start",goals:["goal1","goal2"]});
  assert.equal(routes.complete,true);assert.equal(routes.missingGoals.length,0);assert.equal(routes.nodeCoverage,100);
  const boss=evaluateBossStrategies({boss:{hp:100,phases:[.5]},strategies:[{id:"fast",damage:30},{id:"safe",damage:20}],simulate:(s,strategy)=>({...s,bossHp:s.bossHp-strategy.damage,playerHp:s.playerHp-4})});
  assert.equal(boss.impossible,false);assert.ok(boss.results.every(r=>r.won));
  const economy=stressEconomy({baseState:{goods:[{id:"ore",price:10,floor:2,ceiling:30,supply:100,demand:100}]},step:(state,input)=>({goods:state.goods.map(g=>{const supply=Math.max(1,g.supply*(input.supplyMultiplier||1)),demand=g.demand*(input.demandMultiplier||1);return{...g,supply,demand,price:Math.max(g.floor,Math.min(g.ceiling,g.price*(demand/supply)))};})}),maxTicks:12});
  assert.equal(economy.passed,true);assert.equal(economy.exploitRisks.length,0);
});

ok("Soft-lock and infinite-loop detection find non-progress states",()=>{
  const locks=detectSoftLocks({states:["start","safe","trap","ending"],transitions:[{from:"start",to:"safe"},{from:"safe",to:"ending"},{from:"start",to:"trap"}],terminalStates:["ending"]});
  assert.equal(locks.passed,false);assert.ok(locks.softLocks.includes("trap"));
  const loop=detectInfiniteLoops({initialState:{room:"a",progress:0},actions:["next"],applyAction:s=>({room:s.room==="a"?"b":"a",progress:s.progress}),progress:s=>s.progress,maxSteps:20});
  assert.equal(loop.loop,true);assert.ok(loop.detectedAt<=3);
});

ok("Save recovery, seeded fuzzing and 10,000-run simulation are reproducible and bounded",()=>{
  const save=recoverSaveSnapshot({schemaVersion:1,data:{coins:4},checksum:"bad"},{schemaVersion:2,defaults:{coins:0,inventory:[]},migrate:(data,from)=>from===1?{...data,inventory:[]}:data});
  assert.equal(save.recoveredFromCorruption,true);assert.equal(save.schemaVersion,2);assert.deepEqual(save.data.inventory,[]);assert.ok(save.errors.includes("checksum_mismatch"));
  const fuzzCase={seed:"repeatable",actions:["left","right"],steps:100000,initialState:{x:0},applyAction:(s,a)=>({...s,x:s.x+(a==="right"?1:-1)}),invariant:s=>Number.isFinite(s.x)};
  const fuzzA=runInputFuzz(fuzzCase),fuzzB=runInputFuzz(fuzzCase);assert.deepEqual(fuzzA,fuzzB);assert.equal(fuzzA.stepsExecuted,10000);assert.equal(fuzzA.passed,true);
  const sim=runLongSimulation({seed:"ten-k",runs:50000,simulateRun:({rng})=>({win:rng()>.45,duration:100+rng()*50,score:rng()*1000,failureReason:"none",economy:rng()*50})});
  assert.equal(sim.runs,10000);assert.equal(sim.syntheticEvidence,true);assert.equal(sim.productionTelemetry,false);assert.ok(sim.winRate>0&&sim.winRate<1);
});

ok("Difficulty analysis and autonomous audit produce review-gated repair suggestions",()=>{
  const curve=analyzeDifficultyCurve([{id:"1",difficulty:20,completionRate:.92,attempts:200},{id:"2",difficulty:30,completionRate:.86,attempts:200},{id:"3",difficulty:75,completionRate:.35,attempts:200}]);
  assert.equal(curve.passed,false);assert.ok(curve.issues.some(x=>x.type==="difficulty_spike"&&x.severity==="high"));
  const audit=runAutonomousDirectorAudit({routeGraph:{nodes:["start","boss","ending"],edges:[{from:"start",to:"boss"}],start:"start",goals:["ending"]},stateGraph:{states:["start","trap","ending"],transitions:[{from:"start",to:"trap"}],terminalStates:["ending"]},difficulty:[{id:"a",difficulty:20,completionRate:.9,attempts:100},{id:"b",difficulty:80,completionRate:.3,attempts:100}]});
  assert.equal(audit.passed,false);assert.equal(audit.productionAutoPatch,false);assert.ok(audit.repairs.length>=3);assert.ok(audit.repairs.every(r=>r.autoApply===false&&r.requiresReview===true));
  const repairs=proposeRepairSuggestions(["soft_lock:trap","infinite_loop:x","checksum_mismatch","difficulty_spike"]);assert.equal(repairs.length,4);
});

ok("SoolenAI taxonomy, Readiness and Game Builder expose Autonomous Director V2 without faking production evidence",()=>{
  const taxonomy=inferGameTaxonomy("Create an RPG with autonomous QA, soft-lock search, fuzz testing, save corruption recovery, 10000 simulations and difficulty curve analysis");
  assert.equal(taxonomy.autonomousDirector.matched,true);assert.ok(taxonomy.systems.some(x=>x.startsWith("AUTONOMOUS GAME DIRECTOR V2:")));assert.match(taxonomy.brief,/Autonomous Game Director V2:/);
  const readiness=currentGameCreatorEvidence();assert.equal(readiness.internalCoreScore,100);assert.equal(readiness.canClaimProduction100,false);for(const key of ["autonomousGameDirectorV2","autonomousQaWorkbench"])assert.ok(GAME_CREATOR_READINESS_AREAS.internal.includes(key));
  const lab=fs.readFileSync("app/game-autonomy-lab/page.js","utf8"),layout=fs.readFileSync("app/game-builder/layout.js","utf8");assert.match(lab,/10,000-run simulation/);assert.match(lab,/production auto-patching is disabled/i);assert.match(layout,/Autonomous Director V2/);
});
