import {evidenceKinds} from "./laneriq-experience-ledger.js";

function clean(value,max=80){return String(value||"").replace(/[\u0000-\u001f\u007f]/g," ").trim().slice(0,max);}
function hasPassed(candidate,kind,predicate=()=>true){return (Array.isArray(candidate?.evidence)?candidate.evidence:[]).some(item=>item?.kind===kind&&item?.passed===true&&predicate(item));}

export function evaluateKnowledgePromotion(candidate={}, {target="validated",reviewerApproved=false}={}){
  const kinds=evidenceKinds(candidate),risk=clean(candidate?.risk,16).toLowerCase()||"normal";
  const blockers=[];
  if(candidate?.contract!=="laneriq-experience-candidate-v1")blockers.push("invalid-candidate-contract");
  if(candidate?.status!=="candidate")blockers.push("candidate-status-required");
  if(candidate?.containsRawSecrets!==false)blockers.push("secret-safety-unverified");
  if(candidate?.containsPrivateUserContent!==false)blockers.push("private-user-content-safety-unverified");
  if(candidate?.containsDirectPii!==false)blockers.push("direct-pii-safety-unverified");
  if(candidate?.autoPromotable!==false)blockers.push("auto-promotion-forbidden");
  if(!hasPassed(candidate,"contract"))blockers.push("deterministic-contract-evidence-required");
  if(kinds.length<2)blockers.push("independent-evidence-diversity-required");
  if(risk==="critical"&&!hasPassed(candidate,"manual_review"))blockers.push("critical-risk-manual-review-evidence-required");

  if(target==="production_rule"){
    if(reviewerApproved!==true)blockers.push("human-review-approval-required");
    if(!hasPassed(candidate,"production_exact_sha",item=>item.exactSha===true&&item.independent===true))blockers.push("independent-exact-sha-production-evidence-required");
    const runtimeEvidence=hasPassed(candidate,"runtime",item=>item.independent===true)||hasPassed(candidate,"physical_device",item=>item.independent===true)||hasPassed(candidate,"benchmark",item=>item.independent===true);
    if(!runtimeEvidence)blockers.push("independent-runtime-benchmark-or-device-evidence-required");
  }

  const allowed=blockers.length===0;
  return{contract:"laneriq-knowledge-promotion-decision-v1",candidateId:clean(candidate?.id,40),target:target==="production_rule"?"production_rule":"validated",allowed,blockers,evidenceKinds:kinds,reviewerApproved:reviewerApproved===true,decision:allowed?"promotable":"blocked"};
}

export function promoteKnowledgeCandidate(candidate={},options={}){
  const decision=evaluateKnowledgePromotion(candidate,options);
  if(!decision.allowed)return{...candidate,status:"candidate",promotion:decision};
  return{...candidate,status:decision.target==="production_rule"?"production_rule":"validated",promotion:decision,autoPromotable:false};
}
