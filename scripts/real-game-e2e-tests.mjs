import assert from "node:assert/strict";
import {REAL_GAME_E2E_CASES,buildDeterministicGameSpecification,auditGeneratedGameSpecification,repairGeneratedGameSpecification,runRealGameE2ESuite} from "../lib/game/real-game-e2e-v1.js";
import {inferMobileGamePlan} from "../lib/ai/mobile-game-knowledge.js";
import {resolveGeneratedRuntime} from "../lib/game/game-runtime-router-v1.js";

const suite=runRealGameE2ESuite();
assert.equal(suite.total,6);
assert.equal(suite.failed,0,JSON.stringify(suite.results.filter(x=>!x.passed),null,2));
assert.equal(suite.score,100);
assert.equal(suite.canPassGate,true);
assert.equal(suite.externalAiProviderCalled,false);
for(const result of suite.results){
  assert.equal(result.passed,true,`${result.name} E2E failed: ${result.play.detail}`);
  assert.equal(result.productionEvidenceClaimed,false);
  assert.ok(["ios","android","web"].every(platform=>result.specification.platforms.includes(platform)));
  assert.equal(result.route.runtimeId,result.expectedArchetype==="moba"?"moba-runtime-v1":result.expectedArchetype==="air_combat"?"air-combat-runtime-v1":["rpg","puzzle","action"].includes(result.expectedArchetype)?"specialist-runtime-v1":"advanced-genre-runtime-v1");
}
console.log("✓ Six real game ideas pass natural-language planning → specification → Preview routing → actual runtime play loops");
console.log(suite.results.map(x=>`  ${x.name}: ${x.expectedArchetype} → ${x.route.runtimeId} → ${x.play.status}`).join("\n"));

const racingCase=REAL_GAME_E2E_CASES.find(x=>x.id==="street-racing");
const plan=inferMobileGamePlan(racingCase.idea);const healthy=buildDeterministicGameSpecification(racingCase);
const corrupted={...healthy,game:{...healthy.game,archetype:"custom",genre:"Custom Game"}};
const badAudit=auditGeneratedGameSpecification(corrupted,plan);
assert.equal(badAudit.passed,false);
assert.equal(resolveGeneratedRuntime(corrupted).runtimeId,"game-runtime-v1");
const repaired=repairGeneratedGameSpecification(corrupted,plan);const repairedAudit=auditGeneratedGameSpecification(repaired,plan);
assert.equal(repairedAudit.passed,true);
assert.equal(resolveGeneratedRuntime(repaired).runtimeId,"advanced-genre-runtime-v1");
assert.equal(repaired.e2e.repaired,true);
console.log("✓ Self-Check detects a deliberately corrupted generated game route and Self-Repair restores the correct Racing runtime");

const moba=suite.results.find(x=>x.id==="original-moba"),air=suite.results.find(x=>x.id==="air-combat");
assert.equal(moba.planner.multiplayer,true);
assert.equal(moba.productionEvidenceClaimed,false);
assert.equal(air.productionEvidenceClaimed,false);
assert.match(suite.truthRule,/does not prove/i);
console.log("✓ Online/provider/native/store truth boundaries stay fail-closed during real-game E2E validation");
