import fs from 'node:fs';
import path from 'node:path';
import { runAutonomousEngine } from '../engine/autonomous-engine.js';
import { applyRuntimeOutcomeIntelligence } from '../lib/ai/runtime-outcome-selector.js';
import { evaluateBenchmarkCandidate } from '../lib/ai/benchmark-factory.js';
import { buildDeterministicGenerationSamplePlan, summarizeDeterministicGenerationSample, evaluateReleaseQualityFloor, buildReleaseQualitySnapshot } from '../lib/ai/release-quality-intelligence.js';

if(String(process.env.SOOLEN_COST_MODE||'zero').toLowerCase()!=='zero'){
  throw new Error('RELEASE_QUALITY_SAMPLE_REQUIRES_SOOLEN_COST_MODE_ZERO');
}

function safeCode(error){return String(error?.message||error||'UNKNOWN').replace(/[^A-Za-z0-9_-]+/g,'_').slice(0,80);}
function compactCandidateMeta(result){const meta=result?.intelligence?.qualityCandidates||{};return {candidateCount:Number(meta.candidateCount||0),uniqueCandidateCount:Number(meta.uniqueCandidateCount||0),selectedCandidateId:String(meta.selectedCandidateId||''),selectedQualityScore:Number(meta.selectedQualityScore||0),selectedDecision:String(meta.selectedDecision||''),paidShadowCalls:Number(meta.paidShadowCalls||0),maxMeteredRemoteCalls:Number(meta.maxMeteredRemoteCalls||0)};}

const plan=buildDeterministicGenerationSamplePlan();
const rows=[];
const startedAt=Date.now();
for(const benchmarkCase of plan.cases){
  try{
    const generated=await runAutonomousEngine(benchmarkCase.prompt,{language:'en'});
    if(generated?.aiProvider!=='soolen-local')throw new Error(`NON_ZERO_COST_PROVIDER_${generated?.aiProvider||'unknown'}`);
    const selected=applyRuntimeOutcomeIntelligence(generated,benchmarkCase.prompt,{requestedCandidates:3,costMode:'free'});
    const evaluated=evaluateBenchmarkCandidate({benchmarkCase,specification:selected.specification});
    const candidate=compactCandidateMeta(selected);
    if(candidate.paidShadowCalls!==0)throw new Error('PAID_SHADOW_CALL_DETECTED');
    rows.push({
      caseId:benchmarkCase.id,
      industry:benchmarkCase.industry,
      archetypeId:benchmarkCase.archetypeId,
      difficulty:benchmarkCase.difficulty,
      provider:generated.aiProvider,
      sourceKind:'zero-cost-full-autonomous-generation',
      validJson:true,
      score:evaluated.score,
      decision:evaluated.decision,
      originalityScore:evaluated.originalityScore,
      coverageScore:evaluated.coverageScore,
      liuiScore:evaluated.liuiScore,
      releaseReadinessScore:evaluated.releaseReadinessScore,
      hardBlockerCount:evaluated.hardBlockers.length,
      outcomeFingerprint:evaluated.outcomeFingerprint,
      ...candidate,
    });
  }catch(error){
    rows.push({caseId:benchmarkCase.id,industry:benchmarkCase.industry,archetypeId:benchmarkCase.archetypeId,difficulty:benchmarkCase.difficulty,provider:'soolen-local',sourceKind:'zero-cost-full-autonomous-generation',validJson:false,score:0,decision:'replan',errorCode:safeCode(error),paidShadowCalls:0});
  }
}

const summary=summarizeDeterministicGenerationSample(rows,{label:'batch-36-zero-cost-full-pipeline-sample',sourceKind:'zero-cost-full-autonomous-generation',evidenceLevel:'CODE_CI_EXECUTABLE_GENERATION_SAMPLE'});
const floor=evaluateReleaseQualityFloor({sampleSummary:summary});
const snapshot=buildReleaseQualitySnapshot({releaseId:process.env.GITHUB_RUN_ID?`github-actions-${process.env.GITHUB_RUN_ID}`:'local-ci-sample',commitSha:process.env.GITHUB_SHA||'',sampleSummary:summary,observedAt:process.env.GITHUB_RUN_STARTED_AT||'',status:floor.passed?'golden':'candidate'});
const candidates={averageCandidateCount:Number((rows.reduce((sum,row)=>sum+Number(row.candidateCount||0),0)/Math.max(1,rows.length)).toFixed(2)),averageUniqueCandidateCount:Number((rows.reduce((sum,row)=>sum+Number(row.uniqueCandidateCount||0),0)/Math.max(1,rows.length)).toFixed(2)),paidShadowCalls:rows.reduce((sum,row)=>sum+Number(row.paidShadowCalls||0),0),providerSet:[...new Set(rows.map(row=>row.provider).filter(Boolean))].sort()};
const artifact={schemaVersion:2,samplePlan:{sampleSize:plan.sampleSize,industryCoverage:plan.industryCoverage,archetypeCoverage:plan.archetypeCoverage,fingerprint:plan.fingerprint,providerPolicy:'SOOLEN_COST_MODE=zero + full autonomous engine'},summary,goldenFloor:floor,snapshot,candidates,elapsedMs:Date.now()-startedAt,rows:rows.map(row=>({caseId:row.caseId,industry:row.industry,archetypeId:row.archetypeId,difficulty:row.difficulty,provider:row.provider,sourceKind:row.sourceKind,validJson:row.validJson,score:row.score,decision:row.decision,originalityScore:row.originalityScore??null,coverageScore:row.coverageScore??null,liuiScore:row.liuiScore??null,releaseReadinessScore:row.releaseReadinessScore??null,hardBlockerCount:row.hardBlockerCount??null,outcomeFingerprint:row.outcomeFingerprint??null,candidateCount:row.candidateCount??null,uniqueCandidateCount:row.uniqueCandidateCount??null,selectedCandidateId:row.selectedCandidateId??null,selectedQualityScore:row.selectedQualityScore??null,selectedDecision:row.selectedDecision??null,paidShadowCalls:row.paidShadowCalls??0,errorCode:row.errorCode??null})),privacy:{rawPromptStored:false,rawSpecificationStored:false,realUserDataStored:false},evidenceBoundary:'This artifact proves deterministic zero-cost full-pipeline generation sampling in GitHub CI only. It is not external-provider LIVE, Production browser, physical-device, store or legal originality evidence.'};
const outputDir=path.join(process.cwd(),'artifacts','quality');
fs.mkdirSync(outputDir,{recursive:true});
const outputPath=path.join(outputDir,'release-quality-generation-sample.json');
fs.writeFileSync(outputPath,JSON.stringify(artifact,null,2));

console.log(`✓ Executed ${summary.caseCount} zero-cost full-pipeline generations across ${summary.industryCoverage} industries`);
console.log(`✓ Valid JSON: ${summary.validJsonRate}% | average judge: ${summary.averageScore} | replan: ${summary.replanRate}%`);
console.log(`✓ Outcome candidates avg ${candidates.averageCandidateCount} / unique ${candidates.averageUniqueCandidateCount} | paid shadow calls ${candidates.paidShadowCalls}`);
console.log(`✓ Provider set: ${candidates.providerSet.join(', ')||'none'} | Golden Floor: ${floor.passed?'PASS':'FAIL'}`);
console.log(`✓ Evidence artifact: ${outputPath}`);

if(summary.caseCount!==50||summary.industryCoverage!==50||summary.validJsonRate!==100||candidates.paidShadowCalls!==0||candidates.providerSet.some(provider=>provider!=='soolen-local')){
  console.error('Executable generation sample lost deterministic coverage, zero-cost provider integrity or JSON integrity.');
  process.exitCode=1;
}else if(!floor.passed){
  console.error('Executable generation quality fell below the Golden Quality Floor.');
  process.exitCode=1;
}
