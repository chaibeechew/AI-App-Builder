import assert from 'node:assert/strict';
import {
  CREATIVE_MEDIA_HARDENING_LAYERS,CREATIVE_MEDIA_INTELLIGENCE_POLICY,
  buildCreativeMediaCandidatePlan,compareCreativeMediaCandidates,buildCreativeMediaRepairRecipe,
  prepareCreativeMediaHardenedRun,runCreativeMediaHardenedExecution,
} from '../lib/ai/creative-media-intelligence-engine.js';
import {
  buildCreativeMediaContinuityContract,assessCreativeMediaContinuity,CREATIVE_MEDIA_CONTINUITY_POLICY,
} from '../lib/ai/creative-media-continuity.js';
import {
  validateCreativeMediaObservationEvidence,judgeRealCreativeMediaOutput,CREATIVE_MEDIA_OBSERVATION_POLICY,
} from '../lib/ai/creative-media-observation-judge.js';
import {
  buildVideoCinemaPhysicsPlan,assessVideoCinemaPhysicsEvidence,VIDEO_CINEMA_PHYSICS_POLICY,
} from '../lib/video/cinema-physics-engine.js';

assert.deepEqual(CREATIVE_MEDIA_HARDENING_LAYERS.image,[
  'live-provider-execution','multi-model-candidate-battle','real-output-judge','auto-repair-regeneration','identity-product-brand-continuity',
]);
assert.deepEqual(CREATIVE_MEDIA_HARDENING_LAYERS.video,[
  'live-provider-execution','multi-model-candidate-battle','real-output-judge','auto-repair-regeneration','identity-product-brand-continuity','cinema-physics-intelligence',
]);
assert.equal(CREATIVE_MEDIA_INTELLIGENCE_POLICY.maxCandidatesPerRound,3);
assert.equal(CREATIVE_MEDIA_CONTINUITY_POLICY.acceptScore,88);
assert.equal(VIDEO_CINEMA_PHYSICS_POLICY.acceptScore,88);
assert.ok(CREATIVE_MEDIA_OBSERVATION_POLICY.trustedObserverKinds.includes('laneriq-vision'));

const imageProviders=[
  {id:'free-a',connected:true,available:true,safetyReady:true,costClass:'zero',capabilities:['text-to-image'],qualityScore:80,verifiedOutputCount:1},
  {id:'free-b',connected:true,available:true,safetyReady:true,costClass:'free',capabilities:['text-to-image'],qualityScore:95,verifiedOutputCount:2},
  {id:'premium-c',connected:true,available:true,safetyReady:true,costClass:'premium',capabilities:['text-to-image'],qualityScore:100,verifiedOutputCount:9},
];
const zeroPlan=buildCreativeMediaCandidatePlan({task:'image.generate',input:{prompt:'premium product portrait'},providers:imageProviders,costMode:'zero',premiumAllowed:false,maxCandidates:3});
assert.equal(zeroPlan.ok,true);assert.equal(zeroPlan.candidateMode,'battle');assert.equal(zeroPlan.candidates.length,2);assert.ok(zeroPlan.rejected.some(row=>row.id==='premium-c'&&row.rejectedReason==='cost-policy-blocked'));
const paidNoMultiply=buildCreativeMediaCandidatePlan({task:'image.generate',input:{prompt:'portrait'},providers:[{id:'metered',connected:true,available:true,safetyReady:true,costClass:'metered',capabilities:['text-to-image'],qualityScore:95}],costMode:'balanced',premiumAllowed:false,maxCandidates:3,allowMultiCandidateSpend:false});
assert.equal(paidNoMultiply.candidates.length,1);

const noConsent=buildCreativeMediaCandidatePlan({task:'image.identity-series',input:{prompt:'same person',referenceImages:['asset:face']},providers:[{id:'identity-free',connected:true,available:true,safetyReady:true,costClass:'zero',capabilities:['identity-consistency'],qualityScore:90}],costMode:'zero',likenessConsent:false});
assert.equal(noConsent.ok,false);assert.equal(noConsent.reason,'CREATIVE_MEDIA_LIKENESS_CONSENT_REQUIRED');

const identityContract=buildCreativeMediaContinuityContract({task:'image.identity-series',input:{prompt:'same person',referenceImages:['asset:face'],identityId:'identity:1'}});
assert.equal(identityContract.required,true);assert.ok(identityContract.dimensions.includes('identitySimilarity'));assert.ok(identityContract.dimensions.includes('faceSimilarity'));
const continuityPass=assessCreativeMediaContinuity({task:'image.identity-series',input:{prompt:'same person',referenceImages:['asset:face'],identityId:'identity:1'},observations:{identitySimilarity:96,faceSimilarity:95,compositionContinuity:92,referenceFidelity:94}});
assert.equal(continuityPass.productionEligible,true);
const continuityMissing=assessCreativeMediaContinuity({task:'image.identity-series',input:{prompt:'same person',referenceImages:['asset:face'],identityId:'identity:1'},observations:{identitySimilarity:96}});
assert.equal(continuityMissing.productionEligible,false);assert.ok(continuityMissing.hardBlockers.includes('continuity-evidence-missing'));

const hashA='a'.repeat(64);const hashB='b'.repeat(64);const hashC='c'.repeat(64);
const providerSelfReport=validateCreativeMediaObservationEvidence({observerKind:'laneriq-vision',observedBy:'judge-1',artifactHash:hashA,observationHash:hashB,signedEvidence:true,providerSelfReported:true,safetyPassed:true,provenanceVerified:true,outputValidated:true});
assert.equal(providerSelfReport.ok,false);assert.ok(providerSelfReport.hardBlockers.includes('provider-self-report-not-accepted'));
const trustedEvidence={observerKind:'laneriq-vision',observedBy:'laneriq-vision-v1',artifactHash:hashA,observationHash:hashB,signedEvidence:true,providerSelfReported:false,safetyPassed:true,provenanceVerified:true,outputValidated:true};
const imageJudgement=judgeRealCreativeMediaOutput({task:'image.generate',input:{prompt:'product portrait'},signals:{promptAdherence:96,composition:95,lighting:94,detail:95,resolution:96},artifact:{valid:true,width:1536,height:1536,bytes:200000,sha256:hashA},evidence:trustedEvidence});
assert.equal(imageJudgement.decision,'accept');assert.equal(imageJudgement.productionEligible,true);assert.equal(imageJudgement.truth,'REAL_OUTPUT_QUALITY_VERIFIED');

const cinemaPlan=buildVideoCinemaPhysicsPlan({input:{prompt:'runner turns a corner',durationSeconds:12,resolution:'4k',fps:30,camera:'smooth tracking',motion:'natural sprint'}});
assert.equal(cinemaPlan.resolution,'4k');assert.equal(cinemaPlan.fps,30);assert.ok(cinemaPlan.shots.length>=2);assert.ok(cinemaPlan.physics.some(rule=>rule.includes('gravity')));
const cinemaPass=assessVideoCinemaPhysicsEvidence({plan:cinemaPlan,observations:{cameraIntentMatch:94,motionIntentMatch:93,physicsPlausibility:92,contactStability:91,temporalConsistency:93,endingStability:92}});
assert.equal(cinemaPass.productionEligible,true);
const cinemaFail=assessVideoCinemaPhysicsEvidence({plan:cinemaPlan,observations:{cameraIntentMatch:94}});
assert.equal(cinemaFail.productionEligible,false);assert.ok(cinemaFail.missing.includes('physicsPlausibility'));

const repair=buildCreativeMediaRepairRecipe({task:'video.generate',input:{prompt:'runner',seed:10,motionStrength:70},judgement:{productionEligible:false,base:{dimensions:[{id:'physicsPlausibility',score:60},{id:'morphing',score:55},{id:'promptAdherence',score:70}]},continuity:{dimensions:[]}},providerCandidates:[{id:'free-video',connected:true,available:true,safetyReady:true,costClass:'zero',capabilities:['text-to-video']}],currentProviderId:'free-video',costMode:'zero',attempt:0});
assert.equal(repair.action,'prompt-repair');assert.ok(repair.promptAddendum.includes('gravity'));assert.ok(repair.negativePromptAddendum.includes('morphing'));assert.notEqual(repair.nextInput.seed,10);assert.ok(repair.nextInput.motionStrength<70);

const battle=compareCreativeMediaCandidates({candidates:[
  {providerId:'a',judgement:{decision:'optimize',productionEligible:false,score:95,continuity:{score:100}},cinemaAssessment:null,latencyMs:10},
  {providerId:'b',judgement:{decision:'accept',productionEligible:true,score:90,continuity:{score:90}},cinemaAssessment:null,latencyMs:20},
]});
assert.equal(battle.accepted,true);assert.equal(battle.winner.providerId,'b');

const preparedVideo=prepareCreativeMediaHardenedRun({task:'video.generate',input:{prompt:'slow cinematic push in',durationSeconds:8},providers:[{id:'video-zero',connected:true,available:true,safetyReady:true,costClass:'zero',capabilities:['text-to-video'],qualityScore:90}],costMode:'zero'});
assert.equal(preparedVideo.ok,true);assert.equal(preparedVideo.layers.length,6);assert.ok(preparedVideo.cinemaPlan.requiredSignals.includes('physicsPlausibility'));

const runProviders=[
  {id:'free-a',connected:true,available:true,safetyReady:true,costClass:'zero',capabilities:['text-to-image'],qualityScore:80,verifiedOutputCount:1},
  {id:'free-b',connected:true,available:true,safetyReady:true,costClass:'free',capabilities:['text-to-image'],qualityScore:90,verifiedOutputCount:1},
];
const runResult=await runCreativeMediaHardenedExecution({
  task:'image.generate',input:{prompt:'glass perfume bottle on stone'},requestId:'test:image:1',providers:runProviders,costMode:'zero',maxRounds:1,
  executeCandidate:async ({providerId})=>({providerId,url:`internal://${providerId}`} ),
  observeCandidate:async ({providerId})=>({
    signals:providerId==='free-b'
      ?{promptAdherence:96,composition:95,lighting:95,detail:94,resolution:95}
      :{promptAdherence:82,composition:83,lighting:82,detail:80,resolution:84},
    artifact:{valid:true,width:1024,height:1024,bytes:100000,sha256:providerId==='free-b'?hashC:hashA},
    evidence:{...trustedEvidence,artifactHash:providerId==='free-b'?hashC:hashA,observationHash:providerId==='free-b'?hashB:hashC},
    continuityObservations:{},
  }),
});
assert.equal(runResult.ok,true);assert.equal(runResult.status,'completed');assert.equal(runResult.winner.providerId,'free-b');assert.equal(runResult.truth,'REAL_OUTPUT_QUALITY_VERIFIED');

const blockedWithoutAdapters=await runCreativeMediaHardenedExecution({task:'image.generate',input:{prompt:'x'},requestId:'test:image:2',providers:runProviders});
assert.equal(blockedWithoutAdapters.ok,false);assert.equal(blockedWithoutAdapters.code,'CREATIVE_MEDIA_EXECUTION_ADAPTER_REQUIRED');

console.log('Creative Media Image 5-layer + Video 6-layer hardening contracts passed.');
