const freeze=value=>Object.freeze(value);

export function buildCreativeAgentDeliveryPack({
  plan,
  selectedCandidateIds=[],
  persistedAssetIds=[],
  provenanceEvidenceIds=[],
  approvals={approved:true},
}={}){
  if(!plan||!plan.planId) throw new Error('CREATIVE_AGENT_PLAN_REQUIRED');
  if(!Array.isArray(selectedCandidateIds)||selectedCandidateIds.length===0) throw new Error('CREATIVE_AGENT_SELECTED_CANDIDATE_REQUIRED');
  if(!Array.isArray(persistedAssetIds)||persistedAssetIds.length===0) throw new Error('CREATIVE_AGENT_DURABLE_ASSET_REQUIRED');
  if(!Array.isArray(provenanceEvidenceIds)||provenanceEvidenceIds.length===0) throw new Error('CREATIVE_AGENT_PROVENANCE_REQUIRED');
  if((plan.contract.approvalReasons||[]).length&&approvals.approved!==true) throw new Error('CREATIVE_AGENT_HUMAN_APPROVAL_REQUIRED');
  return freeze({
    planId:plan.planId,
    selectedCandidateIds:freeze([...new Set(selectedCandidateIds.map(String))]),
    persistedAssetIds:freeze([...new Set(persistedAssetIds.map(String))]),
    provenanceEvidenceIds:freeze([...new Set(provenanceEvidenceIds.map(String))]),
    readyForHumanDelivery:true,
    autoPublished:false,
    liveProviderEvidence:false,
    realOutputQualityEvidence:false,
  });
}
