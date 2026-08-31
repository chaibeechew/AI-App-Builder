import assert from "node:assert/strict";
import fs from "node:fs";
import {
  RPG_OPEN_WORLD_SYSTEMS_V1,inferRpgOpenWorldCapabilities,createNavGrid,findGridPath,createEnemyAi,stepEnemyAi,damageEnemy,
  createBossEncounter,stepBossEncounter,createAnimationState,transitionAnimation,createSkillVfxDescriptor,generateProceduralRegion,
  validateQuestGraph,createQuestState,availableQuests,completeQuest,createNpcRelationship,changeNpcRelationship,createInventory,craftRecipe,
  createMountState,stepMount,createPetState,commandPet
} from "../lib/game/rpg-open-world-systems-v1.js";
import {inferGameTaxonomy} from "../lib/ai/game-taxonomy-knowledge.js";
import {currentGameCreatorEvidence,GAME_CREATOR_READINESS_AREAS} from "../lib/game/game-creator-readiness-v2.js";

assert.equal(RPG_OPEN_WORLD_SYSTEMS_V1.deterministic,true);
for(const token of ["navigation","enemy-ai","boss-phases","animation-state-machine","skill-vfx","procedural-world","quest-graph","npc-relationships","crafting","mount-pet"])assert.ok(RPG_OPEN_WORLD_SYSTEMS_V1.systems.includes(token),`Missing deep RPG system ${token}`);
const knowledge=inferRpgOpenWorldCapabilities("Create a 3D open-world xianxia RPG with boss quests NPC relationships crafting mounts pets and procedural regions");
assert.equal(knowledge.matched,true);assert.equal(knowledge.openWorld,true);assert.equal(knowledge.wants.boss,true);assert.equal(knowledge.wants.quests,true);assert.equal(knowledge.wants.relationships,true);assert.equal(knowledge.wants.crafting,true);assert.equal(knowledge.wants.mounts,true);assert.equal(knowledge.wants.pets,true);assert.equal(knowledge.wants.procedural,true);

const grid=createNavGrid({width:8,height:8,blocked:[[2,1],[2,2],[2,3]]});const path=findGridPath(grid,{x:0,y:0},{x:5,y:5});assert.ok(path.length>0);assert.deepEqual(path[0],{x:0,y:0});assert.deepEqual(path.at(-1),{x:5,y:5});
let enemy=createEnemyAi({id:"e1",x:0,z:0});enemy=stepEnemyAi(enemy,{player:{id:"p1",x:4,z:0},dt:.1});assert.equal(enemy.status,"chase");enemy=damageEnemy(enemy,999);assert.equal(enemy.status,"downed");
let boss=createBossEncounter({maxHealth:1000,phases:[.7,.4]});boss=stepBossEncounter(boss,{damage:350});assert.equal(boss.phase,2);boss=stepBossEncounter(boss,{damage:300});assert.equal(boss.phase,3);boss=stepBossEncounter(boss,{damage:500});assert.equal(boss.status,"defeated");
let anim=createAnimationState();anim=transitionAnimation(anim,"move",{now:1});assert.equal(anim.state,"move");anim=transitionAnimation(anim,"attack",{now:2,lockMs:100});assert.equal(anim.state,"attack");const locked=transitionAnimation(anim,"idle",{now:50});assert.equal(locked.state,"attack");
const vfx=createSkillVfxDescriptor({id:"meteor",shape:"circle",particles:500});assert.equal(vfx.gameplayHitLogicSeparate,true);assert.equal(vfx.telegraphRequired,true);assert.ok(vfx.particles<=120);assert.ok(vfx.reducedMotionParticles<=12);
const regionA=generateProceduralRegion({seed:"demo",regionX:2,regionZ:-1}),regionB=generateProceduralRegion({seed:"demo",regionX:2,regionZ:-1});assert.equal(regionA.checksum,regionB.checksum);assert.deepEqual(regionA.features,regionB.features);

const graph=validateQuestGraph([{id:"intro",requires:[]},{id:"boss",requires:["intro"]}]);assert.equal(graph.valid,true);const qstate=createQuestState(graph);assert.deepEqual(availableQuests(qstate).map(q=>q.id),["intro"]);assert.equal(completeQuest(qstate,"intro"),true);assert.ok(availableQuests(qstate).some(q=>q.id==="boss"));const bad=validateQuestGraph([{id:"a",requires:["b"]},{id:"b",requires:["a"]}]);assert.equal(bad.valid,false);
let rel=createNpcRelationship({npcId:"mentor"});rel=changeNpcRelationship(rel,{affinity:20,reputation:10,flag:"saved_village"});assert.equal(rel.affinity,20);assert.ok(rel.flags.has("saved_village"));
const inv=createInventory({ore:4,wood:2});const crafted=craftRecipe(inv,{inputs:{ore:3,wood:1},outputs:{sword:1}});assert.equal(crafted.ok,true);assert.equal(crafted.inventory.items.sword,1);assert.equal(inv.items.ore,4,"Crafting must not mutate source inventory before success is accepted");
let mount=createMountState({id:"horse"});mount=stepMount(mount,{summon:true});assert.equal(mount.summoned,true);let pet=createPetState({id:"fox"});pet=commandPet(pet,"assist");assert.equal(pet.command,"assist");

const taxonomy=inferGameTaxonomy("Create a 3D open-world xianxia RPG with quests crafting mounts pets replay guild leaderboard and UGC level editor");assert.equal(taxonomy.rpgOpenWorld.matched,true);assert.ok(taxonomy.systems.some(item=>item.startsWith("RPG/OPEN WORLD:")));assert.ok(taxonomy.platformCapabilities.requested.length>=4);
const readiness=currentGameCreatorEvidence();assert.equal(readiness.internalCoreScore,100);for(const key of ["rpgOpenWorldDepth","platformWorkbench"])assert.ok(GAME_CREATOR_READINESS_AREAS.internal.includes(key));assert.equal(readiness.canClaimProduction100,false);

const lab=fs.readFileSync("app/game-platform-lab/page.js","utf8");for(const token of ["Replay Viewer","Spectator Policy","Guild / Clan","Ranked Board","Achievement","Cloud Save Envelope","UGC Visual Level Editor","Evidence boundary"])assert.ok(lab.includes(token),`Game Platform Lab missing ${token}`);
assert.match(lab,/provider-neutral local contracts/);assert.match(lab,/public UGC still require verified provider\/backend evidence/);
const builderLayout=fs.readFileSync("app/game-builder/layout.js","utf8");assert.match(builderLayout,/href="\/game-platform-lab"/);assert.match(builderLayout,/Game Platform Lab/);assert.match(builderLayout,/safe-area-inset-bottom/);

console.log("✓ Deep RPG/Open-world core covers bounded navigation, enemy/Boss AI, animation, VFX, deterministic procedural regions, quest graphs, NPC relationships, crafting and mount/pet state");
console.log("✓ SoolenAI taxonomy injects deep RPG/open-world engineering when requested instead of treating those features as generic pages");
console.log("✓ Game Platform Lab exposes replay, spectator, guild, leaderboard/achievement, cloud-save conflict and UGC validation workbenches without faking live services");
console.log("✓ Game Builder exposes a mobile-safe Game Platform Lab entry and internal 100 requires deep RPG/open-world + workbench evidence while Production 100 remains externally gated");
