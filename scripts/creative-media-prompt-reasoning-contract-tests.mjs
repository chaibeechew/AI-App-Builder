import assert from 'node:assert/strict';
import { analyzeCreativePromptIntent } from '../lib/ai/creative-prompt-intent.js';
import { buildCreativePromptBrief } from '../lib/ai/creative-prompt-brief.js';
import { repairCreativePromptBrief } from '../lib/ai/creative-prompt-repair.js';
import { buildCreativePromptTaskPlan } from '../lib/ai/creative-prompt-task-plan.js';

const intent=analyzeCreativePromptIntent({prompt:'帮我做一个豪宅获客广告视频，水元素70%，未来感，高级电影级，9:16，20秒，发布到 Reels',costMode:'zero'});
assert.equal(intent.ok,true);
assert.equal(intent.family,'real-estate');
assert.equal(intent.modality,'video');
assert.equal(intent.goal,'conversion');
assert.equal(intent.platform,'social-vertical');
assert.equal(intent.costMode,'zero');
assert.equal(intent.privateChainOfThoughtStored,false);

const brief=buildCreativePromptBrief({prompt:intent.prompt,brandKitId:'brand:laneriq',audience:'premium property buyers',referenceAssetIds:['asset:villa-front'],costMode:'zero'});
assert.equal(brief.ok,true);
assert.equal(brief.intent.family,'real-estate');
assert.equal(brief.constraints.aspectRatio,'9:16');
assert.equal(brief.constraints.durationSeconds,20);
assert.equal(brief.genomeSeed.genes.subject,'property');
assert.equal(brief.genomeSeed.genes.environment,'water');
assert.equal(brief.providerInvocationPerformed,false);
assert.equal(brief.ambiguity.requiresClarification,false);
assert.ok(!brief.ambiguity.ambiguities.some(row=>row.code==='BRAND_KIT_MISSING'));

const repair=repairCreativePromptBrief(brief);
assert.equal(repair.ok,true);
assert.equal(repair.readyForProviderPlanning,true);
assert.equal(repair.semanticFactsInvented,false);
assert.match(repair.expandedPrompt,/Do not invent brand claims/);
const plan=buildCreativePromptTaskPlan(repair);
assert.equal(plan.ok,true);
assert.ok(plan.tasks.some(row=>row.taskId==='video.storyboard'));
assert.ok(plan.tasks.some(row=>row.taskId==='video.generate'));
assert.ok(plan.tasks.some(row=>row.taskId==='video.thumbnail'));
assert.equal(plan.providerSelectionPerformed,false);
assert.equal(plan.automaticGenerationPerformed,false);
assert.equal(plan.automaticPublishPerformed,false);
assert.equal(plan.realOutputEvidenceRequired,true);

const avatarBrief=buildCreativePromptBrief({prompt:'用我的脸做一个数字人口播视频，15秒，9:16',costMode:'zero'});
assert.equal(avatarBrief.ok,true);
assert.equal(avatarBrief.intent.family,'avatar');
assert.equal(avatarBrief.ambiguity.requiresClarification,true);
assert.ok(avatarBrief.ambiguity.ambiguities.some(row=>row.code==='LIKENESS_CONSENT_REQUIRED'));
const avatarRepair=repairCreativePromptBrief(avatarBrief);
assert.equal(avatarRepair.readyForProviderPlanning,false);
assert.equal(buildCreativePromptTaskPlan(avatarRepair).code,'CREATIVE_PROMPT_APPROVAL_REQUIRED');
const consented=buildCreativePromptBrief({prompt:'用我的脸做一个数字人口播视频，15秒，9:16',likenessConsent:true,costMode:'zero'});
const consentRepair=repairCreativePromptBrief(consented);
assert.equal(consentRepair.readyForProviderPlanning,true);
const avatarPlan=buildCreativePromptTaskPlan(consentRepair);
assert.equal(avatarPlan.ok,true);
assert.ok(avatarPlan.tasks.some(row=>row.taskId==='video.avatar-speech'));

const badRef=buildCreativePromptBrief({prompt:'做一个产品广告图片',referenceAssetIds:['https://evil.example/item.png']});
assert.equal(badRef.ok,false);
assert.equal(badRef.code,'CREATIVE_PROMPT_REFERENCE_ID_INVALID');
assert.equal(analyzeCreativePromptIntent({prompt:'   '}).code,'CREATIVE_PROMPT_REQUIRED');

const ambiguous=buildCreativePromptBrief({prompt:'做一个很高级的宣传内容'});
assert.equal(ambiguous.ok,true);
assert.ok(ambiguous.ambiguity.ambiguities.some(row=>row.code==='MODALITY_UNSPECIFIED'));
assert.ok(ambiguous.ambiguity.assumptions.length>0);
assert.equal(ambiguous.privateChainOfThoughtStored,false);

console.log('Creative Media Prompt Reasoning Core Transfer contract tests passed.');
