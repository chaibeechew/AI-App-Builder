import assert from "node:assert/strict";
import fs from "node:fs";
import {
  CONTENT_PRODUCTION_PIPELINE_V1,inferContentProductionCapabilities,validateAssetImport,normalizeAnimationClip,
  validateSceneDocument,createPrefab,instantiatePrefab,createPhysicsMaterial,combinePhysicsMaterials,
  planLodHlod,computeOcclusionVisibility,buildGpuInstanceBatches,validateShaderMaterialGraph,
  spatializeAudio,selectSpatialAudioVoices,buildLocalizationBundle,runAutomatedPlaytest,
  analyzeCrashReport,analyzePerformanceSamples,planLargeWorldContent
} from "../lib/game/content-production-pipeline-v1.js";
import {inferGameTaxonomy} from "../lib/ai/game-taxonomy-knowledge.js";
import {currentGameCreatorEvidence,GAME_CREATOR_READINESS_AREAS} from "../lib/game/game-creator-readiness-v2.js";

for(const token of ["asset-import","animation-import","scene-composer","prefab-system","physics-materials","lod-hlod","occlusion-culling","gpu-instancing","shader-material-editor","spatial-audio","localization","automated-playtesting-ai","crash-performance-analyzer","large-world-content-pipeline"]){
  assert.ok(CONTENT_PRODUCTION_PIPELINE_V1.systems.includes(token),`content production system missing ${token}`);
}
assert.equal(CONTENT_PRODUCTION_PIPELINE_V1.deterministic,true);
assert.deepEqual(CONTENT_PRODUCTION_PIPELINE_V1.targetPlatforms,["ios","android","web-preview"]);

const knowledge=inferContentProductionCapabilities("Build an open-world asset pipeline with animation import scene composer prefabs LOD HLOD occlusion GPU instancing shader editor spatial audio localization automated playtest crash analyzer and content pipeline");
assert.equal(knowledge.matched,true);
for(const key of ["assetImport","scene","prefab","lod","occlusion","instancing","shader","audio","localization","playtest","crash","worldPipeline"])assert.equal(knowledge.wants[key],true,`content inference missing ${key}`);
assert.match(knowledge.truthRule,/real-device|measured production evidence/i);

const mesh=validateAssetImport({type:"mesh",name:"hero.glb",extension:"glb",sizeMb:20,vertices:180000});assert.equal(mesh.valid,true);assert.ok(mesh.asset.id.startsWith("asset_"));
const heavy=validateAssetImport({type:"mesh",name:"city.glb",extension:"glb",sizeMb:120,vertices:900000});assert.equal(heavy.valid,true);assert.ok(heavy.warnings.includes("asset_size_over_mobile_budget"));assert.ok(heavy.warnings.includes("mesh_requires_lod"));
const executable=validateAssetImport({type:"data",name:"evil.js",extension:"js",sizeMb:1});assert.equal(executable.valid,false);assert.ok(executable.errors.includes("executable_payload_not_allowed"));
const clip=normalizeAnimationClip({id:"run",duration:1.2,fps:60,loop:true,events:[{time:.9,name:"right"},{time:.4,name:"left"}]});assert.equal(clip.events[0].name,"left");assert.equal(clip.loop,true);

const scene=validateSceneDocument({id:"arena",entities:[{id:"player",components:[{type:"transform"},{type:"mesh"},{type:"collider"}]}]});assert.equal(scene.valid,true);
const unsafeScene=validateSceneDocument({id:"bad",entities:[{id:"x",components:[{type:"javascript"}]}],externalScript:"alert(1)"});assert.equal(unsafeScene.valid,false);assert.ok(unsafeScene.errors.includes("executable_scene_code_not_allowed"));
const prefab=createPrefab({id:"grunt",entities:[{id:"body",components:[{type:"transform"},{type:"mesh"}]}],allowedOverrides:["transform","material"]});assert.equal(prefab.valid,true);
const instance=instantiatePrefab(prefab.prefab,{instanceId:"g1",overrides:{transform:{x:1}}});assert.equal(instance.ok,true);
const denied=instantiatePrefab(prefab.prefab,{instanceId:"g2",overrides:{scriptlessBehavior:{aggressive:true}}});assert.equal(denied.ok,false);assert.equal(denied.reason,"override_not_allowed");

const ice=createPhysicsMaterial({id:"ice",friction:.05,restitution:.1,frictionCombine:"min"}),rubber=createPhysicsMaterial({id:"rubber",friction:1.4,restitution:.8});const contact=combinePhysicsMaterials(ice,rubber);assert.equal(contact.friction,.05);assert.ok(contact.restitution<=1);
const lod=planLodHlod({triangles:200000,distances:[10,30,70],staticInstances:400});assert.equal(lod.hlod.enabled,true);assert.ok(lod.lods[1].triangles<lod.lods[0].triangles);assert.equal(lod.lods.at(-1).cull,true);
const visibility=computeOcclusionVisibility([{id:"a",distance:20},{id:"b",distance:60},{id:"c",distance:300}],{maxDistance:160,occludedIds:["b"]});assert.equal(visibility.find(x=>x.id==="a").visible,true);assert.equal(visibility.find(x=>x.id==="b").reason,"occluded");assert.equal(visibility.find(x=>x.id==="c").reason,"distance_cull");
const batches=buildGpuInstanceBatches(Array.from({length:2200},(_,i)=>({id:`tree${i}`,mesh:"tree",material:"green"})));assert.equal(batches.length,3);assert.ok(batches.every(b=>b.count<=1023));

const shader=validateShaderMaterialGraph({tier:"mobile_low",nodes:[{id:"t",type:"texture"},{id:"c",type:"color"},{id:"m",type:"multiply",inputs:["t","c"]},{id:"o",type:"output",inputs:["m"]}]});assert.equal(shader.valid,true);
const unsafeShader=validateShaderMaterialGraph({tier:"mobile_low",nodes:[{id:"x",type:"custom-code"}]});assert.equal(unsafeShader.valid,false);assert.ok(unsafeShader.errors.some(e=>e.startsWith("unsupported_shader_node")));
const spatial=spatializeAudio({x:10,y:0,z:0},{x:0,y:0,z:0});assert.ok(spatial.gain>0&&spatial.gain<1);assert.ok(spatial.pan>0);
const voices=selectSpatialAudioVoices(Array.from({length:40},(_,i)=>({id:`v${i}`,x:i,z:0})),{x:0,y:0,z:0},12);assert.equal(voices.length,12);

const locale=buildLocalizationBundle({hello:{en:"Hello {name}",zh:"你好 {name}",ms:"Hai {name}"}},["en","zh","ms"],"en");assert.equal(locale.valid,true);
const brokenLocale=buildLocalizationBundle({hello:{en:"Hello {name}",zh:"你好"}},["en","zh"],"en");assert.equal(brokenLocale.valid,false);assert.ok(brokenLocale.errors.includes("placeholder_mismatch:hello:zh"));

const playtest=runAutomatedPlaytest({initialState:{x:0,coins:0},actions:["move","coin","move","coin","goal"],applyAction:(s,a)=>a==="move"?{...s,x:s.x+1}:a==="coin"?{...s,coins:s.coins+1}:a==="goal"?{...s,x:3}:s,goal:s=>s.x>=3&&s.coins>=2,assertState:s=>s.x>=0&&s.coins>=0});assert.equal(playtest.passed,true);assert.equal(playtest.goalReached,true);assert.ok(playtest.uniqueStates>1);
const badPlaytest=runAutomatedPlaytest({initialState:{health:1},actions:["hit"],applyAction:s=>({...s,health:-1}),assertState:s=>s.health>=0});assert.equal(badPlaytest.passed,false);assert.ok(badPlaytest.errors.includes("invalid_state_at:1"));

const crash=analyzeCrashReport({message:"Render failed token=super-secret",stack:"Error GPU\n at draw"});assert.equal(crash.category,"rendering");assert.equal(crash.containsRawSecret,false);assert.ok(!crash.message.includes("super-secret"));
const perf=analyzePerformanceSamples([{frameMs:14,memoryMb:600,drawCalls:900},{frameMs:35,memoryMb:1200,drawCalls:2500}]);assert.equal(perf.productionDeviceEvidence,false);assert.ok(perf.violations.length>=3);
const worldA=planLargeWorldContent([{id:"a",x:0,z:0,sizeMb:20},{id:"b",x:140,z:0,sizeMb:80,dependencies:["shared"]}],{chunkSize:128,chunkBudgetMb:64}),worldB=planLargeWorldContent([{id:"a",x:0,z:0,sizeMb:20},{id:"b",x:140,z:0,sizeMb:80,dependencies:["shared"]}],{chunkSize:128,chunkBudgetMb:64});assert.deepEqual(worldA,worldB);assert.ok(worldA.overBudgetChunks.length===1);

const taxonomy=inferGameTaxonomy("Create a 3D RPG with asset pipeline prefab LOD GPU instancing shader editor localization automated playtest and crash analyzer");assert.equal(taxonomy.contentProduction.matched,true);assert.ok(taxonomy.systems.some(item=>item.startsWith("CONTENT PRODUCTION:")));assert.match(taxonomy.brief,/Content production pipeline:/);
const readiness=currentGameCreatorEvidence();assert.equal(readiness.internalCoreScore,100);for(const key of ["contentProductionSystems","contentProductionWorkbench"])assert.ok(GAME_CREATOR_READINESS_AREAS.internal.includes(key));assert.equal(readiness.canClaimProduction100,false);

const lab=fs.readFileSync("app/game-content-lab/page.js","utf8");for(const token of ["GAME CONTENT LAB","Asset + Animation Import","3D Scene Composer + Prefab","LOD / HLOD + Occlusion Culling","GPU Instancing Plan","Shader / Material Editor Contract","Spatial Audio Budget","Localization + Placeholder Parity","Automated Playtesting AI","Crash / Performance Analyzer","Large-world Content Pipeline","Production evidence boundary"])assert.ok(lab.includes(token),`content lab missing ${token}`);
const builder=fs.readFileSync("app/game-builder/layout.js","utf8");assert.match(builder,/href="\/game-content-lab"/);assert.match(builder,/Game Content Lab/);

console.log("✓ Content Production V1 executes safe asset/animation import, scene/prefab, physics material, LOD/HLOD, occlusion and GPU-instancing contracts");
console.log("✓ Shader, spatial audio and localization contracts enforce mobile budgets and runtime-safe data integrity");
console.log("✓ Automated Playtesting, Crash/Performance Analyzer and Large-world Content Pipeline produce deterministic evidence without faking device certification");
console.log("✓ SoolenAI taxonomy + Game Content Lab + Readiness require content-production evidence for internal Game Creator 100");
