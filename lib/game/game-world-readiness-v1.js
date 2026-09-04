// LANERIQ AI Game World Readiness V1
// Unified internal-code gate across Generator + Simulation Intelligence + Reasoning Orchestrator.
// Production/live evidence remains deliberately separate.

import {GAME_WORLD_GENERATOR_V1,compileGameWorldProject} from "./game-world-generator-v1.js";
import {runWorldSimulationIntelligence,auditSimulationIntelligence,scenarioSpaceSummary,GAME_WORLD_SIMULATION_INTELLIGENCE_V1} from "./game-world-simulation-intelligence-v1.js";
import {runWorldReasoningOrchestration,auditWorldReasoningOrchestration,GAME_WORLD_REASONING_ORCHESTRATOR_V1} from "./game-world-reasoning-orchestrator-v1.js";

export const GAME_WORLD_READINESS_AREAS=Object.freeze({
  internal:Object.freeze([
    "worldGeneratorArchitecture",
    "deterministicBlueprint",
    "aiMapAndSceneBridge",
    "existingGameRuntimeBridge",
    "scenarioSimulationIntelligence",
    "counterfactualAndAdversarialCoverage",
    "constraintAndRepairPlanning",
    "multiHypothesisReasoning",
    "deterministicEvidenceReplay",
    "truthBoundary"
  ]),
  production:Object.freeze([
    "final3dRendererEvidence",
    "realEngineExporterEvidence",
    "realDeviceGpuThermalEvidence",
    "liveEconomyEvidence",
    "liveMultiplayerEvidence",
    "storeDistributionEvidence"
  ])
});

export function currentGameWorldReadinessEvidence({prompt="Epic mobile open world RPG with castle, quests, treasure, dungeons and bosses",seed="game-world-readiness"}={}){
  const project=compileGameWorldProject({prompt,seed,levelCount:18,treasureCount:24,bossCount:4});
  const simulation=runWorldSimulationIntelligence(project.blueprint,{seed:`${seed}:simulation`,budget:64});
  const simulationAudit=auditSimulationIntelligence(simulation);
  const reasoning=runWorldReasoningOrchestration({prompt,seed:`${seed}:reasoning`,levelCount:18,treasureCount:24,bossCount:4,hypothesisCount:3,simulationBudget:32});
  const reasoningAudit=auditWorldReasoningOrchestration(reasoning);
  const sceneValid=project.scene?.valid===true;
  const runtimeReady=Boolean(project.runtime?.systems?.length&&project.runtime?.platforms?.length);
  const space=scenarioSpaceSummary();
  const gates={
    worldGeneratorArchitecture:GAME_WORLD_GENERATOR_V1.architecture==="world-layer-over-existing-game-runtime"&&GAME_WORLD_GENERATOR_V1.technologyTransfer.length>=3,
    deterministicBlueprint:GAME_WORLD_GENERATOR_V1.deterministic===true&&project.blueprint?.generation?.deterministic===true,
    aiMapAndSceneBridge:Array.isArray(project.blueprint?.regions)&&project.blueprint.regions.length>=2&&sceneValid,
    existingGameRuntimeBridge:runtimeReady,
    scenarioSimulationIntelligence:simulationAudit.score===100&&GAME_WORLD_SIMULATION_INTELLIGENCE_V1.scenarioDimensions===24,
    counterfactualAndAdversarialCoverage:simulation.executed.counterfactual>0&&simulation.executed.adversarial>0,
    constraintAndRepairPlanning:Boolean(simulation.constraints)&&Array.isArray(simulation.repair?.actions),
    multiHypothesisReasoning:reasoningAudit.score===100&&reasoning.hypothesisCount>=2,
    deterministicEvidenceReplay:simulation.evidence?.deterministic===true&&reasoning.evidence?.deterministic===true,
    truthBoundary:space.exhaustive===false&&simulation.evidence?.productionEvidence===false&&reasoning.evidence?.productionAutoWrite===false
  };
  const score=Math.round(Object.values(gates).filter(Boolean).length/Object.keys(gates).length*100);
  const productionEvidence={
    final3dRendererEvidence:false,
    realEngineExporterEvidence:false,
    realDeviceGpuThermalEvidence:false,
    liveEconomyEvidence:false,
    liveMultiplayerEvidence:false,
    storeDistributionEvidence:false
  };
  return{
    version:"game-world-readiness-v1",
    score,
    gates,
    internalAreas:GAME_WORLD_READINESS_AREAS.internal,
    productionAreas:GAME_WORLD_READINESS_AREAS.production,
    scenarioSpace:space,
    simulationAudit:simulationAudit.score,
    reasoningAudit:reasoningAudit.score,
    productionEvidence,
    canClaimInternal100:score===100,
    canClaimProduction100:Object.values(productionEvidence).every(Boolean),
    truthRule:"100 INTERNAL CODE means the deterministic Game World generation, map/scene/runtime bridge, simulation intelligence, counterfactual/adversarial coverage, constraint/repair planning and multi-hypothesis reasoning contracts all pass. Production 100 requires separately measured renderer, exporter, real-device, live economy, live multiplayer and store evidence."
  };
}
