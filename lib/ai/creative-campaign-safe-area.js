const freeze=value=>Object.freeze(value);

export function buildCreativeCampaignSafeArea({deliverable}={}){
  if(!deliverable?.id) throw new Error('CREATIVE_CAMPAIGN_DELIVERABLE_REQUIRED');
  const inset=Math.max(0,Math.min(25,Number(deliverable.safeInsetPct)||0));
  const width=Number(deliverable.width)||0;
  const height=Number(deliverable.height)||0;
  if(width<=0||height<=0) throw new Error('CREATIVE_CAMPAIGN_DIMENSIONS_REQUIRED');
  const x=Math.round(width*inset/100);
  const y=Math.round(height*inset/100);
  return freeze({
    deliverableId:deliverable.id,
    canvas:freeze({width,height,aspectRatio:deliverable.aspectRatio}),
    safeArea:freeze({x,y,width:width-(2*x),height:height-(2*y)}),
    keepCriticalTextInside:true,
    keepBrandMarksInside:true,
    platformValidationRequired:true,
  });
}
