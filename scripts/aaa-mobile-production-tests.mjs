import assert from "node:assert/strict";
import fs from "node:fs";
import {
  AAA_MOBILE_PRODUCTION_V1,inferAaaMobileProductionCapabilities,createBlendTree,evaluateBlendTree,solveTwoBoneIk,
  createReactionState,applyHitReaction,stepReaction,buildNavMesh,findNavMeshPath,planTacticalGroup,
  validateSkillDocument,validateVfxDocument,createMaterialLightingProfile,generateTerrain,classifyBiomes,
  createSettlement,stepSettlement,validateNarrativeVisualDocument,createGameProfiler,recordProfileSample,recordDebugEvent,profileSummary
} from "../lib/game/aaa-mobile-production-systems-v1.js";
import {inferGameTaxonomy} from "../lib/ai/game-taxonomy-knowledge.js";
import {currentGameCreatorEvidence,GAME_CREATOR_READINESS_AREAS} from "../lib/game/game-creator-readiness-v2.js";

for(const token of ["animation-blend-tree","two-bone-ik","hit-reaction-ragdoll","navmesh","tactical-group-ai","skill-editor","vfx-editor","material-lighting","terrain-editor","biome-generator","settlement-system","quest-dialogue-visual-editor","game-debugger","game-profiler"]){
  assert.ok(AAA_MOBILE_PRODUCTION_V1.systems.includes(token),`AAA production system missing ${token}`);
}
assert.equal(AAA_MOBILE_PRODUCTION_V1.deterministic,true);
assert.deepEqual(AAA_MOBILE_PRODUCTION_V1.targetPlatforms,["ios","android","web-preview"]);

const knowledge=inferAaaMobileProductionCapabilities("Create a AAA 3D action RPG with animation blend tree IK ragdoll NavMesh tactical AI skill editor VFX editor terrain biome settlement quest editor debugger and profiler");
assert.equal(knowledge.matched,true);
for(const key of ["animation","ik","ragdoll","navmesh","tacticalAi","skillEditor","vfxEditor","terrain","biome","settlement","visualNarrative","profiler"])assert.equal(knowledge.wants[key],true,`AAA inference missing ${key}`);
assert.match(knowledge.truthRule,/real-device/i);

const tree=createBlendTree({clips:[{id:"idle",speed:0,direction:0},{id:"walk",speed:2,direction:0},{id:"run",speed:6,direction:0}]});
const blend=evaluateBlendTree(tree,{speed:5.8,direction:0,grounded:true});assert.equal(blend.primary,"run");
const ik=solveTwoBoneIk({root:{x:0,y:0},target:{x:4,y:0},upper:1,lower:1});assert.equal(ik.reachable,false);assert.equal(ik.clamped,true);assert.ok(ik.end.x<2.01);
let reaction=createReactionState();reaction=applyHitReaction(reaction,{force:90});assert.equal(reaction.mode,"ragdoll");reaction=stepReaction(reaction,1.2);assert.equal(reaction.mode,"recovering");

const mesh=buildNavMesh({width:10,height:10,blocked:[[4,1],[4,2],[4,3],[4,4]]});const path=findNavMeshPath(mesh,{x:1,y:1},{x:8,y:8});assert.ok(path.length>0);assert.deepEqual(path[0],{x:1,y:1});assert.deepEqual(path.at(-1),{x:8,y:8});
const squad=planTacticalGroup(Array.from({length:8},(_,i)=>({id:`a${i}`})),{x:10,z:10});assert.equal(squad.length,8);assert.ok(squad.some(item=>item.role==="flank_left"));assert.ok(squad.every(item=>item.bounded===true));

const skill=validateSkillDocument({id:"arc",targeting:"cone",cooldown:8,cost:20,effects:[{type:"damage"},{type:"debuff"}]});assert.equal(skill.valid,true);assert.equal(skill.runtimeSafe,true);
const badSkill=validateSkillDocument({id:"bad",targeting:"planet",effects:[]});assert.equal(badSkill.valid,false);
const vfx=validateVfxDocument({particles:999,dynamicLights:99,duration:20,overdrawLayers:9});assert.equal(vfx.budget.particles,160);assert.equal(vfx.budget.dynamicLights,4);assert.ok(vfx.warnings.includes("particle_budget_clamped"));assert.equal(vfx.reducedMotion.cameraShake,false);
const material=createMaterialLightingProfile({tier:"mobile_low",dynamicLights:9,shadowCasters:9,textureSize:4096});assert.equal(material.dynamicLights,4);assert.equal(material.textureSize,512);

const terrainA=generateTerrain({seed:"mountain",size:12}),terrainB=generateTerrain({seed:"mountain",size:12});assert.equal(terrainA.checksum,terrainB.checksum);assert.deepEqual(terrainA.heights,terrainB.heights);const biomes=classifyBiomes(terrainA);assert.equal(biomes.length,12);assert.equal(biomes[0].length,12);
let settlement=createSettlement({population:20});const beforeFood=settlement.food;settlement=stepSettlement(settlement,{hours:4});assert.notEqual(settlement.food,beforeFood);const upgraded=stepSettlement({...settlement,wood:100,stone:100},{hours:1,upgrade:true});assert.ok(upgraded.level>settlement.level);
const narrative=validateNarrativeVisualDocument({nodes:[{id:"q",type:"quest",next:["end"]},{id:"end",type:"end",next:[]}]});assert.equal(narrative.valid,true);const unsafeNarrative=validateNarrativeVisualDocument({nodes:[{id:"end",type:"end",next:[]}],externalScript:"fetch('x')"});assert.equal(unsafeNarrative.valid,false);assert.ok(unsafeNarrative.errors.includes("external_scripts_not_allowed"));

const profiler=createGameProfiler({targetFps:60});recordProfileSample(profiler,{frameMs:14,cpuMs:7,gpuMs:9,memoryMb:600,drawCalls:1000,entities:300});recordProfileSample(profiler,{frameMs:35,cpuMs:25,gpuMs:27,memoryMb:1300,drawCalls:2600,entities:1200});recordDebugEvent(profiler,{type:"budget_warning",message:"heavy frame",at:2});const summary=profileSummary(profiler);assert.equal(summary.samples,2);assert.equal(summary.productionDeviceEvidence,false);assert.ok(summary.violations.length>0);assert.equal(profiler.events.length,1);

const taxonomy=inferGameTaxonomy("Build a AAA 3D open-world action RPG with animation blend tree IK NavMesh terrain biome skill editor VFX editor and profiler");assert.equal(taxonomy.aaaMobileProduction.matched,true);assert.ok(taxonomy.systems.some(item=>item.startsWith("AAA MOBILE PRODUCTION:")));assert.match(taxonomy.brief,/AAA mobile production:/);
const readiness=currentGameCreatorEvidence();assert.equal(readiness.internalCoreScore,100);for(const key of ["aaaMobileProductionSystems","aaaMobileProductionWorkbench"])assert.ok(GAME_CREATOR_READINESS_AREAS.internal.includes(key));assert.equal(readiness.canClaimProduction100,false);

const lab=fs.readFileSync("app/game-engine-lab/page.js","utf8");for(const token of ["AAA MOBILE GAME LAB","Animation Blend Tree","IK + Hit Reaction / Ragdoll","NavMesh Connectivity","Tactical Group AI","Skill Editor Contract","VFX + Material/Lighting Budget","Terrain Editor Foundation","Biome Generator","Settlement / Building System","Quest / Dialogue Visual Editor Contract","Game Debugger / Profiler","Production evidence boundary"])assert.ok(lab.includes(token),`AAA lab missing ${token}`);
assert.match(lab,/does not pretend a final renderer or real-device performance test has already passed/);
const builderLayout=fs.readFileSync("app/game-builder/layout.js","utf8");assert.match(builderLayout,/href="\/game-engine-lab"/);assert.match(builderLayout,/AAA Mobile Lab/);

console.log("✓ AAA mobile production core covers blend trees, IK, reactions/ragdoll, NavMesh, group AI, authoring budgets, terrain/biomes, settlement, narrative and profiler evidence");
console.log("✓ SoolenAI taxonomy injects AAA mobile production engineering only when relevant and preserves real-device truth boundaries");
console.log("✓ AAA Mobile Game Lab exposes executable workbenches instead of marketing-only capability labels");
console.log("✓ Internal Game Creator 100 now requires AAA production systems/workbench while Production 100 remains device/network/store evidence-gated");
