import assert from "node:assert/strict";
import {GAME_WORLD_PLAYABLE_RUNTIME_V5,applyLocalRegenerationPatchV5,auditPlayableWorldRuntimeV5,compilePlayableWorldRuntimeV5,createLocalRegenerationPatchV5,createRuntimeNavGridV5,createTerrainRuntimeV5,findRuntimePathV5,stepPhysicsRuntimeV5} from "../lib/game/game-world-playable-runtime-v5.js";

let failures=0;
function ok(name,fn){try{fn();console.log(`✓ ${name}`);}catch(error){failures++;console.error(`✗ ${name}`);console.error(error);}}

ok("Playable Runtime V5 metadata keeps LIVE truth separate",()=>{
  assert.equal(GAME_WORLD_PLAYABLE_RUNTIME_V5.browserRendererImplemented,true);
  assert.equal(GAME_WORLD_PLAYABLE_RUNTIME_V5.webgl2Preferred,true);
  assert.equal(GAME_WORLD_PLAYABLE_RUNTIME_V5.thirdPartyPhysicsEngineBundled,false);
  assert.equal(GAME_WORLD_PLAYABLE_RUNTIME_V5.productionAutoWrite,false);
});

ok("Terrain chunk runtime is deterministic and device bounded",()=>{
  const a=createTerrainRuntimeV5({worldId:"test",seed:"seed",deviceClass:"balanced"});
  const b=createTerrainRuntimeV5({worldId:"test",seed:"seed",deviceClass:"balanced"});
  assert.deepEqual(a,b);assert.ok(a.chunks.length>0);assert.ok(a.chunks.length<=a.profile.maxChunks);assert.equal(a.streaming.eviction,"distance-lru");
});

ok("Runtime navigation executes deterministic A-star pathfinding",()=>{
  const terrain=createTerrainRuntimeV5({worldId:"test",seed:"laneriq-playable-v5",deviceClass:"balanced"});
  const nav=createRuntimeNavGridV5(terrain,{cellMeters:8});
  const path=findRuntimePathV5(nav,{x:1,z:1},{x:nav.cellsPerAxis-2,z:nav.cellsPerAxis-2});
  assert.ok(nav.cells.length>100);assert.ok(path.length>2);assert.deepEqual(path[0],{x:1,z:1});assert.deepEqual(path.at(-1),{x:nav.cellsPerAxis-2,z:nav.cellsPerAxis-2});
});

ok("Physics runtime bridge advances bodies without claiming third-party engine evidence",()=>{
  const runtime=compilePlayableWorldRuntimeV5({prompt:"Playable fantasy kingdom with castle village dungeon boss treasure",seed:"laneriq-playable-v5",deviceClass:"balanced",simulationBudget:16,hypothesisCount:2});
  const before=runtime.physics.bodies[0].position[1];
  const stepped=stepPhysicsRuntimeV5(runtime.physics,6);
  assert.ok(Number.isFinite(stepped.bodies[0].position[1]));assert.notEqual(stepped.bodies[0].position[1],before);assert.equal(runtime.physics.evidence.runtimeBridgeExecutable,true);assert.equal(runtime.physics.evidence.thirdPartyPhysicsVerified,false);
});

ok("Local regeneration changes only selected chunk and exposes undo",()=>{
  const runtime=compilePlayableWorldRuntimeV5({prompt:"Playable fantasy kingdom with castle village dungeon boss treasure",seed:"laneriq-playable-v5",deviceClass:"balanced",simulationBudget:16,hypothesisCount:2});
  const target=runtime.terrain.chunks[0],other=runtime.terrain.chunks[1];
  const patch=createLocalRegenerationPatchV5(runtime,{chunkId:target.id,operation:"raise-terrain",strength:2});
  const edited=applyLocalRegenerationPatchV5(runtime,patch);
  assert.notEqual(edited.terrain.chunks[0].heightSeed,target.heightSeed);assert.equal(edited.terrain.chunks[1].heightSeed,other.heightSeed);assert.equal(patch.requiresFullWorldRegeneration,false);assert.equal(patch.undo.supported,true);assert.equal(patch.productionWrite,false);
});

ok("Unified V5 compiler reaches 100 INTERNAL while LIVE evidence stays false",()=>{
  const runtime=compilePlayableWorldRuntimeV5({prompt:"Playable fantasy kingdom with castle village dungeon boss treasure companions dynamic weather",seed:"laneriq-playable-v5",deviceClass:"balanced",simulationBudget:24,hypothesisCount:3});
  const audit=auditPlayableWorldRuntimeV5(runtime);
  assert.equal(runtime.readiness.v4Internal100,true);assert.equal(audit.score,100);assert.equal(runtime.readiness.v5Internal100,true);assert.equal(runtime.readiness.internalScore,100);assert.equal(runtime.truth.browserRendererCodeImplemented,true);assert.equal(runtime.truth.webglContextRuntimeVerified,false);assert.equal(runtime.truth.realDeviceFpsVerified,false);assert.equal(runtime.truth.productionDeploymentVerified,false);
});

if(failures){console.error(`\n${failures} V5 test(s) failed.`);process.exit(1);}console.log("\nGame World Playable Runtime V5 contracts: 100 INTERNAL CODE");
