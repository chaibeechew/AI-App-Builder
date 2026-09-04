import assert from 'node:assert/strict';
import {
  CREATIVE_MEDIA_TASKS,CREATIVE_MEDIA_TRUTH_LEVELS,CREATIVE_MEDIA_CONTROL_SURFACES,
  buildCreativeMediaExecutionPlan,listCreativeMediaTasks
} from '../lib/ai/creative-media-control-plane.js';
import {
  IMAGE_QUALITY_DIMENSIONS,VIDEO_QUALITY_DIMENSIONS,CREATIVE_MEDIA_QUALITY_POLICY,
  getCreativeMediaRequiredQualitySignals,assessCreativeMediaCandidate,buildCreativeMediaRetryDecision
} from '../lib/ai/creative-media-quality-judge.js';
import {rankCreativeMediaProviders,buildCreativeMediaProviderTruth,CREATIVE_MEDIA_PROVIDER_PRIORITY} from '../lib/ai/creative-media-provider-selection.js';
import {buildCreativeImagePayload} from '../lib/ai/creative-image-generation-gateway.js';
import {buildVideoGenerationPayload} from '../lib/video/generation-gateway.js';

const requiredTasks=[
  'image.generate','image.image-to-image','image.edit','image.generative-fill','image.inpaint','image.outpaint','image.remove-object','image.replace-object','image.insert-object','image.remove-background','image.replace-background','image.style-transfer','image.upscale','image.restore','image.relight','image.recolor','image.transparent-png','image.variation','image.identity-series','image.face-consistency','image.product-series','image.brand-consistency','image.prompt-enhance',
  'video.generate','video.image-to-video','video.reference-video','video.video-to-video','video.first-last-frame','video.character-consistency','video.product-consistency','video.scene-generate','video.extend','video.variation','video.restyle','video.object-edit','video.background-replace','video.loop','video.reframe','video.upscale','video.lipsync','video.avatar-speech','video.audio-generate','video.audio-attach','video.caption-integrate','video.storyboard','video.thumbnail','video.timeline-render'
];
for(const id of requiredTasks)assert.ok(CREATIVE_MEDIA_TASKS[id],`Missing ${id}`);
assert.equal(listCreativeMediaTasks().length,requiredTasks.length);
for(const key of ['PROVIDER_CONNECTED','LIVE_PROVIDER_VERIFIED','BROWSER_VERIFIED','PRODUCTION_VERIFIED','REAL_OUTPUT_QUALITY_VERIFIED'])assert.equal(CREATIVE_MEDIA_TRUTH_LEVELS[key],key);
for(const key of ['identity','image','cinema','audio','workflow'])assert.ok(CREATIVE_MEDIA_CONTROL_SURFACES[key]?.length>0);
for(const metric of ['promptAdherence','composition','anatomy','face','hands','textRendering','lighting','detail','resolution','brandConsistency','characterConsistency','productConsistency'])assert.ok(IMAGE_QUALITY_DIMENSIONS.includes(metric));
for(const metric of ['promptAdherence','motionQuality','temporalConsistency','characterConsistency','faceConsistency','objectConsistency','cameraCoherence','frameArtifacts','flicker','morphing','physicsPlausibility','lipSyncQuality','audioVideoSync','endingStability'])assert.ok(VIDEO_QUALITY_DIMENSIONS.includes(metric));
assert.equal(CREATIVE_MEDIA_QUALITY_POLICY.failedCandidateCanNeverBeMarkedSuccessful,true);

const connectedNoEvidence=buildCreativeMediaExecutionPlan({task:'video.image-to-video',input:{prompt:'orbit',referenceImages:['asset:1']},providerConnected:true,providerCapabilities:['image-to-video'],providerProductionEvidence:true,verifiedOutputCount:0});
assert.equal(connectedNoEvidence.truth,'PROVIDER_CONNECTED');
const liveWithEvidence=buildCreativeMediaExecutionPlan({task:'video.image-to-video',input:{prompt:'orbit',referenceImages:['asset:1']},providerConnected:true,providerCapabilities:['image-to-video'],providerProductionEvidence:true,verifiedOutputCount:1});
assert.equal(liveWithEvidence.truth,'LIVE_PROVIDER_VERIFIED');

const imageSignals=getCreativeMediaRequiredQualitySignals({task:'image.identity-series',context:{requiresTextRendering:true}});
for(const metric of ['promptAdherence','composition','anatomy','face','hands','textRendering','characterConsistency'])assert.ok(imageSignals.includes(metric));
const missingEvidence=assessCreativeMediaCandidate({task:'image.generate',signals:{promptAdherence:99,composition:99,lighting:99,detail:99,resolution:99},artifact:{valid:true,width:1024,height:1024,bytes:1000},evidence:{safetyPassed:true,provenanceVerified:false,outputValidated:true}});
assert.equal(missingEvidence.decision,'reject');assert.ok(missingEvidence.hardBlockers.includes('provenance-missing'));assert.equal(missingEvidence.productionEligible,false);
const accepted=assessCreativeMediaCandidate({task:'video.generate',signals:{promptAdherence:94,motionQuality:92,temporalConsistency:91,cameraCoherence:90,frameArtifacts:90,flicker:90,morphing:90,physicsPlausibility:89,endingStability:92},artifact:{valid:true,durationSeconds:8,bytes:100000},evidence:{safetyPassed:true,provenanceVerified:true,outputValidated:true}});
assert.equal(accepted.decision,'accept');assert.equal(accepted.productionEligible,true);

assert.deepEqual(CREATIVE_MEDIA_PROVIDER_PRIORITY,['connected-free-quota','user-owned-provider','free-provider','low-cost-provider','premium-provider-explicit-only']);
const providers=[
  {id:'premium',connected:true,available:true,safetyReady:true,costClass:'premium',capabilities:['text-to-video'],qualityScore:100,verifiedOutputCount:5},
  {id:'user',connected:true,available:true,safetyReady:true,userOwned:true,costClass:'metered',freeQuotaRemaining:0,capabilities:['text-to-video'],qualityScore:90,verifiedOutputCount:1},
  {id:'free',connected:true,available:true,safetyReady:true,costClass:'free',capabilities:['text-to-video'],qualityScore:70,verifiedOutputCount:0},
  {id:'quota',connected:true,available:true,safetyReady:true,costClass:'premium',freeQuotaRemaining:3,capabilities:['text-to-video'],qualityScore:80,verifiedOutputCount:1}
];
const zeroRank=rankCreativeMediaProviders({task:'video.generate',providers,costMode:'zero',premiumAllowed:false});
assert.equal(zeroRank.selected.id,'quota');assert.ok(zeroRank.rejected.some(p=>p.id==='user'&&p.rejectedReason==='cost-policy-blocked'));assert.ok(zeroRank.rejected.some(p=>p.id==='premium'&&p.rejectedReason==='cost-policy-blocked'));
const balancedRank=rankCreativeMediaProviders({task:'video.generate',providers,costMode:'balanced',premiumAllowed:true});
assert.equal(balancedRank.selected.id,'quota');
assert.equal(buildCreativeMediaProviderTruth({id:'x',connected:true,available:true,safetyReady:true,capabilities:[],verifiedOutputCount:0}).state,'PROVIDER_CONNECTED');
assert.equal(buildCreativeMediaProviderTruth({id:'x',connected:true,available:true,safetyReady:true,capabilities:[],verifiedOutputCount:1}).state,'LIVE_PROVIDER_VERIFIED');

const retry0=buildCreativeMediaRetryDecision({assessment:{productionEligible:false},task:'video.generate',providerCandidates:providers,currentProviderId:'free',costMode:'zero',attempt:0});assert.equal(retry0.action,'prompt-repair');
const retry2=buildCreativeMediaRetryDecision({assessment:{productionEligible:false},task:'video.generate',providerCandidates:providers,currentProviderId:'free',costMode:'zero',attempt:2});assert.equal(retry2.action,'provider-fallback');assert.equal(retry2.nextProviderId,'quota');

const imagePayload=buildCreativeImagePayload({task:'image.inpaint',requestId:'image:abc',input:{prompt:'replace chair',referenceImages:['asset:image:1'],mask:'asset:mask:1',negativePrompt:'distortion',seed:42,count:2,canvas:{width:1024,height:1024,evilUrl:'https://example.invalid'}}});
assert.equal(imagePayload.schemaVersion,2);assert.equal(imagePayload.capability,'inpaint');assert.equal(imagePayload.input.seed,42);assert.deepEqual(imagePayload.input.referenceImageAssetIds,['asset:image:1']);assert.equal(imagePayload.input.maskAssetId,'asset:mask:1');assert.equal(imagePayload.output.provenanceRequired,true);assert.equal(imagePayload.referencesRequireOwnerValidation,true);assert.deepEqual(imagePayload.input.canvas,{width:1024,height:1024});
const videoPayload=buildVideoGenerationPayload({task:'video.first-last-frame',requestId:'video:abc',input:{firstFrame:'asset:first',lastFrame:'asset:last',prompt:'smooth move',durationSeconds:8,fps:24,camera:'dolly in'}});
assert.equal(videoPayload.capability,'first-last-frame');assert.equal(videoPayload.input.firstFrameAssetId,'asset:first');assert.equal(videoPayload.input.lastFrameAssetId,'asset:last');assert.equal(videoPayload.input.fps,24);assert.equal(videoPayload.output.qualityEvidenceRequired,true);

console.log(`Creative media quality/runtime contracts passed with ${requiredTasks.length} canonical tasks and strict owner/evidence gates.`);
