import crypto from "node:crypto";
import { getBenchmarkCatalog, buildBenchmarkManifest } from "./benchmark-factory.js";

export const RELEASE_QUALITY_INTELLIGENCE_VERSION=1;
export const RELEASE_QUALITY_SAMPLE_SIZE=50;
export const RELEASE_QUALITY_HISTORY_MAX=24;

export const GOLDEN_QUALITY_FLOOR=Object.freeze({
  version:1,
  state:"quality-floor",
  syntheticBenchmark:{minimumCaseCount:600,minimumPassRate:95,minimumAverageScore:90,maximumReplanRate:5},
  deterministicGenerationSample:{minimumCaseCount:50,minimumValidJsonRate:100,minimumIndustryCoverage:50,minimumAverageScore:50,maximumReplanRate:80},
  promotionRule:"A deterministic generation sample becomes a trusted golden baseline only after its exact commit, CI run and evidence artifact are reviewed. External-provider, browser, physical-device and store evidence remain separate.",
});

function list(value){return Array.isArray(value)?value:[];}
function object(value){return value&&typeof value==="object"&&!Array.isArray(value)?value:{};}
function num(value){const n=Number(value);return Number.isFinite(n)?n:0;}
function avg(values){const rows=list(values).map(Number).filter(Number.isFinite);return rows.length?Number((rows.reduce((sum,value)=>sum+value,0)/rows.length).toFixed(2)):0;}
function pct(numerator,denominator){return denominator?Number(((numerator/denominator)*100).toFixed(2)):0;}
function clean(value,max=160){return String(value||"").trim().slice(0,max);}
function stable(value){if(Array.isArray(value))return value.map(stable);if(value&&typeof value==="object")return Object.fromEntries(Object.keys(value).sort().map(key=>[key,stable(value[key])]));return value;}
function fingerprint(prefix,value){return `${prefix}-${crypto.createHash("sha256").update(JSON.stringify(stable(value))).digest("hex").slice(0,16)}`;}
function freezeDeep(value){if(Array.isArray(value)){value.forEach(freezeDeep);return Object.freeze(value);}if(value&&typeof value==="object"){Object.values(value).forEach(freezeDeep);return Object.freeze(value);}return value;}
function safeSha(value){const v=clean(value,64);return /^[0-9a-f]{7,40}$/i.test(v)?v:"";}

export function buildDeterministicGenerationSamplePlan({size=RELEASE_QUALITY_SAMPLE_SIZE}={}){
  const catalog=getBenchmarkCatalog();
  const requested=Math.max(1,Math.min(catalog.length,Number(size)||RELEASE_QUALITY_SAMPLE_SIZE));
  if(requested===RELEASE_QUALITY_SAMPLE_SIZE){
    const industries=[...new Set(catalog.map(item=>item.industry))];
    const rows=industries.map((industry,index)=>{
      const candidates=catalog.filter(item=>item.industry===industry);
      return candidates[index%candidates.length];
    });
    return freezeDeep({
      version:RELEASE_QUALITY_INTELLIGENCE_VERSION,
      sampleSize:rows.length,
      industryCoverage:new Set(rows.map(item=>item.industry)).size,
      archetypeCoverage:new Set(rows.map(item=>item.archetypeId)).size,
      cases:rows,
      deterministic:true,
      providerPolicy:"zero-cost-local-only-for-ci-sample",
      fingerprint:fingerprint("rqsp1",rows.map(item=>item.id)),
    });
  }
  const step=catalog.length/requested;
  const rows=[];
  for(let index=0;index<requested;index++)rows.push(catalog[Math.floor(index*step)]);
  return freezeDeep({
    version:RELEASE_QUALITY_INTELLIGENCE_VERSION,
    sampleSize:rows.length,
    industryCoverage:new Set(rows.map(item=>item.industry)).size,
    archetypeCoverage:new Set(rows.map(item=>item.archetypeId)).size,
    cases:rows,
    deterministic:true,
    providerPolicy:"zero-cost-local-only-for-ci-sample",
    fingerprint:fingerprint("rqsp1",rows.map(item=>item.id)),
  });
}

export function summarizeDeterministicGenerationSample(rows=[],options={}){
  const results=list(rows);
  const valid=results.filter(row=>row?.validJson===true);
  const scored=results.filter(row=>Number.isFinite(Number(row?.score)));
  const byIndustry={};
  for(const row of results){
    const industry=clean(row?.industry||"Unknown",80);
    if(!byIndustry[industry])byIndustry[industry]=[];
    byIndustry[industry].push(row);
  }
  const summary={
    version:RELEASE_QUALITY_INTELLIGENCE_VERSION,
    label:clean(options.label||"deterministic-generation-sample"),
    sourceKind:clean(options.sourceKind||"zero-cost-local-generation"),
    evidenceLevel:clean(options.evidenceLevel||"CODE_CI_GENERATION_SAMPLE"),
    caseCount:results.length,
    validJsonCount:valid.length,
    validJsonRate:pct(valid.length,results.length),
    industryCoverage:new Set(results.map(row=>clean(row?.industry,80)).filter(Boolean)).size,
    archetypeCoverage:new Set(results.map(row=>clean(row?.archetypeId,80)).filter(Boolean)).size,
    averageScore:avg(scored.map(row=>row.score)),
    averageOriginality:avg(scored.map(row=>row.originalityScore)),
    averageLiui:avg(scored.map(row=>row.liuiScore)),
    averageReleaseReadiness:avg(scored.map(row=>row.releaseReadinessScore)),
    acceptCount:results.filter(row=>row?.decision==="accept").length,
    optimizeCount:results.filter(row=>row?.decision==="optimize").length,
    replanCount:results.filter(row=>row?.decision==="replan").length,
    replanRate:pct(results.filter(row=>row?.decision==="replan").length,results.length),
    errorCount:results.filter(row=>row?.errorCode).length,
    byIndustry:Object.fromEntries(Object.entries(byIndustry).sort(([a],[b])=>a.localeCompare(b)).map(([industry,items])=>[industry,{caseCount:items.length,validJsonRate:pct(items.filter(item=>item?.validJson===true).length,items.length),averageScore:avg(items.map(item=>item?.score)),replanCount:items.filter(item=>item?.decision==="replan").length}])),
    storesRawPrompt:false,
    storesRawSpecification:false,
    externalProviderLiveEvidence:false,
  };
  return freezeDeep({...summary,fingerprint:fingerprint("rqsr1",summary)});
}

function benchmarkGate(summary){
  const floor=GOLDEN_QUALITY_FLOOR.syntheticBenchmark;
  const caseCount=num(summary?.caseCount),passRate=num(summary?.passRate),averageScore=num(summary?.averageScore),replanRate=pct(num(summary?.replanCount),caseCount);
  const checks=[
    {id:"benchmark_case_count",passed:caseCount>=floor.minimumCaseCount,value:caseCount,target:floor.minimumCaseCount},
    {id:"benchmark_pass_rate",passed:passRate>=floor.minimumPassRate,value:passRate,target:floor.minimumPassRate},
    {id:"benchmark_average_score",passed:averageScore>=floor.minimumAverageScore,value:averageScore,target:floor.minimumAverageScore},
    {id:"benchmark_replan_rate",passed:replanRate<=floor.maximumReplanRate,value:replanRate,target:floor.maximumReplanRate},
  ];
  return {passed:checks.every(check=>check.passed),checks,replanRate};
}

function sampleGate(summary){
  const floor=GOLDEN_QUALITY_FLOOR.deterministicGenerationSample;
  const checks=[
    {id:"sample_case_count",passed:num(summary?.caseCount)>=floor.minimumCaseCount,value:num(summary?.caseCount),target:floor.minimumCaseCount},
    {id:"sample_valid_json_rate",passed:num(summary?.validJsonRate)>=floor.minimumValidJsonRate,value:num(summary?.validJsonRate),target:floor.minimumValidJsonRate},
    {id:"sample_industry_coverage",passed:num(summary?.industryCoverage)>=floor.minimumIndustryCoverage,value:num(summary?.industryCoverage),target:floor.minimumIndustryCoverage},
    {id:"sample_average_score",passed:num(summary?.averageScore)>=floor.minimumAverageScore,value:num(summary?.averageScore),target:floor.minimumAverageScore},
    {id:"sample_replan_rate",passed:num(summary?.replanRate)<=floor.maximumReplanRate,value:num(summary?.replanRate),target:floor.maximumReplanRate},
  ];
  return {passed:checks.every(check=>check.passed),checks};
}

export function evaluateReleaseQualityFloor({benchmarkSummary=null,sampleSummary=null}={}){
  const benchmark=benchmarkSummary?benchmarkGate(benchmarkSummary):null;
  const sample=sampleSummary?sampleGate(sampleSummary):null;
  const active=[benchmark,sample].filter(Boolean);
  const result={
    version:RELEASE_QUALITY_INTELLIGENCE_VERSION,
    passed:active.length>0&&active.every(gate=>gate.passed),
    benchmark,
    sample,
    goldenFloorVersion:GOLDEN_QUALITY_FLOOR.version,
    evidenceBoundary:"The quality floor evaluates LANERIQ deterministic benchmark and zero-cost CI generation evidence only. It is not external-provider LIVE, Production browser, physical-device, store, market-share or legal-clearance evidence.",
  };
  return freezeDeep({...result,fingerprint:fingerprint("rqgf1",result)});
}

export function buildReleaseQualitySnapshot({releaseId="",commitSha="",benchmarkSummary=null,sampleSummary=null,observedAt="",status="candidate"}={}){
  const gate=evaluateReleaseQualityFloor({benchmarkSummary,sampleSummary});
  const snapshot={
    version:RELEASE_QUALITY_INTELLIGENCE_VERSION,
    releaseId:clean(releaseId||commitSha||"unidentified-release",120),
    commitSha:safeSha(commitSha),
    observedAt:clean(observedAt,40),
    status:["candidate","golden","rejected"].includes(status)?status:"candidate",
    benchmark:benchmarkSummary?{
      caseCount:num(benchmarkSummary.caseCount),averageScore:num(benchmarkSummary.averageScore),passRate:num(benchmarkSummary.passRate),replanCount:num(benchmarkSummary.replanCount),fingerprint:clean(benchmarkSummary.fingerprint,80),
    }:null,
    sample:sampleSummary?{
      caseCount:num(sampleSummary.caseCount),validJsonRate:num(sampleSummary.validJsonRate),industryCoverage:num(sampleSummary.industryCoverage),averageScore:num(sampleSummary.averageScore),replanRate:num(sampleSummary.replanRate),fingerprint:clean(sampleSummary.fingerprint,80),sourceKind:clean(sampleSummary.sourceKind,80),
    }:null,
    floorPassed:gate.passed,
    floorFingerprint:gate.fingerprint,
    privacySafe:true,
    rawPromptStored:false,
    rawSpecificationStored:false,
  };
  return freezeDeep({...snapshot,fingerprint:fingerprint("rqs1",snapshot)});
}

export function buildReleaseQualityTrend(snapshots=[]){
  const rows=list(snapshots).slice(-RELEASE_QUALITY_HISTORY_MAX).map(item=>object(item)).filter(item=>item.fingerprint);
  const points=rows.map((item,index)=>({
    index,
    releaseId:clean(item.releaseId,120),
    commitSha:safeSha(item.commitSha),
    floorPassed:item.floorPassed===true,
    benchmarkAverage:item.benchmark?num(item.benchmark.averageScore):null,
    benchmarkPassRate:item.benchmark?num(item.benchmark.passRate):null,
    sampleAverage:item.sample?num(item.sample.averageScore):null,
    sampleValidJsonRate:item.sample?num(item.sample.validJsonRate):null,
    fingerprint:clean(item.fingerprint,80),
  }));
  const last=points.at(-1)||null,previous=points.at(-2)||null;
  const delta=(key)=>last&&previous&&last[key]!=null&&previous[key]!=null?Number((last[key]-previous[key]).toFixed(2)):null;
  const trend={
    version:RELEASE_QUALITY_INTELLIGENCE_VERSION,
    pointCount:points.length,
    maxHistory:RELEASE_QUALITY_HISTORY_MAX,
    points,
    latest:last,
    deltas:{benchmarkAverage:delta("benchmarkAverage"),benchmarkPassRate:delta("benchmarkPassRate"),sampleAverage:delta("sampleAverage"),sampleValidJsonRate:delta("sampleValidJsonRate")},
    historyStorage:"GitHub Actions quality evidence artifacts or another caller-owned append-only store; LANERIQ runtime does not require a dedicated server for this ledger.",
  };
  return freezeDeep({...trend,fingerprint:fingerprint("rqt1",trend)});
}

export function buildReleaseQualityStatus(){
  const benchmarkManifest=buildBenchmarkManifest();
  const samplePlan=buildDeterministicGenerationSamplePlan();
  return freezeDeep({
    version:RELEASE_QUALITY_INTELLIGENCE_VERSION,
    mode:"benchmark-plus-deterministic-generation-sampling",
    goldenQualityFloor:GOLDEN_QUALITY_FLOOR,
    benchmark:{caseCount:benchmarkManifest.caseCount,industryCount:benchmarkManifest.industryCount,archetypeCount:benchmarkManifest.archetypeCount,fingerprint:benchmarkManifest.fingerprint},
    deterministicSample:{sampleSize:samplePlan.sampleSize,industryCoverage:samplePlan.industryCoverage,archetypeCoverage:samplePlan.archetypeCoverage,fingerprint:samplePlan.fingerprint,providerPolicy:samplePlan.providerPolicy},
    history:{enabled:true,maxSnapshots:RELEASE_QUALITY_HISTORY_MAX,storage:"CI artifacts / caller-owned append-only evidence"},
    cost:{paidEmbeddings:false,vectorDatabase:false,dedicatedServer:false,requiredExternalProviderCallsForCi:false},
    evidenceBoundary:"Status describes CODE/CI quality-control capability. External providers, Production, browsers, physical devices and app stores require independent evidence.",
  });
}

export const RELEASE_QUALITY_INTELLIGENCE_POLICY=freezeDeep({
  version:RELEASE_QUALITY_INTELLIGENCE_VERSION,
  sampleSize:RELEASE_QUALITY_SAMPLE_SIZE,
  sampleProvider:"soolen-local",
  sampleMode:"deterministic-zero-cost-generation",
  qualityHistory:true,
  goldenPromotionRequiresReview:true,
  paidEmbeddingDependency:false,
  vectorDatabaseDependency:false,
  dedicatedServerRequired:false,
  rawPromptStorage:false,
  rawSpecificationStorage:false,
  externalProviderLiveClaim:false,
});
