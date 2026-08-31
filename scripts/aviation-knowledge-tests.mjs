import assert from "node:assert/strict";
import fs from "node:fs";
import {AIRCRAFT_CATALOG_SEED,AIRCRAFT_ROLES,AVIATION_ERAS,buildAviationCapabilityPlan,isAirCombatIdea,searchAircraftKnowledge} from "../lib/ai/aviation-knowledge.js";
import {inferMobileGamePlan} from "../lib/ai/mobile-game-knowledge.js";

assert.equal(isAirCombatIdea("Create a modern fighter jet air combat game"),true);
assert.equal(isAirCombatIdea("做一个二战飞机空战游戏"),true);
assert.equal(isAirCombatIdea("Build a property CRM"),false);

assert.ok(AIRCRAFT_CATALOG_SEED.length>=50,"Aviation catalog should seed at least 50 representative public aircraft references");
for(const era of ["ww2","early_jet","cold_war","modern"])assert.ok(AVIATION_ERAS.some(item=>item.id===era),`Missing aviation era ${era}`);
for(const role of ["fighter","multirole","bomber","transport","airborne-early-warning","tanker","helicopter","uav","civil-airliner","general-aviation"])assert.ok(AIRCRAFT_ROLES.includes(role),`Missing aviation role ${role}`);

assert.ok(searchAircraftKnowledge("F-16").some(item=>item.id==="f16"));
assert.ok(searchAircraftKnowledge("Spitfire").some(item=>item.id==="spitfire"));
assert.ok(searchAircraftKnowledge("A320").some(item=>item.id==="a320"));
assert.ok(searchAircraftKnowledge("helicopter").some(item=>item.role==="helicopter"));

const plan=buildAviationCapabilityPlan("Create a realistic 3D multiplayer modern fighter jet air combat simulator with carrier operations, weather and AI pilots");
assert.equal(plan.matched,true);
assert.equal(plan.archetype,"air_combat");
assert.equal(plan.dimensions,"3d-capable");
assert.equal(plan.simulation,true);
assert.equal(plan.multiplayer,true);
assert.equal(plan.carrier,true);
assert.ok(plan.catalogSeed.length>=50);
assert.ok(plan.knowledge.physics.some(item=>/angle of attack/i.test(item)));
assert.ok(plan.knowledge.physics.some(item=>/energy management/i.test(item)));
assert.ok(plan.knowledge.avionics.some(item=>/radar/i.test(item)));
assert.ok(plan.knowledge.damage.some(item=>/engine damage/i.test(item)));
assert.ok(plan.knowledge.environment.some(item=>/cloud/i.test(item)));
assert.ok(plan.knowledge.ai.some(item=>/formation/i.test(item)));
assert.ok(plan.knowledge.controls.some(item=>/touch/i.test(item)));
assert.ok(plan.knowledge.performance.some(item=>/60fps/i.test(item)));
assert.match(plan.brief,/public non-classified/i);
assert.match(plan.brief,/classified performance/i);
assert.match(plan.brief,/weapon-construction instructions/i);

const game=inferMobileGamePlan("Build a realistic fighter jet air combat game for iPhone and Android with carrier operations and weather");
assert.equal(game.matched,true);
assert.equal(game.genreId,"air_combat");
assert.equal(game.archetype,"air_combat");
assert.equal(game.dimensions,"3d-capable");
assert.equal(game.aviation?.matched,true);
assert.ok(game.screens.includes("Hangar / aircraft select"));
assert.ok(game.screens.includes("Flight HUD / instruments"));
assert.ok(game.systems.some(item=>item.startsWith("AVIATION:")));

const engine=fs.readFileSync("engine/autonomous-engine.js","utf8");
const builder=fs.readFileSync("app/game-builder/page.js","utf8");
assert.match(engine,/AVIATION \/ AIR COMBAT ENGINEERING MODE/);
assert.match(engine,/game\.archetype to air_combat/);
assert.match(engine,/mergeAviationSpecification/);
assert.match(engine,/catalogSeedCount/);
assert.match(builder,/Air Combat \/ Flight/);
assert.match(builder,/Aviation Knowledge Core/);
assert.match(builder,/50\+ Public Aircraft References/);

console.log(`✓ SoolenAI Aviation Knowledge Core seeds ${AIRCRAFT_CATALOG_SEED.length} representative public aircraft references and remains extensible`);
console.log("✓ Air Combat Engineering Mode covers flight physics, eras/roles, avionics, damage, weather, missions, AI pilots, mobile controls and performance");
console.log("✓ Air-combat projects are classified as 3D-capable air_combat specifications instead of generic shooters");
console.log("✓ Aviation knowledge is explicitly limited to public/non-classified game-development context and excludes weapon construction or real attack procedures");
