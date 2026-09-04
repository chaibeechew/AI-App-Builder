import assert from "node:assert/strict";
import {compileLatestGameWorldV2} from "../lib/game/game-world-latest-tech-transfer-v2.js";
import {buildSpatialSceneGraph,querySpatialGraph,spatialNeighbors,auditSpatialIntelligence,GAME_WORLD_SPATIAL_INTELLIGENCE_V3} from "../lib/game/game-world-spatial-intelligence-v3.js";
import {predictWorldEventCascade,auditPhysicalReasoning,GAME_WORLD_PHYSICAL_REASONING_V3} from "../lib/game/game-world-physical-reasoning-v3.js";
import {buildHybridWorldRepresentation,auditHybridWorldRepresentation,createHybrid3DProviderContract} from "../lib/game/game-world-hybrid-3d-v3.js";
import {buildPortableSceneStage,auditPortableSceneStage,GAME_WORLD_PORTABLE_SCENE_V3} from "../lib/game/game-world-portable-scene-v3.js";
import {buildNpcIntelligencePackage,auditNpcMotionIntelligence,createNpcMotionProviderContract} from "../lib/game/game-world-npc-motion-intelligence-v3.js";
import {compileSpatialHybridGameWorldV3,summarizeSpatialHybridGameWorldV3,GAME_WORLD_SPATIAL_HYBRID_V3} from "../lib/game/game-world-spatial-hybrid-v3.js";

function ok(name,fn){fn();console.log(`✓ ${name}`);}
const input={prompt:"Living fantasy open world with castle villages quests treasure dungeon bosses dynamic weather and NPC companions for mobile",seed:"spatial-hybrid-v3-test",levelCount:18,treasureCount:24,bossCount:4,hypothesisCount:3,simulationBudget:32,deviceClass:"balanced"};
const v2=compileLatestGameWorldV2(input);
const project=v2.selectedWorld;

ok("Spatial Intelligence V3 builds deterministic auditable scene and relation graphs",()=>{
  const a=buildSpatialSceneGraph(project,{cellMeters:128});const b=buildSpatialSceneGraph(project,{cellMeters:128});
  assert.equal(GAME_WORLD_SPATIAL_INTELLIGENCE_V3.deterministic,true);assert.deepEqual(a,b);assert.ok(a.nodes.length>=2);assert.ok(Object.keys(a.spatialIndex).length>0);assert.equal(auditSpatialIntelligence(a).score,100);
  const regions=querySpatialGraph(a,{type:"region"});assert.ok(regions.length>=2);assert.ok(Array.isArray(spatialNeighbors(a,regions[0].id)));
});

ok("Physical Reasoning V3 predicts bounded spatial cascades and repair responses",()=>{
  const spatial=buildSpatialSceneGraph(project);const anchor=project.blueprint.regions[0].id;
  const result=predictWorldEventCascade({worldModel:v2.worldModel,spatial,event:{type:"bridge-destroyed",anchorId:anchor}});
  assert.equal(GAME_WORLD_PHYSICAL_REASONING_V3.deterministic,true);assert.ok(result.direct.some(x=>x.effect==="mobility-reduced"));assert.ok(result.secondary.some(x=>x.effect==="npc-reroute-required"));assert.ok(result.responsePlan.some(x=>x.action==="generate-alternate-route"));assert.equal(auditPhysicalReasoning(result).score,100);assert.equal(result.evidence.privateChainOfThoughtExposed,false);assert.equal(result.evidence.productionAutoWrite,false);
});

ok("Hybrid 3D V3 separates gameplay truth from optional visual splat/neural layers",()=>{
  const spatial=buildSpatialSceneGraph(project);const hybrid=buildHybridWorldRepresentation({project,pcg:v2.pcg,spatial,deviceClass:"balanced"});
  assert.equal(hybrid.renderingPolicy.gameplayTruthSource,"gameplay-mesh");assert.equal(hybrid.renderingPolicy.physicsNeverDependsOnSplat,true);assert.equal(hybrid.renderingPolicy.navNeverDependsOnSplat,true);assert.ok(hybrid.layers.some(x=>x.id==="visual-splat"&&x.required===false));assert.ok(hybrid.chunks.length>0);assert.equal(auditHybridWorldRepresentation(hybrid).score,100);
  const provider=createHybrid3DProviderContract();assert.equal(provider.providerNeutral,true);assert.equal(provider.noProviderRequiredForCoreRuntime,true);
});

ok("Portable Scene V3 is layered and adapter-ready without claiming OpenUSD or engine verification",()=>{
  const spatial=buildSpatialSceneGraph(project);const hybrid=buildHybridWorldRepresentation({project,pcg:v2.pcg,spatial});const scene=buildPortableSceneStage({project,spatial,hybrid});
  assert.equal(GAME_WORLD_PORTABLE_SCENE_V3.claimsOpenUsdCompliance,false);assert.ok(scene.stage.prims.length>0);assert.ok(scene.stage.layers.some(x=>x.id==="gameplay"));assert.equal(scene.adapters.openusd.verified,false);assert.equal(scene.adapters.godot.verified,false);assert.equal(scene.evidence.realEngineImportVerified,false);assert.equal(auditPortableSceneStage(scene).score,100);
});

ok("NPC + Motion Intelligence V3 uses spatial context, local-first runtime and Provider Router fallback",()=>{
  const spatial=buildSpatialSceneGraph(project);const physical=predictWorldEventCascade({worldModel:v2.worldModel,spatial,event:{type:"storm",anchorId:project.blueprint.regions[0].id}});const npc=buildNpcIntelligencePackage({project,spatial,physical});
  assert.ok(npc.archetypes.length>=2);assert.equal(npc.spatialAwareness.usesSceneGraph,true);assert.ok(npc.motionGraph.states.includes("shelter"));assert.equal(npc.runtimeContract.preferred,"local-first-when-available");assert.equal(npc.runtimeContract.fallback,"provider-router");assert.equal(npc.evidence.liveMotionModelVerified,false);assert.equal(npc.evidence.liveNpcModelVerified,false);assert.equal(auditNpcMotionIntelligence(npc).score,100);
  const contract=createNpcMotionProviderContract();assert.equal(contract.providerNeutral,true);assert.equal(contract.localRuntimeOptional,true);
});

ok("Spatial Hybrid V3 integrates V2 + five new layers into internal 100 without LIVE overclaim",()=>{
  const result=compileSpatialHybridGameWorldV3(input);const summary=summarizeSpatialHybridGameWorldV3(result);
  assert.equal(GAME_WORLD_SPATIAL_HYBRID_V3.architecture,"v2-world-model-plus-spatial-physical-hybrid-runtime");assert.equal(result.readiness.v2Internal100,true);assert.equal(result.readiness.newLayers100,true);assert.equal(result.readiness.internal100,true);assert.equal(result.readiness.internalScore,100);assert.equal(result.readiness.production100,false);assert.equal(summary.v3Internal100,true);assert.ok(summary.spatialNodes>0);assert.ok(summary.hybridChunks>0);assert.ok(summary.npcArchetypes>=2);
});

ok("V3 deterministic replay keeps auditable structure stable",()=>{
  const a=compileSpatialHybridGameWorldV3(input);const b=compileSpatialHybridGameWorldV3(input);
  assert.equal(a.project.blueprint.id,b.project.blueprint.id);assert.deepEqual(a.spatial.nodes,b.spatial.nodes);assert.deepEqual(a.spatial.relations,b.spatial.relations);assert.equal(a.physical.riskScore,b.physical.riskScore);assert.deepEqual(a.physical.responsePlan,b.physical.responsePlan);assert.deepEqual(a.hybrid.chunks,b.hybrid.chunks);assert.deepEqual(a.portableScene.stage,b.portableScene.stage);
});

ok("V3 technology transfer stays independent and keeps real provider/device/engine evidence separate",()=>{
  const result=compileSpatialHybridGameWorldV3({...input,hypothesisCount:2});
  assert.equal(result.truth.independentImplementation,true);assert.equal(result.truth.proprietaryWeightsCopied,false);assert.equal(result.truth.proprietaryCodeCopied,false);assert.equal(result.truth.hiddenReasoningCopied,false);assert.equal(result.truth.liveSpatialWorldModelProviderVerified,false);assert.equal(result.truth.live3dgsProviderVerified,false);assert.equal(result.truth.realOpenUsdComplianceVerified,false);assert.equal(result.truth.realEngineImportVerified,false);assert.equal(result.truth.liveMotionModelVerified,false);assert.equal(result.truth.liveNpcModelVerified,false);assert.equal(result.truth.realDeviceHybrid3dPerformanceVerified,false);assert.equal(result.truth.productionDeploymentVerified,false);
});

console.log("✓ Batch133 transfers Spatial Intelligence + Physical Reasoning + Hybrid 3D + Portable Scene + NPC/Motion architecture into LANERIQ Game World V3 with auditable INTERNAL 100 contracts and separate LIVE evidence.");
