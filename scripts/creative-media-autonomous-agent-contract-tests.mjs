import assert from 'node:assert/strict';
import { buildCreativeAgentContract, normalizeCreativeAgentAssetIds } from '../lib/ai/creative-agent-contract.js';
import { buildCreativeAgentPlan } from '../lib/ai/creative-agent-planner.js';
import { evaluateCreativeAgentApprovals } from '../lib/ai/creative-agent-approval.js';
import { nextCreativeAgentRecovery } from '../lib/ai/creative-agent-recovery.js';
import { validateCreativeAgentTransition } from '../lib/ai/creative-agent-state-machine.js';
import { buildCreativeAgentDeliveryPack } from '../lib/ai/creative-agent-delivery.js';
import { getCreativeMediaTask } from '../lib/ai/creative-media-control-plane.js';

const imagePlan=buildCreativeAgentPlan({brief:{family:'web-hero',modality:'image',goal:'awareness'}});
assert.deepEqual(imagePlan.taskIds,['image.generate']);
assert.equal(imagePlan.executionAuthority,'planner-only');
assert.equal(imagePlan.providerInvocation,false);
assert.equal(imagePlan.automaticPublish,false);

const videoInput={
  brief:{family:'real-estate',modality:'video',goal:'conversion',platform:'social-vertical'},
  assetIds:['asset:property:hero-01'],
  brandKitId:'brand:laneriq:demo',
  identityId:'identity:presenter:01',
  publicRelease:true,
  likeness:true,
  costMode:'zero',
};
const videoPlan=buildCreativeAgentPlan(videoInput);
assert.ok(videoPlan.taskIds.includes('video.storyboard'));
assert.ok(videoPlan.taskIds.includes('video.character-consistency'));
assert.ok(videoPlan.taskIds.includes('video.timeline-render'));
for(const taskId of videoPlan.taskIds) assert.ok(getCreativeMediaTask(taskId),taskId);
assert.ok(videoPlan.contract.approvalReasons.includes('likeness'));
assert.ok(videoPlan.contract.approvalReasons.includes('public-brand-release'));
assert.ok(videoPlan.contract.approvalReasons.includes('external-publish'));

const repeat=buildCreativeAgentPlan(videoInput);
assert.equal(repeat.planId,videoPlan.planId,'plan IDs must be deterministic');

assert.throws(()=>normalizeCreativeAgentAssetIds(['https://example.com/file.png']),/OWNER_SCOPED_ASSET/);
assert.throws(()=>normalizeCreativeAgentAssetIds(['data:image/png;base64,abc']),/OWNER_SCOPED_ASSET/);

const inferred=evaluateCreativeAgentApprovals({plan:videoPlan,approvals:{likeness:{approved:'yes',approvedAt:'2026-09-05T00:00:00Z'}}});
assert.equal(inferred.approved,false);
assert.equal(inferred.inferredApproval,false);

const explicit={};
for(const reason of videoPlan.contract.approvalReasons) explicit[reason]={approved:true,approvedAt:'2026-09-05T00:00:00Z',approvedBy:'owner'};
const approved=evaluateCreativeAgentApprovals({plan:videoPlan,approvals:explicit});
assert.equal(approved.approved,true);

assert.equal(nextCreativeAgentRecovery({attempt:0}).action,'prompt-repair');
assert.equal(nextCreativeAgentRecovery({attempt:1}).action,'same-provider-regenerate');
assert.equal(nextCreativeAgentRecovery({attempt:2,fallbackAvailable:true}).action,'provider-fallback');
assert.equal(nextCreativeAgentRecovery({attempt:3,maxAttempts:3}).action,'fail-closed');
assert.equal(nextCreativeAgentRecovery({attempt:1,failureCode:'SAFETY_GATE_FAILED'}).action,'fail-closed');
assert.equal(nextCreativeAgentRecovery({attempt:2,premiumFallback:true,premiumPermission:false}).action,'candidate-compare');

assert.equal(validateCreativeAgentTransition('draft','planned').ok,true);
assert.equal(validateCreativeAgentTransition('draft','completed').ok,false);
assert.equal(validateCreativeAgentTransition('quality-check','approval-required').ok,true);
assert.equal(validateCreativeAgentTransition('approval-required','completed').ok,false);

assert.throws(()=>buildCreativeAgentDeliveryPack({plan:videoPlan,selectedCandidateIds:['candidate:1'],persistedAssetIds:['asset:final:1'],provenanceEvidenceIds:['prov:1'],approvals:{approved:false}}),/HUMAN_APPROVAL_REQUIRED/);
const delivery=buildCreativeAgentDeliveryPack({plan:videoPlan,selectedCandidateIds:['candidate:1'],persistedAssetIds:['asset:final:1'],provenanceEvidenceIds:['prov:1'],approvals:approved});
assert.equal(delivery.readyForHumanDelivery,true);
assert.equal(delivery.autoPublished,false);
assert.equal(delivery.liveProviderEvidence,false);
assert.equal(delivery.realOutputQualityEvidence,false);

const contract=buildCreativeAgentContract({brief:{modality:'mixed'},maxAttempts:99,qualityTarget:20});
assert.equal(contract.maxAttempts,4);
assert.equal(contract.qualityTarget,70);
assert.equal(contract.privateChainOfThoughtStored,false);

console.log('Creative Media Autonomous Agent contract PASS');
