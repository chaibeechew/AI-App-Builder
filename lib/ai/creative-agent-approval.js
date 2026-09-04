const freeze=value=>Object.freeze(value);

export function evaluateCreativeAgentApprovals({plan,approvals={}}={}){
  if(!plan||!plan.contract) throw new Error('CREATIVE_AGENT_PLAN_REQUIRED');
  const source=approvals&&typeof approvals==='object'?approvals:{};
  const missing=[];
  const accepted={};
  for(const reason of plan.contract.approvalReasons||[]){
    const item=source[reason];
    const ok=item&&item.approved===true&&typeof item.approvedAt==='string'&&item.approvedAt.trim().length>=10;
    if(!ok) missing.push(reason);
    else accepted[reason]={approved:true,approvedAt:item.approvedAt,approvedBy:String(item.approvedBy||'human').trim()||'human'};
  }
  return freeze({
    required:(plan.contract.approvalReasons||[]).length>0,
    approved:missing.length===0,
    missing:freeze(missing),
    accepted:freeze(accepted),
    inferredApproval:false,
  });
}
