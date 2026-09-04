import assert from 'node:assert/strict';
import {
  CREATIVE_MEDIA_TASKS,
  CREATIVE_MEDIA_JOB_STATES,
  CREATIVE_MEDIA_TRUTH_LEVELS,
  CREATIVE_MEDIA_CONTROL_SURFACES,
  getCreativeMediaTask,
  listCreativeMediaTasks,
  validateCreativeMediaRequest,
  buildCreativeMediaExecutionPlan,
  summarizeCreativeMediaReadiness,
} from '../lib/ai/creative-media-control-plane.js';

const requiredTasks=[
  'image.generate','image.image-to-image','image.inpaint','image.outpaint','image.remove-object','image.replace-object',
  'image.remove-background','image.replace-background','image.upscale','image.variation','image.identity-series','image.product-series',
  'video.generate','video.image-to-video','video.video-to-video','video.first-last-frame','video.extend','video.loop','video.reframe',
  'video.upscale','video.lipsync','video.avatar-speech','video.audio-generate','video.timeline-render',
];
for(const task of requiredTasks) assert.ok(CREATIVE_MEDIA_TASKS[task],`Missing creative media task ${task}`);
assert.equal(listCreativeMediaTasks().length,requiredTasks.length);
for(const state of ['draft','queued','running','completed','failed','blocked_by_policy','cancelled']) assert.ok(CREATIVE_MEDIA_JOB_STATES.includes(state));
for(const level of ['CODE_READY','CI_READY','PREVIEW_READY','PROVIDER_READY','PRODUCTION_LIVE_VERIFIED','EVIDENCE_REQUIRED']) assert.equal(CREATIVE_MEDIA_TRUTH_LEVELS[level],level);
for(const surface of ['identity','image','cinema','audio']) assert.ok(CREATIVE_MEDIA_CONTROL_SURFACES[surface]?.length>0);

assert.equal(getCreativeMediaTask(' VIDEO.IMAGE-TO-VIDEO ')?.capability,'image-to-video');
assert.deepEqual(validateCreativeMediaRequest({task:'image.inpaint',input:{prompt:'replace chair'}}).missing,['referenceImages','mask']);
assert.equal(validateCreativeMediaRequest({task:'image.inpaint',input:{prompt:'replace chair',referenceImages:['asset:1'],mask:'asset:2'}}).ok,true);

const local=buildCreativeMediaExecutionPlan({task:'image.generate',input:{prompt:'luxury property'},providerConnected:false});
assert.equal(local.execution,'local-fallback');
assert.equal(local.truth,'CODE_READY');
assert.match(local.note,/not external-model LIVE evidence/);

const missingProvider=buildCreativeMediaExecutionPlan({task:'video.image-to-video',input:{prompt:'orbit camera',referenceImages:['asset:1']}});
assert.equal(missingProvider.ok,false);
assert.equal(missingProvider.code,'CREATIVE_MEDIA_PROVIDER_NOT_CONNECTED');
assert.equal(missingProvider.truth,'EVIDENCE_REQUIRED');

const providerReady=buildCreativeMediaExecutionPlan({task:'video.image-to-video',input:{prompt:'orbit camera',referenceImages:['asset:1']},providerConnected:true,providerCapabilities:['image-to-video']});
assert.equal(providerReady.execution,'provider');
assert.equal(providerReady.truth,'EVIDENCE_REQUIRED');
assert.notEqual(providerReady.truth,'PRODUCTION_LIVE_VERIFIED');

const live=buildCreativeMediaExecutionPlan({task:'video.image-to-video',input:{prompt:'orbit camera',referenceImages:['asset:1']},providerConnected:true,providerCapabilities:['image-to-video'],providerProductionEvidence:true});
assert.equal(live.truth,'PRODUCTION_LIVE_VERIFIED');

const noConsent=buildCreativeMediaExecutionPlan({task:'video.lipsync',input:{referenceVideos:['asset:v'],audio:'asset:a'},providerConnected:true,providerCapabilities:['lip-sync']});
assert.equal(noConsent.ok,false);
assert.equal(noConsent.code,'CREATIVE_MEDIA_LIKENESS_CONSENT_REQUIRED');
assert.equal(noConsent.jobState,'blocked_by_policy');

const withConsent=buildCreativeMediaExecutionPlan({task:'video.lipsync',input:{referenceVideos:['asset:v'],audio:'asset:a'},providerConnected:true,providerCapabilities:['lip-sync'],likenessConsent:true});
assert.equal(withConsent.ok,true);
assert.equal(withConsent.execution,'provider');
assert.equal(withConsent.truth,'EVIDENCE_REQUIRED');

const blocked=buildCreativeMediaExecutionPlan({task:'image.image-to-image',input:{prompt:'restyle',referenceImages:['asset:1']},providerConnected:true,providerCapabilities:['image-to-image'],costPolicyAllowed:false});
assert.equal(blocked.code,'CREATIVE_MEDIA_COST_POLICY_BLOCKED');
assert.equal(blocked.execution,'blocked');

const summary=summarizeCreativeMediaReadiness({providerConnected:true,providerCapabilities:['text-to-image','image-to-video','lip-sync'],verifiedCapabilities:['text-to-image']});
assert.equal(summary.total,requiredTasks.length);
assert.equal(summary.codeReady,requiredTasks.length);
assert.equal(summary.providerReady,3);
assert.equal(summary.liveVerified,1);
assert.match(summary.rule,/separate evidence states/);

console.log('Creative media control plane contract tests passed.');
