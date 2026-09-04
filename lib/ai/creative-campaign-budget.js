const freeze=value=>Object.freeze(value);

const WEIGHTS=Object.freeze({image:1,video:4});

export function allocateCreativeCampaignBudget({campaign,maxGenerationUnits=20,premiumPermission=false}={}){
  if(!campaign?.campaignId) throw new Error('CREATIVE_CAMPAIGN_REQUIRED');
  const limit=Math.max(1,Math.min(100,Math.trunc(Number(maxGenerationUnits)||20)));
  const costMode=String(campaign.costMode||'zero').trim().toLowerCase();
  const entries=(campaign.deliverables||[]).map(item=>({
    deliverableId:item.id,
    units:WEIGHTS[item.mediaKind]||1,
    maxAttempts:item.mediaKind==='video'?2:3,
  }));
  const plannedUnits=entries.reduce((sum,item)=>sum+item.units*item.maxAttempts,0);
  const withinBudget=plannedUnits<=limit;
  const premiumAllowed=costMode==='standard'&&premiumPermission===true;
  return freeze({
    costMode,
    maxGenerationUnits:limit,
    plannedUnits,
    withinBudget,
    premiumAllowed,
    surprisePaidSpendAllowed:false,
    entries:freeze(entries),
    code:withinBudget?null:'CREATIVE_CAMPAIGN_BUDGET_REDUCTION_REQUIRED',
  });
}
