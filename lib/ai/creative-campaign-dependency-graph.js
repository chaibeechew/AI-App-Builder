const freeze=value=>Object.freeze(value);

export function buildCreativeCampaignDependencyGraph({campaign}={}){
  if(!campaign?.campaignId||!Array.isArray(campaign.deliverables)) throw new Error('CREATIVE_CAMPAIGN_REQUIRED');
  const nodes=[];
  const edges=[];
  nodes.push({id:'master-concept',kind:'concept'});
  if((campaign.masterAssetIds||[]).length) nodes.push({id:'master-assets',kind:'asset-source'});
  const reuseGroups={image:[],video:[]};
  for(const item of campaign.deliverables){
    nodes.push({id:item.id,kind:'deliverable',target:item.target,task:item.task});
    edges.push({from:'master-concept',to:item.id,type:'concept'});
    if((campaign.masterAssetIds||[]).length) edges.push({from:'master-assets',to:item.id,type:'reference'});
    reuseGroups[item.mediaKind]?.push(item.id);
  }
  const graph=freeze({
    nodes:freeze(nodes),
    edges:freeze(edges),
    reuseGroups:freeze({image:freeze(reuseGroups.image),video:freeze(reuseGroups.video)}),
    duplicateGenerationAvoidance:true,
    cyclesAllowed:false,
    appBuilderMutation:false,
  });
  return graph;
}

export function validateCreativeCampaignDependencyGraph(graph){
  const ids=new Set((graph?.nodes||[]).map(n=>n.id));
  const invalid=(graph?.edges||[]).filter(e=>!ids.has(e.from)||!ids.has(e.to)||e.from===e.to);
  return freeze({ok:invalid.length===0,invalidEdges:freeze(invalid),code:invalid.length?'CREATIVE_CAMPAIGN_GRAPH_INVALID':null});
}
