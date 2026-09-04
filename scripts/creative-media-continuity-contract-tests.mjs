import assert from 'node:assert/strict';
import { buildContinuityProfile, normalizeContinuityAssetIds } from '../lib/ai/creative-continuity-profile.js';
import { buildContinuityLocks, evaluateContinuityChangeRequest } from '../lib/ai/creative-continuity-constraints.js';
import { buildContinuityShotPlan } from '../lib/ai/creative-continuity-shot-plan.js';
import { detectContinuityConflicts } from '../lib/ai/creative-continuity-conflict.js';
import { evaluateContinuityEvidence } from '../lib/ai/creative-continuity-evidence.js';
import { deriveContinuityProfileVersion } from '../lib/ai/creative-continuity-version.js';

assert.throws(()=>buildContinuityProfile({type:'identity',profileId:'identity:hero:01',referenceAssetIds:['asset:face:01'],likenessConsent:false}),/LIKENESS/i);
assert.throws(()=>buildContinuityProfile({type:'identity',profileId:'identity:hero:01',referenceAssetIds:['asset:face:01'],likenessConsent:true,biometricEmbedding:[0.1,0.2]}),/BIOMETRIC_EMBEDDING_FORBIDDEN/);
assert.throws(()=>normalizeContinuityAssetIds(['https://example.com/a.png']),/OWNER_SCOPED_ASSET/);

const identity=buildContinuityProfile({type:'identity',profileId:'identity:hero:01',referenceAssetIds:['asset:face:01','asset:fullbody:01'],likenessConsent:true,declaredTraits:{wardrobe:'black suit'}});
assert.equal(identity.storesBiometricEmbedding,false);
assert.equal(identity.performsBiometricIdentification,false);
assert.equal(identity.realOutputContinuityVerified,false);

const identityRepeat=buildContinuityProfile({type:'identity',profileId:'identity:hero:01',referenceAssetIds:['asset:face:01','asset:fullbody:01'],likenessConsent:true,declaredTraits:{wardrobe:'black suit'}});
assert.equal(identity.profileVersionId,identityRepeat.profileVersionId);

const product=buildContinuityProfile({type:'product',profileId:'product:phone:01',referenceAssetIds:['asset:product:front','asset:product:side']});
const brand=buildContinuityProfile({type:'brand',profileId:'brand:laneriq:01',referenceAssetIds:[],declaredTraits:{palette:'deep blue'}});
const profiles=[identity,product,brand];
const locks=buildContinuityLocks({profiles,overrides:{'brand:laneriq:01:tone':'soft','identity:hero:01:wardrobe':'soft'}});
assert.equal(locks['identity:hero:01:face'],'hard');
assert.equal(locks['identity:hero:01:wardrobe'],'soft');

const hardChange=evaluateContinuityChangeRequest({locks,profileId:'identity:hero:01',dimension:'face',requestedChange:'different face shape'});
assert.equal(hardChange.ok,false);
assert.equal(hardChange.requiresHumanReview,true);
const softChange=evaluateContinuityChangeRequest({locks,profileId:'identity:hero:01',dimension:'wardrobe',requestedChange:'blue jacket'});
assert.equal(softChange.ok,true);
assert.equal(softChange.requiresHumanReview,true);

const shotPlan=buildContinuityShotPlan({profiles,shots:[
  {shotId:'s1',profileIds:['identity:hero:01','brand:laneriq:01']},
  {shotId:'s2',profileIds:['identity:hero:01','product:phone:01','brand:laneriq:01'],allowedChanges:['camera-language']},
  {shotId:'s3',profileIds:['identity:hero:01','brand:laneriq:01']},
]});
assert.equal(shotPlan.shotCount,3);
assert.equal(shotPlan.crossShotContinuityRequired,true);
assert.equal(shotPlan.providerContinuityAssumed,false);

const conflicts=detectContinuityConflicts({profiles,locks,requestedChanges:[
  {profileId:'identity:hero:01',dimension:'face',value:'change identity'},
  {profileId:'brand:laneriq:01',dimension:'tone',value:'more playful'},
]});
assert.equal(conflicts.ok,false);
assert.equal(conflicts.conflicts.length,1);
assert.equal(conflicts.automaticOverride,false);

const missingEvidence=evaluateContinuityEvidence({profileId:identity.profileId,artifactHash:'a'.repeat(64),provenanceId:'prov:continuity:01',metrics:{identity:95},requiredDimensions:['identity','face']});
assert.equal(missingEvidence.ok,false);
assert.equal(missingEvidence.truth,'EVIDENCE_REQUIRED');
const weak=evaluateContinuityEvidence({profileId:identity.profileId,artifactHash:'b'.repeat(64),provenanceId:'prov:continuity:02',metrics:{identity:92,face:84},requiredDimensions:['identity','face'],threshold:88});
assert.equal(weak.ok,false);
assert.equal(weak.realOutputContinuityVerified,false);
const strong=evaluateContinuityEvidence({profileId:identity.profileId,artifactHash:'c'.repeat(64),provenanceId:'prov:continuity:03',metrics:{identity:94,face:91},requiredDimensions:['identity','face'],threshold:88});
assert.equal(strong.ok,true);
assert.equal(strong.truth,'MEASURED_EVIDENCE');
assert.equal(strong.realOutputContinuityVerified,true);

const v2=deriveContinuityProfileVersion({parentProfile:identity,patch:{declaredTraits:{wardrobe:'formal black suit'}},likenessConsent:true});
assert.equal(v2.parentProfileVersionId,identity.profileVersionId);
assert.equal(v2.overwritesParent,false);
assert.notEqual(v2.profileVersionId,identity.profileVersionId);

console.log('Creative Media Continuity Engine contract PASS');
