// SoolenAI Autonomous Game Development Agent V4.
// Cross-version regression isolation, mutation/coverage analysis, lifetime/desync/replay diagnostics and review-gated candidate patches.
// Production writes and release authority remain disabled.

function clamp(v,min,max){return Math.max(min,Math.min(max,Number(v)||0));}
function text(v){return String(v??"").trim();}
function cleanId(v){return text(v).replace(/[^a-zA-Z0-9_.:-]/g,"_").slice(0,160);}
function hash(value){const s=text(value);let h=2166136261;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619);}return(h>>>0).toString(16);}
function stable(value){if(Array.isArray(value))return value.map(stable);if(value&&typeof value==="object")return Object.fromEntries(Object.keys(value).sort().map(k=>[k,stable(value[k])]));return value;}
function fingerprint(value){return hash(JSON.stringify(stable(value)));}

export const AUTONOMOUS_GAME_DEVELOPMENT_AGENT_V4=Object.freeze({
  version:"autonomous-game-development-agent-v4",
  systems:[
    "cross-version-regression-bisect","mutation-testing","coverage-gap-finder","memory-object-lifetime-analysis",
    "network-desync-root-cause","replay-divergence-detection","performance-regression-bisect","candidate-code-patch"
  ],
  deterministic:true,
  maxVersions:512,
  maxMutants:500,
  maxCoverageItems:5000,
  maxLifetimeSnapshots:2000,
  maxNetworkFrames:10000,
  productionAutoPatch:false,
  productionReleaseAuthority:false,
  realDeviceEvidence:false
});

export function inferAutonomousDevelopmentV4Capabilities(idea=""){
  const s=text(idea);
  const matched=/agent v4|regression bisect|commit bisect|mutation test|coverage gap|memory leak|object lifetime|network desync|replay divergence|performance regression|candidate patch|跨版本|二分定位|变异测试|變異測試|覆盖缺口|覆蓋缺口|内存泄漏|記憶體洩漏|网络不同步|網路不同步|回放分歧|性能回归|效能回歸|候选补丁|候選補丁/i.test(s);
  return{matched,systems:[
    "Bisect ordered versions/commits with a deterministic pass/fail probe to isolate the first known bad revision while preserving tested-boundary evidence.",
    "Run bounded mutation testing and report survived mutants so test strength is measured by behavior, not line-count vanity metrics.",
    "Map requirements, runtime states and risk tags to tests to expose coverage gaps and high-risk unverified behavior.",
    "Analyze object-lifetime snapshots for monotonic retained-count or retained-memory growth, while labeling synthetic heap samples separately from real-device profiling.",
    "Compare authoritative and peer state fingerprints by tick to isolate the first network desync and rank differing state fields without inventing a root cause.",
    "Compare deterministic replay frames to baseline frames and identify the earliest divergent tick, input, RNG or state fingerprint.",
    "Bisect performance samples across ordered versions to isolate the first budget regression while keeping synthetic benchmark evidence separate from real iOS/Android measurements.",
    "Generate review-gated candidate code patches as structured intent/diff suggestions tied to repro, root-cause and regression evidence; never write or merge production code automatically."
  ],truthRule:"Autonomous Development Agent V4 proves internal regression-isolation and diagnostic contracts only. Candidate patches are suggestions with autoApply=false. Production code writes, release authority, live-network proof and measured iOS/Android profiling remain external evidence."};
}

// Versions must be ordered from oldest to newest. probe(version) returns true for good/pass and false for bad/fail.
export function bisectRegression({versions=[],probe}={}){
  const rows=(versions||[]).slice(0,AUTONOMOUS_GAME_DEVELOPMENT_AGENT_V4.maxVersions).map((v,i)=>({id:cleanId(typeof v==="string"?v:(v.id||v.sha||`v_${i}`)),value:v,index:i}));
  if(!rows.length||typeof probe!=="function")return{isolated:false,reason:"versions_and_probe_required",tested:[]};
  const tested=[];const run=i=>{const existing=tested.find(x=>x.index===i);if(existing)return existing.good;let good=false,error=null;try{good=probe(rows[i].value,i)===true;}catch(e){error=text(e?.message).slice(0,120);good=false;}tested.push({index:i,id:rows[i].id,good,error});return good;};
  const firstGood=run(0),lastGood=run(rows.length-1);
  if(!firstGood)return{isolated:true,firstBad:rows[0].id,firstBadIndex:0,lastKnownGood:null,tested:tested.sort((a,b)=>a.index-b.index),monotonicBoundaryAssumption:true};
  if(lastGood)return{isolated:false,reason:"no_bad_version_found",firstBad:null,lastKnownGood:rows.at(-1).id,tested:tested.sort((a,b)=>a.index-b.index),monotonicBoundaryAssumption:true};
  let lo=0,hi=rows.length-1;while(hi-lo>1){const mid=Math.floor((lo+hi)/2);if(run(mid))lo=mid;else hi=mid;}
  return{isolated:true,firstBad:rows[hi].id,firstBadIndex:hi,lastKnownGood:rows[lo].id,lastKnownGoodIndex:lo,tested:tested.sort((a,b)=>a.index-b.index),monotonicBoundaryAssumption:true};
}

export function runMutationTesting({mutants=[],runTests}={}){
  const rows=(mutants||[]).slice(0,AUTONOMOUS_GAME_DEVELOPMENT_AGENT_V4.maxMutants).map((m,i)=>({id:cleanId(m.id||`mutant_${i}`),area:cleanId(m.area||"runtime"),operator:cleanId(m.operator||"unknown"),payload:structuredClone(m.payload??null)}));
  const results=[];for(const mutant of rows){let killed=false,error=null,tests=[];try{const out=typeof runTests==="function"?runTests(mutant):null;if(typeof out==="boolean")killed=out;else if(out&&typeof out==="object"){killed=out.killed===true;tests=(out.tests||[]).slice(0,100).map(cleanId);}}catch(e){killed=true;error=`test_runtime:${text(e?.message).slice(0,100)}`;}results.push({...mutant,killed,survived:!killed,error,tests});}
  const killed=results.filter(r=>r.killed).length,total=results.length;return{total,killed,survived:total-killed,mutationScore:total?+(killed/total*100).toFixed(2):0,survivors:results.filter(r=>!r.killed),results,bounded:true};
}

export function findCoverageGaps({requirements=[],tests=[]}={}){
  const reqs=(requirements||[]).slice(0,AUTONOMOUS_GAME_DEVELOPMENT_AGENT_V4.maxCoverageItems).map((r,i)=>({id:cleanId(r.id||`req_${i}`),risk:cleanId(r.risk||"medium"),tags:(r.tags||[]).slice(0,32).map(cleanId)}));
  const normalizedTests=(tests||[]).slice(0,AUTONOMOUS_GAME_DEVELOPMENT_AGENT_V4.maxCoverageItems).map((t,i)=>({id:cleanId(t.id||`test_${i}`),covers:(t.covers||[]).slice(0,100).map(cleanId),tags:(t.tags||[]).slice(0,32).map(cleanId)}));
  const coveredBy=new Map(reqs.map(r=>[r.id,[]]));for(const t of normalizedTests)for(const id of t.covers)if(coveredBy.has(id))coveredBy.get(id).push(t.id);
  const rows=reqs.map(r=>({...r,coveredBy:coveredBy.get(r.id),covered:coveredBy.get(r.id).length>0})),gaps=rows.filter(r=>!r.covered),riskWeight={critical:4,high:3,medium:2,low:1,info:0};gaps.sort((a,b)=>(riskWeight[b.risk]||0)-(riskWeight[a.risk]||0)||a.id.localeCompare(b.id));
  return{requirements:rows.length,covered:rows.filter(r=>r.covered).length,gaps,coveragePercent:rows.length?+(rows.filter(r=>r.covered).length/rows.length*100).toFixed(2):100,highRiskGaps:gaps.filter(r=>["critical","high"].includes(r.risk)),tests:normalizedTests};
}

export function analyzeObjectLifetimes(samples=[]){
  const rows=(samples||[]).slice(0,AUTONOMOUS_GAME_DEVELOPMENT_AGENT_V4.maxLifetimeSnapshots).map((s,i)=>({tick:Number.isFinite(Number(s.tick))?Number(s.tick):i,objects:Object.fromEntries(Object.entries(s.objects||{}).slice(0,300).map(([k,v])=>[cleanId(k),{count:Math.max(0,Number(v?.count??v)||0),bytes:Math.max(0,Number(v?.bytes)||0)}]))})).sort((a,b)=>a.tick-b.tick);
  const types=[...new Set(rows.flatMap(r=>Object.keys(r.objects)))],suspects=[];for(const type of types){const series=rows.map(r=>({tick:r.tick,count:r.objects[type]?.count||0,bytes:r.objects[type]?.bytes||0}));if(series.length<3)continue;let countGrowth=0,byteGrowth=0,nonDecreasing=0;for(let i=1;i<series.length;i++){countGrowth+=series[i].count-series[i-1].count;byteGrowth+=series[i].bytes-series[i-1].bytes;if(series[i].count>=series[i-1].count)nonDecreasing++;}const retentionRatio=nonDecreasing/Math.max(1,series.length-1);if((countGrowth>0||byteGrowth>0)&&retentionRatio>=.8)suspects.push({type,countGrowth:+countGrowth.toFixed(2),byteGrowth:+byteGrowth.toFixed(2),retentionRatio:+retentionRatio.toFixed(3),first:series[0],last:series.at(-1)});}
  suspects.sort((a,b)=>b.byteGrowth-a.byteGrowth||b.countGrowth-a.countGrowth);return{samples:rows.length,suspects,possibleLeak:suspects.length>0,syntheticEvidence:true,realDeviceHeapProfile:false,truth:"Monotonic synthetic retention is a leak suspect, not proof of a native/device memory leak."};
}

function diffTopLevel(a,b){const keys=[...new Set([...Object.keys(a||{}),...Object.keys(b||{})])].sort(),diffs=[];for(const key of keys){const av=a?.[key],bv=b?.[key];if(fingerprint(av)!==fingerprint(bv))diffs.push({field:cleanId(key),authoritative:fingerprint(av),peer:fingerprint(bv)});}return diffs;}

export function diagnoseNetworkDesync({authoritativeFrames=[],peerFrames=[]}={}){
  const auth=new Map((authoritativeFrames||[]).slice(0,AUTONOMOUS_GAME_DEVELOPMENT_AGENT_V4.maxNetworkFrames).map(f=>[Number(f.tick),f])),peer=new Map((peerFrames||[]).slice(0,AUTONOMOUS_GAME_DEVELOPMENT_AGENT_V4.maxNetworkFrames).map(f=>[Number(f.tick),f])),ticks=[...auth.keys()].filter(t=>peer.has(t)).sort((a,b)=>a-b);let first=null;
  for(const tick of ticks){const a=auth.get(tick),p=peer.get(tick),ah=a.hash||fingerprint(a.state),ph=p.hash||fingerprint(p.state);if(ah!==ph){first={tick,authoritativeHash:ah,peerHash:ph,differences:diffTopLevel(a.state||{},p.state||{}).slice(0,50),authoritativeInputSeq:a.inputSeq??null,peerInputSeq:p.inputSeq??null};break;}}
  return{desynced:!!first,firstDivergence:first,sharedTicks:ticks.length,possibleCauses:first?["input-sequence mismatch","non-deterministic simulation","missing authoritative correction","serialization/state-field mismatch"]:[],rootCauseProven:false};
}

export function detectReplayDivergence({baselineFrames=[],replayFrames=[]}={}){
  const n=Math.min(baselineFrames.length,replayFrames.length,AUTONOMOUS_GAME_DEVELOPMENT_AGENT_V4.maxNetworkFrames);for(let i=0;i<n;i++){const a=baselineFrames[i],b=replayFrames[i],tick=a.tick??i,ah=a.hash||fingerprint(a.state??a),bh=b.hash||fingerprint(b.state??b);if(ah!==bh)return{diverged:true,index:i,tick,baselineHash:ah,replayHash:bh,inputMismatch:fingerprint(a.input)!==fingerprint(b.input),rngMismatch:fingerprint(a.rng)!==fingerprint(b.rng),stateDifferences:diffTopLevel(a.state||{},b.state||{}).slice(0,50)};}
  if(baselineFrames.length!==replayFrames.length)return{diverged:true,index:n,tick:null,reason:"frame_count_mismatch",baselineFrames:baselineFrames.length,replayFrames:replayFrames.length};return{diverged:false,framesCompared:n};
}

// metric(version) returns a number where greater is worse by default, e.g. frameMs or memoryMb.
export function bisectPerformanceRegression({versions=[],metric,budget,direction="higher_is_worse"}={}){
  const cache=new Map();const fails=v=>{const id=cleanId(typeof v==="string"?v:(v.id||v.sha||"version"));if(!cache.has(id)){let value=NaN;try{value=Number(metric(v));}catch{}cache.set(id,value);}const value=cache.get(id);if(!Number.isFinite(value))return true;return direction==="lower_is_worse"?value<budget:value>budget;};
  const base=bisectRegression({versions,probe:v=>!fails(v)});return{...base,budget:Number(budget),direction,measurements:[...cache.entries()].map(([id,value])=>({id,value})),syntheticEvidence:true,realDevicePerformanceEvidence:false};
}

export function generateCandidateCodePatch({issue={},rootCause={},evidence={},files=[]}={}){
  const allowedFiles=(files||[]).slice(0,20).map(cleanId),area=cleanId(rootCause.area||issue.area||"runtime"),type=cleanId(issue.type||issue.id||"issue");
  const proposal={id:`candidate_patch_${hash(JSON.stringify([issue,rootCause,evidence,allowedFiles]))}`,type,area,files:allowedFiles,summary:`Candidate change for ${type} in ${area}, derived from isolated evidence and requiring review.`,intent:["Preserve the minimized reproduction as a failing regression before the fix.","Change only the smallest reviewed boundary implicated by isolated evidence.","Run targeted regression, mutation survivors for the affected area, and the full runtime gate.","Retain rollback metadata and compare performance/replay/network evidence before release."],evidenceFingerprint:fingerprint(evidence),rootCauseStatus:cleanId(rootCause.status||"suspect"),autoApply:false,productionWrite:false,requiresReview:true,diffPreview:null};
  return{...proposal,truth:"This is a structured candidate patch plan, not an applied Git diff or production code change."};
}

export function runAutonomousDevelopmentV4Audit({versions=[],versionProbe,mutants=[],runMutantTests,requirements=[],tests=[],lifetimes=[],authoritativeFrames=[],peerFrames=[],baselineReplay=[],replay=[],performanceMetric,performanceBudget}={}){
  const regression=versions.length&&versionProbe?bisectRegression({versions,probe:versionProbe}):null,mutation=runMutationTesting({mutants,runTests:runMutantTests}),coverage=findCoverageGaps({requirements,tests}),memory=analyzeObjectLifetimes(lifetimes),network=diagnoseNetworkDesync({authoritativeFrames,peerFrames}),replayResult=detectReplayDivergence({baselineFrames:baselineReplay,replayFrames:replay}),performance=versions.length&&performanceMetric?bisectPerformanceRegression({versions,metric:performanceMetric,budget:performanceBudget}):null;
  const blockers=[];if(regression?.firstBad)blockers.push(`regression:${regression.firstBad}`);if(mutation.survived)blockers.push(`mutation_survivors:${mutation.survived}`);if(coverage.highRiskGaps.length)blockers.push(`coverage_high_risk:${coverage.highRiskGaps.length}`);if(memory.possibleLeak)blockers.push(`memory_suspects:${memory.suspects.length}`);if(network.desynced)blockers.push(`network_desync:${network.firstDivergence.tick}`);if(replayResult.diverged)blockers.push(`replay_divergence:${replayResult.tick??replayResult.index}`);if(performance?.firstBad)blockers.push(`performance_regression:${performance.firstBad}`);
  return{passed:blockers.length===0,blockers,regression,mutation,coverage,memory,network,replay:replayResult,performance,productionAutoPatch:false,productionReleaseAuthority:false};
}
