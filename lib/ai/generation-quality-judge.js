import { assessBuildQuality } from "../buildStandards.js";
import { assessGenerationOutcome } from "./generation-outcome-intelligence.js";

export const GENERATION_QUALITY_JUDGE_VERSION=1;
export const GENERATION_QUALITY_ACCEPT_SCORE=95;
export const GENERATION_QUALITY_REPLAN_SCORE=85;

const BASE_DIMENSIONS=Object.freeze([
  Object.freeze({id:"releaseReadiness",label:"Release Readiness",weight:25}),
  Object.freeze({id:"structuralOriginality",label:"Structural Originality",weight:20}),
  Object.freeze({id:"requirementCoverage",label:"Requirement Coverage",weight:20}),
  Object.freeze({id:"liui",label:"Living Intelligence UI",weight:15}),
  Object.freeze({id:"productCompleteness",label:"Product Completeness",weight:10}),
  Object.freeze({id:"securityTrust",label:"Security & Trust",weight:10}),
]);

function list(value){return Array.isArray(value)?value:[];}
function object(value){return value&&typeof value==="object"&&!Array.isArray(value)?value:{};}
function clamp(value,min=0,max=100){const n=Number(value);return Number.isFinite(n)?Math.max(min,Math.min(max,n)):0;}
function round(value){return Math.round(clamp(value));}
function text(value){return String(value||"").trim();}
function normalize(value){return text(value).toLowerCase().replace(/[^a-z0-9]+/g," ").replace(/\s+/g," ").trim();}
function meaningfulTokens(value){return normalize(value).split(" ").filter(token=>token.length>=4);}
function signalMatched(signal,haystack){
  const phrase=normalize(signal);if(!phrase)return true;
  if(haystack.includes(phrase))return true;
  const tokens=meaningfulTokens(phrase);if(!tokens.length)return true;
  const hits=tokens.filter(token=>haystack.includes(token)).length;
  return hits>=Math.max(1,Math.ceil(tokens.length*0.6));
}
function specText(specification){
  const spec=object(specification);
  return normalize([
    spec.name,spec.description,
    ...list(spec.pages).flatMap(page=>[page?.name,page?.route,page?.purpose,page?.description,page?.layout,page?.visualTreatment]),
    ...list(spec.features).flatMap(feature=>typeof feature==="string"?[feature]:[feature?.name,feature?.description,feature?.uiPattern]),
    ...list(spec.actions).flatMap(action=>typeof action==="string"?[action]:[action?.name,action?.label,action?.description,action?.intent]),
    ...list(spec.navigation).flatMap(item=>[item?.label,item?.route]),
    JSON.stringify(spec.data||{}),JSON.stringify(spec.dataModels||[]),
  ].filter(Boolean).join(" "));
}
function completenessScore(specification){
  const spec=object(specification),pages=list(spec.pages),features=list(spec.features),actions=list(spec.actions),navigation=list(spec.navigation),models=list(spec.dataModels);
  const dataEntities=Object.keys(object(spec.data)).length;
  let score=0;
  score+=Math.min(30,pages.length*6);
  score+=Math.min(25,features.length*5);
  score+=Math.min(20,actions.length*4);
  score+=Math.min(15,navigation.length*3);
  score+=Math.min(10,(models.length+dataEntities)*5);
  return Math.min(100,score);
}
function requirementCoverage(specification,benchmarkCase){
  if(!benchmarkCase)return {active:false,score:null,checks:[],matched:0,total:0};
  const spec=object(specification),expected=object(benchmarkCase.expected),haystack=specText(spec),checks=[];
  const add=(id,passed,detail)=>checks.push({id,passed:Boolean(passed),detail});
  const minPages=Math.max(0,Number(expected.minPages||0));
  const minFeatures=Math.max(0,Number(expected.minFeatures||0));
  if(minPages)add("minimum_pages",list(spec.pages).length>=minPages,`${list(spec.pages).length}/${minPages}`);
  if(minFeatures)add("minimum_features",list(spec.features).length>=minFeatures,`${list(spec.features).length}/${minFeatures}`);
  for(const signal of list(expected.requiredFeatureSignals))add(`feature:${normalize(signal).replace(/ /g,"-")}`,signalMatched(signal,haystack),text(signal));
  for(const signal of list(expected.requiredPageSignals))add(`page:${normalize(signal).replace(/ /g,"-")}`,signalMatched(signal,haystack),text(signal));
  if(expected.mobileFirst===true){
    const comfort=normalize(JSON.stringify(object(spec.qualityPlan).comfort||[]));
    const responsive=normalize(JSON.stringify({designSystem:spec.designSystem,liui:spec.liui,pages:spec.pages}));
    add("mobile_first",/(mobile|responsive|safe area|safe-area|phone)/.test(`${comfort} ${responsive}`),"mobile-first evidence");
  }
  const total=checks.length,matched=checks.filter(check=>check.passed).length;
  return {active:true,score:total?Math.round((matched/total)*100):100,checks,matched,total};
}
function securityScore(buildQuality){
  const securityDimension=list(buildQuality?.dimensions).find(item=>item?.id==="security");
  return round(securityDimension?.score??(buildQuality?.security?.passed?100:0));
}
function buildDimensionRows({buildQuality,outcome,coverage,completeness}){
  const liuiScore=round(buildQuality?.liui?.score||0);
  const scoreMap={
    releaseReadiness:round(buildQuality?.overall||0),
    structuralOriginality:round(outcome?.score||0),
    requirementCoverage:coverage.active?round(coverage.score):null,
    liui:liuiScore,
    productCompleteness:round(completeness),
    securityTrust:securityScore(buildQuality),
  };
  return BASE_DIMENSIONS.map(dimension=>Object.freeze({...dimension,active:dimension.id!=="requirementCoverage"||coverage.active,score:scoreMap[dimension.id]}));
}
function weightedScore(dimensions){
  const active=dimensions.filter(item=>item.active&&Number.isFinite(Number(item.score)));
  const totalWeight=active.reduce((sum,item)=>sum+item.weight,0);
  if(!totalWeight)return 0;
  return Math.round(active.reduce((sum,item)=>sum+(item.score*item.weight),0)/totalWeight);
}
function buildDirectives({dimensions,outcome,coverage,buildQuality}){
  const directives=[];
  if(outcome.requiresReplan||dimensions.find(item=>item.id==="structuralOriginality")?.score<GENERATION_QUALITY_REPLAN_SCORE)directives.push("Materially change page architecture, navigation, composition grammar and action distribution; cosmetic-only changes do not satisfy the replan.");
  if(coverage.active&&coverage.score<85)directives.push("Restore missing benchmark/customer capabilities and page responsibilities before visual polishing; do not invent unrelated functionality.");
  if((buildQuality?.liui?.score||0)<95)directives.push("Raise LIUI evidence and implementation across responsiveness, accessibility, interaction quality, states, AI integration, industry fit and trust/permission UX.");
  if(securityScore(buildQuality)<100||buildQuality?.security?.passed===false)directives.push("Keep Secure-by-Default MAX fail-closed; repair security evidence without weakening ownership, authorization, validation or secret boundaries.");
  if((buildQuality?.overall||0)<95)directives.push("Repair deterministic stability, privacy, comfort, beauty and naturalness gaps while preserving working functionality.");
  return directives;
}

export function assessGenerationQuality(specification={},options={}){
  const buildQuality=assessBuildQuality(specification);
  const outcome=assessGenerationOutcome(specification,{referenceDescriptors:options.referenceDescriptors});
  const coverage=requirementCoverage(specification,options.benchmarkCase);
  const completeness=completenessScore(specification);
  const dimensions=buildDimensionRows({buildQuality,outcome,coverage,completeness});
  const score=weightedScore(dimensions);
  const hardBlockers=[];
  if(outcome.requiresReplan)hardBlockers.push("structural_originality_replan");
  if(buildQuality?.security?.passed===false)hardBlockers.push("security_gate_failed");
  if(coverage.active&&coverage.score<70)hardBlockers.push("benchmark_requirement_coverage_low");
  if(completeness<45)hardBlockers.push("product_completeness_low");
  const decision=hardBlockers.length||score<GENERATION_QUALITY_REPLAN_SCORE?"replan":score<GENERATION_QUALITY_ACCEPT_SCORE?"optimize":"accept";
  const directives=buildDirectives({dimensions,outcome,coverage,buildQuality});
  return Object.freeze({
    schemaVersion:GENERATION_QUALITY_JUDGE_VERSION,
    score,
    acceptScore:GENERATION_QUALITY_ACCEPT_SCORE,
    replanScore:GENERATION_QUALITY_REPLAN_SCORE,
    decision,
    passed:decision!=="replan",
    productionEligibleByJudge:decision==="accept",
    hardBlockers:Object.freeze(hardBlockers),
    directives:Object.freeze(directives),
    dimensions:Object.freeze(dimensions),
    benchmarkCoverage:coverage,
    outcome,
    buildQuality,
    privacySafe:true,
    storesRawUserPrompt:false,
    methodology:"laneriq-generation-quality-judge-v1-deterministic-zero-paid-embeddings",
    evidenceBoundary:"Internal generation-quality evidence only. It does not prove provider, browser, physical-device, store, legal or Production success.",
  });
}

export const GENERATION_QUALITY_JUDGE_POLICY=Object.freeze({
  version:GENERATION_QUALITY_JUDGE_VERSION,
  acceptScore:GENERATION_QUALITY_ACCEPT_SCORE,
  replanScore:GENERATION_QUALITY_REPLAN_SCORE,
  zeroPaidEmbeddingDependency:true,
  zeroVectorDatabaseDependency:true,
  noDedicatedServerRequired:true,
  rawUserPromptStorage:false,
  decisions:Object.freeze(["accept","optimize","replan"]),
});
