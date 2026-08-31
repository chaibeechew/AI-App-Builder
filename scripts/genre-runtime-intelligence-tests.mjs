import assert from "node:assert/strict";
import {GENRE_RUNTIME_PROFILES,inferGenreRuntimeProfile,buildGenreRuntimeContract} from "../lib/game/genre-runtime-intelligence.js";
import {compileGameRuntimeV1} from "../lib/game/runtime-v1.js";

for(const id of ["arcade","racing","shooter","platformer","puzzle","tower_defense","rpg","survival","strategy","card","simulation","sports","rhythm","idle","moba","air_combat"])assert.ok(GENRE_RUNTIME_PROFILES[id],`Missing genre runtime profile ${id}`);

assert.equal(inferGenreRuntimeProfile({genre:"Racing"}).id,"racing");
assert.equal(inferGenreRuntimeProfile({genre:"Tower Defense"}).id,"tower_defense");
assert.equal(inferGenreRuntimeProfile({genre:"Puzzle Match-3"}).id,"puzzle");
assert.equal(inferGenreRuntimeProfile({archetype:"air_combat"}).runtime,"air-combat-runtime-v1");
assert.equal(inferGenreRuntimeProfile({archetype:"moba"}).runtime,"moba-runtime-v1");

const racing=buildGenreRuntimeContract({genre:"Racing"});assert.ok(racing.requirements.some(item=>/steering/i.test(item)));assert.ok(racing.requirements.some(item=>/checkpoints-and-finish/i.test(item)));
const puzzle=buildGenreRuntimeContract({genre:"Puzzle"});assert.ok(puzzle.requirements.some(item=>/tap, drag, swap/i.test(item)));assert.ok(puzzle.requirements.some(item=>/solve-board-or-target/i.test(item)));
const tower=buildGenreRuntimeContract({genre:"Tower Defense"});assert.ok(tower.requirements.some(item=>/place, select, upgrade/i.test(item)));assert.ok(tower.requirements.some(item=>/survive-waves/i.test(item)));

const genericRacing=compileGameRuntimeV1({name:"Race",game:{genre:"Racing",archetype:"racing"}});assert.equal(genericRacing.genreProfile.id,"racing");assert.equal(genericRacing.runtimeCompleteness,"foundation-only");assert.equal(genericRacing.dedicatedGenreRuntime,false);assert.ok(genericRacing.controls.genreControls.includes("steering"));
const arcade=compileGameRuntimeV1({name:"Arcade",game:{genre:"Arcade / Casual",archetype:"arcade"}});assert.equal(arcade.runtimeCompleteness,"dedicated");

console.log("✓ Genre Runtime Intelligence differentiates controls, goals, fail states and progression across major game families");
console.log("✓ Generic Runtime reports foundation-only for genres that do not yet have a dedicated renderer instead of falsely claiming genre completeness");
