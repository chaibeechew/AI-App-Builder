import assert from "node:assert/strict";
import fs from "node:fs";
import {inferAdvancedGenreKnowledge,ADVANCED_GAME_GENRES} from "../lib/ai/advanced-game-genre-knowledge.js";
import {inferMobileGamePlan} from "../lib/ai/mobile-game-knowledge.js";
import {compileAdvancedGenreRuntimeV1,createAdvancedGenreState,stepStrategy,stepRacing,stepSimulation,playCard,stepSports,judgeRhythm,stepSurvival,ADVANCED_GENRE_RUNTIME_V1} from "../lib/game/advanced-genre-runtime-v1.js";

for(const id of ["strategy","racing","simulation","card","sports","rhythm","survival"]){assert.ok(ADVANCED_GAME_GENRES[id],`Missing knowledge: ${id}`);assert.ok(ADVANCED_GENRE_RUNTIME_V1.genres.includes(id),`Missing runtime: ${id}`);}
assert.equal(inferAdvancedGenreKnowledge("做一个三国 SLG 策略游戏","strategy").id,"strategy");
assert.equal(inferAdvancedGenreKnowledge("Create a racing game","racing").id,"racing");
assert.equal(inferAdvancedGenreKnowledge("模拟经营城市","simulation").id,"simulation");
assert.equal(inferAdvancedGenreKnowledge("卡牌 deck builder","card").id,"card");
assert.equal(inferAdvancedGenreKnowledge("football sports game","sports").id,"sports");
assert.equal(inferAdvancedGenreKnowledge("音乐节奏游戏","rhythm").id,"rhythm");
assert.equal(inferAdvancedGenreKnowledge("roguelite survival game","survival").id,"survival");

const strategy=compileAdvancedGenreRuntimeV1({name:"Empire",game:{archetype:"strategy"}});let ss=createAdvancedGenreState(strategy);ss={...ss,territory:2,army:20,enemyPower:1};ss=stepStrategy(ss,"attack");assert.equal(ss.status,"won");
const racing=compileAdvancedGenreRuntimeV1({name:"Track",game:{archetype:"racing"}});let rs=createAdvancedGenreState(racing);for(let i=0;i<8000&&rs.status==="playing";i++)rs=stepRacing(rs,{throttle:1,steer:0,brake:0},.05);assert.equal(rs.status,"won");assert.ok(rs.bestLap>0);
const sim=compileAdvancedGenreRuntimeV1({name:"Town",game:{archetype:"simulation"}});let ms=createAdvancedGenreState(sim);ms={...ms,population:79,capacity:100,happiness:90,cash:500};ms=stepSimulation(ms,"services");assert.equal(ms.status,"won");
const card=compileAdvancedGenreRuntimeV1({name:"Deck",game:{archetype:"card"}});let cs=createAdvancedGenreState(card);cs={...cs,enemyHp:1,hand:[1],mana:1};cs=playCard(cs,0);assert.equal(cs.status,"won");
const sports=compileAdvancedGenreRuntimeV1({name:"Match",game:{archetype:"sports"}});let ps=createAdvancedGenreState(sports);ps={...ps,clock:1,score:1,opponentScore:0};ps=stepSports(ps,"pass",2);assert.equal(ps.status,"won");
const rhythm=compileAdvancedGenreRuntimeV1({name:"Beat",game:{archetype:"rhythm"}});let ys=createAdvancedGenreState(rhythm);for(let i=0;i<24;i++)ys=judgeRhythm(ys,0);assert.equal(ys.status,"won");assert.equal(ys.bestCombo,24);
const survival=compileAdvancedGenreRuntimeV1({name:"Run",game:{archetype:"survival"}});let vs=createAdvancedGenreState(survival);vs={...vs,time:89.9,health:100};vs=stepSurvival(vs,"dodge",.2);assert.equal(vs.status,"won");

for(const [idea,id] of [["做一个历史 SLG 策略游戏","strategy"],["Create a racing mobile game","racing"],["做一个模拟经营城市游戏","simulation"],["做一个卡牌游戏","card"],["做一个足球体育游戏","sports"],["做一个音乐节奏游戏","rhythm"],["做一个生存 roguelite 游戏","survival"]]){const plan=inferMobileGamePlan(idea);assert.equal(plan.advancedGenre?.id,id,`Planner missing ${id}`);assert.ok(plan.systems.some(item=>item.startsWith(`${id.toUpperCase()}:`)));}

const page=fs.readFileSync("app/a/[id]/page.js","utf8");const client=fs.readFileSync("app/a/[id]/AdvancedGenreRuntimeClient.js","utf8");
assert.match(page,/AdvancedGenreRuntimeClient/);for(const id of ["strategy","racing","simulation","card","sports","rhythm","survival"]){assert.match(page,new RegExp(`${id}_runtime_view`));assert.match(client,new RegExp(id));}
assert.match(client,/iOS · Android · Web Preview/);assert.match(client,/Evidence-gated specialist runtime/);
console.log("✓ SLG/Strategy, Racing, Simulation/Tycoon, Card, Sports, Rhythm and Survival have dedicated knowledge, state machines, win/lose evidence and project-preview routing");
