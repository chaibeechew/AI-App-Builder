import assert from "node:assert/strict";
import fs from "node:fs";
import {
  GAME_STUDIO_INTELLIGENCE_V1,inferGameStudioCapabilities,validateCinematicTimeline,createCharacterPreset,
  validateEquipmentLoadout,validateCombatSkillGraph,generateProceduralCity,sampleWaterSurface,
  validateVehicleAircraftConfig,createNpcDirector,stepNpcDirector,createDynamicEconomy,stepDynamicEconomy,
  validateSeasonPlan,analyzeBalanceMetrics,runAutonomousGameQaCycle
} from "../lib/game/game-studio-intelligence-v1.js";
import {inferGameTaxonomy} from "../lib/ai/game-taxonomy-knowledge.js";
import {currentGameCreatorEvidence,GAME_CREATOR_READINESS_AREAS} from "../lib/game/game-creator-readiness-v2.js";

for(const token of ["cinematic-timeline-editor","character-creator","inventory-equipment-editor","combat-skill-graph","procedural-city-building-generator","water-ocean-system","vehicle-aircraft-editor","ai-npc-director","dynamic-economy","live-events-season-system","analytics-balancing-ai","autonomous-game-qa-agent"]){
  assert.ok(GAME_STUDIO_INTELLIGENCE_V1.systems.includes(token),`Studio system missing ${token}`);
}
assert.equal(GAME_STUDIO_INTELLIGENCE_V1.deterministic,true);
assert.deepEqual(GAME_STUDIO_INTELLIGENCE_V1.targetPlatforms,["ios","android","web-preview"]);

const knowledge=inferGameStudioCapabilities("Create a game with cinematic timeline editor character creator inventory equipment editor combat skill graph procedural city building generator water ocean system vehicle aircraft editor NPC director dynamic economy live event season system balancing AI and autonomous game QA");
assert.equal(knowledge.matched,true);
for(const key of ["cinematic","character","equipment","skillGraph","city","water","vehicle","npcDirector","economy","season","balance","qa"])assert.equal(knowledge.wants[key],true,`Studio inference missing ${key}`);
assert.match(knowledge.truthRule,/production evidence/i);

const timeline=validateCinematicTimeline({id:"intro",tracks:[{id:"camera",type:"camera",clips:[{id:"shot1",start:0,duration:2,asset:"cam_a"}]},{id:"audio",type:"audio",clips:[{id:"music",start:0,duration:2,asset:"theme"}]}]});
assert.equal(timeline.valid,true);assert.equal(timeline.timeline.duration,2);
const unsafeTimeline=validateCinematicTimeline({tracks:[{id:"x",type:"camera",clips:[]}],externalScript:"eval('x')"});assert.equal(unsafeTimeline.valid,false);assert.ok(unsafeTimeline.errors.includes("timeline_executable_code_not_allowed"));

const characterA=createCharacterPreset({id:"hero",height:.6,build:.5,hair:"long"}),characterB=createCharacterPreset({id:"hero",height:.6,build:.5,hair:"long"});
assert.equal(characterA.biometricIdentity,false);assert.equal(characterA.checksum,characterB.checksum);

const loadout=validateEquipmentLoadout([{id:"helm",slot:"head",weight:3,stats:{armor:10}},{id:"blade",slot:"main_hand",weight:6,stats:{attack:30}}]);assert.equal(loadout.valid,true);assert.equal(loadout.items.length,2);
const badLoadout=validateEquipmentLoadout([{id:"a",slot:"head"},{id:"b",slot:"head"}]);assert.equal(badLoadout.valid,false);assert.ok(badLoadout.errors.includes("duplicate_slot:head"));

const skill=validateCombatSkillGraph({nodes:[{id:"in",type:"input",next:["damage"]},{id:"damage",type:"damage",value:100,next:["out"]},{id:"out",type:"output",next:[]}]});assert.equal(skill.valid,true);
const cyclic=validateCombatSkillGraph({nodes:[{id:"a",type:"input",next:["b"]},{id:"b",type:"damage",next:["a"]},{id:"out",type:"output",next:[]}]});assert.equal(cyclic.valid,false);assert.ok(cyclic.errors.includes("unsafe_skill_cycle"));

const cityA=generateProceduralCity({seed:"jade-city",blocks:9}),cityB=generateProceduralCity({seed:"jade-city",blocks:9});assert.equal(cityA.checksum,cityB.checksum);assert.deepEqual(cityA.blocks,cityB.blocks);
const ocean=sampleWaterSurface({time:2,wind:7,waveHeight:1.5,samples:12});assert.equal(ocean.points.length,12);assert.equal(ocean.rendererVerified,false);

const vehicle=validateVehicleAircraftConfig({id:"original_jet",type:"aircraft",mass:8000,maxSpeed:500,acceleration:20,turnRate:90,liftClass:.7});assert.equal(vehicle.valid,true);assert.match(vehicle.truth,/abstract balance parameters/i);
const invalidVehicle=validateVehicleAircraftConfig({type:"teleporter"});assert.equal(invalidVehicle.valid,false);

let director=createNpcDirector({maxActive:20,seed:"market"});director=stepNpcDirector(director,{population:200,hour:13,hotspots:["market","dock"]});assert.equal(director.npcs.length,20);assert.equal(director.tick,1);

let economy=createDynamicEconomy([{id:"iron",basePrice:20,supply:20,demand:100,floor:5,ceiling:60}]);const before=economy.goods[0].price;economy=stepDynamicEconomy(economy,{production:{iron:2},consumption:{iron:8}});assert.notEqual(economy.goods[0].price,before);assert.ok(economy.goods[0].price<=60&&economy.goods[0].price>=5);

const season=validateSeasonPlan({id:"s1",durationDays:30,events:[{id:"launch",day:0,reward:{type:"badge",amount:1}}]});assert.equal(season.valid,true);assert.equal(season.season.liveBackendConnected,false);
const p2w=validateSeasonPlan({id:"bad",durationDays:30,payToWin:true});assert.equal(p2w.valid,false);assert.ok(p2w.errors.includes("pay_to_win_season_not_allowed"));

const balance=analyzeBalanceMetrics([{id:"hero_a",matches:500,winRate:.61,pickRate:.3},{id:"hero_b",matches:10,winRate:.8,pickRate:.1}]);assert.ok(balance.issues.includes("high_win_rate:hero_a"));assert.ok(balance.issues.includes("low_sample:hero_b"));assert.equal(balance.productionRewriteAllowed,false);assert.equal(balance.requiresHumanReview,true);

const qa=runAutonomousGameQaCycle({scenario:{health:1,x:0},actions:["hit","move","move","move"],play:(s,a)=>a==="hit"?{...s,health:s.health-1}:a==="move"?{...s,x:s.x+1}:s,assertState:s=>s.health>0?true:"player_health_invalid",goal:s=>s.x>=3,diagnose:r=>r.issues.map(issue=>({issue,fix:issue.includes("health")?"increase scenario health":"review route"})),repair:(s,diagnosis)=>diagnosis.some(d=>d.issue.includes("health"))?{...s,health:2}:s,maxRounds:3});
assert.equal(qa.passed,true);assert.equal(qa.retested,true);assert.equal(qa.rounds.length,2);assert.equal(qa.rounds[0].result.passed,false);assert.equal(qa.rounds[1].result.passed,true);

const taxonomy=inferGameTaxonomy("Build a 3D RPG with character creator combat skill graph procedural city NPC director dynamic economy season system balancing AI and autonomous game QA");assert.equal(taxonomy.gameStudio.matched,true);assert.ok(taxonomy.systems.some(item=>item.startsWith("GAME STUDIO INTELLIGENCE:")));assert.match(taxonomy.brief,/Game Studio Intelligence:/);
const readiness=currentGameCreatorEvidence();assert.equal(readiness.internalCoreScore,100);for(const key of ["gameStudioIntelligenceSystems","gameStudioIntelligenceWorkbench"])assert.ok(GAME_CREATOR_READINESS_AREAS.internal.includes(key));assert.equal(readiness.canClaimProduction100,false);

const lab=fs.readFileSync("app/game-studio-lab/page.js","utf8");for(const token of ["GAME STUDIO INTELLIGENCE LAB","Cinematic / Timeline Editor","Character Creator","Inventory / Equipment Visual Editor","Combat Skill Graph","Procedural City / Building Generator","Water / Ocean System","Vehicle / Aircraft Editor","AI NPC Director","Dynamic Economy","Live Events / Season System","Analytics / Balancing AI","Autonomous Game QA Agent","Production evidence boundary"])assert.ok(lab.includes(token),`Studio lab missing ${token}`);
const builder=fs.readFileSync("app/game-builder/layout.js","utf8");assert.match(builder,/href="\/game-studio-lab"/);assert.match(builder,/Studio Intelligence Lab/);

console.log("✓ Game Studio Intelligence covers cinematics, character/loadout/skill authoring, city/ocean, vehicle/NPC, economy/seasons and balancing evidence");
console.log("✓ Autonomous Game QA demonstrates fail → diagnose → bounded repair → deterministic re-test success");
console.log("✓ SoolenAI taxonomy injects Studio Intelligence when requested and keeps production evidence boundaries explicit");
console.log("✓ Internal Game Creator 100 now requires Studio Intelligence systems/workbench while Production 100 remains externally gated");
