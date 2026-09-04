import assert from "node:assert/strict";
import {compileSpatialHybridGameWorldV3} from "../lib/game/game-world-spatial-hybrid-v3.js";
import {createReconstructionCapturePlan,auditReconstructionV4,createReconstructionProviderContract,estimateReconstructionQuality,GAME_WORLD_RECONSTRUCTION_V4} from "../lib/game/game-world-reconstruction-v4.js";
import {buildNeuralSceneV4,auditNeuralSceneV4,createNeuralSceneProviderContract,GAME_WORLD_NEURAL_SCENE_V4} from "../lib/game/game-world-neural-scene-v4.js";
import {buildPhysicsSimulationV4,auditPhysicsSimulationV4,simulatePhysicsPreview,GAME_WORLD_PHYSICS_SIMULATION_V4} from "../lib/game/game-world-physics-simulation-v4.js";
import {buildEmbodiedAgentsV4,auditEmbodiedAgentsV4,runEmbodiedCycleV4,GAME_WORLD_EMBODIED_AGENT_V4} from "../lib/game/game-world-embodied-agent-v4.js";
import {buildDigitalTwinCalibrationV4,auditDigitalTwinCalibrationV4,evaluateTwinCalibrationV4,GAME_WORLD_DIGITAL_TWIN_CALIBRATION_V4} from "../lib/game/game-world-digital-twin-calibration-v4.js";
import {compileNeuralReconstructionEmbodiedV4,summarizeNeuralReconstructionEmbodiedV4,GAME_WORLD_NEURAL_RECONSTRUCTION_EMBODIED_V4} from "../lib/game/game-world-neural-reconstruction-embodied-v4.js";

function ok(name,fn){fn();console.log(`✓ ${name}`);}
const input={prompt:"Reconstructable living fantasy fortress city with villages dungeon waterways bridges quests treasure bosses companions and dynamic weather for mobile",seed:"neural-reconstruction-v4-test",levelCount:20,treasureCount:24,bossCount:4,hypothesisCount:3,simulationBudget:32,deviceClass:"balanced",counterfactualEvent:{type:"bridge-destroyed"}};
const v3=compileSpatialHybridGameWorldV3(input);

ok("Reconstruction V4 plans multi-view capture with privacy defaults and no LIVE overclaim",()=>{
  const plan=createReconstructionCapturePlan({project:v3.project,captures:[{id:"a",assetRef:"asset_img_001"},{id:"b",assetRef:"https://unsafe.example/a.jpg"},{id:"c",assetRef:"asset_img_003"},{id:"d",assetRef:"asset_img_004"}],mode:"photo-set"});
  assert.equal(GAME_WORLD_RECONSTRUCTION_V4.faceIdentityExtractionDefault,false);assert.equal(plan.privacy.faceIdentityExtraction,false);assert.equal(plan.privacy.geolocationInference,false);assert.equal(plan.privacy.rawUrlsAccepted,false);assert.ok(plan.frames.every(x=>!/^https?:/i.test(x.assetRef)));assert.equal(auditReconstructionV4(plan).score,100);
  const quality=estimateReconstructionQuality(plan);assert.equal(quality.measured,false);assert.equal(quality.measurementRequiredForLive,true);assert.equal(createReconstructionProviderContract().liveVerified,false);
});

ok("Neural Scene V4 keeps semantic mesh/nav/physics independent from optional neural appearance",()=>{
  const reconstruction=createReconstructionCapturePlan({project:v3.project});const scene=buildNeuralSceneV4({v3,reconstruction,deviceClass:"balanced"});
  assert.equal(GAME_WORLD_NEURAL_SCENE_V4.gameplayTruthIndependentOfNeuralAppearance,true);assert.ok(scene.layers.some(x=>x.id==="occupancy-grid"));assert.ok(scene.layers.some(x=>x.id==="signed-distance-field"));assert.equal(scene.policy.physicsNeverDependsOnNeuralAppearance,true);assert.equal(scene.policy.navNeverDependsOnNeuralAppearance,true);assert.equal(auditNeuralSceneV4(scene).score,100);assert.equal(createNeuralSceneProviderContract().mandatoryForGameplay,false);
});

ok("Advanced Physics V4 is fixed-step, bounded and deterministic at contract-preview level",()=>{
  const reconstruction=createReconstructionCapturePlan({project:v3.project});const scene=buildNeuralSceneV4({v3,reconstruction});const physics=buildPhysicsSimulationV4({v3,neuralScene:scene,event:{type:"bridge-destroyed",anchorId:v3.project.blueprint.regions[0].id}});
  assert.equal(GAME_WORLD_PHYSICS_SIMULATION_V4.deterministicPlan,true);assert.equal(physics.stepPolicy.fixedStep,true);assert.equal(physics.stepPolicy.rollbackSnapshotContract,true);assert.equal(physics.stepPolicy.networkDeterminismNotClaimed,true);assert.equal(auditPhysicsSimulationV4(physics).score,100);
  const a=simulatePhysicsPreview(physics,12),b=simulatePhysicsPreview(physics,12);assert.deepEqual(a,b);assert.equal(a.externalEngineUsed,false);
});

ok("Embodied NPC V4 grounds actions to scene/nav/physics and stores no hidden reasoning",()=>{
  const reconstruction=createReconstructionCapturePlan({project:v3.project});const scene=buildNeuralSceneV4({v3,reconstruction});const physics=buildPhysicsSimulationV4({v3,neuralScene:scene});const pkg=buildEmbodiedAgentsV4({v3,physics,neuralScene:scene});
  assert.equal(GAME_WORLD_EMBODIED_AGENT_V4.localFirst,true);assert.ok(pkg.agents.length>=2);assert.equal(pkg.grounding.usesGameplayTruth,true);assert.equal(pkg.runtime.fallback,"provider-router");assert.equal(pkg.evidence.privateChainOfThoughtStored,false);assert.equal(auditEmbodiedAgentsV4(pkg).score,100);
  const cycle=runEmbodiedCycleV4(pkg,pkg.agents[0].id,{hazard:true,questAvailable:true});assert.ok(cycle.actions.includes("avoid"));assert.equal(cycle.decisionEvidence.hiddenReasoning,false);assert.equal(cycle.productionWrite,false);
});

ok("Digital Twin V4 keeps calibration accuracy evidence separate from CODE readiness",()=>{
  const reconstruction=createReconstructionCapturePlan({project:v3.project});const scene=buildNeuralSceneV4({v3,reconstruction});const twin=buildDigitalTwinCalibrationV4({v3,reconstruction,neuralScene:scene});
  assert.equal(GAME_WORLD_DIGITAL_TWIN_CALIBRATION_V4.realWorldAccuracyVerified,false);assert.ok(twin.anchors.length>=3);assert.equal(twin.changeDetection.productionAutoWrite,false);assert.equal(twin.evidence.realWorldAccuracyVerified,false);assert.equal(auditDigitalTwinCalibrationV4(twin).score,100);assert.equal(evaluateTwinCalibrationV4(twin).liveEligible,false);
});

ok("Unified V4 compiles V3 plus all five layers to INTERNAL 100 only",()=>{
  const result=compileNeuralReconstructionEmbodiedV4(input);const summary=summarizeNeuralReconstructionEmbodiedV4(result);
  assert.equal(GAME_WORLD_NEURAL_RECONSTRUCTION_EMBODIED_V4.architecture,"v3-spatial-hybrid-plus-reconstruction-neural-physics-embodied-twin");assert.equal(result.readiness.v3Internal100,true);assert.equal(result.readiness.newLayers100,true);assert.equal(result.readiness.internal100,true);assert.equal(result.readiness.internalScore,100);assert.equal(result.readiness.production100,false);assert.equal(summary.v4Internal100,true);assert.ok(summary.captureFrames>=4);assert.ok(summary.neuralChunks>0);assert.ok(summary.embodiedAgents>=2);
});

ok("Unified V4 replay is deterministic for planning structures",()=>{
  const a=compileNeuralReconstructionEmbodiedV4(input),b=compileNeuralReconstructionEmbodiedV4(input);
  assert.deepEqual(a.reconstruction,b.reconstruction);assert.deepEqual(a.neuralScene,b.neuralScene);assert.deepEqual(a.physics,b.physics);assert.deepEqual(a.physicsPreview,b.physicsPreview);assert.deepEqual(a.embodied,b.embodied);assert.deepEqual(a.digitalTwin,b.digitalTwin);
});

ok("V4 independent implementation keeps all real provider/device/accuracy evidence false",()=>{
  const result=compileNeuralReconstructionEmbodiedV4({...input,hypothesisCount:2});
  assert.equal(result.truth.independentImplementation,true);assert.equal(result.truth.proprietaryCodeCopied,false);assert.equal(result.truth.proprietaryWeightsCopied,false);assert.equal(result.truth.hiddenReasoningCopied,false);assert.equal(result.truth.realCaptureReconstructionVerified,false);assert.equal(result.truth.liveReconstructionProviderVerified,false);assert.equal(result.truth.liveNeuralSceneProviderVerified,false);assert.equal(result.truth.realWorldScaleVerified,false);assert.equal(result.truth.realWorldAccuracyVerified,false);assert.equal(result.truth.livePhysicsEngineVerified,false);assert.equal(result.truth.realDevicePhysicsPerformanceVerified,false);assert.equal(result.truth.liveEmbodiedNpcModelVerified,false);assert.equal(result.truth.realMultimodalPerceptionVerified,false);assert.equal(result.truth.realEngineImportVerified,false);assert.equal(result.truth.productionDeploymentVerified,false);
});

console.log("✓ Batch136 transfers reconstruction + neural scene + advanced physics + embodied NPC + digital-twin calibration into LANERIQ Game World V4 with auditable INTERNAL 100 contracts and separate LIVE evidence.");
