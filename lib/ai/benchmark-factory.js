import crypto from "node:crypto";
import { INDUSTRIES, ARCHETYPES } from "../templateCatalog.js";
import { assessGenerationQuality } from "./generation-quality-judge.js";

export const BENCHMARK_FACTORY_SCHEMA_VERSION=1;
export const BENCHMARK_FACTORY_EXPECTED_CASES=INDUSTRIES.length*ARCHETYPES.length;
export const BENCHMARK_DIFFICULTIES=Object.freeze(["core","advanced","edge"]);

function slugify(value){return String(value||"").toLowerCase().replace(/&/g,"and").replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"");}
function stable(value){if(Array.isArray(value))return value.map(stable);if(value&&typeof value==="object")return Object.fromEntries(Object.keys(value).sort().map(key=>[key,stable(value[key])]));return value;}
function sha256(value){return crypto.createHash("sha256").update(value).digest("hex");}
function freezeDeep(value){if(Array.isArray(value)){value.forEach(freezeDeep);return Object.freeze(value);}if(value&&typeof value==="object"){Object.values(value).forEach(freezeDeep);return Object.freeze(value);}return value;}
function signal(value){return String(value||"").trim().replace(/\s+/g," ");}
function difficultyInstruction(difficulty){
  if(difficulty==="advanced")return "Include a realistic multi-step workflow, useful data relationships and role-aware actions without adding unrelated complexity.";
  if(difficulty==="edge")return "Include empty/loading/error recovery, weak-network/mobile constraints and a non-generic interaction path while preserving a simple customer experience.";
  return "Deliver the complete core customer workflow with a clear mobile-first information architecture.";
}

export function buildBenchmarkCase(industry,archetype,index=0){
  const difficulty=BENCHMARK_DIFFICULTIES[Math.abs(Number(index)||0)%BENCHMARK_DIFFICULTIES.length];
  const requiredFeatureSignals=archetype.features.slice(0,4).map(signal);
  const requiredPageSignals=archetype.pages.slice(0,4).map(signal);
  const benchmarkCase={
    schemaVersion:BENCHMARK_FACTORY_SCHEMA_VERSION,
    id:`bm1-${slugify(industry)}-${archetype.id}`,
    industry,
    archetypeId:archetype.id,
    archetype:archetype.name,
    difficulty,
    target:"app+website",
    prompt:`Create an original ${industry} ${archetype.name} App + Website. Core capabilities: ${requiredFeatureSignals.join(", ")}. ${difficultyInstruction(difficulty)} Use LANERIQ AI Living Intelligence UI, mobile-first responsive behavior, accessible recovery states and Secure-by-Default MAX.`,
    expected:{
      minPages:Math.max(4,archetype.pages.length),
      minFeatures:Math.max(4,archetype.features.length),
      requiredFeatureSignals,
      requiredPageSignals,
      mobileFirst:true,
      liui:true,
      secureByDefault:true,
      originalityRequired:true,
    },
    evidencePolicy:{
      syntheticTask:true,
      containsRealUserData:false,
      containsThirdPartyBranding:false,
      providerCallRequired:false,
      paidEmbeddingRequired:false,
      vectorDatabaseRequired:false,
      dedicatedServerRequired:false,
    },
  };
  return freezeDeep(benchmarkCase);
}

let catalogCache;
export function buildBenchmarkCatalog(){
  const cases=[];let index=0;
  for(const industry of INDUSTRIES){
    for(const archetype of ARCHETYPES){
      cases.push(buildBenchmarkCase(industry,archetype,index));
      index+=1;
    }
  }
  if(cases.length!==BENCHMARK_FACTORY_EXPECTED_CASES)throw new Error(`Benchmark catalog integrity failure: expected ${BENCHMARK_FACTORY_EXPECTED_CASES}, got ${cases.length}`);
  return freezeDeep(cases);
}
export function getBenchmarkCatalog(){if(!catalogCache)catalogCache=buildBenchmarkCatalog();return catalogCache;}

export function buildBenchmarkManifest(){
  const cases=getBenchmarkCatalog();
  const manifest={
    schemaVersion:BENCHMARK_FACTORY_SCHEMA_VERSION,
    caseCount:cases.length,
    industryCount:INDUSTRIES.length,
    archetypeCount:ARCHETYPES.length,
    difficulties:Object.fromEntries(BENCHMARK_DIFFICULTIES.map(difficulty=>[difficulty,cases.filter(item=>item.difficulty===difficulty).length])),
    caseIds:cases.map(item=>item.id),
  };
  return Object.freeze({...manifest,fingerprint:`bmf1-${sha256(JSON.stringify(stable(manifest))).slice(0,16)}`});
}

export function evaluateBenchmarkCandidate({benchmarkCase,specification,referenceDescriptors=[]}={}){
  if(!benchmarkCase?.id)throw new Error("benchmarkCase is required");
  const judge=assessGenerationQuality(specification||{},{benchmarkCase,referenceDescriptors});
  return freezeDeep({
    schemaVersion:BENCHMARK_FACTORY_SCHEMA_VERSION,
    caseId:benchmarkCase.id,
    industry:benchmarkCase.industry,
    archetypeId:benchmarkCase.archetypeId,
    difficulty:benchmarkCase.difficulty,
    score:judge.score,
    decision:judge.decision,
    passed:judge.decision!=="replan",
    productionEligibleByJudge:judge.productionEligibleByJudge,
    outcomeFingerprint:judge.outcome?.fingerprint||null,
    originalityScore:judge.outcome?.score??0,
    coverageScore:judge.benchmarkCoverage?.score??null,
    liuiScore:judge.buildQuality?.liui?.score??0,
    releaseReadinessScore:judge.buildQuality?.overall??0,
    hardBlockers:[...judge.hardBlockers],
    dimensions:judge.dimensions.map(item=>({id:item.id,score:item.score,weight:item.weight,active:item.active})),
    privacySafe:true,
    rawSpecificationStored:false,
  });
}

function avg(values){const nums=values.map(Number).filter(Number.isFinite);return nums.length?Number((nums.reduce((sum,value)=>sum+value,0)/nums.length).toFixed(2)):0;}
export function summarizeBenchmarkRun(results=[],options={}){
  const rows=Array.isArray(results)?results:[];
  const byIndustry={};
  for(const row of rows){
    const key=String(row?.industry||"Unknown");
    if(!byIndustry[key])byIndustry[key]=[];
    byIndustry[key].push(row);
  }
  const summary={
    schemaVersion:BENCHMARK_FACTORY_SCHEMA_VERSION,
    label:String(options.label||"benchmark-run"),
    caseCount:rows.length,
    expectedCaseCount:BENCHMARK_FACTORY_EXPECTED_CASES,
    coverageComplete:rows.length===BENCHMARK_FACTORY_EXPECTED_CASES&&new Set(rows.map(row=>row.caseId)).size===BENCHMARK_FACTORY_EXPECTED_CASES,
    averageScore:avg(rows.map(row=>row.score)),
    averageOriginality:avg(rows.map(row=>row.originalityScore)),
    averageCoverage:avg(rows.map(row=>row.coverageScore).filter(value=>value!=null)),
    averageLiui:avg(rows.map(row=>row.liuiScore)),
    averageReleaseReadiness:avg(rows.map(row=>row.releaseReadinessScore)),
    replanCount:rows.filter(row=>row.decision==="replan").length,
    optimizeCount:rows.filter(row=>row.decision==="optimize").length,
    acceptCount:rows.filter(row=>row.decision==="accept").length,
    passingCount:rows.filter(row=>row.passed).length,
    passRate:rows.length?Number(((rows.filter(row=>row.passed).length/rows.length)*100).toFixed(2)):0,
    byIndustry:Object.fromEntries(Object.entries(byIndustry).sort(([a],[b])=>a.localeCompare(b)).map(([industry,industryRows])=>[industry,{caseCount:industryRows.length,averageScore:avg(industryRows.map(row=>row.score)),replanCount:industryRows.filter(row=>row.decision==="replan").length}])),
  };
  const signatureInput={...summary,byIndustry:summary.byIndustry};
  return freezeDeep({...summary,fingerprint:`bmr1-${sha256(JSON.stringify(stable(signatureInput))).slice(0,16)}`});
}

export function compareBenchmarkRuns(baseline,candidate,options={}){
  const base=baseline||{},next=candidate||{};
  const allowedAverageRegression=Math.max(0,Number(options.allowedAverageRegression??1));
  const allowedPassRateRegression=Math.max(0,Number(options.allowedPassRateRegression??1));
  const regressions=[];
  const averageDelta=Number((Number(next.averageScore||0)-Number(base.averageScore||0)).toFixed(2));
  const passRateDelta=Number((Number(next.passRate||0)-Number(base.passRate||0)).toFixed(2));
  if(averageDelta < -allowedAverageRegression)regressions.push(`Average benchmark score regressed by ${Math.abs(averageDelta)} points.`);
  if(passRateDelta < -allowedPassRateRegression)regressions.push(`Benchmark pass rate regressed by ${Math.abs(passRateDelta)} percentage points.`);
  if(base.coverageComplete===true&&next.coverageComplete!==true)regressions.push("Candidate benchmark run lost full 600-case coverage.");
  const industries=new Set([...Object.keys(base.byIndustry||{}),...Object.keys(next.byIndustry||{})]);
  const industryRegressions=[];
  for(const industry of industries){
    const before=Number(base.byIndustry?.[industry]?.averageScore||0),after=Number(next.byIndustry?.[industry]?.averageScore||0);
    const delta=Number((after-before).toFixed(2));
    if(before&&delta<-Math.max(2,allowedAverageRegression))industryRegressions.push({industry,delta});
  }
  if(industryRegressions.length)regressions.push(`${industryRegressions.length} industries regressed beyond the per-industry tolerance.`);
  return freezeDeep({
    schemaVersion:BENCHMARK_FACTORY_SCHEMA_VERSION,
    passed:regressions.length===0,
    averageDelta,
    passRateDelta,
    regressions,
    industryRegressions,
    baselineFingerprint:base.fingerprint||null,
    candidateFingerprint:next.fingerprint||null,
    evidenceBoundary:"Compares deterministic LANERIQ benchmark evidence only; it is not a claim of live-provider, browser, device, store or market performance.",
  });
}

export const BENCHMARK_FACTORY_POLICY=Object.freeze({
  schemaVersion:BENCHMARK_FACTORY_SCHEMA_VERSION,
  expectedCases:BENCHMARK_FACTORY_EXPECTED_CASES,
  industries:INDUSTRIES.length,
  archetypes:ARCHETYPES.length,
  zeroPaidEmbeddingDependency:true,
  zeroVectorDatabaseDependency:true,
  zeroProviderCallRequiredForCi:true,
  noDedicatedServerRequired:true,
  syntheticTasksOnly:true,
  storesRawGeneratedSpecification:false,
  releaseUse:"regression-evidence-gate",
});
