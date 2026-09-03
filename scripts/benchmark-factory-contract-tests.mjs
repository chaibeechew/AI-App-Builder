import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { INDUSTRIES, ARCHETYPES } from '../lib/templateCatalog.js';
import { applySoolenMaxSecurity } from '../lib/ai/soolenai-max-security.js';
import { applyLivingIntelligenceStandard } from '../lib/ai/liui-standard.js';
import { assessGenerationQuality, GENERATION_QUALITY_JUDGE_POLICY } from '../lib/ai/generation-quality-judge.js';
import { BENCHMARK_FACTORY_EXPECTED_CASES, BENCHMARK_FACTORY_POLICY, buildBenchmarkManifest, compareBenchmarkRuns, evaluateBenchmarkCandidate, getBenchmarkCatalog, summarizeBenchmarkRun } from '../lib/ai/benchmark-factory.js';
import { buildSelfHealInstruction, inspectProjectSpecification } from '../lib/ai/project-self-heal-policy.js';

const root=process.cwd();
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const policySource=read('lib/ai/project-self-heal-policy.js');
const packageJson=JSON.parse(read('package.json'));

const catalog=getBenchmarkCatalog();
assert.equal(BENCHMARK_FACTORY_EXPECTED_CASES,600,'Benchmark Factory must remain 50 industries × 12 archetypes = 600 deterministic cases.');
assert.equal(catalog.length,600);
assert.equal(new Set(catalog.map(item=>item.id)).size,600,'Benchmark case IDs must be unique.');
assert.equal(new Set(catalog.map(item=>item.industry)).size,50,'All 50 industries must be represented.');
assert.equal(new Set(catalog.map(item=>item.archetypeId)).size,12,'All 12 archetypes must be represented.');
for(const industry of INDUSTRIES)assert.equal(catalog.filter(item=>item.industry===industry).length,ARCHETYPES.length,`${industry} must have all 12 benchmark archetypes.`);
for(const item of catalog){
  assert.equal(item.evidencePolicy.syntheticTask,true);
  assert.equal(item.evidencePolicy.containsRealUserData,false);
  assert.equal(item.evidencePolicy.containsThirdPartyBranding,false);
  assert.equal(item.evidencePolicy.providerCallRequired,false);
  assert.equal(item.evidencePolicy.paidEmbeddingRequired,false);
  assert.equal(item.evidencePolicy.vectorDatabaseRequired,false);
  assert.equal(item.evidencePolicy.dedicatedServerRequired,false);
  assert.ok(item.prompt.includes(item.industry));
  assert.ok(item.prompt.includes('LANERIQ AI Living Intelligence UI'));
}

const manifestA=buildBenchmarkManifest(),manifestB=buildBenchmarkManifest();
assert.equal(manifestA.fingerprint,manifestB.fingerprint,'Benchmark manifest fingerprint must be deterministic.');
assert.equal(manifestA.caseCount,600);
assert.deepEqual(manifestA.difficulties,{core:200,advanced:200,edge:200});

const qualityPlan={
  stability:['Clear loading error empty retry backup offline validation status confirmation states','Recoverable actions with timeout fallback and predictable navigation','No placeholders; useful confirmation and error recovery'],
  security:['Secure auth login permission role access validation with RLS and server-only secrets','CSRF rate-limit replay SSRF CSP malware-defense boundaries','Least privilege admin authorization and fail-closed validation'],
  privacy:['Private-by-default personal data with consent and purpose limitation','Delete export and permission controls','Data minimization with clear customer privacy choices'],
  comfort:['Mobile-first responsive safe-area layout with accessible readable tap targets','Simple clear search filter navigation without overflow','Keyboard screen-reader contrast and reduced-motion support'],
  beauty:['Original premium visual design style brand image gallery theme layout hero background','Coordinated responsive palette color wallpaper card typography and imagery','Distinctive memorable composition rather than generic template appearance'],
  naturalness:['Human natural friendly personalized copy and workflow','Context-aware local language and real-world behavior','Natural spacing rhythm and customer-first interactions'],
};
const designSystem={visualDirection:'premium original editorial interface',backgroundDirection:'layered cinematic responsive background',heroDirection:'intent-first living hero',layoutSignature:'adaptive-bento narrative workspace',fontDirection:'humanist responsive sans',iconStyle:'semantic line icons',themeMode:'auto',colorPreference:'coordinated accessible brand palette',paletteRationale:'high-contrast accessible coordinated palette',cardStyle:'living cards with restrained depth',imageStyle:'original editorial imagery',wallpaperPreset:'moon-city',motionDirection:'semantic restrained motion'};
const routeClasses=['/','/search','/calendar','/booking','/community','/analytics'];
const componentTypes=['hero','search','calendar','map','chat','chart'];
function strongSpecFor(benchmarkCase){
  const names=[...benchmarkCase.expected.requiredPageSignals];
  while(names.length<benchmarkCase.expected.minPages)names.push(`Experience ${names.length+1}`);
  const features=[...benchmarkCase.expected.requiredFeatureSignals];
  while(features.length<benchmarkCase.expected.minFeatures)features.push(`Adaptive workflow ${features.length+1}`);
  const base={
    name:`Benchmark ${benchmarkCase.industry}`,
    description:`Original ${benchmarkCase.industry} ${benchmarkCase.archetype} customer workflow with mobile responsive accessible behavior.`,
    industry:{name:benchmarkCase.industry,category:benchmarkCase.industry},
    designSystem,
    qualityPlan,
    pages:names.map((name,index)=>({id:`page-${index+1}`,name,route:routeClasses[index]||`/experience-${index+1}`,purpose:`${name} customer workflow`,description:`Responsive accessible ${name} experience`,layout:index%2?'adaptive workspace':'living bento',visualTreatment:'premium original responsive composition',components:[{type:componentTypes[index%componentTypes.length]},{type:index%2?'timeline':'card'}]})),
    features:features.map((name,index)=>({name,description:`Complete ${name} workflow with clear loading error empty and recovery states`,uiPattern:index%2?'living card':'context action'})),
    actions:[{name:'Search',intent:'search'},{name:'Book',intent:'book'},{name:'Message',intent:'message'},{name:'Share',intent:'share'},{name:'Review',intent:'approve'}],
    navigation:names.map((name,index)=>({label:name,route:routeClasses[index]||`/experience-${index+1}`})),
    data:{Record:{fields:['name','status','owner_id','updated_at']}},
    dataModels:[{name:'Record',fields:['name: text','status: text','owner_id: uuid relation','updated_at: timestamp']}],
    visualAssets:[{type:'hero',description:'Original accessible industry hero artwork'}],
  };
  return applyLivingIntelligenceStandard(applySoolenMaxSecurity(base));
}

const benchmarkCase=catalog[0];
const strongSpec=strongSpecFor(benchmarkCase);
const weakSpec={name:'Generic',pages:[{name:'Dashboard',route:'/',components:[{type:'card'}]}],features:[],actions:[],navigation:[{label:'Dashboard',route:'/'}],qualityPlan:{comfort:['mobile responsive accessible']}};
const strongJudge=assessGenerationQuality(strongSpec,{benchmarkCase});
const weakJudge=assessGenerationQuality(weakSpec,{benchmarkCase});
assert.equal(strongJudge.benchmarkCoverage.score,100,'Known-good benchmark candidate must cover the canonical task requirements.');
assert.ok(strongJudge.score>weakJudge.score,`Strong candidate ${strongJudge.score} must outscore weak candidate ${weakJudge.score}.`);
assert.notEqual(strongJudge.decision,'replan',`Known-good benchmark candidate unexpectedly requires replan: ${JSON.stringify(strongJudge.hardBlockers)}`);
assert.equal(weakJudge.decision,'replan','Incomplete benchmark candidate must trigger automatic replan.');
assert.equal(strongJudge.privacySafe,true);
assert.equal(strongJudge.storesRawUserPrompt,false);

const strongResult=evaluateBenchmarkCandidate({benchmarkCase,specification:strongSpec});
const weakResult=evaluateBenchmarkCandidate({benchmarkCase,specification:weakSpec});
assert.equal(strongResult.rawSpecificationStored,false);
assert.ok(strongResult.score>weakResult.score);
assert.equal(weakResult.passed,false);

const baselineRows=catalog.map(item=>({caseId:item.id,industry:item.industry,score:96,decision:'accept',passed:true,originalityScore:95,coverageScore:100,liuiScore:97,releaseReadinessScore:96}));
const candidateRows=baselineRows.map(row=>row.industry==='Real Estate'?{...row,score:88,decision:'optimize'}:{...row,score:97});
const baseline=summarizeBenchmarkRun(baselineRows,{label:'baseline'}),candidate=summarizeBenchmarkRun(candidateRows,{label:'candidate'});
assert.equal(baseline.coverageComplete,true);
assert.equal(candidate.coverageComplete,true);
assert.equal(baseline.caseCount,600);
const comparison=compareBenchmarkRuns(baseline,candidate);
assert.equal(comparison.passed,false,'Per-industry regression must fail the comparison gate even when global average remains close.');
assert.ok(comparison.industryRegressions.some(item=>item.industry==='Real Estate'));
const improved=summarizeBenchmarkRun(baselineRows.map(row=>({...row,score:97})),{label:'improved'});
assert.equal(compareBenchmarkRuns(baseline,improved).passed,true,'Non-regressing candidate should pass benchmark comparison.');

const inspection=inspectProjectSpecification(strongSpec);
assert.ok(inspection.judge,'Self-Heal inspection must expose Automatic Quality Judge evidence.');
const instruction=buildSelfHealInstruction({specification:weakSpec});
assert.match(instruction,/Automatic Quality Judge:/);
assert.match(instruction,/QUALITY JUDGE REPLAN REQUIRED:/);
assert.match(policySource,/assessGenerationQuality/);
assert.match(policySource,/Automatic Quality Judge/);
assert.match(policySource,/QUALITY JUDGE REPLAN REQUIRED/);

assert.equal(BENCHMARK_FACTORY_POLICY.expectedCases,600);
assert.equal(BENCHMARK_FACTORY_POLICY.industries,50);
assert.equal(BENCHMARK_FACTORY_POLICY.archetypes,12);
assert.equal(BENCHMARK_FACTORY_POLICY.zeroPaidEmbeddingDependency,true);
assert.equal(BENCHMARK_FACTORY_POLICY.zeroVectorDatabaseDependency,true);
assert.equal(BENCHMARK_FACTORY_POLICY.zeroProviderCallRequiredForCi,true);
assert.equal(BENCHMARK_FACTORY_POLICY.noDedicatedServerRequired,true);
assert.equal(GENERATION_QUALITY_JUDGE_POLICY.zeroPaidEmbeddingDependency,true);
assert.equal(GENERATION_QUALITY_JUDGE_POLICY.zeroVectorDatabaseDependency,true);
assert.equal(GENERATION_QUALITY_JUDGE_POLICY.noDedicatedServerRequired,true);
assert.equal(GENERATION_QUALITY_JUDGE_POLICY.rawUserPromptStorage,false);
assert.equal(packageJson.scripts['test:benchmark-factory'],'node scripts/benchmark-factory-contract-tests.mjs');
assert.ok(packageJson.scripts['quality:100'].includes('test:benchmark-factory'),'Benchmark Factory must be part of quality:100.');

console.log('✓ Benchmark Factory deterministically covers all 50 industries × 12 archetypes = 600 synthetic tasks');
console.log('✓ Difficulty coverage is balanced across core / advanced / edge without provider calls or paid embeddings');
console.log('✓ Automatic Quality Judge scores release quality, structural originality, benchmark coverage, LIUI, completeness and security evidence');
console.log('✓ Weak/incomplete candidates trigger replan while known-good scoped candidates are not padded with unnecessary pages');
console.log('✓ Benchmark summaries compare baseline vs candidate and fail meaningful per-industry regressions');
console.log('✓ Self-Heal consumes Quality Judge directives and preserves truthful evidence boundaries');
