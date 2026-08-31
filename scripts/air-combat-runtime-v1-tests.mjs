import assert from "node:assert/strict";
import fs from "node:fs";
import {RUNTIME_3D_FOUNDATION,createFlightBody,stepFlight3D,projectWorldPoint,cameraFromFlight} from "../lib/game/runtime-3d-foundation.js";
import {AIR_COMBAT_RUNTIME_V1,compileAirCombatRuntimeV1,createAirCombatMatch,fireTrainingBurst,stepAirCombatMatch,targetTelemetry} from "../lib/game/air-combat-runtime-v1.js";

assert.equal(RUNTIME_3D_FOUNDATION.zeroCost,true);
assert.equal(RUNTIME_3D_FOUNDATION.serverlessFunctionsAdded,0);
for(const system of ["3d-vectors","flight-kinematics","stall-model","energy-model","fixed-timestep","perspective-projection"])assert.ok(RUNTIME_3D_FOUNDATION.systems.includes(system),`Missing 3D foundation system ${system}`);

const body=createFlightBody({y:1000,speed:220,minSpeed:80,maxSpeed:420});
const flown=stepFlight3D(body,{throttle:.8,pitch:.3,roll:.2},1/60,{stallSpeed:85,ceiling:15000});
assert.ok(Number.isFinite(flown.position.x)&&Number.isFinite(flown.position.y)&&Number.isFinite(flown.position.z));
assert.ok(flown.energy>0);
const camera=cameraFromFlight(flown);const projected=projectWorldPoint({x:flown.position.x,y:flown.position.y,z:flown.position.z+1000},camera,{width:960,height:600});assert.ok(projected&&projected.depth>0);

const config=compileAirCombatRuntimeV1({name:"Sky Test",game:{enabled:true,archetype:"air_combat",genre:"Air Combat / Flight",aviation:{aiCount:3,targetCount:3}},designSystem:{}});
assert.equal(config.archetype,"air_combat");assert.equal(config.platforms.length,3);assert.equal(config.safety.publicKnowledgeOnly,true);assert.equal(config.safety.noClassifiedPerformance,true);assert.equal(config.safety.noRealAttackProcedure,true);assert.equal(config.safety.noWeaponConstruction,true);assert.equal(config.performance.targetFps,60);
for(const control of ["fire","target","pause","restart"])assert.ok(config.controls.buttons.includes(control));

let match=createAirCombatMatch(config,"deterministic-test");assert.equal(match.enemies.length,3);assert.equal(match.status,"playing");assert.equal(match.player.health,100);
const firstPositions=match.enemies.map(enemy=>[enemy.body.position.x,enemy.body.position.y,enemy.body.position.z]);const again=createAirCombatMatch(config,"deterministic-test");assert.deepEqual(again.enemies.map(enemy=>[enemy.body.position.x,enemy.body.position.y,enemy.body.position.z]),firstPositions);
match=stepAirCombatMatch(match,{pitch:.1,roll:.2,throttle:.8},1/60,config);assert.ok(match.time>0);assert.ok(match.player.position.y>=0);assert.ok(targetTelemetry(match));
const beforeShots=match.shots;match=fireTrainingBurst(match,config);assert.equal(match.shots,beforeShots+1);
assert.equal(AIR_COMBAT_RUNTIME_V1.liveOnline,false,"Air Combat V1 must not fake live online PvP");

const page=fs.readFileSync("app/a/[id]/page.js","utf8"),client=fs.readFileSync("app/a/[id]/AirCombatRuntimeClient.js","utf8");
assert.match(page,/AirCombatRuntimeClient/);assert.match(page,/air_combat_runtime_view/);assert.match(client,/AIR COMBAT RUNTIME V1/);assert.match(client,/Throttle/i);assert.match(client,/STALL/);assert.match(client,/TARGET/);assert.match(client,/FIRE/);assert.match(client,/iOS · Android · Web Preview/);assert.match(client,/Online PvP not claimed live/);

console.log("✓ Zero-cost 3D foundation provides deterministic flight kinematics, stall/energy behavior, camera and perspective projection without adding serverless functions");
console.log("✓ Air Combat Runtime V1 is a playable 3D bot-training foundation with mobile flight controls, HUD, targeting, abstract training fire, damage, mission state and 60fps budget");
console.log("✓ Air Combat remains truthfully bounded to public/non-classified game knowledge and does not claim live online PvP or real operational combat guidance");
