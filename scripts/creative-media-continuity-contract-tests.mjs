import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  CREATIVE_MEDIA_IDENTITY_PROFILE_KINDS,
  buildCreativeMediaIdentityProfile,
  buildCreativeMediaIdentityEnvelope,
  buildCreativeMediaContinuityPlan,
} from '../lib/ai/creative-media-continuity.js';

assert.deepEqual([...CREATIVE_MEDIA_IDENTITY_PROFILE_KINDS],['character','product','brand']);

const character=buildCreativeMediaIdentityProfile({
  kind:'character',displayName:'Campaign Lead',subjectType:'self',realPersonLikeness:true,consentAttested:true,
  referenceAssetIds:['asset-char-1','asset-char-2'],semantic:{description:'Same adult presenter across scenes',palette:['navy','silver'],wardrobe:['navy jacket'],prohibitedChanges:['face identity','wardrobe color']}
});
assert.equal(character.kind,'character');assert.equal(character.consent.likenessConsentSatisfied,true);assert.equal(character.referenceOwnershipValidationRequired,true);assert.equal(character.biometricEmbeddingsStored,false);assert.equal(character.rawReferenceUrlsAllowed,false);assert.match(character.profileDigest,/^[0-9a-f]{64}$/);
assert.throws(()=>buildCreativeMediaIdentityProfile({kind:'character',subjectType:'self',realPersonLikeness:true,consentAttested:false}),/MEDIA_IDENTITY_LIKENESS_CONSENT_REQUIRED/);
assert.throws(()=>buildCreativeMediaIdentityProfile({kind:'character',subjectType:'minor',realPersonLikeness:true,guardianConsentAttested:false}),/MEDIA_IDENTITY_GUARDIAN_CONSENT_REQUIRED/);
assert.throws(()=>buildCreativeMediaIdentityProfile({kind:'character',referenceAssetIds:['https://example.com/a.png']}),/MEDIA_IDENTITY_REFERENCE_ID_INVALID/);
assert.throws(()=>buildCreativeMediaIdentityProfile({kind:'character',semantic:{faceEmbedding:[1,2,3]}}),/MEDIA_IDENTITY_PRIVATE_FIELD_NOT_ALLOWED/);

const blocked=buildCreativeMediaIdentityEnvelope({task:'image.identity-series',profile:character,input:{prompt:'Editorial portrait'},referenceOwnershipValidated:false});
assert.equal(blocked.ok,false);assert.equal(blocked.code,'MEDIA_IDENTITY_REFERENCE_OWNERSHIP_REQUIRED');
const envelope=buildCreativeMediaIdentityEnvelope({task:'image.identity-series',profile:character,input:{prompt:'Editorial portrait'},referenceOwnershipValidated:true});
assert.equal(envelope.ok,true);assert.equal(envelope.input.identityId,character.identityId);assert.deepEqual(envelope.input.referenceImages,['asset-char-1','asset-char-2']);assert.ok(envelope.requiredQualitySignals.includes('characterConsistency'));assert.equal(envelope.providerLiveVerified,false);

const product=buildCreativeMediaIdentityProfile({kind:'product',displayName:'Bottle X',referenceAssetIds:['asset-product-1'],semantic:{materials:['brushed aluminum'],geometry:['tall cylinder'],palette:['silver']}});
const productEnvelope=buildCreativeMediaIdentityEnvelope({task:'video.product-consistency',profile:product,input:{prompt:'Slow orbit product shot'},referenceOwnershipValidated:true});
assert.equal(productEnvelope.ok,true);assert.equal(productEnvelope.input.productId,product.identityId);assert.ok(productEnvelope.requiredQualitySignals.includes('objectConsistency'));
assert.equal(buildCreativeMediaIdentityEnvelope({task:'image.product-series',profile:character,input:{prompt:'x'},referenceOwnershipValidated:true}).code,'MEDIA_IDENTITY_KIND_TASK_MISMATCH');

const plan=buildCreativeMediaContinuityPlan({profile:character,targetDurationSeconds:20,shots:[
  {shotId:'shot-a',prompt:'Presenter enters a future city lobby',durationSeconds:5,camera:{move:'dolly-in'},motion:'calm'},
  {shotId:'shot-b',prompt:'Presenter turns toward a floating product display',durationSeconds:6,firstFrameAssetId:'frame-a'},
  {shotId:'shot-c',prompt:'Close-up maintains the same presenter identity',durationSeconds:4,lastFrameAssetId:'frame-c'},
]});
assert.equal(plan.shotCount,3);assert.equal(plan.totalDurationSeconds,15);assert.equal(plan.shots[1].identityProfileDigest,character.profileDigest);assert.equal(plan.shots[1].continuityFrom,'shot-a');assert.equal(plan.continuityRules.lockIdentity,true);assert.equal(plan.continuityRules.providerMayNotReusePrivateReferencesAcrossUsers,true);assert.equal(plan.truth.codeReady,true);assert.equal(plan.truth.liveProviderVerified,false);assert.ok(plan.shots[0].requiredQualitySignals.includes('characterConsistency'));assert.match(plan.planDigest,/^[0-9a-f]{64}$/);
assert.throws(()=>buildCreativeMediaContinuityPlan({profile:character,shots:[]}),/MEDIA_CONTINUITY_SHOT_COUNT_INVALID/);
assert.throws(()=>buildCreativeMediaContinuityPlan({profile:character,targetDurationSeconds:3,shots:[{prompt:'too long',durationSeconds:5}]}),/MEDIA_CONTINUITY_DURATION_EXCEEDED/);

const source=fs.readFileSync('lib/ai/creative-media-continuity.js','utf8');
for(const forbidden of [/createSignedUrl/,/service_role/,/SUPABASE_SERVICE_ROLE/,/providerLiveVerified:true/,/reusableAcrossUsers:true/])assert.doesNotMatch(source,forbidden);
for(const required of [/referenceOwnershipValidationRequired/,/biometricEmbeddingsStored:false/,/MEDIA_IDENTITY_LIKENESS_CONSENT_REQUIRED/,/MEDIA_IDENTITY_GUARDIAN_CONSENT_REQUIRED/,/getCreativeMediaRequiredQualitySignals/,/providerMayNotReusePrivateReferencesAcrossUsers:true/])assert.match(source,required);
console.log('Creative media identity and continuity contract tests passed.');
