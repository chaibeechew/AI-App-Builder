import assert from "node:assert/strict";
import {buildWasmWorkerPolicyV8,evaluateDependencyV8,evaluateGameWorldSupplyChainV8} from "../lib/game/game-world-supply-chain-v8.js";

const policy=buildWasmWorkerPolicyV8({memoryMb:128,cpuMs:50});
assert.equal(policy.network,"deny-by-default");
assert.equal(policy.fallback,"laneriq-internal-physics-nav");

const blocked=evaluateDependencyV8({package:"example",version:"1.0.0",exactVersion:true,integrityPinned:true,license:"MIT",provenanceVerified:true,workerIsolated:true,resourceLimits:policy,findings:[{severity:"high",resolved:false}]});
assert.equal(blocked.productionAccepted,false);
assert.ok(blocked.blocks.includes("unresolved-high-or-critical-security-finding"));

const accepted=evaluateDependencyV8({package:"safe",version:"1.2.3",exactVersion:true,integrityPinned:true,license:"MIT",provenanceVerified:true,workerIsolated:true,resourceLimits:policy,findings:[]});
assert.equal(accepted.productionAccepted,true);

const gate=evaluateGameWorldSupplyChainV8({workerPolicy:policy,dependencies:[{package:"safe",version:"1.2.3",exactVersion:true,integrityPinned:true,license:"MIT",provenanceVerified:true,findings:[]}]});
assert.equal(gate.readiness.internal100,true);
assert.equal(gate.truth.supplyChainGateExecutable,true);
assert.equal(gate.truth.externalWasmProductionBundled,false);
assert.equal(gate.readiness.production100,false);
console.log("Game World V8 Supply Chain: 100 INTERNAL CODE; Production acceptance remains evidence-gated");
