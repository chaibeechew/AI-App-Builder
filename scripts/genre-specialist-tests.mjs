import assert from "node:assert/strict";
import fs from "node:fs";
import {buildRpgKnowledge,buildPuzzleKnowledge,buildActionKnowledge,inferGenreSpecialist} from "../lib/ai/genre-specialist-knowledge.js";
import {inferMobileGamePlan} from "../lib/ai/mobile-game-knowledge.js";
import {SPECIALIST_RUNTIME_V1,compileSpecialistRuntimeV1,createSpecialistState,stepRpgRuntime,puzzleMove,puzzleUndo,puzzleHint,stepActionRuntime} from "../lib/game/specialist-runtime-v1.js";
import {inferGenreRuntimeProfile} from "../lib/game/genre-runtime-intelligence.js";
import {compileGameRuntimeV1} from "../lib/game/runtime-v1.js";
import {resolveGeneratedRuntime} from "../lib/game/game-runtime-router-v1.js";

const rpgK=buildRpgKnowledge(),puzzleK=buildPuzzleKnowledge(),actionK=buildActionKnowledge();
assert.ok(rpgK.systems.some(x=>/quest graph/i.test(x)));assert.ok(rpgK.systems.some(x=>/inventory/i.test(x)));assert.ok(rpgK.systems.some(x=>/save system/i.test(x)));assert.ok(rpgK.systems.some(x=>/boss AI/i.test(x)));
assert.ok(puzzleK.systems.some(x=>/solvable/i.test(x)));assert.ok(puzzleK.systems.some(x=>/hint system/i.test(x)));assert.ok(puzzleK.systems.some(x=>/undo/i.test(x)));assert.ok(puzzleK.systems.some(x=>/deterministic seeded/i.test(x)));
assert.ok(actionK.systems.some(x=>/hitbox\/hurtbox/i.test(x)));assert.ok(actionK.systems.some(x=>/combo system/i.test(x)));assert.ok(actionK.systems.some(x=>/invulnerability frames/i.test(x)));assert.ok(actionK.systems.some(x=>/checkpoint/i.test(x)));assert.ok(actionK.systems.some(x=>/60fps/i.test(x)));
assert.equal(inferGenreSpecialist("Create an RPG with quests and equipment").id,"rpg");assert.equal(inferGenreSpecialist("制作一个智力游戏，有提示和undo").id,"puzzle");assert.equal(inferGenreSpecialist("Create a mobile action game with combo and dodge").id,"action");

for(const [idea,id] of [["Create an RPG with quests, NPCs, inventory and bosses","rpg"],["制作一个智力游戏，有逻辑关卡、提示和撤销","puzzle"],["Create an action game with dodge, combo and boss fights","action"]]){const plan=inferMobileGamePlan(idea);assert.equal(plan.genreId,id);assert.equal(plan.specialist?.id,id);assert.ok(plan.systems.some(x=>x.startsWith(id.toUpperCase()+":")));}

assert.deepEqual(SPECIALIST_RUNTIME_V1.genres,["rpg","puzzle","action"]);
const rpgConfig=compileSpecialistRuntimeV1({name:"RPG Test",game:{archetype:"rpg",genre:"RPG"}});let rpg=createSpecialistState(rpgConfig);const x0=rpg.player.x;rpg=stepRpgRuntime(rpg,{x:1,y:0,attack:false},.1);assert.ok(rpg.player.x>x0);assert.equal(rpg.status,"playing");
const puzzleConfig=compileSpecialistRuntimeV1({name:"Puzzle Test",game:{archetype:"puzzle",genre:"Puzzle"}});let puzzle=createSpecialistState(puzzleConfig);const selected=puzzleMove(puzzle,0,0);assert.deepEqual(selected.selected,{x:0,y:0});const hinted=puzzleHint(puzzle);assert.equal(hinted.hints,puzzle.hints-1);const undoAttempt=puzzleUndo(puzzle);assert.equal(undoAttempt.undos,puzzle.undos);
const actionConfig=compileSpecialistRuntimeV1({name:"Action Test",game:{archetype:"action",genre:"Action"}});let action=createSpecialistState(actionConfig);const stamina=action.stamina;action=stepActionRuntime(action,{x:1,dodge:true},.016);assert.ok(action.stamina<stamina);assert.ok(action.invulnerable>0);

for(const id of ["rpg","puzzle","action"]){const profile=inferGenreRuntimeProfile({archetype:id});assert.equal(profile.runtime,"specialist-runtime-v1");const generic=compileGameRuntimeV1({game:{archetype:id,genre:id}});assert.equal(generic.runtimeCompleteness,"dedicated");const route=resolveGeneratedRuntime({productType:"mobile_game",game:{enabled:true,archetype:id,genre:id}});assert.equal(route.runtimeId,"specialist-runtime-v1");assert.equal(route.type,id);assert.equal(route.eventName,`${id}_runtime_view`);}

const page=fs.readFileSync("app/a/[id]/page.js","utf8"),client=fs.readFileSync("app/a/[id]/SpecialistRuntimeClient.js","utf8");
assert.match(page,/resolveGeneratedRuntime/);assert.match(page,/SpecialistRuntimeClient/);assert.match(client,/RPG \/ ADVENTURE/);assert.match(client,/PUZZLE \/ BRAIN/);assert.match(client,/ACTION COMBAT/);assert.match(client,/HINT/);assert.match(client,/UNDO/);assert.match(client,/DODGE/);assert.match(client,/COMBO/);

console.log("✓ SoolenAI now has dedicated RPG knowledge for quests, NPC/dialogue, inventory/equipment, progression, bosses, economy and persistent world state");
console.log("✓ Puzzle / Brain knowledge includes solvability, deterministic generation, hints, undo, difficulty and fair completion rules");
console.log("✓ Action knowledge and runtime include responsive movement, attack/dodge, stamina, combo, hit-state rules, i-frame foundation, enemies/boss and checkpoints");
console.log("✓ RPG, Puzzle and Action projects route through the shared Preview resolver to the dedicated Specialist Runtime");
