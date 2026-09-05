import { CREATIVE_MEDIA_BENCHMARK_CASES } from './creative-media-benchmark-suite.js';
import { listCreativeMediaTasks } from './creative-media-control-plane.js';

const freeze=value=>Object.freeze(value);
function unique(values){return [...new Set(values.filter(Boolean))];}

export function buildCreativeMediaReadinessScorecard({providerQualification=null,liveEvidenceRecords=[],benchmarkResults=[]}={}){
  const tasks=listCreativeMediaTasks();const capabilities=unique(tasks.map(row=>row.capability));
  const qualification=providerQualification&&providerQualification.ok===true?providerQualification:null;
  const records=(Array.isArray(liveEvidenceRecords)?liveEvidenceRecords:[]).filter(row=>row?.liveProviderVerified===true&&row?.productionLiveVerified===true&&row?.realOutputQualityVerified===true);
  const liveCapabilities=new Set(records.map(row=>row.capability).filter(Boolean));
  const liveTasks=tasks.filter(row=>liveCapabilities.has(row.capability));
  const results=new Map((Array.isArray(benchmarkResults)?benchmarkResults:[]).filter(row=>row?.ok===true).map(row=>[row.caseId,row]));
  const critical=CREATIVE_MEDIA_BENCHMARK_CASES.filter(row=>row.critical);const passedCritical=critical.filter(row=>results.get(row.id)?.passed===true);
  const allBenchmarksPassed=CREATIVE_MEDIA_BENCHMARK_CASES.every(row=>results.get(row.id)?.passed===true);
  const allCriticalPassed=passedCritical.length===critical.length;
  const capabilityCoverage=capabilities.length?Number((liveCapabilities.size/capabilities.length*100).toFixed(2)):0;
  const criticalBenchmarkCoverage=critical.length?Number((passedCritical.length/critical.length*100).toFixed(2)):0;
  const providerCanaryQualified=qualification?.qualifiedForMediaCanary===true;
  const blockers=[];if(!providerCanaryQualified)blockers.push('media-provider-not-qualified');if(!allCriticalPassed)blockers.push('critical-live-benchmarks-incomplete');if(liveCapabilities.size!==capabilities.length)blockers.push('canonical-capability-live-coverage-incomplete');if(!allBenchmarksPassed)blockers.push('full-benchmark-suite-incomplete');
  const productionLive100=blockers.length===0;
  return freeze({
    codeReadyTasks:tasks.length,totalCanonicalCapabilities:capabilities.length,liveVerifiedCapabilities:liveCapabilities.size,liveVerifiedTasks:liveTasks.length,
    capabilityCoveragePercent:capabilityCoverage,criticalBenchmarksPassed:passedCritical.length,criticalBenchmarksTotal:critical.length,criticalBenchmarkCoveragePercent:criticalBenchmarkCoverage,
    providerCanaryQualified,allCriticalBenchmarksPassed:allCriticalPassed,allBenchmarksPassed,productionLive100,
    status:productionLive100?'100_LIVE_VERIFIED':providerCanaryQualified&&records.length?'PARTIAL_LIVE_VERIFIED':'EVIDENCE_REQUIRED',blockers:freeze(blockers),
    truth:freeze({codeReadyDoesNotEqualLive:true,providerConfiguredDoesNotEqualLive:true,previewDoesNotEqualProduction:true,productionLive100RequiresCanonicalCapabilityCoverageAndBenchmarks:true})
  });
}
