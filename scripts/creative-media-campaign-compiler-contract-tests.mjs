import assert from 'node:assert/strict';
import { listCreativeCampaignPlatformSpecs } from '../lib/ai/creative-campaign-platform-specs.js';
import { compileCreativeCampaign } from '../lib/ai/creative-campaign-compiler.js';
import { buildCreativeCampaignDependencyGraph, validateCreativeCampaignDependencyGraph } from '../lib/ai/creative-campaign-dependency-graph.js';
import { allocateCreativeCampaignBudget } from '../lib/ai/creative-campaign-budget.js';
import { buildCreativeCampaignSafeArea } from '../lib/ai/creative-campaign-safe-area.js';
import { buildCreativeCampaignEvidenceSlots, evaluateCreativeCampaignEvidence } from '../lib/ai/creative-campaign-evidence.js';
import { getCreativeMediaTask } from '../lib/ai/creative-media-control-plane.js';

const specs=listCreativeCampaignPlatformSpecs();
assert.ok(specs.length>=10);
for(const spec of specs) assert.ok(getCreativeMediaTask(spec.task),spec.task);

const input={
  brief:{prompt:'Premium real-estate launch with water-led cinematic visual language'},
  targets:['web-hero','social-square','social-vertical-video','web-promo-video','game-promo-image'],
  brandProfileId:'brand:laneriq:01',
  identityProfileId:'identity:presenter:01',
  masterAssetIds:['asset:campaign:master-01'],
  costMode:'zero',
};
const campaign=compileCreativeCampaign(input);
assert.equal(campaign.deliverables.length,5);
assert.equal(campaign.compileOnly,true);
assert.equal(campaign.providerInvocationAllowed,false);
assert.equal(campaign.automaticPublishAllowed,false);
assert.equal(campaign.privateChainOfThoughtStored,false);
assert.ok(campaign.deliverables.every(d=>d.continuityRequired));
assert.ok(campaign.deliverables.every(d=>d.providerInvocation===false&&d.autoPublish===false));

const repeat=compileCreativeCampaign(input);
assert.equal(repeat.campaignId,campaign.campaignId);
assert.throws(()=>compileCreativeCampaign({...input,masterAssetIds:['https://example.com/a.png']}),/ASSET_INVALID/);
assert.throws(()=>compileCreativeCampaign({brief:{prompt:'x'},targets:['unknown-target']}),/BRIEF_REQUIRED|TARGET_UNSUPPORTED/);

const graph=buildCreativeCampaignDependencyGraph({campaign});
assert.equal(graph.duplicateGenerationAvoidance,true);
assert.equal(graph.appBuilderMutation,false);
assert.equal(validateCreativeCampaignDependencyGraph(graph).ok,true);
assert.equal(graph.reuseGroups.image.length,3);
assert.equal(graph.reuseGroups.video.length,2);

const zeroBudget=allocateCreativeCampaignBudget({campaign,maxGenerationUnits:30,premiumPermission:true});
assert.equal(zeroBudget.costMode,'zero');
assert.equal(zeroBudget.premiumAllowed,false);
assert.equal(zeroBudget.surprisePaidSpendAllowed,false);
const tinyBudget=allocateCreativeCampaignBudget({campaign,maxGenerationUnits:3});
assert.equal(tinyBudget.withinBudget,false);
assert.equal(tinyBudget.code,'CREATIVE_CAMPAIGN_BUDGET_REDUCTION_REQUIRED');

for(const deliverable of campaign.deliverables){
  const safe=buildCreativeCampaignSafeArea({deliverable});
  assert.ok(safe.safeArea.width>0&&safe.safeArea.height>0);
  assert.ok(safe.safeArea.width<safe.canvas.width);
  assert.equal(safe.platformValidationRequired,true);
}

const slots=buildCreativeCampaignEvidenceSlots({campaign});
assert.equal(slots.length,campaign.deliverables.length);
assert.ok(slots.every(s=>s.complete===false));
assert.equal(evaluateCreativeCampaignEvidence({campaign,evidence:slots}).complete,false);

const completed=campaign.deliverables.map((d,index)=>({
  deliverableId:d.id,
  persistedAssetId:`asset:campaign:final-${index+1}`,
  artifactHash:String(index%10).repeat(64),
  provenanceId:`prov:campaign:${index+1}`,
  qualityPassed:true,
  continuityPassed:true,
  providerLiveVerified:false,
  productionVerified:false,
}));
const measured=evaluateCreativeCampaignEvidence({campaign,evidence:completed});
assert.equal(measured.complete,true);
assert.equal(measured.productionVerified,false);
assert.equal(measured.liveProviderVerified,false);
assert.equal(measured.automaticPublish,false);

console.log('Creative Media Campaign Compiler contract PASS');
