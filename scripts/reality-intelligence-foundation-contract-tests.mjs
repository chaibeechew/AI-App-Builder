import assert from 'node:assert/strict';
import { REALITY_TRUTH_LEVELS, REALITY_POLICY, summarizeRealityIntelligenceFoundation } from '../lib/reality/reality-intelligence-contract.js';
import { createWorldState, applyWorldEvent, buildWorldMemoryPatch } from '../lib/reality/world-state.js';
import { createCausalModel, buildCounterfactualPlan } from '../lib/reality/causal-counterfactual.js';
import { compileRealityIntent } from '../lib/reality/reality-compiler.js';
import { rankSimulatedFutures } from '../lib/reality/multiverse-search.js';
import { selectIntelligenceFabric } from '../lib/reality/intelligence-fabric.js';
import { assessRealityEvidence } from '../lib/reality/trust-governance.js';
import { buildRealityIntelligencePlan } from '../lib/reality/reality-intelligence-engine.js';

const foundation=summarizeRealityIntelligenceFoundation();
assert.equal(foundation.truth,'CODE_READY');
assert.equal(REALITY_POLICY.simulationIsNotPrediction,true);
assert.equal(REALITY_POLICY.physicalActionRequiresExplicitAuthorization,true);

const world=createWorldState({
  worldId:'world:demo',projectId:'project:demo',
  entities:[
    {id:'room:living',kind:'room',attributes:{floor:1}},
    {id:'sofa:white',kind:'furniture',attributes:{room:'room:living',color:'white'}},
  ],
  relations:[{from:'sofa:white',to:'room:living',type:'located-in'}],
});
assert.equal(world.version,1);
const moved=applyWorldEvent(world,{eventId:'event:1',type:'entity.upsert',entity:{id:'sofa:white',kind:'furniture',attributes:{room:'room:upper',color:'white'}},reason:'move sofa'});
assert.equal(world.version,1);assert.equal(moved.version,2);assert.equal(moved.history.length,1);
assert.equal(buildWorldMemoryPatch(moved).realityWorld.worldId,'world:demo');
assert.throws(()=>applyWorldEvent(moved,{eventId:'event:1',type:'metadata.patch',patch:{x:1}}),/REALITY_WORLD_EVENT_REPLAY/);

const causal=createCausalModel({
  modelId:'causal:property-campaign',
  nodes:[{id:'price'},{id:'clicks'},{id:'viewings'},{id:'sales'}],
  edges:[
    {from:'price',to:'clicks',mechanism:'modeled price sensitivity',evidenceId:'e:price-click',confidence:.7},
    {from:'clicks',to:'viewings',mechanism:'modeled funnel transition',evidenceId:'e:click-view',confidence:.8},
    {from:'viewings',to:'sales',mechanism:'modeled conversion',evidenceId:'e:view-sale',confidence:.75},
  ],
});
assert.equal(causal.truth,'SIMULATION_ONLY');assert.equal(causal.evidenceCoverage,1);
const cf=buildCounterfactualPlan({model:causal,scenarioId:'future:discount',interventions:{price:-7},outcomes:['sales'],assumptions:['Other conditions held constant for the simulation.']});
assert.equal(cf.canClaimPrediction,false);assert.ok(cf.affectedNodes.includes('sales'));
assert.throws(()=>createCausalModel({modelId:'bad',nodes:[{id:'a'},{id:'b'}],edges:[{from:'a',to:'b'},{from:'b',to:'a'}]}),/REALITY_CAUSAL_GRAPH_CYCLE/);

const compiler=compileRealityIntent({intent:'Create and compare future campaign worlds',targets:['simulation','world'],worldId:world.worldId,projectId:world.projectId});
assert.ok(compiler.requiredCapabilities.includes('multiverse-search'));
assert.equal(compiler.executionClass,'code-ready-plan');

const futures=rankSimulatedFutures({
  scenarios:[
    {id:'future:a',metrics:{conversion:82,risk:20},evidenceIds:['sim:a']},
    {id:'future:b',metrics:{conversion:91,risk:45},evidenceIds:['sim:b']},
    {id:'future:no-evidence',metrics:{conversion:100,risk:0}},
  ],
  objectives:{conversion:1,risk:-.5},maxResults:2,
});
assert.equal(futures.truth,'SIMULATION_ONLY');assert.equal(futures.canClaimBestRealFuture,false);assert.equal(futures.rejected[0].rejectedReason,'evidence-required');

const fabricNodes=[
  {id:'local-core',connected:true,available:true,safetyReady:true,costClass:'zero',capabilities:compiler.requiredCapabilities,qualityScore:80,verifiedOutputCount:0},
  {id:'premium-world',connected:true,available:true,safetyReady:true,costClass:'premium',capabilities:compiler.requiredCapabilities,qualityScore:100,verifiedOutputCount:10},
];
const zeroFabric=selectIntelligenceFabric({requiredCapabilities:compiler.requiredCapabilities,nodes:fabricNodes,costMode:'zero',premiumAllowed:false});
assert.equal(zeroFabric.complete,true);assert.equal(zeroFabric.selected[0].id,'local-core');assert.ok(zeroFabric.rejected.some(row=>row.id==='premium-world'&&row.rejectedReason==='cost-policy-blocked'));

const predictedWithoutEvidence=assessRealityEvidence({claimType:'real-world-prediction',evidence:{}});
assert.equal(predictedWithoutEvidence.allowed,false);assert.equal(predictedWithoutEvidence.truth,'EVIDENCE_REQUIRED');assert.ok(predictedWithoutEvidence.blockers.includes('uncertainty-required'));
const actionWithoutApproval=assessRealityEvidence({claimType:'physical-action',evidence:{artifactHash:'a'.repeat(64),outputValidated:true,provenanceId:'prov:1',provenanceVerified:true,observerId:'observer:1',observed:true},authorization:{},action:{physical:true,irreversible:true}});
assert.equal(actionWithoutApproval.allowed,false);assert.ok(actionWithoutApproval.blockers.includes('explicit-user-approval-required'));

const plan=buildRealityIntelligencePlan({
  intent:'Simulate campaign alternatives without claiming a real prediction',targets:['simulation','world'],worldState:world,
  intelligenceNodes:fabricNodes,costMode:'zero',causalModel:causal,
  counterfactual:{scenarioId:'future:discount-2',interventions:{price:-5},outcomes:['sales']},
  scenarios:[{id:'future:a',metrics:{conversion:82},evidenceIds:['sim:a']}],objectives:{conversion:1},claimType:'simulation',
});
assert.equal(plan.truth,REALITY_TRUTH_LEVELS.SIMULATION_ONLY);assert.equal(plan.canExecute,true);assert.equal(plan.governance.allowed,true);
assert.ok(plan.statement.includes('simulations'));

console.log('Reality Intelligence foundation contracts passed: world state, causal/counterfactual planning, Reality Compiler, Multiverse Search, Intelligence Fabric and Trust/Governance are fail-closed and simulation-truthful.');
