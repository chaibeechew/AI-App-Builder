import assert from "node:assert/strict";
import fs from "node:fs";
import {
  ADVANCED_3D_GAMEPLAY_V1,inferAdvanced3dGameplayCapabilities,createBossCombatRuntime,stepBossCombat,validateBehaviorTree,tickBehaviorTree,
  planGroupNavigation,validateTalentTree,createTalentState,unlockTalent,rollItemAffixes,rollLootTable,validateDialogueGraph,dialogueChoices,
  createWorldTimeWeather,stepWorldTimeWeather,worldLightingState,generateDungeon,createDestructible,damageDestructible,
  validateCutsceneTimeline,cutsceneStateAt,createCameraDirector,directCamera,validateUgcSceneDocument
} from "../lib/game/advanced-3d-gameplay-systems-v1.js";
import {inferGameTaxonomy} from "../lib/ai/game-taxonomy-knowledge.js";
import {currentGameCreatorEvidence,GAME_CREATOR_READINESS_AREAS} from "../lib/game/game-creator-readiness-v2.js";

assert.equal(ADVANCED_3D_GAMEPLAY_V1.deterministic,true);
for(const token of ["boss-combat-runtime","behavior-tree","group-navigation","talent-tree","item-affixes","loot-table","dialogue-graph","day-night-weather","dungeon-generation","destructible-environment","cutscene-timeline","camera-director","ugc-scene-document"])assert.ok(ADVANCED_3D_GAMEPLAY_V1.systems.includes(token),`Missing advanced 3D system ${token}`);
const knowledge=inferAdvanced3dGameplayCapabilities("Create a 3D open-world RPG with boss behavior tree squad AI talent tree random loot dialogue weather dungeon destructible environment cutscenes and UGC scene editor");
assert.equal(knowledge.matched,true);for(const key of ["boss","behavior","groupAi","talent","loot","dialogue","weather","dungeon","destructible","cutscene","sceneEditor"])assert.equal(knowledge.wants[key],true,`Knowledge did not infer ${key}`);

let boss=createBossCombatRuntime({maxHealth:1000,phases:[.75,.5,.25]});boss=stepBossCombat(boss,{damage:300},.1);assert.equal(boss.phase,2);boss=stepBossCombat(boss,{damage:260,interrupt:true},.1);assert.equal(boss.phase,3);boss=stepBossCombat(boss,{damage:500},.1);assert.equal(boss.status,"defeated");assert.equal(boss.victory,true);

const tree={root:"root",nodes:[{id:"root",type:"selector",children:["attack","patrol"]},{id:"attack",type:"sequence",children:["near","strike"]},{id:"near",type:"condition"},{id:"strike",type:"action"},{id:"patrol",type:"action"}]};assert.equal(validateBehaviorTree(tree).valid,true);const tick=tickBehaviorTree(tree,{near:true},{condition:(n,c)=>n.id==="near"&&c.near,action:()=>"success"});assert.equal(tick.status,"success");assert.ok(tick.trace.includes("strike"));
const formation=planGroupNavigation([{id:"a",x:0,z:0},{id:"b",x:.3,z:.2},{id:"c",x:1,z:1}],{x:10,z:10});assert.equal(formation.length,3);assert.ok(formation.every(row=>row.bounded===true));

const talentTree=[{id:"power",cost:1,requires:[]},{id:"meteor",cost:2,requires:["power"]}];assert.equal(validateTalentTree(talentTree).valid,true);let talent=createTalentState(3);let unlocked=unlockTalent(talent,talentTree,"meteor");assert.equal(unlocked.ok,false);unlocked=unlockTalent(talent,talentTree,"power");assert.equal(unlocked.ok,true);talent=unlocked.state;unlocked=unlockTalent(talent,talentTree,"meteor");assert.equal(unlocked.ok,true);assert.equal(unlocked.state.points,0);
const affixA=rollItemAffixes({seed:"same",rarity:"epic"}),affixB=rollItemAffixes({seed:"same",rarity:"epic"});assert.deepEqual(affixA,affixB);assert.equal(affixA.affixes.length,3);const lootA=rollLootTable([{id:"gold",weight:80,min:10,max:20},{id:"gem",weight:20,min:1,max:2}],{seed:"boss-1",rolls:4}),lootB=rollLootTable([{id:"gold",weight:80,min:10,max:20},{id:"gem",weight:20,min:1,max:2}],{seed:"boss-1",rolls:4});assert.deepEqual(lootA,lootB);

const dialogue=[{id:"start",choices:[{label:"Continue",next:"end"},{label:"Secret",next:"secret",condition:"trusted"}]},{id:"end",terminal:true,choices:[]},{id:"secret",terminal:true,choices:[]}];assert.equal(validateDialogueGraph(dialogue).valid,true);assert.equal(dialogueChoices(dialogue,"start",{trusted:false}).length,1);assert.equal(dialogueChoices(dialogue,"start",{trusted:true}).length,2);assert.equal(validateDialogueGraph([{id:"broken",choices:[]}]).valid,false);

let world=createWorldTimeWeather({hour:19,weather:"clear"});world=stepWorldTimeWeather(world,{dtSeconds:12,timeScale:600});const lighting=worldLightingState(world);assert.equal(typeof lighting.exposure,"number");for(let i=0;i<5;i++)world=stepWorldTimeWeather(world,{nextWeather:"storm"});assert.equal(world.weather,"storm");assert.ok(world.wind>.5);
const dungeonA=generateDungeon({seed:"same-dungeon",width:11,height:11,rooms:18}),dungeonB=generateDungeon({seed:"same-dungeon",width:11,height:11,rooms:18});assert.equal(dungeonA.connected,true);assert.equal(dungeonA.checksum,dungeonB.checksum);assert.deepEqual(dungeonA.grid,dungeonB.grid);
let wall=createDestructible({maxHealth:100,destructible:true,persistenceKey:"wall-1"});wall=damageDestructible(wall,60);assert.equal(wall.state,"damaged");wall=damageDestructible(wall,50);assert.equal(wall.state,"destroyed");assert.ok(wall.fragments>0);const protectedWall=createDestructible({maxHealth:100,destructible:false});assert.equal(damageDestructible(protectedWall,999).health,100);

const shots=[{id:"wide",start:0,duration:2,camera:"wide",reducedMotionCamera:"static"},{id:"boss",start:2,duration:2,camera:"boss-close",lockGameplay:true}];const timeline=validateCutsceneTimeline(shots);assert.equal(timeline.valid,true);assert.equal(cutsceneStateAt(shots,2.5).gameplayLocked,true);assert.equal(cutsceneStateAt(shots,5).complete,true);let camera=createCameraDirector();camera=directCamera(camera,{mode:"cinematic",targetId:"boss",priority:10,blend:.4,shake:.3});assert.equal(camera.mode,"cinematic");assert.equal(camera.targetId,"boss");
const safeScene=validateUgcSceneDocument({name:"Demo",entities:[{id:"spawn",type:"spawn",assets:["asset-1"]}]});assert.equal(safeScene.valid,true);assert.equal(safeScene.publiclyShared,false);const unsafeScene=validateUgcSceneDocument({name:"Bad",entities:[{id:"x",type:"prop",externalScript:"alert(1)"}]});assert.equal(unsafeScene.valid,false);assert.ok(unsafeScene.errors.some(item=>item.includes("scripts_not_allowed")));

const taxonomy=inferGameTaxonomy("Create a 3D open-world RPG with boss behavior tree talent tree loot dialogue weather dungeon destructible environment cutscene and UGC scene editor");assert.equal(taxonomy.advanced3d.matched,true);assert.ok(taxonomy.systems.some(item=>item.startsWith("ADVANCED 3D GAMEPLAY:")));assert.match(taxonomy.brief,/Advanced 3D gameplay/);
const readiness=currentGameCreatorEvidence();assert.equal(readiness.internalCoreScore,100);for(const key of ["advanced3dGameplaySystems","advanced3dWorkbench"])assert.ok(GAME_CREATOR_READINESS_AREAS.internal.includes(key));assert.equal(readiness.canClaimProduction100,false);

const lab=fs.readFileSync("app/game-3d-lab/page.js","utf8"),layout=fs.readFileSync("app/game-builder/layout.js","utf8");for(const token of ["3D Boss Combat Runtime","Behavior Tree","Talent Tree","Loot + Random Affixes","Dialogue Graph","Day / Night & Weather","Seeded Dungeon","Destructible Environment","Cutscene Timeline","Camera Director","UGC Scene Editor Contract","Evidence boundary"])assert.ok(lab.includes(token),`Advanced 3D Game Lab missing ${token}`);assert.match(lab,/do not claim final 3D art\/animation quality/i);assert.match(layout,/\/game-3d-lab/);assert.match(layout,/Advanced 3D Lab/);

console.log("✓ Advanced 3D Gameplay V1 executes boss combat, behavior trees, bounded group navigation, talents, deterministic affixes/loot, dialogue, weather, dungeons, destruction, cutscenes/camera and safe UGC scenes");
console.log("✓ SoolenAI taxonomy injects advanced 3D gameplay engineering instead of treating these systems as generic pages");
console.log("✓ Advanced 3D Game Lab exposes executable local workbenches and keeps renderer/backend/device evidence truthful");
console.log("✓ Game Creator internal 100 now requires Advanced 3D Gameplay Systems + Workbench evidence while Production 100 remains externally gated");
