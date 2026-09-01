import assert from "node:assert/strict";
import fs from "node:fs";
import {buildMobaCapabilityPlan,isMobaIdea,MOBA_ROLES} from "../lib/ai/moba-knowledge.js";
import {inferMobileGamePlan} from "../lib/ai/mobile-game-knowledge.js";
import {MOBA_RUNTIME_V1,applyDamage,canCastAbility,castAbility,compileMobaRuntimeV1,createHeroState,createMatchState,grantExperience,markHeroDead,respawnHero,respawnSeconds,selectNearestEnemy,tickHero} from "../lib/game/moba-runtime-v1.js";
import {resolveGeneratedRuntime} from "../lib/game/game-runtime-router-v1.js";

assert.equal(isMobaIdea("Create an original 5v5 MOBA with three lanes"),true);
assert.equal(isMobaIdea("做一个类似王者荣耀类型但完全原创角色与地图的游戏"),true);
assert.equal(isMobaIdea("Create a single-player racing game"),false);
assert.ok(MOBA_ROLES.length>=6);

const plan=buildMobaCapabilityPlan("Create an original 5v5 MOBA with ranked mode and spectator support");
assert.equal(plan.matched,true);assert.equal(plan.archetype,"moba");assert.equal(plan.teamSize,5);assert.equal(plan.lanes,3);assert.equal(plan.features.ranked,true);assert.equal(plan.features.spectator,true);
for(const key of ["match","map","hero","combat","economy","lane","jungle","ai","controls","multiplayer","performance","safety"])assert.ok(Array.isArray(plan.systems[key])&&plan.systems[key].length>0,`Missing MOBA system ${key}`);
assert.match(plan.brief,/authoritative server/i);assert.match(plan.brief,/never copy protected characters/i);

const mobilePlan=inferMobileGamePlan("Build a 5v5 MOBA with original heroes and three lanes");
assert.equal(mobilePlan.genreId,"moba");assert.equal(mobilePlan.archetype,"moba");assert.equal(mobilePlan.multiplayer,true);assert.equal(mobilePlan.moba?.matched,true);assert.match(mobilePlan.brief,/MOBA ENGINEERING MODE/i);
const previewRoute=resolveGeneratedRuntime({productType:"mobile_game",game:{enabled:true,archetype:"moba",genre:"MOBA"}});assert.equal(previewRoute.runtimeId,"moba-runtime-v1");assert.equal(previewRoute.type,"moba");assert.equal(previewRoute.eventName,"moba_runtime_view");

const config=compileMobaRuntimeV1({name:"Nova Arena",game:{enabled:true,archetype:"moba",moba:{maxLevel:15}}});
assert.equal(MOBA_RUNTIME_V1.playableTrainingArena,true);assert.equal(MOBA_RUNTIME_V1.liveOnline,false);assert.equal(config.teamSize,5);assert.equal(config.lanes,3);assert.equal(config.hero.abilities.length,4);assert.equal(config.multiplayer.live,false);assert.equal(config.multiplayer.authoritativeServerRequired,true);assert.equal(config.performance.maxHeroes,10);assert.equal(config.originality.copyCommercialHeroes,false);

const match=createMatchState(config);assert.equal(match.heroes.length,10);assert.equal(match.heroes.filter(h=>h.team==="blue").length,5);assert.equal(match.heroes.filter(h=>h.team==="red").length,5);assert.equal(match.structures.towers.length,6);assert.equal(match.structures.blueCore.kind,"core");assert.equal(match.structures.redCore.kind,"core");

let hero=createHeroState(config,{id:"player",team:"blue",x:100,y:100,isPlayer:true});assert.equal(hero.armor,config.hero.armor);assert.equal(hero.resistance,config.hero.resistance);assert.equal(hero.attackDamage,config.hero.attackDamage);
const q=config.hero.abilities.find(a=>a.slot==="Q");assert.equal(canCastAbility(hero,q),true);const cast=castAbility(hero,q);assert.equal(cast.ok,true);assert.equal(cast.hero.resource,hero.resource-q.cost);assert.equal(cast.hero.cooldowns.Q,q.cooldown);assert.equal(canCastAbility(cast.hero,q),false);const cooled=tickHero(cast.hero,q.cooldown);assert.equal(canCastAbility(cooled,q),true);

const armored={...createHeroState(config,{id:"target",team:"red"}),armor:100,health:1000,maxHealth:1000};const hit=applyDamage(armored,100,{type:"physical",sourceId:"player"});assert.ok(hit.damage<100&&hit.damage>0,"Armor must reduce physical damage");assert.equal(hit.sourceId,"player");
const leveled=grantExperience(hero,1000,config.hero.maxLevel);assert.ok(leveled.level>1);assert.ok(leveled.attackDamage>hero.attackDamage);assert.ok(leveled.maxHealth>hero.maxHealth);assert.ok(respawnSeconds(10,600,config.hero.respawnBase)>respawnSeconds(1,0,config.hero.respawnBase));const dead=markHeroDead(hero,50,config.hero.respawnBase,300);assert.equal(dead.dead,true);assert.ok(dead.respawnAt>50);const revived=respawnHero(dead,config,{x:90,y:360});assert.equal(revived.dead,false);assert.equal(revived.health,revived.maxHealth);
const enemy=selectNearestEnemy({team:"blue",x:0,y:0},[{id:"a",team:"red",x:30,y:0,dead:false},{id:"b",team:"red",x:10,y:0,dead:false},{id:"c",team:"blue",x:1,y:0,dead:false}],100);assert.equal(enemy.id,"b");

const engine=fs.readFileSync("engine/autonomous-engine.js","utf8"),generatedPage=fs.readFileSync("app/a/[id]/page.js","utf8"),client=fs.readFileSync("app/a/[id]/MobaRuntimeClient.js","utf8");
assert.match(engine,/MOBA ENGINEERING MODE/);assert.match(engine,/game\.archetype to moba/);assert.match(engine,/Authoritative server required for real online PvP/);assert.match(generatedPage,/resolveGeneratedRuntime/);assert.match(generatedPage,/MobaRuntimeClient/);assert.match(client,/ORIGINAL 5v5 BOT TRAINING/);assert.match(client,/Online PvP: Not Connected/);assert.match(client,/minion waves/i);assert.match(client,/towers/i);assert.match(client,/team cores/i);assert.match(client,/Q \/ W \/ E \/ R/);assert.match(client,/requestAnimationFrame/);assert.match(client,/onPointerCancel/);

console.log("✓ SoolenAI detects MOBA/5v5 intent and switches to a dedicated original-first MOBA engineering plan");
console.log("✓ MOBA Runtime V1 provides hero stats/levels, QWER abilities, cooldowns/resources, damage mitigation, death/respawn and 5v5 match state foundations");
console.log("✓ Generated MOBA projects route through the shared Preview resolver to a dedicated 5v5 Bot Training Arena");
console.log("✓ Real online PvP remains truthfully gated behind an authoritative multiplayer/server contract and is not falsely claimed live");
