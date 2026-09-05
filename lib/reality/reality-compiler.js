import { REALITY_TRUTH_LEVELS } from './reality-intelligence-contract.js';

const freeze=value=>Object.freeze(value);
const clean=(value,max=4000)=>String(value??'').replace(/[\u0000-\u001f\u007f]/g,'').trim().slice(0,max);
const list=value=>Array.isArray(value)?value:[];

const TARGETS=Object.freeze({
  image:['world-state','creative-media','quality-judge','provenance'],
  video:['world-state','creative-media','continuity','cinema-physics','quality-judge','provenance'],
  app:['world-state','app-builder','project-memory','verification'],
  web:['world-state','app-builder','publish','verification'],
  simulation:['world-state','causal-plan','counterfactual-plan','multiverse-search','uncertainty'],
  agent:['world-state','intelligence-fabric','authorization','audit'],
  world:['world-state','continuity','causal-plan','simulation','trust-governance'],
});

export function listRealityCompilerTargets(){return Object.keys(TARGETS);}

export function compileRealityIntent({intent,targets=['world'],constraints={},worldId=null,projectId=null}={}){
  const instruction=clean(intent);if(!instruction)throw new Error('REALITY_COMPILER_INTENT_REQUIRED');
  const normalizedTargets=[...new Set(list(targets).map(value=>clean(value,40).toLowerCase()).filter(Boolean))];
  if(!normalizedTargets.length)throw new Error('REALITY_COMPILER_TARGET_REQUIRED');
  for(const target of normalizedTargets){if(!TARGETS[target])throw new Error('REALITY_COMPILER_TARGET_UNSUPPORTED');}
  const capabilities=[...new Set(normalizedTargets.flatMap(target=>TARGETS[target]))];
  const normalizedConstraints=constraints&&typeof constraints==='object'&&!Array.isArray(constraints)?{...constraints}:{};
  const requiresPhysicalAction=normalizedConstraints.physicalAction===true;
  const requiresExternalPrediction=normalizedConstraints.claimRealWorldPrediction===true;
  const blockers=[];
  if(requiresPhysicalAction)blockers.push('physical-action-authorization-and-live-world-evidence-required');
  if(requiresExternalPrediction)blockers.push('real-world-prediction-validation-required');
  return freeze({
    schemaVersion:1,
    intent:instruction,
    worldId:clean(worldId,160)||null,
    projectId:clean(projectId,160)||null,
    targets:freeze(normalizedTargets),
    requiredCapabilities:freeze(capabilities),
    constraints:freeze(normalizedConstraints),
    stages:freeze([
      'resolve-world-state','plan-causal-and-continuity-constraints','select-intelligence-modules','compile-target-manifests','simulate-or-generate-candidates','judge-and-repair','attach-trust-evidence','request-authorization-if-actionable'
    ]),
    blockers:freeze(blockers),
    executionClass:blockers.length?'simulation-only':'code-ready-plan',
    truth:blockers.length?REALITY_TRUTH_LEVELS.EVIDENCE_REQUIRED:REALITY_TRUTH_LEVELS.CODE_READY,
    statement:'Reality Compiler converts intent into a governed execution manifest. It does not invent unavailable providers, verified predictions, or physical permissions.',
  });
}
