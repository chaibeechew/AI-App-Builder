import { REALITY_TRUTH_LEVELS } from './reality-intelligence-contract.js';

const freeze=value=>Object.freeze(value);
const clean=(value,max=200)=>String(value??'').trim().slice(0,max);
const list=value=>Array.isArray(value)?value:[];
const hash=/^[a-f0-9]{64}$/i;

export function assessRealityEvidence({
  claimType='simulation',evidence={},authorization={},action={}
}={}){
  const type=clean(claimType,60).toLowerCase();
  const blockers=[];
  const artifactHash=clean(evidence.artifactHash||evidence.sha256,128).toLowerCase();
  const provenanceId=clean(evidence.provenanceId,200);
  const observerId=clean(evidence.observerId,200);
  const uncertainty=Number(evidence.uncertainty);
  const hasUncertainty=Number.isFinite(uncertainty)&&uncertainty>=0&&uncertainty<=1;
  const verifiedArtifact=hash.test(artifactHash)&&evidence.outputValidated===true;
  const verifiedProvenance=Boolean(provenanceId)&&evidence.provenanceVerified===true;
  const independentObservation=Boolean(observerId)&&evidence.observed===true;
  if(type==='verified-world'||type==='real-world-prediction'||type==='physical-action'){
    if(!verifiedArtifact)blockers.push('verified-artifact-required');
    if(!verifiedProvenance)blockers.push('verified-provenance-required');
    if(!independentObservation)blockers.push('independent-observation-required');
  }
  if(type==='real-world-prediction'&&!hasUncertainty)blockers.push('uncertainty-required');
  const physical=type==='physical-action'||action.physical===true;
  if(physical){
    if(authorization.explicitUserApproval!==true)blockers.push('explicit-user-approval-required');
    if(action.irreversible===true&&authorization.humanApproval!==true)blockers.push('human-approval-required-for-irreversible-action');
    if(!clean(authorization.scope,200))blockers.push('authorization-scope-required');
  }
  const allowed=blockers.length===0;
  let truth=REALITY_TRUTH_LEVELS.SIMULATION_ONLY;
  if(type==='verified-world'&&allowed)truth=REALITY_TRUTH_LEVELS.LIVE_WORLD_VERIFIED;
  if(physical&&allowed)truth=REALITY_TRUTH_LEVELS.REALITY_ACTION_AUTHORIZED;
  if(type==='simulation')truth=REALITY_TRUTH_LEVELS.SIMULATION_ONLY;
  if(!allowed)truth=REALITY_TRUTH_LEVELS.EVIDENCE_REQUIRED;
  return freeze({
    allowed,claimType:type,truth,blockers:freeze(blockers),
    evidence:freeze({verifiedArtifact,verifiedProvenance,independentObservation,hasUncertainty,uncertainty:hasUncertainty?uncertainty:null}),
    authorization:freeze({explicitUserApproval:authorization.explicitUserApproval===true,humanApproval:authorization.humanApproval===true,scope:clean(authorization.scope,200)||null}),
    audit:freeze({reason:clean(action.reason,300)||null,reversible:action.irreversible!==true,requestedEffects:freeze(list(action.effects).map(v=>clean(v,200)).filter(Boolean).slice(0,50))}),
    statement:allowed?'Governance requirements satisfied for the declared claim/action class.':'Fail-closed: declared claim/action cannot be promoted until all evidence and authorization blockers are cleared.',
  });
}
