import assert from "node:assert/strict";
import fs from "node:fs";
import {
  GAME_WORLD_GENERATOR_V1,
  GAME_WORLD_TEMPLATES,
  inferGameWorldIntent,
  buildWorldBlueprint,
  buildWorldSceneDocument,
  buildWorldGameplayPackage,
  buildWorldStreamingPlan,
  compileWorldToGameRuntime,
  compileGameWorldProject,
  summarizeWorldProject
} from "../lib/game/game-world-generator-v1.js";

const ok=(name,fn)=>{fn();console.log(`✓ ${name}`);};

ok("Game World Generator is a technology-transfer layer over the existing game stack",()=>{
  assert.equal(GAME_WORLD_GENERATOR_V1.architecture,"world-layer-over-existing-game-runtime");
  assert.deepEqual(GAME_WORLD_GENERATOR_V1.technologyTransfer,["game-runtime-v1","advanced-3d-gameplay-v1","content-production-pipeline-v1"]);
  assert.equal(GAME_WORLD_GENERATOR_V1.internalWorldContractVerified,true);
  assert.equal(GAME_WORLD_GENERATOR_V1.productionRendererVerified,false);
  assert.equal(GAME_WORLD_GENERATOR_V1.realEngineExporterVerified,false);
  assert.ok(GAME_WORLD_TEMPLATES.length>=8);
});

ok("Intent parser recognizes map/world gameplay requirements without provider calls",()=>{
  const intent=inferGameWorldIntent("Create a huge dark fantasy open world with a castle, 5 dungeon levels, 30 treasure chests, 4 boss fights, villages, quests and snow weather");
  assert.equal(intent.scale,"large");
  assert.equal(intent.requested.castle,true);
  assert.equal(intent.requested.dungeon,true);
  assert.equal(intent.requested.treasure,true);
  assert.equal(intent.requested.boss,true);
  assert.equal(intent.requested.village,true);
  assert.equal(intent.requested.quest,true);
  assert.equal(intent.requested.weather,true);
  assert.equal(intent.treasureCount,30);
  assert.equal(intent.bossCount,4);
});

ok("World Blueprint and AI MAP structure are deterministic, connected and progression-aware",()=>{
  const input={prompt:"Dark fantasy RPG with central castle, dungeon, 24 treasure chests, 3 bosses and quests",seed:"evidence-seed-127",levelCount:18};
  const a=buildWorldBlueprint(input),b=buildWorldBlueprint(input);
  assert.deepEqual(a,b);
  assert.ok(a.regions.length>=6);
  assert.ok(a.routes.length>=a.regions.length-1);
  assert.deepEqual(a.progression.criticalPath,a.regions.map(region=>region.id));
  assert.equal(a.progression.levels,18);
  assert.equal(a.progression.bosses,3);
  assert.equal(a.progression.treasures,24);
  assert.ok(a.pointsOfInterest.some(item=>item.type==="castle"));
  assert.ok(a.pointsOfInterest.some(item=>item.type==="dungeon"));
});

ok("World Scene Document transfers generated regions and POIs into the safe scriptless scene contract",()=>{
  const blueprint=buildWorldBlueprint({prompt:"Fantasy castle dungeon world with treasure and bosses",seed:"scene-127"});
  const scene=buildWorldSceneDocument(blueprint);
  assert.equal(scene.valid,true);
  assert.equal(scene.errors.length,0);
  assert.ok(scene.scene.entityCount>=blueprint.regions.length+blueprint.pointsOfInterest.length);
  assert.ok(scene.scene.checksum);
});

ok("Dungeon, treasure, boss, quest and weather systems reuse existing deterministic 3D gameplay contracts",()=>{
  const blueprint=buildWorldBlueprint({prompt:"Ice RPG with castle, dungeon, snow, quests, 12 treasure chests and 2 bosses",seed:"gameplay-127",levelCount:10});
  const gameplay=buildWorldGameplayPackage(blueprint);
  assert.ok(gameplay.dungeons.length>=1);
  assert.equal(gameplay.treasure.length,12);
  assert.equal(gameplay.bosses.length,2);
  assert.ok(gameplay.quests.length>=1);
  assert.ok(["clear","snow"].includes(gameplay.weather.weather));
  assert.ok(gameplay.treasure.every(item=>Array.isArray(item.loot.drops)));
});

ok("Large-world streaming planning and Game Runtime V1 remain shared instead of duplicated",()=>{
  const blueprint=buildWorldBlueprint({prompt:"Huge open world RPG with dungeon treasure and boss",seed:"stream-127",scale:"large",levelCount:20});
  const streaming=buildWorldStreamingPlan(blueprint);
  const runtime=compileWorldToGameRuntime(blueprint);
  assert.ok(streaming);
  assert.equal(runtime.playable,true);
  assert.equal(runtime.productType,"mobile_game");
  assert.equal(runtime.progression.maxLevel,20);
  assert.ok(runtime.platforms.includes("ios"));
  assert.ok(runtime.platforms.includes("android"));
  assert.ok(runtime.platforms.includes("web-preview"));
});

ok("Full World Project compiles Prompt → Blueprint → Map/Scene → Gameplay → Runtime with truth-gated evidence",()=>{
  const input={prompt:"Epic dark fantasy open world. Central castle, villages, five-floor dungeon, 30 treasure chests, 4 bosses and quest lines.",seed:"full-world-127",levelCount:24};
  const a=compileGameWorldProject(input),b=compileGameWorldProject(input);
  assert.equal(a.validation.valid,true);
  assert.deepEqual(a.blueprint,b.blueprint);
  assert.deepEqual(a.gameplay,b.gameplay);
  assert.equal(a.runtime.playable,true);
  assert.equal(a.evidence.worldContract,"internal-verified");
  assert.equal(a.evidence.productionRenderer,false);
  assert.equal(a.evidence.realEngineExport,false);
  assert.equal(a.evidence.realDeviceWorldPerformance,false);
  const summary=summarizeWorldProject(a);
  assert.equal(summary.valid,true);
  assert.equal(summary.playableRuntime,true);
  assert.equal(summary.bosses,4);
  assert.equal(summary.treasures,30);
});

ok("Game World product surface exposes AI MAP, Blueprint and existing-runtime handoff",()=>{
  const page=fs.readFileSync("app/game-world/page.js","utf8");
  const layout=fs.readFileSync("app/game-builder/layout.js","utf8");
  assert.match(page,/LANERIQ AI GAME WORLD GENERATOR/);
  assert.match(page,/AI MAP/);
  assert.match(page,/WORLD BLUEPRINT/);
  assert.match(page,/Existing Game Runtime/);
  assert.match(page,/Production truth boundary/);
  assert.match(page,/compileGameWorldProject/);
  assert.match(layout,/\/game-world/);
});

console.log("✓ Batch127 transfers existing game runtime + advanced 3D + content pipeline technology into one deterministic Game World Generator domain");
console.log("✓ Internal world contracts are testable now; real renderer/exporter/device evidence stays explicitly gated");
