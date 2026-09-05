import { REALITY_TRUTH_LEVELS, summarizeRealityIntelligenceFoundation } from './reality-intelligence-contract.js';
import { compileRealityIntent } from './reality-compiler.js';
import { selectIntelligenceFabric } from './intelligence-fabric.js';
import { buildCounterfactualPlan } from './causal-counterfactual.js';
import { rankSimulatedFutures } from './multiverse-search.js';
import { assessRealityEvidence } from './trust-governance.js';

const freeze=value=>Object.freeze(value);
const clean=(value,max=160)=>String(value??'').trim().slice(0,max);

export function buildRealityIntelligencePlan({
  intent,targets=['world'],constraints={},worldState=null,
  intelligenceNodes=[],costMode='zero',premiumAllowed=false,
  causalModel=null,counterfactual=null,scenarios=null,objectives=null,
  claimType='simulation',evidence={},authorization={},action={}
}={}){
  const compiler=compileRealityIntent({
    intent,targets,constraints,worldId:worldState?.worldId||null,projectId:worldState?.projectId||null,
  });
  const fabric=selectIntelligenceFabric({
    requiredCapabilities:compiler.requiredCapabilities,
    nodes:intelligenceNodes,costMode,premiumAllowed,
  });
  let counterfactualPlan=null;
  if(causalModel&&counterfactual){counterfactualPlan=buildCounterfactualPlan({model:causalModel,...counterfactual});}
  let multiverse=null;
  if(Array.isArray(scenarios)&&scenarios.length&&objectives){multiverse=rankSimulatedFutures({scenarios,objectives,requireEvidence:true});}
  const governance=assessRealityEvidence({claimType,evidence,authorization,action});
  const blockers=[...compiler.blockers];
  if(!fabric.complete)blockers.push('intelligence-fabric-capability-gap');
  if(!governance.allowed&&claimType!=='simulation')blockers.push(...governance.blockers);
  if(constraints?.requiresPersistentWorld===true&&!worldState?.worldId)blockers.push('persistent-world-state-required');
  const canExecute=blockers.length===0&&fabric.complete;
  let truth=REALITY_TRUTH_LEVELS.CODE_READY;
  if(claimType==='simulation')truth=REALITY_TRUTH_LEVELS.SIMULATION_ONLY;
  else if(!canExecute)truth=REALITY_TRUTH_LEVELS.EVIDENCE_REQUIRED;
  else truth=governance.truth;
  return freeze({
    schemaVersion:1,
    foundation:summarizeRealityIntelligenceFoundation(),
    planId:clean(constraints?.planId||`reality:${worldState?.worldId||'unbound'}`,160),
    world:worldState?freeze({worldId:worldState.worldId,projectId:worldState.projectId,version:worldState.version}):null,
    compiler,fabric,counterfactual:counterfactualPlan,multiverse,governance,
    blockers:freeze([...new Set(blockers)]),canExecute,truth,
    nextStages:freeze([
      canExecute?'dispatch-capability-modules':'resolve-blockers',
      'collect-observed-evidence','judge-output','update-world-state-with-approved-events','persist-project-scoped-memory'
    ]),
    statement:'LANERIQ Reality Intelligence coordinates world state, explicit causal assumptions, simulated futures, capability routing and governance. Future-facing results remain simulations until independently validated.',
  });
}
