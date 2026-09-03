import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { applySoolenMaxSecurity } from '../lib/ai/soolenai-max-security.js';
import { applyLivingIntelligenceStandard } from '../lib/ai/liui-standard.js';
import { assessGenerationQuality, GENERATION_QUALITY_JUDGE_POLICY } from '../lib/ai/generation-quality-judge.js';
import { buildGenerationCandidateBudget, evaluateGenerationCandidatePool, GENERATION_CANDIDATE_ORCHESTRATOR_POLICY } from '../lib/ai/generation-candidate-orchestrator.js';
import { expandZeroCostIndustrySpecification, ZERO_COST_INDUSTRY_EXPANDER_POLICY } from '../lib/ai/zero-cost-industry-expander.js';
import { applyRuntimeOutcomeIntelligence, RUNTIME_OUTCOME_SELECTOR_POLICY } from '../lib/ai/runtime-outcome-selector.js';
import { buildDeterministicGenerationSamplePlan, summarizeDeterministicGenerationSample, evaluateReleaseQualityFloor, buildReleaseQualityStatus, RELEASE_QUALITY_INTELLIGENCE_POLICY } from '../lib/ai/release-quality-intelligence.js';

const root=process.cwd();
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const qualityPlan={
  stability:['Loading, empty, error, timeout and retry states are explicit.','Weak-network recovery preserves safe progress.','Validated idempotent actions prevent duplicate submissions.'],
  security:['Authentication and ownership authorization fail closed.','Secrets stay server-only and least privilege.','Rate limits and bounded inputs protect mutations.'],
  privacy:['Private by default with explicit sharing controls.','Collect only necessary workflow data.','Sensitive permissions are user-triggered and denial-safe.'],
  comfort:['Mobile-first safe-area layout with large touch targets.','Keyboard screen-reader and contrast accessibility.','Reduced-motion behavior keeps feedback understandable.'],
  beauty:['Original industry-specific visual identity.','Coordinated typography imagery cards and spacing.','Readable premium backgrounds preserve hierarchy.'],
  naturalness:['Human-readable real-world workflows.','Context-local actions expose the next useful step.','Consequential actions confirm and recover clearly.'],
};
const base={name:'Outcome Intelligence Candidate',description:'Original workflow candidate',designSystem:{visualDirection:'premium original editorial interface',backgroundDirection:'layered responsive background',heroDirection:'intent-first living hero',layoutSignature:'adaptive bento workspace',fontDirection:'humanist responsive sans',iconStyle:'semantic icons',themeMode:'auto',colorPreference:'accessible coordinated palette',paletteRationale:'high contrast',cardStyle:'living cards',imageStyle:'original editorial imagery',wallpaperPreset:'moon-city',motionDirection:'semantic reduced-motion-safe motion'},qualityPlan,pages:[{name:'Home',route:'/',purpose:'Intent and next actions',components:[{type:'hero'},{type:'command'}]},{name:'Workspace',route:'/workspace',purpose:'Core work queue',components:[{type:'kanban'},{type:'filter'}]},{name:'Calendar',route:'/calendar',purpose:'Schedule and follow up',components:[{type:'calendar'},{type:'timeline'}]},{name:'Insights',route:'/insights',purpose:'Understand progress',components:[{type:'chart'},{type:'card'}]},{name:'People',route:'/people',purpose:'Manage relationships',components:[{type:'search'},{type:'list'}]},{name:'Settings',route:'/settings',purpose:'Control preferences',components:[{type:'tabs'},{type:'form'}]}],features:[{name:'Search',description:'Search with loading empty error retry recovery'},{name:'Workflow',description:'Role-aware mobile workflow'},{name:'Insights',description:'Accessible responsive analytics'},{name:'Recovery',description:'Offline weak-network reconnect and retry'}],actions:[{name:'Search',intent:'search'},{name:'Create',intent:'create'},{name:'Book',intent:'book'},{name:'Message',intent:'message'},{name:'Share',intent:'share'}],navigation:[{label:'Home',route:'/'},{label:'Workspace',route:'/workspace'},{label:'Calendar',route:'/calendar'},{label:'Insights',route:'/insights'},{label:'People',route:'/people'},{label:'Settings',route:'/settings'}],data:{Record:{fields:['name','status','owner_id','updated_at']}},dataModels:[{name:'Record',fields:['name: text','status: text','owner_id: uuid relation','updated_at: timestamp']}]};
const strong=applyLivingIntelligenceStandard(applySoolenMaxSecurity(base));
const weak={name:'Generic',pages:[{name:'Dashboard',route:'/',components:[{type:'card'}]}],features:[],actions:[],navigation:[{label:'Dashboard',route:'/'}]};

const strongJudge=assessGenerationQuality(strong);
const weakJudge=assessGenerationQuality(weak);
assert.equal(GENERATION_QUALITY_JUDGE_POLICY.version,2);
assert.ok(GENERATION_QUALITY_JUDGE_POLICY.dimensions.includes('workflowCoherence'));
assert.ok(GENERATION_QUALITY_JUDGE_POLICY.dimensions.includes('resilienceAccessibility'));
assert.ok(strongJudge.workflowCoherence.score>=80);
assert.ok(strongJudge.resilienceAccessibility.score>=75);
assert.ok(strongJudge.score>weakJudge.score);
assert.equal(weakJudge.decision,'replan');

const budget=buildGenerationCandidateBudget({costMode:'free',requestedCandidates:3});
assert.equal(budget.maxMeteredRemoteCalls,1);
assert.equal(budget.localShadowCandidates,2);
assert.equal(budget.parallelMeteredCalls,false);
const pool=evaluateGenerationCandidatePool([{id:'weak',provider:'remote',sourceKind:'primary-provider',specification:weak},{id:'strong',provider:'laneriq-local-transform',sourceKind:'zero-cost-structural-shadow',specification:strong},{id:'duplicate-weak',provider:'laneriq-local-transform',sourceKind:'zero-cost-structural-shadow',specification:weak}]);
assert.equal(pool.selectedCandidateId,'strong');
assert.ok(pool.ranking.find(item=>item.id==='weak').duplicatePenalty>0);
assert.equal(GENERATION_CANDIDATE_ORCHESTRATOR_POLICY.freeModeMaxMeteredRemoteCalls,1);

const expanded=expandZeroCostIndustrySpecification({pages:[{name:'Home',route:'/'}],features:[],actions:[],data:{}},'Create a Cybersecurity CRM app',{variationIndex:1});
assert.equal(expanded.zeroCostIndustryIntelligence.matched,true);
assert.equal(expanded.zeroCostIndustryIntelligence.industry,'Cybersecurity');
assert.equal(expanded.zeroCostIndustryIntelligence.explicitIndustry,true);
assert.equal(ZERO_COST_INDUSTRY_EXPANDER_POLICY.explicitCanonicalIndustryWins,true);

const selected=applyRuntimeOutcomeIntelligence({specification:strong,aiProvider:'soolen-local',intelligence:{}},'Create a Cybersecurity CRM app',{requestedCandidates:3,costMode:'free'});
assert.equal(selected.intelligence.qualityCandidates.enabled,true);
assert.equal(selected.intelligence.qualityCandidates.candidateCount,3);
assert.equal(selected.intelligence.qualityCandidates.paidShadowCalls,0);
assert.equal(selected.intelligence.qualityCandidates.maxMeteredRemoteCalls,1);
assert.ok(selected.intelligence.qualityCandidates.selectedCandidateId);
assert.equal(RUNTIME_OUTCOME_SELECTOR_POLICY.sharedByProductionAndCi,true);
assert.equal(RUNTIME_OUTCOME_SELECTOR_POLICY.paidShadowCalls,0);

const samplePlan=buildDeterministicGenerationSamplePlan();
assert.equal(samplePlan.sampleSize,50);
assert.equal(samplePlan.industryCoverage,50);
assert.equal(new Set(samplePlan.cases.map(item=>item.id)).size,50);
const sampleRows=samplePlan.cases.map(item=>({caseId:item.id,industry:item.industry,archetypeId:item.archetypeId,validJson:true,score:88,decision:'optimize',originalityScore:90,liuiScore:86,releaseReadinessScore:84}));
const sampleSummary=summarizeDeterministicGenerationSample(sampleRows);
const benchmarkSummary={caseCount:600,passRate:100,averageScore:96,replanCount:0};
const floor=evaluateReleaseQualityFloor({benchmarkSummary,sampleSummary});
assert.equal(floor.passed,true,JSON.stringify(floor));
assert.equal(RELEASE_QUALITY_INTELLIGENCE_POLICY.sampleProvider,'soolen-local');
const status=buildReleaseQualityStatus();
assert.equal(status.benchmark.caseCount,600);
assert.equal(status.deterministicSample.industryCoverage,50);
assert.equal(status.cost.requiredExternalProviderCallsForCi,false);

const createRoute=read('app/api/create-app/route.js');
assert.match(createRoute,/applyRuntimeOutcomeIntelligence/);
assert.doesNotMatch(createRoute,/function applyOutcomeIntelligence/);
const selectorSource=read('lib/ai/runtime-outcome-selector.js');
assert.match(selectorSource,/zero-cost-structural-shadow/);
assert.match(selectorSource,/paidShadowCalls:0/);
assert.match(selectorSource,/maxMeteredRemoteCalls/);
const sampleSource=read('scripts/release-quality-generation-sample.mjs');
assert.match(sampleSource,/runAutonomousEngine/);
assert.match(sampleSource,/SOOLEN_COST_MODE/);
assert.match(sampleSource,/Golden Quality Floor/);
const statusRoute=read('app/api/quality/status/route.js');
assert.match(statusRoute,/CODE_CI_CAPABILITY/);
assert.match(statusRoute,/externalProviderLiveVerified:false/);
assert.match(statusRoute,/physicalDeviceVerified:false/);
assert.match(statusRoute,/storeVerified:false/);
assert.doesNotMatch(statusRoute,/process\.env|service_role|api[_-]?key|secret/i);

console.log('✓ Automatic Quality Judge v2 scores workflow coherence and resilience/accessibility');
console.log('✓ Production and CI share one bounded zero-cost Runtime Outcome Selector with no paid shadow calls');
console.log('✓ Explicit 50-industry local expansion prevents adjacent-industry keyword takeover');
console.log('✓ Release Quality Intelligence exposes 600-case benchmark + deterministic 50-industry sample evidence');
console.log('✓ Executable generation sample is wired to the full autonomous engine under SOOLEN_COST_MODE=zero');
console.log('✓ Evidence labels remain CODE/CI only until independent Production/browser/device/store verification');
