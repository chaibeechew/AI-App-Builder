import crypto from "node:crypto";
import { INDUSTRIES, ARCHETYPES } from "../templateCatalog.js";

export const OUTCOME_LEARNING_LEDGER_VERSION=1;
export const OUTCOME_LEARNING_COMPARISON_POLICY=Object.freeze({
  maximumGlobalAverageScoreRegression:1.5,
  maximumGroupAverageScoreRegression:3,
  maximumRuntimeReplanIncrease:2,
  maximumBenchmarkReplanIncrease:2,
  maximumUniqueCandidateRegression:0.25,
  newHardBlockersAllowed:0,
});

const INDUSTRY_SET=new Set(INDUSTRIES);
const ARCHETYPE_SET=new Set(ARCHETYPES.map(item=>item.id));
const FORBIDDEN_KEYS=new Set(["prompt","rawprompt","specification","rawspecification","idea","useridea","userid","email","customername","voicetranscript","referenceimages","messagebody","content"]);

function list(value){return Array.isArray(value)?value:[];}
function object(value){return value&&typeof value==="object"&&!Array.isArray(value)?value:{};}
function num(value){const n=Number(value);return Number.isFinite(n)?n:0;}
function avg(values){const rows=list(values).map(Number).filter(Number.isFinite);return rows.length?Number((rows.reduce((sum,value)=>sum+value,0)/rows.length).toFixed(2)):0;}
function pct(n,d){return d?Number(((n/d)*100).toFixed(2)):0;}
function cleanId(value,max=100){return String(value||"").trim().replace(/[^A-Za-z0-9_.:-]+/g,"-").slice(0,max);}
function safeSha(value){const text=String(value||"").trim();return /^[0-9a-f]{7,40}$/i.test(text)?text:"";}
function stable(value){if(Array.isArray(value))return value.map(stable);if(value&&typeof value==="object")return Object.fromEntries(Object.keys(value).sort().map(key=>[key,stable(value[key])]));return value;}
function fingerprint(prefix,value){return `${prefix}-${crypto.createHash("sha256").update(JSON.stringify(stable(value))).digest("hex").slice(0,16)}`;}
function freezeDeep(value){if(Array.isArray(value)){value.forEach(freezeDeep);return Object.freeze(value);}if(value&&typeof value==="object"){Object.values(value).forEach(freezeDeep);return Object.freeze(value);}return value;}
function winnerFamily(row){const id=String(row?.selectedCandidateId||"");if(id==="primary")return"primary";if(id.startsWith("local-structural-shadow-"))return"zeroCostStructuralShadow";return"other";}
function blockerIds(row){return [...new Set([...list(row?.selectedHardBlockers),...list(row?.benchmarkHardBlockers)].map(value=>cleanId(value,80)).filter(Boolean))].sort();}
function countValues(values){const counts={};for(const value of values){const key=cleanId(value,100);if(key)counts[key]=(counts[key]||0)+1;}return Object.fromEntries(Object.entries(counts).sort(([a],[b])=>a.localeCompare(b)));}
function groupRows(rows,key){const groups={};for(const row of rows){const raw=String(row?.[key]||"");const allowed=key==="industry"?INDUSTRY_SET.has(raw):ARCHETYPE_SET.has(raw);if(!allowed)continue;(groups[raw]??=[]).push(row);}return groups;}
function summarizeGroup(rows){const items=list(rows);const blockers=items.flatMap(blockerIds);return {caseCount:items.length,averageScore:avg(items.map(row=>row?.score)),minimumScore:items.length?Math.min(...items.map(row=>num(row?.score))):0,averageOriginality:avg(items.map(row=>row?.originalityScore)),averageCoverage:avg(items.map(row=>row?.coverageScore)),replanRate:pct(items.filter(row=>row?.decision==="replan").length,items.length),winnerFamilies:countValues(items.map(winnerFamily)),blockers:countValues(blockers)};}
function summarizeGroups(rows,key){const groups=groupRows(rows,key);return Object.fromEntries(Object.entries(groups).sort(([a],[b])=>a.localeCompare(b)).map(([id,items])=>[id,summarizeGroup(items)]));}
function assertNoForbiddenKeys(value,path="root"){if(Array.isArray(value)){value.forEach((item,index)=>assertNoForbiddenKeys(item,`${path}[${index}]`));return;}if(!value||typeof value!=="object")return;for(const [key,item] of Object.entries(value)){if(FORBIDDEN_KEYS.has(key.toLowerCase()))throw new Error(`OUTCOME_LEARNING_FORBIDDEN_FIELD_${key.toUpperCase()}`);assertNoForbiddenKeys(item,`${path}.${key}`);}}

export function buildPrivacySafeOutcomeLearningRecord(rows=[],meta={}){
  const items=list(rows).filter(row=>INDUSTRY_SET.has(String(row?.industry||""))&&ARCHETYPE_SET.has(String(row?.archetypeId||"")));
  const runtimeReplanRate=pct(items.filter(row=>row?.selectedDecision==="replan").length,items.length);
  const benchmarkReplanRate=pct(items.filter(row=>row?.decision==="replan").length,items.length);
  const allBlockers=items.flatMap(blockerIds);
  const record={
    schemaVersion:OUTCOME_LEARNING_LEDGER_VERSION,
    recordId:cleanId(meta.recordId||meta.releaseId||meta.commitSha||"outcome-learning",120),
    commitSha:safeSha(meta.commitSha),
    evidenceLevel:cleanId(meta.evidenceLevel||"CODE_CI_EXECUTABLE_GENERATION_SAMPLE",80),
    sample:{
      caseCount:items.length,
      industryCoverage:new Set(items.map(row=>row.industry)).size,
      archetypeCoverage:new Set(items.map(row=>row.archetypeId)).size,
      averageScore:avg(items.map(row=>row?.score)),
      minimumScore:items.length?Math.min(...items.map(row=>num(row?.score))):0,
      averageOriginality:avg(items.map(row=>row?.originalityScore)),
      averageCoverage:avg(items.map(row=>row?.coverageScore)),
      averageLiui:avg(items.map(row=>row?.liuiScore)),
      averageReleaseReadiness:avg(items.map(row=>row?.releaseReadinessScore)),
      runtimeReplanRate,
      benchmarkReplanRate,
      averageCandidateCount:avg(items.map(row=>row?.candidateCount)),
      averageUniqueCandidateCount:avg(items.map(row=>row?.uniqueCandidateCount)),
      winnerFamilies:countValues(items.map(winnerFamily)),
      blockers:countValues(allBlockers),
      uniqueOutcomeFingerprintCount:new Set(items.map(row=>String(row?.outcomeFingerprint||"")).filter(Boolean)).size,
    },
    byArchetype:summarizeGroups(items,"archetypeId"),
    byIndustry:summarizeGroups(items,"industry"),
    privacy:{syntheticBenchmarkOnly:true,rawPromptStored:false,rawSpecificationStored:false,userIdStored:false,customerNameStored:false,freeFormUserTextStored:false,outcomeFingerprintRowsStored:false},
    governance:{automaticBaselineMutation:false,reviewedPullRequestRequired:true,learningMayRankStrategiesButCannotLowerQualityGates:true},
  };
  assertNoForbiddenKeys(record);
  return freezeDeep({...record,fingerprint:fingerprint("olr1",record)});
}

function blockerTotal(record){return Object.values(object(record?.sample?.blockers)).reduce((sum,value)=>sum+num(value),0);}
function compareGroups(baseline,candidate,key,tolerance){const before=object(baseline?.[key]),after=object(candidate?.[key]);const regressions=[];for(const id of Object.keys(before)){if(!after[id]){regressions.push({scope:key,id,type:"missing-group",delta:null});continue;}const delta=Number((num(after[id]?.averageScore)-num(before[id]?.averageScore)).toFixed(2));if(delta < -tolerance)regressions.push({scope:key,id,type:"average-score",delta});const replanDelta=Number((num(after[id]?.replanRate)-num(before[id]?.replanRate)).toFixed(2));if(replanDelta>OUTCOME_LEARNING_COMPARISON_POLICY.maximumBenchmarkReplanIncrease)regressions.push({scope:key,id,type:"replan-rate",delta:replanDelta});}return regressions;}

export function compareOutcomeLearningRecords(baseline={},candidate={},policy=OUTCOME_LEARNING_COMPARISON_POLICY){
  assertNoForbiddenKeys(baseline);assertNoForbiddenKeys(candidate);
  const globalScoreDelta=Number((num(candidate?.sample?.averageScore)-num(baseline?.sample?.averageScore)).toFixed(2));
  const runtimeReplanDelta=Number((num(candidate?.sample?.runtimeReplanRate)-num(baseline?.sample?.runtimeReplanRate)).toFixed(2));
  const benchmarkReplanDelta=Number((num(candidate?.sample?.benchmarkReplanRate)-num(baseline?.sample?.benchmarkReplanRate)).toFixed(2));
  const uniqueCandidateDelta=Number((num(candidate?.sample?.averageUniqueCandidateCount)-num(baseline?.sample?.averageUniqueCandidateCount)).toFixed(2));
  const newBlockers=Math.max(0,blockerTotal(candidate)-blockerTotal(baseline));
  const regressions=[];
  if(globalScoreDelta < -num(policy.maximumGlobalAverageScoreRegression))regressions.push({scope:"global",type:"average-score",delta:globalScoreDelta});
  if(runtimeReplanDelta > num(policy.maximumRuntimeReplanIncrease))regressions.push({scope:"global",type:"runtime-replan-rate",delta:runtimeReplanDelta});
  if(benchmarkReplanDelta > num(policy.maximumBenchmarkReplanIncrease))regressions.push({scope:"global",type:"benchmark-replan-rate",delta:benchmarkReplanDelta});
  if(uniqueCandidateDelta < -num(policy.maximumUniqueCandidateRegression))regressions.push({scope:"global",type:"candidate-uniqueness",delta:uniqueCandidateDelta});
  if(newBlockers>num(policy.newHardBlockersAllowed))regressions.push({scope:"global",type:"new-hard-blockers",delta:newBlockers});
  regressions.push(...compareGroups(baseline,candidate,"byArchetype",num(policy.maximumGroupAverageScoreRegression)));
  regressions.push(...compareGroups(baseline,candidate,"byIndustry",num(policy.maximumGroupAverageScoreRegression)));
  const result={schemaVersion:OUTCOME_LEARNING_LEDGER_VERSION,passed:regressions.length===0,deltas:{globalScore:globalScoreDelta,runtimeReplanRate:runtimeReplanDelta,benchmarkReplanRate:benchmarkReplanDelta,averageUniqueCandidates:uniqueCandidateDelta,newHardBlockers:newBlockers},regressions,baselineFingerprint:cleanId(baseline?.fingerprint,80),candidateFingerprint:cleanId(candidate?.fingerprint,80),policy:{...policy},evidenceBoundary:"Compares privacy-safe synthetic CODE/CI outcome-learning aggregates only. It is not external-provider LIVE, Production browser, device, store, user-behavior or market evidence."};
  assertNoForbiddenKeys(result);
  return freezeDeep({...result,fingerprint:fingerprint("olc1",result)});
}

export function assertPrivacySafeOutcomeLearningRecord(record){assertNoForbiddenKeys(record);if(record?.privacy?.rawPromptStored!==false||record?.privacy?.rawSpecificationStored!==false||record?.privacy?.userIdStored!==false||record?.privacy?.freeFormUserTextStored!==false)throw new Error("OUTCOME_LEARNING_PRIVACY_CONTRACT_FAILED");return true;}

export const OUTCOME_LEARNING_LEDGER_POLICY=Object.freeze({version:OUTCOME_LEARNING_LEDGER_VERSION,syntheticBenchmarkOnly:true,aggregateOnly:true,storesRawPrompt:false,storesRawSpecification:false,storesUserId:false,storesCustomerName:false,storesFreeFormUserText:false,storesRowFingerprints:false,automaticBaselineMutation:false,baselinePromotionRequiresReviewedPullRequest:true,qualityGatesMayNotBeLoweredByLearning:true,paidEmbeddingDependency:false,vectorDatabaseDependency:false,dedicatedServerRequired:false});
