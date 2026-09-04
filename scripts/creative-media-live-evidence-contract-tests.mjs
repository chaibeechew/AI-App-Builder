import assert from 'node:assert/strict';
import { assessCreativeMediaProvider } from '../lib/ai/creative-media-provider-qualification.js';
import { assessCreativeMediaLiveEvidence } from '../lib/ai/creative-media-live-evidence.js';
import { buildCreativeMediaBenchmarkPlan, assessCreativeMediaBenchmarkCase, CREATIVE_MEDIA_BENCHMARK_CASES } from '../lib/ai/creative-media-benchmark-suite.js';
import { buildCreativeMediaReadinessScorecard } from '../lib/ai/creative-media-readiness-scorecard.js';
import { getCreativeMediaTask } from '../lib/ai/creative-media-control-plane.js';

const tasks=['image.generate','image.image-to-image','image.identity-series','video.generate','video.image-to-video','video.lipsync'];
for(const task of tasks)assert.ok(getCreativeMediaTask(task),`Missing task ${task}`);
const caps=tasks.map(task=>getCreativeMediaTask(task).capability);

const claimsOnly=assessCreativeMediaProvider({provider:{id:'provider.demo',costClass:'free',capabilities:caps},taskIds:tasks,observations:{realRuns:0}});
assert.equal(claimsOnly.ok,true);assert.equal(claimsOnly.qualifiedForMediaCanary,false);assert.equal(claimsOnly.liveProviderVerified,false);assert.ok(claimsOnly.blockers.includes('insufficient-real-runs'));

const qualified=assessCreativeMediaProvider({provider:{id:'provider.demo',costClass:'free',capabilities:caps},taskIds:tasks,observations:{realRuns:10,successfulRuns:10,durableOutputs:10,safetyPassedRuns:10,provenanceVerifiedRuns:10,ownerValidatedRuns:10,qualityPassedRuns:10,p95LatencyMs:45000}});
assert.equal(qualified.qualifiedForMediaCanary,true);assert.equal(qualified.liveProviderVerified,false);

const sha='a'.repeat(40),hash='b'.repeat(64);
const mismatched=assessCreativeMediaLiveEvidence({task:'video.generate',providerId:'provider.demo',providerRunId:'run.1',outputAssetId:'asset.video.1',contentSha256:hash,generatedAt:new Date().toISOString(),qualityScore:94,qualityAssessmentId:'qa.1',evidence:{actualProviderResponseCaptured:true,outputValidated:true,durablePersistenceVerified:true,outputReopenVerified:true,provenanceVerified:true,ownerScopeVerified:true,safetyPassed:true},release:{mainSha:sha,deploymentSha:sha,runtimeSha:'c'.repeat(40),productionReady:true,runtimeVerified:true}});
assert.equal(mismatched.liveProviderVerified,false);assert.ok(mismatched.blockers.includes('production-exact-sha-not-verified'));

const live=assessCreativeMediaLiveEvidence({task:'video.generate',providerId:'provider.demo',providerRunId:'run.2',outputAssetId:'asset.video.2',contentSha256:hash,generatedAt:new Date().toISOString(),qualityScore:94,qualityAssessmentId:'qa.2',evidence:{actualProviderResponseCaptured:true,outputValidated:true,durablePersistenceVerified:true,outputReopenVerified:true,provenanceVerified:true,ownerScopeVerified:true,safetyPassed:true},release:{mainSha:sha,deploymentSha:sha,runtimeSha:sha,productionReady:true,runtimeVerified:true}});
assert.equal(live.liveProviderVerified,true);assert.equal(live.productionLiveVerified,true);assert.equal(live.realOutputQualityVerified,true);

const plan=buildCreativeMediaBenchmarkPlan({providerId:'provider.demo',providerCapabilities:caps});
assert.equal(plan.ok,true);assert.ok(plan.totalCases>=10);assert.equal(plan.truth.advertisedCapabilityIsNotPassingEvidence,true);
const definition=CREATIVE_MEDIA_BENCHMARK_CASES.find(row=>row.id==='vid-t2v');
const sample={liveProviderVerified:true,contentSha256:hash,outputAssetId:'asset.video.sample',metrics:{promptAdherence:95,motionQuality:94,temporalConsistency:94,cameraCoherence:93}};
const benchmark=assessCreativeMediaBenchmarkCase({caseId:'vid-t2v',samples:Array.from({length:definition.minSamples},()=>sample)});
assert.equal(benchmark.passed,true);
const weak=assessCreativeMediaBenchmarkCase({caseId:'vid-t2v',samples:[sample]});
assert.equal(weak.passed,false);assert.ok(weak.blockers.includes('insufficient-samples'));

const partial=buildCreativeMediaReadinessScorecard({providerQualification:qualified,liveEvidenceRecords:[live],benchmarkResults:[benchmark]});
assert.equal(partial.productionLive100,false);assert.notEqual(partial.status,'100_LIVE_VERIFIED');assert.ok(partial.capabilityCoveragePercent<100);
const empty=buildCreativeMediaReadinessScorecard({providerQualification:null,liveEvidenceRecords:[],benchmarkResults:[]});
assert.equal(empty.status,'EVIDENCE_REQUIRED');assert.equal(empty.productionLive100,false);

console.log('Creative Media Provider Qualification & Live Evidence 100 contracts passed.');
