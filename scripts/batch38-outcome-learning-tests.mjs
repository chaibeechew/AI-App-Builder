import assert from 'node:assert/strict';
import fs from 'node:fs';
import { buildPrivacySafeOutcomeLearningRecord, compareOutcomeLearningRecords, assertPrivacySafeOutcomeLearningRecord, OUTCOME_LEARNING_LEDGER_POLICY, OUTCOME_LEARNING_COMPARISON_POLICY } from '../lib/ai/outcome-learning-ledger.js';

const rows=[
  {industry:'Real Estate',archetypeId:'booking',score:98,decision:'accept',originalityScore:95,coverageScore:91,liuiScore:100,releaseReadinessScore:100,candidateCount:3,uniqueCandidateCount:3,selectedCandidateId:'local-structural-shadow-1',selectedDecision:'accept',selectedHardBlockers:[],benchmarkHardBlockers:[],outcomeFingerprint:'gof1-safe-a',prompt:'PRIVATE PROMPT MUST NOT SURVIVE',specification:{secret:'PRIVATE SPEC MUST NOT SURVIVE'},userId:'user-secret'},
  {industry:'Restaurant',archetypeId:'crm',score:90,decision:'optimize',originalityScore:64,coverageScore:73,liuiScore:98,releaseReadinessScore:100,candidateCount:3,uniqueCandidateCount:3,selectedCandidateId:'primary',selectedDecision:'optimize',selectedHardBlockers:[],benchmarkHardBlockers:[],outcomeFingerprint:'gof1-safe-b'},
  {industry:'Retail',archetypeId:'marketplace',score:98,decision:'accept',originalityScore:93,coverageScore:91,liuiScore:100,releaseReadinessScore:100,candidateCount:3,uniqueCandidateCount:3,selectedCandidateId:'local-structural-shadow-2',selectedDecision:'accept',selectedHardBlockers:[],benchmarkHardBlockers:[],outcomeFingerprint:'gof1-safe-c'},
  {industry:'Healthcare',archetypeId:'directory',score:99,decision:'accept',originalityScore:91,coverageScore:100,liuiScore:100,releaseReadinessScore:100,candidateCount:3,uniqueCandidateCount:3,selectedCandidateId:'local-structural-shadow-2',selectedDecision:'accept',selectedHardBlockers:[],benchmarkHardBlockers:[],outcomeFingerprint:'gof1-safe-d'},
];

const record=buildPrivacySafeOutcomeLearningRecord(rows,{recordId:'batch38-test',commitSha:'b365e9552ca307cc93ccb1c958997e596da71258'});
assertPrivacySafeOutcomeLearningRecord(record);
const serialized=JSON.stringify(record);
assert.doesNotMatch(serialized,/PRIVATE PROMPT|PRIVATE SPEC|user-secret/);
assert.doesNotMatch(serialized,/"prompt"|"specification"|"userId"/);
assert.equal(record.sample.caseCount,4);
assert.equal(record.sample.industryCoverage,4);
assert.equal(record.sample.archetypeCoverage,4);
assert.equal(record.sample.averageUniqueCandidateCount,3);
assert.equal(record.sample.uniqueOutcomeFingerprintCount,4);
assert.deepEqual(record.sample.winnerFamilies,{primary:1,zeroCostStructuralShadow:3});
assert.equal(OUTCOME_LEARNING_LEDGER_POLICY.syntheticBenchmarkOnly,true);
assert.equal(OUTCOME_LEARNING_LEDGER_POLICY.automaticBaselineMutation,false);
assert.equal(OUTCOME_LEARNING_LEDGER_POLICY.baselinePromotionRequiresReviewedPullRequest,true);
assert.equal(OUTCOME_LEARNING_LEDGER_POLICY.qualityGatesMayNotBeLoweredByLearning,true);
assert.equal(OUTCOME_LEARNING_LEDGER_POLICY.storesRawPrompt,false);
assert.equal(OUTCOME_LEARNING_LEDGER_POLICY.storesRawSpecification,false);
assert.equal(OUTCOME_LEARNING_LEDGER_POLICY.storesUserId,false);
assert.equal(OUTCOME_LEARNING_LEDGER_POLICY.paidEmbeddingDependency,false);
assert.equal(OUTCOME_LEARNING_LEDGER_POLICY.vectorDatabaseDependency,false);
assert.equal(OUTCOME_LEARNING_LEDGER_POLICY.dedicatedServerRequired,false);

const identical=compareOutcomeLearningRecords(record,record);
assert.equal(identical.passed,true);
assert.equal(identical.regressions.length,0);

const degradedRows=rows.map((row,index)=>({...row,score:index===0?70:row.score-8,selectedDecision:index===0?'replan':row.selectedDecision,decision:index===0?'replan':row.decision,selectedHardBlockers:index===0?['security_gate_failed']:[],benchmarkHardBlockers:index===0?['security_gate_failed']:[],uniqueCandidateCount:index===0?1:2}));
const degraded=buildPrivacySafeOutcomeLearningRecord(degradedRows,{recordId:'degraded'});
const comparison=compareOutcomeLearningRecords(record,degraded);
assert.equal(comparison.passed,false);
assert.ok(comparison.regressions.some(item=>item.type==='average-score'));
assert.ok(comparison.regressions.some(item=>item.type==='runtime-replan-rate'));
assert.ok(comparison.regressions.some(item=>item.type==='benchmark-replan-rate'));
assert.ok(comparison.regressions.some(item=>item.type==='candidate-uniqueness'));
assert.ok(comparison.regressions.some(item=>item.type==='new-hard-blockers'));
assert.ok(OUTCOME_LEARNING_COMPARISON_POLICY.maximumGroupAverageScoreRegression<=3);

const baseline=JSON.parse(fs.readFileSync('quality/baselines/outcome-learning-batch37-main.json','utf8'));
assert.equal(baseline.source.commitSha,'b365e9552ca307cc93ccb1c958997e596da71258');
assert.equal(baseline.source.workflowRunId,33790568048);
assert.equal(baseline.source.artifactId,9907158345);
assert.equal(baseline.sample.caseCount,50);
assert.equal(baseline.sample.industryCoverage,50);
assert.equal(baseline.sample.archetypeCoverage,12);
assert.equal(baseline.sample.averageScore,97.94);
assert.equal(baseline.sample.runtimeReplanRate,0);
assert.equal(baseline.sample.benchmarkReplanRate,0);
assert.equal(baseline.sample.averageUniqueCandidateCount,3);
assert.equal(baseline.governance.automaticBaselineMutation,false);
assert.equal(baseline.governance.reviewedPullRequestRequired,true);
assert.equal(baseline.privacy.rawPromptStored,false);
assert.equal(baseline.privacy.rawSpecificationStored,false);
assert.equal(Object.keys(baseline.byIndustry).length,50);
assert.equal(Object.keys(baseline.byArchetype).length,12);

const sampleScript=fs.readFileSync('scripts/release-quality-generation-sample.mjs','utf8');
assert.match(sampleScript,/buildPrivacySafeOutcomeLearningRecord/);
assert.match(sampleScript,/compareOutcomeLearningRecords/);
assert.match(sampleScript,/outcome-learning-batch37-main\.json/);
assert.match(sampleScript,/outcome-learning-record\.json/);
assert.match(sampleScript,/reviewed-baseline outcome learning regression failed/);

const statusRoute=fs.readFileSync('app/api/quality/status/route.js','utf8');
assert.match(statusRoute,/privacy-safe-synthetic-release-comparison/);
assert.match(statusRoute,/reviewed-pull-request-only/);
assert.match(statusRoute,/OUTCOME_LEARNING_LEDGER_POLICY/);
assert.match(statusRoute,/OUTCOME_LEARNING_COMPARISON_POLICY/);
assert.doesNotMatch(statusRoute,/process\.env|service_role|api[_-]?key|secret/i);

console.log('✓ Outcome Learning keeps only synthetic aggregate metrics, strategy families and blocker IDs');
console.log('✓ Raw prompts, specifications and user identifiers are discarded even when present in input rows');
console.log('✓ Release-over-release comparison catches score, replan, uniqueness and hard-blocker regressions');
console.log('✓ Batch 37 post-merge main is pinned as a reviewed baseline and cannot mutate automatically');
console.log('✓ Quality status exposes policy/governance only and no secrets or baseline row data');
console.log('✓ Learning may rank strategies but cannot lower Quality Judge or Release Gate standards');
