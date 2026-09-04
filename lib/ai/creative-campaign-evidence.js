const freeze=value=>Object.freeze(value);
const SHA256=/^[a-f0-9]{64}$/i;

export function buildCreativeCampaignEvidenceSlots({campaign}={}){
  if(!campaign?.campaignId) throw new Error('CREATIVE_CAMPAIGN_REQUIRED');
  return freeze((campaign.deliverables||[]).map(item=>freeze({
    deliverableId:item.id,
    target:item.target,
    persistedAssetId:null,
    artifactHash:null,
    provenanceId:null,
    qualityPassed:false,
    continuityPassed:item.continuityRequired?false:null,
    providerLiveVerified:false,
    productionVerified:false,
    complete:false,
  })));
}

export function evaluateCreativeCampaignEvidence({campaign,evidence=[]}={}){
  if(!campaign?.campaignId) throw new Error('CREATIVE_CAMPAIGN_REQUIRED');
  const map=new Map((Array.isArray(evidence)?evidence:[]).map(item=>[String(item?.deliverableId||''),item]));
  const results=(campaign.deliverables||[]).map(item=>{
    const e=map.get(item.id)||{};
    const assetId=String(e.persistedAssetId||'').trim();
    const hash=String(e.artifactHash||'').trim();
    const provenance=String(e.provenanceId||'').trim();
    const continuityOk=!item.continuityRequired||e.continuityPassed===true;
    const complete=Boolean(assetId)&&SHA256.test(hash)&&Boolean(provenance)&&e.qualityPassed===true&&continuityOk;
    return freeze({deliverableId:item.id,complete,productionVerified:e.productionVerified===true,providerLiveVerified:e.providerLiveVerified===true});
  });
  return freeze({
    complete:results.every(r=>r.complete),
    productionVerified:results.every(r=>r.complete&&r.productionVerified),
    liveProviderVerified:results.every(r=>r.complete&&r.providerLiveVerified),
    results:freeze(results),
    automaticPublish:false,
  });
}
