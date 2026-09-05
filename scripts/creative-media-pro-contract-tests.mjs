import assert from 'node:assert/strict';
import { buildCreativeAudioPlan, buildLipSyncAlignmentPlan } from '../lib/ai/creative-audio-director.js';
import { buildVideoPostProductionPlan } from '../lib/video/creative-video-post-production.js';
import { buildProImageEditPlan } from '../lib/ai/creative-image-edit-engine.js';
import { buildCreativeCampaignPlan } from '../lib/ai/creative-campaign-agent.js';
import { getCreativeMediaRequiredQualitySignals, assessCreativeMediaCandidate, AUDIO_QUALITY_DIMENSIONS } from '../lib/ai/creative-media-quality-judge.js';
import { getCreativeMediaTask } from '../lib/ai/creative-media-control-plane.js';

assert.ok(getCreativeMediaTask('video.lipsync'));
assert.ok(getCreativeMediaTask('video.extend'));
assert.ok(getCreativeMediaTask('image.replace-object'));
assert.ok(getCreativeMediaTask('video.audio-generate'));

const blockedVoice=buildCreativeAudioPlan({
  mode:'voiceover',transcript:'hello',voice:{sourceType:'consented-reference',referenceAssetId:'voice.ref.1'}
});
assert.equal(blockedVoice.ok,false);
assert.equal(blockedVoice.code,'CREATIVE_AUDIO_VOICE_CONSENT_REQUIRED');

const audio=buildCreativeAudioPlan({
  mode:'mix',durationSeconds:45,transcript:'Launch the new product.',
  voice:{sourceType:'synthetic',emotion:'warm',speed:1.1},
  music:{enabled:true,prompt:'cinematic technology bed',bpm:96,ducking:true},
  sfx:[{prompt:'soft UI whoosh',atSeconds:2}]
});
assert.equal(audio.ok,true);
assert.ok(audio.requiredCapabilities.includes('text-to-speech'));
assert.ok(audio.requiredCapabilities.includes('music-generation'));
assert.ok(audio.requiredCapabilities.includes('sfx-generation'));
assert.equal(audio.truth.liveProviderVerified,false);

const lipsync=buildLipSyncAlignmentPlan({videoAssetId:'video.asset.1',audioAssetId:'audio.asset.1',language:'en-US'});
assert.equal(lipsync.ok,true);
assert.equal(lipsync.task,'video.lipsync');
assert.equal(lipsync.truth.realOutputQualityVerified,false);

const post=buildVideoPostProductionPlan({
  referenceVideos:['video.asset.1'],
  operations:[
    {type:'reframe',aspectRatio:'9:16',subjectTracking:'primary subject'},
    {type:'upscale',targetResolution:'2160p',frameInterpolation:true,fps:60,stabilization:55},
    {type:'loop',loopSeconds:8,transitionStrength:40}
  ],
  output:{aspectRatio:'9:16',resolution:'2160p',fps:60}
});
assert.equal(post.ok,true);
assert.ok(post.requiredCapabilities.includes('video-reframe'));
assert.ok(post.requiredCapabilities.includes('video-upscale'));
assert.ok(post.requiredCapabilities.includes('frame-interpolation'));
assert.ok(post.requiredCapabilities.includes('video-stabilization'));
assert.equal(post.execution.preserveOriginal,true);

const badImage=buildProImageEditPlan({sourceImage:'https://example.com/private.png',regions:[]});
assert.equal(badImage.ok,false);
assert.equal(badImage.code,'PRO_IMAGE_SOURCE_REQUIRED');

const image=buildProImageEditPlan({
  sourceImage:'image.asset.1',
  regions:[
    {operation:'replace',mask:'mask.asset.1',prompt:'replace bottle with premium black bottle'},
    {operation:'relight',mask:'mask.asset.2',prompt:'soft cinematic rim light'}
  ],
  textLayers:[{text:'LANERIQ',placement:'top-center'}],
  styleReference:'style.asset.1',
  poseReference:'pose.asset.1',
  compositionReference:'composition.asset.1',
  layout:{subjectX:50,subjectY:52,subjectScale:115,aspectRatio:'4:5'},
  output:{resolution:'2160p'},
  variants:4,seed:42
});
assert.equal(image.ok,true);
assert.ok(image.requiredCapabilities.includes('object-replace'));
assert.ok(image.requiredCapabilities.includes('relight'));
assert.ok(image.requiredCapabilities.includes('text-rendering'));
assert.ok(image.requiredCapabilities.includes('pose-control'));
assert.equal(image.execution.nonDestructive,true);

const campaign=buildCreativeCampaignPlan({
  goal:'Launch a premium AI app with a consistent hero image, store media and vertical social campaign.',
  channels:['website','ios-store','social-vertical','ad'],
  brandKitId:'brand.kit.1',
  productAssets:['product.asset.1'],
  identityAssets:['identity.asset.1'],
  budgetMode:'zero',
  premiumAllowed:true
});
assert.equal(campaign.ok,true);
assert.equal(campaign.policy.premiumAllowed,false);
assert.ok(campaign.stages.length>=8);
for(const stage of campaign.stages)assert.ok(getCreativeMediaTask(stage.task),`Unknown campaign task ${stage.task}`);
assert.ok(campaign.stages.every(stage=>stage.qualityGate===true));
assert.equal(campaign.truth.productionVerified,false);

assert.ok(AUDIO_QUALITY_DIMENSIONS.includes('speechIntelligibility'));
const required=getCreativeMediaRequiredQualitySignals({
  task:'video.audio-generate',
  context:{requiresVoice:true,requiresMusic:true,requiresSfx:true,requiresSync:true}
});
for(const key of ['speechIntelligibility','voiceNaturalness','pronunciation','musicQuality','sfxQuality','syncAccuracy']){
  assert.ok(required.includes(key),`Missing audio quality signal ${key}`);
}
const signals=Object.fromEntries(required.map(key=>[key,94]));
const assessment=assessCreativeMediaCandidate({
  task:'video.audio-generate',
  context:{requiresVoice:true,requiresMusic:true,requiresSfx:true,requiresSync:true},
  signals,
  artifact:{valid:true,durationSeconds:30,bytes:200000,sampleRate:48000,channels:2},
  evidence:{safetyPassed:true,provenanceVerified:true,outputValidated:true}
});
assert.equal(assessment.productionEligible,true);
assert.equal(assessment.modality,'audio');

console.log('Creative Media Pro 100 contracts passed.');
