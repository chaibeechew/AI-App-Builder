import assert from "node:assert/strict";
import {compileGameWorldProject} from "../lib/game/game-world-generator-v1.js";
import {createWorldModel,applyWorldEvent,stepWorldModel,checkpointWorldModel,auditWorldModel,GAME_WORLD_MODEL_V2} from "../lib/game/game-world-world-model-v2.js";
import {createWorldMemory,rememberWorldModelDelta,branchWorldMemory,auditWorldMemory,createWorldMemoryStorageContract} from "../lib/game/game-world-memory-v2.js";
import {createWorldPcgGraph,addPcgOverride,compileWorldPcgGraph,planPcgChunks,auditWorldPcg} from "../lib/game/game-world-pcg-graph-v2.js";
import {observeWorldForAgent,planWorldAgentActions,runAutonomousWorldCycle,auditAutonomousWorldAgent} from "../lib/game/game-world-autonomous-agent-v2.js";
import {planWebGpuWorldRuntime,createWebGpuCapabilityProbeContract,createEngineExportAdapters,createNeuralRenderingExtensionContract,auditWebGpuRuntimePlan} from "../lib/game/game-world-webgpu-runtime-v2.js";
import {compileLatestGameWorldV2,summarizeLatestGameWorldV2,GAME_WORLD_LATEST_TECH_TRANSFER_V2} from "../lib/game/game-world-latest-tech-transfer-v2.js";

function ok(name,fn){fn();console.log(`✓ ${name}`);}
const input={prompt:"Large evolving fantasy open world with castle, villages, quests, treasure, dungeon, bosses and dynamic weather for mobile",seed:"latest-tech-v2-test",levelCount:16,treasureCount:20,bossCount:3};
const project=compileGameWorldProject(input);

ok("World Model V2 is event-sourced, deterministic and truth-gated",()=>{
  const model=createWorldModel(project);assert.equal(GAME_WORLD_MODEL_V2.deterministicReplay,true);assert.equal(model.events.length,0);assert.equal(auditWorldModel(model).score,100);
});

ok("World state persists dynamic weather, resource, landmark and flag transitions",()=>{
  const regionId=project.blueprint.regions[0].id;let model=createWorldModel(project);
  model=applyWorldEvent(model,{type:"weather-change",payload:{weather:"storm",regionId}});
  model=applyWorldEvent(model,{type:"landmark-destroyed",payload:{regionId}});
  model=applyWorldEvent(model,{type:"resource-delta",payload:{regionId,delta:-30}});
  model=stepWorldModel(model,{minutes:5});model=checkpointWorldModel(model,"after-events");
  assert.equal(model.state.regions[regionId].weather,"storm");assert.equal(model.state.regions[regionId].landmarkState,"destroyed");assert.ok(model.state.regions[regionId].resourceIndex<70);assert.equal(auditWorldModel(model).score,100);
});

ok("Persistent World Memory records deltas, snapshots and branchable timelines",()=>{
  const regionId=project.blueprint.regions[0].id;const before=createWorldModel(project);let after=applyWorldEvent(before,{type:"resource-delta",payload:{regionId,delta:-10}});
  let memory=createWorldMemory(before,{snapshotEvery:8,maxEvents:128});memory=rememberWorldModelDelta(memory,before,after);memory=branchWorldMemory(memory,"alternate");
  assert.equal(memory.activeBranch,"alternate");assert.equal(Object.keys(memory.branches).length,2);assert.equal(auditWorldMemory(memory).score,100);assert.equal(createWorldMemoryStorageContract().liveAdapterVerified,false);
});

ok("PCG World Graph is acyclic, deterministic and supports nondestructive art-direction overrides",()=>{
  let graph=createWorldPcgGraph(project.blueprint);const node=graph.nodes.find(item=>item.type==="biome");graph=addPcgOverride(graph,{nodeId:node.id,path:"params.danger",value:4,reason:"designer-adjustment"});
  const compiled=compileWorldPcgGraph(graph);const repeated=compileWorldPcgGraph(graph);assert.equal(compiled.checksum,repeated.checksum);assert.ok(compiled.overrideCount>0);assert.equal(auditWorldPcg(graph,compiled).score,100);assert.ok(planPcgChunks(project.blueprint).chunkCount>0);
});

ok("Autonomous World Agent uses bounded observe-plan-act-verify evidence",()=>{
  const regionId=project.blueprint.regions[0].id;let model=createWorldModel(project);model=applyWorldEvent(model,{type:"landmark-destroyed",payload:{regionId}});model=applyWorldEvent(model,{type:"threat-spawn",payload:{threatId:"dragon-crisis",regionId,severity:9,kind:"boss"}});
  const observation=observeWorldForAgent(model);const plan=planWorldAgentActions(observation,{maxActions:4});assert.ok(plan.actions.length<=4);assert.equal(plan.decisionEvidence.hiddenReasoning,false);
  const cycle=runAutonomousWorldCycle(model,{maxActions:4});assert.equal(auditAutonomousWorldAgent(cycle).score,100);assert.equal(cycle.evidence.productionAutoWrite,false);
});

ok("WebGPU-first runtime keeps WebGL2/CPU fallbacks and real-device truth boundaries",()=>{
  const runtime=planWebGpuWorldRuntime(project,{targetFps:60,deviceClass:"balanced"});assert.equal(runtime.renderer.preferred,"webgpu");assert.ok(runtime.renderer.fallbacks.includes("webgl2"));assert.equal(runtime.evidence.realDeviceFps,false);assert.equal(auditWebGpuRuntimePlan(runtime).score,100);
  const probe=createWebGpuCapabilityProbeContract();assert.ok(probe.probes.includes("compatibility-mode"));assert.match(probe.privacyRule,/do not fingerprint/i);
});

ok("Engine adapters are schema-ready without falsely claiming real editor imports",()=>{
  const adapters=createEngineExportAdapters();assert.match(adapters.godot.target,/4\.7/);assert.match(adapters.unreal.target,/5\.8/);assert.match(adapters.unity.target,/Unity 6\+/);assert.equal(adapters.truth.actualEditorImportVerified,false);
  const neural=createNeuralRenderingExtensionContract();assert.equal(neural.mandatoryForCoreRuntime,false);assert.equal(neural.proprietaryModelBundled,false);
});

ok("Latest Technology Transfer V2 integrates all five layers into one selected world",()=>{
  const result=compileLatestGameWorldV2({...input,hypothesisCount:3,simulationBudget:32});const summary=summarizeLatestGameWorldV2(result);
  assert.deepEqual(GAME_WORLD_LATEST_TECH_TRANSFER_V2.layers,["world-model","persistent-world-memory","autonomous-agent","pcg-world-graph","webgpu-runtime"]);
  assert.equal(result.readiness.internalScore,100);assert.equal(result.readiness.internal100,true);assert.equal(result.readiness.production100,false);assert.equal(summary.runtime,"webgpu");assert.ok(summary.pcgNodes>0);assert.ok(summary.chunkCount>0);
});

ok("Technology transfer is independent implementation, not proprietary code/weight copying",()=>{
  const result=compileLatestGameWorldV2({...input,hypothesisCount:2,simulationBudget:32});assert.equal(result.truth.independentImplementation,true);assert.equal(result.truth.proprietaryCodeCopied,false);assert.equal(result.truth.proprietaryWeightsCopied,false);assert.equal(result.truth.liveGenerativeWorldProviderVerified,false);assert.equal(result.truth.realWebGpuDeviceVerified,false);
});

console.log("✓ Batch132 transfers World Model + Memory + Autonomous Agent + PCG + WebGPU architecture into LANERIQ Game World V2 with auditable internal 100 contracts and separate Production evidence.");
