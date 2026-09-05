import { assessRealityEvidence } from '../reality/trust-governance.js';
import { securityIntelligenceCloudStatus } from '../../services/malware-defense/lib/security-intelligence-cloud.js';
import { UNIFIED_TRUTH_LEVELS } from './unified-intelligence-contract.js';

const freeze=value=>Object.freeze(value);
const clean=(value,max=240)=>String(value??'').replace(/[\u0000-\u001f\u007f]/g,'').trim().slice(0,max);
const list=value=>Array.isArray(value)?value:[];

export function assessActionAuthority({action={},authorization={},evidence={},securityAssessment={}}={}){
  const effects=list(action.effects).map(value=>clean(value,200)).filter(Boolean).slice(0,50);
  const physical=action.physical===true;
  const external=action.external===true||physical;
  const irreversible=action.irreversible===true;
  const blockers=[];
  const scope=clean(authorization.scope,200);
  if(!scope)blockers.push('authorization-scope-required');
  if(external&&authorization.explicitUserApproval!==true)blockers.push('explicit-user-approval-required');
  if(irreversible&&authorization.humanApproval!==true)blockers.push('human-approval-required-for-irreversible-action');
  if(external&&securityAssessment.checked!==true)blockers.push('security-check-required');
  if(securityAssessment.blocked===true)blockers.push('security-policy-blocked');
  if(external&&securityAssessment.stale===true)blockers.push('fresh-security-evidence-required');

  const governanceRequired=physical||(external&&irreversible);
  const governanceClaimType=physical?'physical-action':(external&&irreversible?'verified-world':'simulation');
  const governance=assessRealityEvidence({claimType:governanceClaimType,evidence,authorization,action:{...action,effects}});
  if(governanceRequired&&!governance.allowed)blockers.push(...governance.blockers);

  const securityStatus=securityIntelligenceCloudStatus();
  const uniqueBlockers=[...new Set(blockers)];
  const allowed=uniqueBlockers.length===0;
  return freeze({
    allowed,
    truth:allowed?UNIFIED_TRUTH_LEVELS.OBSERVED_VERIFIED:UNIFIED_TRUTH_LEVELS.ACTION_AUTHORIZATION_REQUIRED,
    blockers:freeze(uniqueBlockers),
    governance,
    governanceRequired,
    action:freeze({physical,external,irreversible,effects,reason:clean(action.reason,300)||null}),
    authorization:freeze({scope:scope||null,explicitUserApproval:authorization.explicitUserApproval===true,humanApproval:authorization.humanApproval===true}),
    security:freeze({checked:securityAssessment.checked===true,blocked:securityAssessment.blocked===true,stale:securityAssessment.stale===true,assessmentId:clean(securityAssessment.assessmentId,160)||null,intelligenceVersion:securityStatus.version,intelligenceCanAuthorizeClean:securityStatus.canAuthorizeClean===true}),
    rule:'Security Intelligence cannot authorize CLEAN. External irreversible and physical actions fail closed until scoped approval, fresh security checks and independently observed verified-world evidence are all satisfied.',
  });
}
