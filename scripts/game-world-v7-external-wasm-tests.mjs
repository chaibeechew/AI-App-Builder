import assert from "node:assert/strict";
import {runRapierWasmProbeV7,runRecastWasmProbeV7,mergeExternalWasmEvidenceV7} from "../lib/game/game-world-wasm-runtime-v7.js";

console.log("Loading pinned external WASM engines...");
const [rapier,recastCore,recastGenerators]=await Promise.all([
  import("@dimforge/rapier3d-deterministic-compat"),
  import("recast-navigation"),
  import("recast-navigation/generators")
]);

const rapierEvidence=await runRapierWasmProbeV7(rapier,{steps:180});
console.log("Rapier evidence",JSON.stringify(rapierEvidence.rapier));
assert.equal(rapierEvidence.truth.externalRapierWasmVerified,true,rapierEvidence.rapier.error||"Rapier WASM verification failed");

const recastEvidence=await runRecastWasmProbeV7(recastCore,recastGenerators,{size:32,cells:12});
console.log("Recast evidence",JSON.stringify(recastEvidence.recast));
assert.equal(recastEvidence.truth.externalRecastWasmVerified,true,recastEvidence.recast.error||"Recast WASM verification failed");
assert.ok(recastEvidence.recast.pathPoints>=2);

const merged=mergeExternalWasmEvidenceV7(rapierEvidence,recastEvidence);
assert.equal(merged.truth.externalRapierWasmVerified,true);
assert.equal(merged.truth.externalRecastWasmVerified,true);
assert.equal(merged.truth.productionBundled,false);
assert.equal(merged.truth.realDeviceExecuted,false);

console.log("\nGame World V7 external WASM: Rapier + Recast VERIFIED in executable CI runtime");
console.log(JSON.stringify(merged,null,2));
