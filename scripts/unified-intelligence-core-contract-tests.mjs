import assert from 'node:assert/strict';
import { createWorldState } from '../lib/reality/world-state.js';
import { createRealityContext } from '../lib/intelligence/reality-context.js';
import { createWorldEventLog,appendWorldEvent,verifyWorldEventLog,forkWorldEventLog } from '../lib/intelligence/world-event-log.js';
import { createEvidenceLedger,appendEvidence,assessEvidence,verifyEvidenceLedger } from '../lib/intelligence/evidence-ledger.js';
import { createCapabilityMemory,recordCapabilityObservation,capabilityMemoryScore } from '../lib/intelligence/capability-memory.js';
import { createSimulationCalibrationState,registerSimulation,recordObservedOutcome,summarizeCalibration } from '../lib/intelligence/simulation-calibration.js';
import { assessActionAuthority } from '../lib/intelligence/action-authority.js';
import { compileExecutableRealityPlan,validateExecutableRealityPlan } from '../lib/intelligence/executable-reality-compiler.js';
import { planUnifiedIntelligenceTask,admitUnifiedCreativeResult } from '../lib/intelligence/unified-intelligence-core.js';
import { summarizeUnifiedIntelligenceCore } from '../lib/intelligence/unified-intelligence-contract.js';

const HASH_A='a'.repeat(64);
const HASH_B='b'.repeat(64);

const world=createWorldState({
  worldId:'world-1',projectId:'project-1',
  entities:[{id:'character-1',kind:'character',label:'Lead',attributes:{hair:'black',wardrobe:'white-shirt'}}],
});
const context=createRealityContext({worldId:'world-1',worldVersion:1,projectId:'project-1',branchId:'main',characterId:'character-1'});
assert.equal(context.privacyScope,'project');
assert.equal(context.characterId,'character-1');
assert.throws(()=>createRealityContext({worldId:'bad id',projectId:'project-1'}),/UNIFIED_CONTEXT_WORLD_ID_INVALID/);

let log=createWorldEventLog({context});
log=appendWorldEvent(log,{eventId:'event-1',expectedVersion:1,type:'metadata.patch',actorType:'test',patch:{patch:{weather:'sunny'}},evidenceRefs:[],reversible:true});
assert.equal(log.headVersion,2);
assert.equal(verifyWorldEventLog(log).ok,true);
assert.throws(()=>appendWorldEvent(log,{eventId:'event-conflict',expectedVersion:1,type:'metadata.patch',patch:{patch:{weather:'rain'}}}),/UNIFIED_EVENT_VERSION_CONFLICT/);
const tampered=JSON.parse(JSON.stringify(log));
tampered.events[0].patch.patch.weather='tampered';
assert.equal(verifyWorldEventLog(tampered).ok,false);
const branch=forkWorldEventLog(log,{branchId:'what-if-a',fromVersion:2});
assert.equal(branch.baseVersion,2);
assert.equal(branch.events.length,0);
assert.equal(branch.forkedFrom.branchId,'main');
assert.equal(verifyWorldEventLog(branch).ok,true);

let ledger=createEvidenceLedger({worldId:'world-1',projectId:'project-1'});
assert.throws(()=>appendEvidence(ledger,{evidenceId:'evidence-unverified-signature',level:'SIGNED_OBSERVED',artifactHash:HASH_A,signed:true,signatureVerified:false}),/UNIFIED_EVIDENCE_SIGNATURE_VERIFICATION_REQUIRED/);
assert.throws(()=>appendEvidence(ledger,{evidenceId:'evidence-missing-signature',level:'SIGNED_OBSERVED',artifactHash:HASH_A,signed:false,signatureVerified:true}),/UNIFIED_EVIDENCE_SIGNATURE_REQUIRED/);
ledger=appendEvidence(ledger,{evidenceId:'evidence-1',claimId:'creative-1',level:'SIGNED_OBSERVED',artifactHash:HASH_A,observerId:'laneriq-vision-1',sourceId:'creative-observer',signed:true,signatureVerified:true,provenanceVerified:true,observedAt:'2026-09-05T05:00:00Z',expiresAt:'2099-01-01T00:00:00Z',metadata:{qualityScore:94}});
assert.equal(verifyEvidenceLedger(ledger).ok,true);
assert.equal(assessEvidence(ledger,{evidenceIds:['evidence-1'],minimumLevel:'SIGNED_OBSERVED',artifactHash:HASH_A,now:Date.parse('2026-09-05T06:00:00Z')}).ok,true);
assert.equal(assessEvidence(ledger,{evidenceIds:['evidence-1'],minimumLevel:'SIGNED_OBSERVED',artifactHash:HASH_A,now:Date.parse('2100-01-01T00:00:00Z')}).ok,false);
const signatureTampered=JSON.parse(JSON.stringify(ledger));
signatureTampered.entries[0].signatureVerified=false;
assert.equal(verifyEvidenceLedger(signatureTampered).ok,false);
assert.throws(()=>appendEvidence(ledger,{evidenceId:'evidence-private',level:'PROVIDED',metadata:{rawPrompt:'private prompt'}}),/UNIFIED_EVIDENCE_PRIVATE_FIELD_FORBIDDEN/);

let memory=createCapabilityMemory();
memory=recordCapabilityObservation(memory,{moduleId:'provider-a',task:'text-to-image',success:true,qualityScore:93,latencyMs:800,verifiedOutput:true,observedAt:'2026-09-05T05:00:00Z'});
const memoryScore=capabilityMemoryScore(memory,{moduleId:'provider-a',task:'text-to-image',now:Date.parse('2026-09-05T06:00:00Z')});
assert.equal(memoryScore.available,true);
assert.ok(memoryScore.score>0);
assert.equal(memory.rawPromptsStored,false);
assert.throws(()=>recordCapabilityObservation(memory,{moduleId:'provider-a',task:'text-to-image',success:true,rawPrompt:'do not store me'}),/UNIFIED_CAPABILITY_MEMORY_PRIVATE_FIELD_FORBIDDEN/);

let calibration=createSimulationCalibrationState();
calibration=registerSimulation(calibration,{simulationId:'sim-1',modelId:'model-1',scenarioId:'scenario-a',predictions:{conversion:0.7,retention:0.6},assumptions:['explicit model'],evidenceIds:['evidence-1']});
assert.equal(calibration.records['sim-1'].canClaimPrediction,false);
calibration=recordObservedOutcome(calibration,{simulationId:'sim-1',outcomes:{conversion:0.6,retention:0.65},independentEvidence:true,evidenceId:'outcome-evidence-1',observedAt:'2026-10-01T00:00:00Z'});
const calibrationSummary=summarizeCalibration(calibration);
assert.equal(calibrationSummary.calibrated,1);
assert.equal(calibrationSummary.canClaimFutureAccuracy,false);
assert.ok(calibrationSummary.meanAbsoluteError>0);

const blockedAction=assessActionAuthority({action:{external:true,irreversible:true,effects:['send-transaction']},authorization:{scope:'transaction'},securityAssessment:{checked:false}});
assert.equal(blockedAction.allowed,false);
assert.ok(blockedAction.blockers.includes('explicit-user-approval-required'));
assert.ok(blockedAction.blockers.includes('human-approval-required-for-irreversible-action'));
assert.ok(blockedAction.blockers.includes('security-check-required'));

const blockedExternalWithoutEvidence=assessActionAuthority({action:{external:true,irreversible:true,effects:['publish-approved-asset']},authorization:{scope:'publish:asset-1',explicitUserApproval:true,humanApproval:true},securityAssessment:{checked:true,blocked:false,stale:false,assessmentId:'security-1'}});
assert.equal(blockedExternalWithoutEvidence.allowed,false);
assert.equal(blockedExternalWithoutEvidence.governanceRequired,true);
assert.ok(blockedExternalWithoutEvidence.blockers.includes('verified-artifact-required'));
assert.ok(blockedExternalWithoutEvidence.blockers.includes('verified-provenance-required'));
assert.ok(blockedExternalWithoutEvidence.blockers.includes('independent-observation-required'));

const allowedExternal=assessActionAuthority({action:{external:true,irreversible:true,effects:['publish-approved-asset']},authorization:{scope:'publish:asset-1',explicitUserApproval:true,humanApproval:true},securityAssessment:{checked:true,blocked:false,stale:false,assessmentId:'security-1'},evidence:{artifactHash:HASH_A,outputValidated:true,provenanceId:'prov-external-1',provenanceVerified:true,observerId:'observer-external-1',observed:true}});
assert.equal(allowedExternal.allowed,true);
assert.equal(allowedExternal.security.intelligenceCanAuthorizeClean,false);

const allowedPhysical=assessActionAuthority({action:{physical:true,irreversible:false,effects:['move-device'],reason:'user-approved test'},authorization:{scope:'device:test',explicitUserApproval:true,humanApproval:true},securityAssessment:{checked:true,blocked:false,stale:false},evidence:{artifactHash:HASH_A,outputValidated:true,provenanceId:'prov-1',provenanceVerified:true,observerId:'observer-1',observed:true}});
assert.equal(allowedPhysical.allowed,true);

const normalPlan=compileExecutableRealityPlan({intent:'Create a project world',targets:['world'],constraints:{planId:'plan-1'},context,costMode:'zero',premiumAllowed:false});
assert.equal(validateExecutableRealityPlan(normalPlan).ok,true);
assert.equal(normalPlan.nodes.at(-1).id,'world-update');
const premiumBlocked=compileExecutableRealityPlan({intent:'Create a project world',targets:['world'],constraints:{planId:'plan-premium'},context,costMode:'zero',premiumAllowed:true});
assert.equal(premiumBlocked.executable,false);
assert.ok(premiumBlocked.blockers.includes('premium-escalation-blocked-by-zero-free-mode'));

const planWorld=createWorldState({worldId:'world-plan',projectId:'project-plan'});
const unifiedPlan=planUnifiedIntelligenceTask({
  intent:'Create a product hero image',targets:['image'],worldState:planWorld,costMode:'zero',premiumAllowed:false,
  intelligenceNodes:[{id:'local-fabric',connected:true,available:true,safetyReady:true,costClass:'zero',capabilities:['world-state','creative-media','quality-judge','provenance'],qualityScore:90,verifiedOutputCount:1}],
  providers:[{id:'image-provider-free',connected:true,available:true,safetyReady:true,costClass:'zero',capabilities:['text-to-image'],qualityScore:90,verifiedOutputCount:1}],
  creativeTask:'image.generate',creativeInput:{prompt:'A clean product hero'},claimType:'simulation',
});
assert.equal(unifiedPlan.dagValidation.ok,true);
assert.equal(unifiedPlan.canDispatch,true);
assert.equal(unifiedPlan.creative.prepared.candidatePlan.candidates[0].providerId,'image-provider-free');

let mediaLog=createWorldEventLog({context});
const resultA={ok:true,status:'completed',truth:'REAL_OUTPUT_QUALITY_VERIFIED',winner:{providerId:'provider-a',judgement:{productionEligible:true,observation:{ok:true,signedEvidence:true,hardBlockers:[],artifactHash:HASH_A}}}};
const admittedA=admitUnifiedCreativeResult({context,worldState:world,eventLog:mediaLog,evidenceLedger:ledger,result:resultA,evidenceIds:['evidence-1'],eventId:'creative-event-1',entityId:'character-1',entityKind:'character',attributes:{pose:'standing'}});
assert.equal(admittedA.allowed,true);
assert.equal(admittedA.worldState.version,2);
assert.equal(admittedA.eventLog.headVersion,2);
assert.equal(admittedA.canonicalEntityId,'character-1');
assert.equal(admittedA.worldState.entities.find(row=>row.id==='character-1').attributes.lastProviderId,'provider-a');

let ledger2=appendEvidence(ledger,{evidenceId:'evidence-2',claimId:'creative-2',level:'SIGNED_OBSERVED',artifactHash:HASH_B,observerId:'laneriq-vision-1',sourceId:'creative-observer',signed:true,signatureVerified:true,provenanceVerified:true,observedAt:'2026-09-05T05:30:00Z',expiresAt:'2099-01-01T00:00:00Z'});
const context2=createRealityContext({worldId:'world-1',worldVersion:2,projectId:'project-1',branchId:'main',characterId:'character-1'});
const resultB={ok:true,status:'completed',truth:'REAL_OUTPUT_QUALITY_VERIFIED',winner:{providerId:'provider-b',judgement:{productionEligible:true,observation:{ok:true,signedEvidence:true,hardBlockers:[],artifactHash:HASH_B}}}};
const admittedB=admitUnifiedCreativeResult({context:context2,worldState:admittedA.worldState,eventLog:admittedA.eventLog,evidenceLedger:ledger2,result:resultB,evidenceIds:['evidence-2'],eventId:'creative-event-2',entityId:'character-1',entityKind:'character',attributes:{pose:'walking'}});
assert.equal(admittedB.allowed,true);
assert.equal(admittedB.canonicalEntityId,'character-1');
assert.equal(admittedB.worldState.entities.length,1);
assert.equal(admittedB.worldState.entities[0].attributes.lastProviderId,'provider-b');
assert.equal(admittedB.worldState.version,3);
assert.equal(verifyWorldEventLog(admittedB.eventLog).ok,true);

const fakeUnsigned={ok:true,status:'completed',truth:'REAL_OUTPUT_QUALITY_VERIFIED',winner:{providerId:'provider-x',judgement:{productionEligible:true,observation:{ok:true,signedEvidence:false,hardBlockers:[],artifactHash:HASH_A}}}};
const rejected=admitUnifiedCreativeResult({context,worldState:world,eventLog:mediaLog,evidenceLedger:ledger,result:fakeUnsigned,evidenceIds:['evidence-1'],eventId:'creative-event-fake',entityId:'character-1'});
assert.equal(rejected.allowed,false);

const summary=summarizeUnifiedIntelligenceCore();
assert.equal(summary.policy.simulationIsNotPrediction,true);
assert.equal(summary.policy.configuredIsNotLive,true);
assert.equal(summary.liveClaims.length,0);
console.log('LANERIQ Unified Intelligence Core Batch 173 hardened contract tests: PASS');
