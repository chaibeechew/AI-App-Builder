import assert from 'node:assert/strict';
import { buildCreativeMediaExecutionSession } from '../lib/ai/creative-media-execution-session.js';
import { buildCreativeMediaReferenceManifest } from '../lib/ai/creative-media-execution-reference-manifest.js';
import { claimCreativeMediaExecution, canReclaimCreativeMediaExecution } from '../lib/ai/creative-media-execution-claim.js';
import { resolveCreativeMediaExecutionReplay } from '../lib/ai/creative-media-execution-replay.js';
import { authorizeCreativeMediaProviderDispatch } from '../lib/ai/creative-media-execution-dispatch.js';
import { evaluateCreativeMediaExecutionResult } from '../lib/ai/creative-media-execution-result.js';

const input={ownerScopeId:'owner:demo:01',requestId:'req:media:001',taskId:'image.generate',inputAssetIds:['asset:image:01'],costMode:'zero',dispatchAuthorized:true};
const session=buildCreativeMediaExecutionSession(input);
const repeat=buildCreativeMediaExecutionSession(input);
assert.equal(session.sessionId,repeat.sessionId);
assert.equal(session.premiumAllowed,false);
assert.equal(session.providerInvoked,false);
assert.equal(session.productionVerified,false);
assert.throws(()=>buildCreativeMediaExecutionSession({...input,inputAssetIds:['https://example.com/a.png']}),/ASSET_INVALID/);
assert.throws(()=>buildCreativeMediaExecutionSession({...input,taskId:'image.not-real'}),/TASK_UNAVAILABLE/);

assert.throws(()=>buildCreativeMediaReferenceManifest({session,references:[{assetId:'asset:image:01',kind:'image',ownerScopeVerified:true,mimeValidated:true,malwareScanPassed:false}]}),/REFERENCE_SECURITY_REQUIRED/);
const manifest=buildCreativeMediaReferenceManifest({session,references:[{assetId:'asset:image:01',kind:'image',ownerScopeVerified:true,mimeValidated:true,malwareScanPassed:true}]});
assert.equal(manifest.allReferencesSecurityValidated,true);
assert.equal(manifest.externalUrlsAccepted,false);

const first=claimCreativeMediaExecution({sessionId:session.sessionId,workerId:'worker:one',nowMs:1000,leaseMs:10000});
assert.equal(first.ok,true);
const blocked=claimCreativeMediaExecution({sessionId:session.sessionId,workerId:'worker:two',nowMs:2000,currentClaim:first.claim});
assert.equal(blocked.ok,false);
assert.equal(blocked.code,'MEDIA_EXECUTION_ALREADY_CLAIMED');
assert.equal(canReclaimCreativeMediaExecution({claim:first.claim,nowMs:11000}).ok,true);
const reclaimed=claimCreativeMediaExecution({sessionId:session.sessionId,workerId:'worker:two',nowMs:11000,currentClaim:first.claim});
assert.equal(reclaimed.ok,true);

assert.equal(resolveCreativeMediaExecutionReplay({existing:null,session}).action,'create');
assert.equal(resolveCreativeMediaExecutionReplay({existing:{sessionId:session.sessionId,requestId:session.requestId},session}).action,'replay');
const conflictSession=buildCreativeMediaExecutionSession({...input,taskId:'image.edit'});
assert.equal(resolveCreativeMediaExecutionReplay({existing:{sessionId:session.sessionId,requestId:session.requestId},session:conflictSession}).action,'reject');

const noDispatch=buildCreativeMediaExecutionSession({...input,dispatchAuthorized:false});
assert.equal(authorizeCreativeMediaProviderDispatch({session:noDispatch,claim:first.claim,referenceManifest:manifest,ownerScopeValidated:true,provider:{connected:true,available:true,safetyReady:true,costClass:'free',capabilities:['image.generate']}}).ok,false);
const paidBlocked=authorizeCreativeMediaProviderDispatch({session,claim:first.claim,referenceManifest:manifest,ownerScopeValidated:true,provider:{id:'p1',connected:true,available:true,safetyReady:true,costClass:'premium',freeQuotaRemaining:0,capabilities:['image.generate']}});
assert.equal(paidBlocked.code,'MEDIA_EXECUTION_COST_POLICY_BLOCK');
const dispatch=authorizeCreativeMediaProviderDispatch({session,claim:first.claim,referenceManifest:manifest,ownerScopeValidated:true,provider:{id:'p-free',connected:true,available:true,safetyReady:true,costClass:'free',capabilities:['image.generate']}});
assert.equal(dispatch.ok,true);
assert.equal(dispatch.liveProviderVerified,false);

const incomplete=evaluateCreativeMediaExecutionResult({session,result:{persistedAssetId:'asset:final:01',artifactHash:'a'.repeat(64),provenanceId:'prov:01',safetyPassed:true,qualityPassed:false,outputValidated:true}});
assert.equal(incomplete.ok,false);
assert.equal(incomplete.code,'MEDIA_EXECUTION_QUALITY_REQUIRED');
const durable=evaluateCreativeMediaExecutionResult({session,result:{persistedAssetId:'asset:final:01',artifactHash:'b'.repeat(64),provenanceId:'prov:02',safetyPassed:true,qualityPassed:true,outputValidated:true,realOutputQualityMeasured:false}});
assert.equal(durable.ok,true);
assert.equal(durable.truth,'CI_READY');
assert.equal(durable.liveProviderVerified,false);
assert.equal(durable.realOutputQualityVerified,false);
const live=evaluateCreativeMediaExecutionResult({session,result:{persistedAssetId:'asset:final:02',artifactHash:'c'.repeat(64),provenanceId:'prov:03',safetyPassed:true,qualityPassed:true,outputValidated:true,realOutputQualityMeasured:true},providerEvidence:{productionEvidenceId:'provider-evidence:01',providerRequestId:'provider-request:01',outputVerified:true}});
assert.equal(live.truth,'LIVE_PROVIDER_VERIFIED');
assert.equal(live.productionVerified,false);
const production=evaluateCreativeMediaExecutionResult({session,result:{persistedAssetId:'asset:final:03',artifactHash:'d'.repeat(64),provenanceId:'prov:04',safetyPassed:true,qualityPassed:true,outputValidated:true,realOutputQualityMeasured:true},providerEvidence:{productionEvidenceId:'provider-evidence:02',providerRequestId:'provider-request:02',outputVerified:true},runtimeEvidence:{productionDeploymentId:'deploy:01',runtimeVerified:true}});
assert.equal(production.truth,'PRODUCTION_VERIFIED');
assert.equal(production.productionVerified,true);

console.log('Creative Media Execution Session Core contract PASS');
