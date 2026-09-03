import fs from 'node:fs';
import path from 'node:path';
import { generateWithFallback } from '../engine/ai-provider.js';
import { evaluateBenchmarkCandidate } from '../lib/ai/benchmark-factory.js';
import { buildDeterministicGenerationSamplePlan, summarizeDeterministicGenerationSample, evaluateReleaseQualityFloor, buildReleaseQualitySnapshot } from '../lib/ai/release-quality-intelligence.js';

function extractJson(text){
  const cleaned=String(text||'').replace(/```json/gi,'').replace(/```/g,'').trim();
  const first=cleaned.indexOf('{'),last=cleaned.lastIndexOf('}');
  if(first<0||last<first)throw new Error('NO_JSON_OBJECT');
  return JSON.parse(cleaned.slice(first,last+1));
}
function buildPrompt(benchmarkCase){
  return `Build a real mobile-first app and customer website from the user's idea.\nUSER IDEA:\n"${benchmarkCase.prompt}"\n\nVOICE INPUT:\n"None"\n\nREFERENCE IMAGE REFERENCES:\nNone\n\nLANGUAGE CONTEXT:\n{"language":"en"}\n\nINDUSTRY PATTERNS:\n[]\n\nReturn ONLY the complete valid JSON product specification.`;
}
function errorCode(error){return String(error?.message||error||'UNKNOWN').replace(/[^A-Za-z0-9_-]+/g,'_').slice(0,80);}

const plan=buildDeterministicGenerationSamplePlan();
const rows=[];
for(const benchmarkCase of plan.cases){
  try{
    const generated=await generateWithFallback(buildPrompt(benchmarkCase),{providers:['soolen-local']});
    const specification=extractJson(generated.result);
    const evaluated=evaluateBenchmarkCandidate({benchmarkCase,specification});
    rows.push({
      caseId:benchmarkCase.id,
      industry:benchmarkCase.industry,
      archetypeId:benchmarkCase.archetypeId,
      difficulty:benchmarkCase.difficulty,
      provider:generated.provider,
      sourceKind:'zero-cost-local-generation',
      validJson:true,
      score:evaluated.score,
      decision:evaluated.decision,
      originalityScore:evaluated.originalityScore,
      coverageScore:evaluated.coverageScore,
      liuiScore:evaluated.liuiScore,
      releaseReadinessScore:evaluated.releaseReadinessScore,
      hardBlockerCount:evaluated.hardBlockers.length,
      outcomeFingerprint:evaluated.outcomeFingerprint,
    });
  }catch(error){
    rows.push({caseId:benchmarkCase.id,industry:benchmarkCase.industry,archetypeId:benchmarkCase.archetypeId,difficulty:benchmarkCase.difficulty,provider:'soolen-local',sourceKind:'zero-cost-local-generation',validJson:false,score:0,decision:'replan',errorCode:errorCode(error)});
  }
}

const summary=summarizeDeterministicGenerationSample(rows,{label:'batch-30-zero-cost-generation-sample',sourceKind:'zero-cost-local-generation',evidenceLevel:'CODE_CI_GENERATION_SAMPLE'});
const floor=evaluateReleaseQualityFloor({sampleSummary:summary});
const snapshot=buildReleaseQualitySnapshot({
  releaseId:process.env.GITHUB_RUN_ID?`github-actions-${process.env.GITHUB_RUN_ID}`:'local-ci-sample',
  commitSha:process.env.GITHUB_SHA||'',
  sampleSummary:summary,
  observedAt:process.env.GITHUB_RUN_STARTED_AT||'',
  status:'candidate',
});
const artifact={
  schemaVersion:1,
  samplePlan:{sampleSize:plan.sampleSize,industryCoverage:plan.industryCoverage,archetypeCoverage:plan.archetypeCoverage,fingerprint:plan.fingerprint,providerPolicy:plan.providerPolicy},
  summary,
  goldenFloorCandidate:floor,
  snapshot,
  rows:rows.map(row=>({caseId:row.caseId,industry:row.industry,archetypeId:row.archetypeId,difficulty:row.difficulty,provider:row.provider,sourceKind:row.sourceKind,validJson:row.validJson,score:row.score,decision:row.decision,originalityScore:row.originalityScore??null,coverageScore:row.coverageScore??null,liuiScore:row.liuiScore??null,releaseReadinessScore:row.releaseReadinessScore??null,hardBlockerCount:row.hardBlockerCount??null,outcomeFingerprint:row.outcomeFingerprint??null,errorCode:row.errorCode??null})),
  privacy:{rawPromptStored:false,rawSpecificationStored:false,realUserDataStored:false},
  evidenceBoundary:'This artifact proves deterministic zero-cost local generation sampling in CI only. It is not external-provider LIVE, Production browser, physical-device, store or legal originality evidence.',
};
const outputDir=path.join(process.cwd(),'artifacts','quality');
fs.mkdirSync(outputDir,{recursive:true});
const outputPath=path.join(outputDir,'release-quality-generation-sample.json');
fs.writeFileSync(outputPath,JSON.stringify(artifact,null,2));

console.log(`✓ Generated ${summary.caseCount} deterministic zero-cost sample products across ${summary.industryCoverage} industries`);
console.log(`✓ Valid JSON rate: ${summary.validJsonRate}% | average Quality Judge score: ${summary.averageScore} | replan rate: ${summary.replanRate}%`);
console.log(`✓ Candidate Golden Quality Floor: ${floor.passed?'PASS':'NOT YET PROMOTED'}`);
console.log(`✓ Evidence artifact: ${outputPath}`);
if(summary.caseCount!==50||summary.industryCoverage!==50||summary.validJsonRate!==100){
  console.error('Release quality generation sample lost deterministic coverage or valid-JSON integrity.');
  process.exitCode=1;
}
