import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { applySoolenMaxSecurity } from '../lib/ai/soolenai-max-security.js';
import { applyLivingIntelligenceStandard } from '../lib/ai/liui-standard.js';
import { getBenchmarkCatalog, summarizeBenchmarkRun } from '../lib/ai/benchmark-factory.js';
import { assessGenerationQuality, GENERATION_QUALITY_JUDGE_POLICY } from '../lib/ai/generation-quality-judge.js';
import { buildGenerationCandidateBudget, buildShadowCandidateInstruction, evaluateGenerationCandidatePool, buildCandidateSelfHealDirective, GENERATION_CANDIDATE_ORCHESTRATOR_POLICY } from '../lib/ai/generation-candidate-orchestrator.js';
import { GOLDEN_QUALITY_FLOOR, buildDeterministicGenerationSamplePlan, summarizeDeterministicGenerationSample, evaluateReleaseQualityFloor, buildReleaseQualitySnapshot, buildReleaseQualityTrend, buildReleaseQualityStatus, RELEASE_QUALITY_INTELLIGENCE_POLICY } from '../lib/ai/release-quality-intelligence.js';

const root=process.cwd();
const read=p=>fs.readFileSync(path.join(root,p),'utf8');

const catalog=getBenchmarkCatalog();
const benchmarkCase=catalog[0];
const qualityPlan={
  stability:['Loading skeleton, empty state, error recovery and retry with timeout fallback','Weak-network offline recovery and predictable navigation','Validated actions with useful confirmations'],
  security:['Secure auth permission role access validation with server-only secrets','RLS ownership least privilege and fail-closed authorization','Rate limit CSRF replay and input validation boundaries'],
  privacy:['Private by default with consent and purpose limitation','Delete export controls and minimal retention','Permission choices remain customer controlled'],
  comfort:['Mobile-first responsive safe-area layout with 44px tap targets','Keyboard screen-reader contrast and accessible labels','Reduced motion support with readable non-motion feedback'],
  beauty:['Original premium visual direction and tailored responsive composition','Coordinated palette typography imagery cards and background system','Distinctive hero and industry-relevant visual hierarchy'],
  naturalness:['Human-readable customer workflows and local terminology','Context-aware actions and clear recovery copy','Natural spacing and simple decision paths'],
};
const designSystem={visualDirection:'premium original editorial interface',backgroundDirection:'layered cinematic responsive background',heroDirection:'intent-first living hero',layoutSignature:'adaptive-bento narrative workspace',fontDirection:'humanist responsive sans',iconStyle:'semantic line icons',themeMode:'auto',colorPreference:'coordinated accessible palette',paletteRationale:'high contrast accessible palette',cardStyle:'living cards with restrained depth',imageStyle:'original editorial imagery',wallpaperPreset:'moon-city',motionDirection:'semantic restrained reduced motion'};
const pageNames=[...benchmarkCase.expected.requiredPageSignals,'Insights','Settings'];
while(pageNames.length<benchmarkCase.expected.minPages)pageNames.push(`Experience ${pageNames.length+1}`);
const featureNames=[...benchmarkCase.expected.requiredFeatureSignals];
while(featureNames.length<benchmarkCase.expected.minFeatures)featureNames.push(`Adaptive workflow ${featureNames.length+1}`);
const strongBase={
  name:'Quality Candidate',description:`Original ${benchmarkCase.industry} workflow`,industry:{name:benchmarkCase.industry},designSystem,qualityPlan,
  pages:pageNames.map((name,index)=>({name,route:index===0?'/':`/experience-${index+1}`,purpose:`${name} customer workflow`,description:`Responsive accessible ${name}`,components:[{type:index%2?'timeline':'hero'},{type:index%3?'card':'search'}],layout:index%2?'adaptive workspace':'living bento',visualTreatment:'premium original'})),
  features:featureNames.map((name,index)=>({name,description:`${name} with loading error empty retry recovery`,uiPattern:index%2?'living card':'context action'})),
  actions:[{name:'Search',intent:'search'},{name:'Book',intent:'book'},{name:'Message',intent:'message'},{name:'Share',intent:'share'}],
  navigation:pageNames.map((name,index)=>({label:name,route:index===0?'/':`/experience-${index+1}`})),
  data:{Record:{fields:['name','status','owner_id','updated_at']}},dataModels:[{name:'Record',fields:['name: text','status: text','owner_id: uuid relation','updated_at: timestamp']}],
};
const strong=applyLivingIntelligenceStandard(applySoolenMaxSecurity(strongBase));
const weak={name:'Generic',pages:[{name:'Dashboard',route:'/',components:[{type:'card'}]}],features:[],actions:[],navigation:[{label:'Dashboard',route:'/'}]};

const strongJudge=assessGenerationQuality(strong,{benchmarkCase});
const weakJudge=assessGenerationQuality(weak,{benchmarkCase});
assert.equal(GENERATION_QUALITY_JUDGE_POLICY.version,2);
assert.ok(GENERATION_QUALITY_JUDGE_POLICY.dimensions.includes('workflowCoherence'));
assert.ok(GENERATION_QUALITY_JUDGE_POLICY.dimensions.includes('resilienceAccessibility'));
assert.ok(strongJudge.workflowCoherence.score>=80,`Strong workflow coherence too low: ${strongJudge.workflowCoherence.score}`);
assert.ok(strongJudge.resilienceAccessibility.score>=75,`Strong resilience/accessibility too low: ${strongJudge.resilienceAccessibility.score}`);
assert.ok(strongJudge.score>weakJudge.score);
assert.equal(weakJudge.decision,'replan');

const freeBudget=buildGenerationCandidateBudget({costMode:'free',requestedCandidates:3});
assert.equal(freeBudget.targetCandidates,3);
assert.equal(freeBudget.maxMeteredRemoteCalls,1);
assert.equal(freeBudget.localShadowCandidates,2);
assert.equal(freeBudget.parallelMeteredCalls,false);
assert.match(buildShadowCandidateInstruction(2),/materially different|different composition|workflow/i);
const pool=evaluateGenerationCandidatePool([
  {id:'weak',provider:'remote-a',sourceKind:'remote',specification:weak},
  {id:'strong',provider:'soolen-local',sourceKind:'zero-cost-local',specification:strong},
  {id:'duplicate-weak',provider:'soolen-local',sourceKind:'zero-cost-local',specification:weak},
],{benchmarkCase});
assert.equal(pool.candidateCount,3);
assert.equal(pool.selectedCandidateId,'strong');
assert.ok(pool.ranking.find(item=>item.id==='weak').duplicatePenalty>0);
assert.equal(pool.storesRawUserPrompt,false);
assert.equal(GENERATION_CANDIDATE_ORCHESTRATOR_POLICY.freeModeMaxMeteredRemoteCalls,1);
assert.match(GENERATION_CANDIDATE_ORCHESTRATOR_POLICY.activation,/runtime-integrated/);
assert.match(buildCandidateSelfHealDirective(pool),/acceptance gate|requires/i);

const planA=buildDeterministicGenerationSamplePlan(),planB=buildDeterministicGenerationSamplePlan();
assert.equal(planA.sampleSize,50);
assert.equal(planA.industryCoverage,50);
assert.equal(planA.fingerprint,planB.fingerprint);
assert.equal(new Set(planA.cases.map(item=>item.id)).size,50);
assert.equal(planA.providerPolicy,'zero-cost-local-only-for-ci-sample');

const benchmarkRows=catalog.map(item=>({caseId:item.id,industry:item.industry,score:96,decision:'accept',passed:true,originalityScore:95,coverageScore:100,liuiScore:97,releaseReadinessScore:96}));
const benchmarkSummary=summarizeBenchmarkRun(benchmarkRows,{label:'golden-floor-test'});
const sampleRows=planA.cases.map(item=>({caseId:item.id,industry:item.industry,archetypeId:item.archetypeId,validJson:true,score:88,decision:'optimize',originalityScore:90,liuiScore:86,releaseReadinessScore:84}));
const sampleSummary=summarizeDeterministicGenerationSample(sampleRows);
assert.equal(sampleSummary.caseCount,50);
assert.equal(sampleSummary.validJsonRate,100);
assert.equal(sampleSummary.industryCoverage,50);
assert.equal(sampleSummary.storesRawPrompt,false);
assert.equal(sampleSummary.storesRawSpecification,false);
const floor=evaluateReleaseQualityFloor({benchmarkSummary,sampleSummary});
assert.equal(floor.passed,true,JSON.stringify(floor));
assert.equal(GOLDEN_QUALITY_FLOOR.deterministicGenerationSample.minimumCaseCount,50);

const snap1=buildReleaseQualitySnapshot({releaseId:'r1',commitSha:'1234567',benchmarkSummary,sampleSummary,observedAt:'2026-09-03T17:00:00Z'});
const betterSample=summarizeDeterministicGenerationSample(sampleRows.map(row=>({...row,score:90})));
const snap2=buildReleaseQualitySnapshot({releaseId:'r2',commitSha:'abcdef1',benchmarkSummary,sampleSummary:betterSample,observedAt:'2026-09-03T18:00:00Z'});
const trend=buildReleaseQualityTrend([snap1,snap2]);
assert.equal(trend.pointCount,2);
assert.equal(trend.deltas.sampleAverage,2);
assert.equal(snap1.rawPromptStored,false);
assert.equal(snap1.rawSpecificationStored,false);
const status=buildReleaseQualityStatus();
assert.equal(status.benchmark.caseCount,600);
assert.equal(status.deterministicSample.sampleSize,50);
assert.equal(status.cost.paidEmbeddings,false);
assert.equal(status.cost.vectorDatabase,false);
assert.equal(status.cost.dedicatedServer,false);
assert.equal(RELEASE_QUALITY_INTELLIGENCE_POLICY.sampleProvider,'soolen-local');
assert.equal(RELEASE_QUALITY_INTELLIGENCE_POLICY.externalProviderLiveClaim,false);

const route=read('app/api/quality/status/route.js');
assert.match(route,/CODE_CI_CAPABILITY/);
assert.match(route,/externalProviderLiveVerified:false/);
assert.match(route,/physicalDeviceVerified:false/);
assert.match(route,/storeVerified:false/);
assert.doesNotMatch(route,/process\.env/);
assert.doesNotMatch(route,/service_role|api[_-]?key|secret/i);

console.log('✓ Automatic Quality Judge v2 adds workflow coherence and resilience/accessibility scoring');
console.log('✓ Cost-safe candidate orchestration ranks bounded candidates without paid embedding/vector dependencies');
console.log('✓ Release Quality Intelligence builds a deterministic 50-industry zero-cost generation sample plan and privacy-safe quality history');
console.log('✓ Golden Quality Floor and release trend evidence remain separate from external-provider LIVE, Production browser, device and store claims');
console.log('✓ Sanitized /api/quality/status exposes aggregate CODE/CI capability only');
