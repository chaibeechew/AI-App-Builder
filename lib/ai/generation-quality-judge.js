import { assessBuildQuality } from "../buildStandards.js";
import { assessGenerationOutcome } from "./generation-outcome-intelligence.js";

export const GENERATION_QUALITY_JUDGE_VERSION=2;
export const GENERATION_QUALITY_ACCEPT_SCORE=95;
export const GENERATION_QUALITY_REPLAN_SCORE=85;

const BASE_DIMENSIONS=Object.freeze([
  Object.freeze({id:"releaseReadiness",label:"Release Readiness",weight:20}),
  Object.freeze({id:"structuralOriginality",label:"Structural Originality",weight:15}),
  Object.freeze({id:"requirementCoverage",label:"Requirement Coverage",weight:15}),
  Object.freeze({id:"liui",label:"Living Intelligence UI",weight:15}),
  Object.freeze({id:"productCompleteness",label:"Product Completeness",weight:10}),
  Object.freeze({id:"securityTrust",label:"Security & Trust",weight:10}),
  Object.freeze({id:"workflowCoherence",label:"Workflow Coherence",weight:10}),
  Object.freeze({id:"resilienceAccessibility",label:"Resilience & Accessibility",weight:5}),
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
    ...list(spec.pages).flatMap(page=>[page?.name,page?.route,page?.purpose,page?.description,page?.layout,page?.visualTreatment,page?.backgroundTreatment,JSON.stringify(page?.components||[])]),
    ...list(spec.features).flatMap(feature=>typeof feature==="string"?[feature]:[feature?.name,feature?.description,feature?.uiPattern]),
    ...list(spec.actions).flatMap(action=>typeof action==="string"?[action]:[action?.name,action?.label,action?.description,action?.intent]),
    ...list(spec.navigation).flatMap(item=>[item?.label,item?.route]),
    JSON.stringify(spec.data||{}),JSON.stringify(spec.dataModels||[]),JSON.stringify(spec.qualityPlan||{}),JSON.stringify(spec.liui||{}),JSON.stringify(spec.security||{}),
  ].filter(Boolean).join(" "));
}
function completenessScore(specification){
  const spec=object(specification),pages=list(spec.pages),features=list(spec.features),actions=list(spec.actions),navigation=list(spec.navigation),models=list(spec.dataModels);
  const dataEntities=Object.keys(object(spec.data)).length;
  const validRoutes=new Set(pages.map(page=>String(page?.route||"").trim()).filter(route=>route.startsWith("/")));
  const navTargets=navigation.map(item=>String(item?.route||"").trim()).filter(Boolean);
  let score=0;
  if(pages.length)score+=25;
  if(features.length)score+=20;
  if(actions.length)score+=20;
  if(navigation.length)score+=15;
  if(models.length||dataEntities)score+=15;
  if(validRoutes.has("/")&&navTargets.every(route=>validRoutes.has(route)))score+=5;
  return Math.min(100,score);
}
function workflowCoherenceScore(specification){
  const spec=object(specification),pages=list(spec.pages),features=list(spec.features),actions=list(spec.actions),navigation=list(spec.navigation),models=list(spec.dataModels),dataEntities=Object.keys(object(spec.data));
  if(!pages.length)return 0;
  const routes=pages.map(page=>String(page?.route||"").trim()).filter(Boolean);
  const validRoutes=new Set(routes.filter(route=>route.startsWith("/")));
  const uniqueRoutes=new Set(routes);
  const navTargets=navigation.map(item=>String(item?.route||"").trim()).filter(Boolean);
  const purposeful=pages.filter(page=>text(page?.purpose||page?.description).length>=8).length;
  let score=20;
  if(routes.length===pages.length&&uniqueRoutes.size===routes.length)score+=20;
  if(navigation.length&&navTargets.every(route=>validRoutes.has(route)))score+=15;
  if(purposeful/pages.length>=0.8)score+=10;
  if(actions.length>=Math.min(3,Math.max(1,features.length?2:1)))score+=15;
  if(models.length||dataEntities.length)score+=15;
  if(validRoutes.has("/"))score+=5;
  return Math.min(100,score);
}
function resilienceAccessibilityScore(specification){
  const haystack=specText(specification);
  const checks=[
    /loading|skeleton|progress/,
    /error|failure|failed/,
    /empty|no results|no data/,
    /retry|recover|fallback|timeout/,
    /offline|weak network|low bandwidth|reconnect/,
    /accessib|keyboard|screen reader|contrast|aria/,
    /mobile|responsive|safe area|safearea|phone/,
    /reduced motion|reduce motion|motion preference/,
  ];
  const matched=checks.filter(pattern=>pattern.test(haystack)).length;
  return Math.round((matched/checks.length)*100);
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
function securityEvidencePresent(specification){return Object.keys(object(specification?.security)).length>0||list(object(specification?.qualityPlan).security).length>0;}
function buildDimensionRows({buildQuality,outcome,coverage,completeness,securityActive,workflowCoherence,resilienceAccessibility}){
  const liuiScore=round(buildQuality?.liui?.score||0);
  const scoreMap={
    releaseReadiness:round(buildQuality?.overall||0),
    structuralOriginality:round(outcome?.score||0),
    requirementCoverage:coverage.active?round(coverage.score):null,
    liui:liuiScore,
    productCompleteness:round(completeness),
    securityTrust:securityScore(buildQuality),
    workflowCoherence:round(workflowCoherence),
    resilienceAccessibility:round(resilienceAccessibility),
  };
  return BASE_DIMENSIONS.map(dimension=>Object.freeze({...dimension,active:(dimension.id!=="requirementCoverage"||coverage.active)&&(dimension.id!=="securityTrust"||securityActive),score:scoreMap[dimension.id]}));
}
function weightedScore(dimensions){
  const active=dimensions.filter(item=>item.active&&Number.isFinite(Number(item.score)));
  const totalWeight=active.reduce((sum,item)=>sum+item.weight,0);
  if(!totalWeight)return 0;
  return Math.round(active.reduce((sum,item)=>sum+(item.score*item.weight),0)/totalWeight);
}
function buildDirectives({dimensions,outcome,coverage,buildQuality,securityActive,workflowCoherence,resilienceAccessibility}){
  const directives=[];
  if(outcome.requiresReplan||dimensions.find(item=>item.id==="structuralOriginality")?.score<GENERATION_QUALITY_REPLAN_SCORE)directives.push("Materially change page architecture, navigation, composition grammar and action distribution; cosmetic-only changes do not satisfy the replan.");
  if(coverage.active&&coverage.score<85)directives.push("Restore missing benchmark/customer capabilities and page responsibilities before visual polishing; do not invent unrelated functionality.");
  if(workflowCoherence<80)directives.push("Repair route uniqueness, navigation targets, page responsibilities, action paths and data/workflow relationships so the product behaves as one coherent system rather than disconnected screens.");
  if(resilienceAccessibility<75)directives.push("Add concrete loading, error, empty, retry/fallback, weak-network, mobile, accessibility and reduced-motion behavior where relevant; do not satisfy this with vague quality claims.");
  if((buildQuality?.liui?.score||0)<95)directives.push("Raise LIUI evidence and implementation across responsiveness, accessibility, interaction quality, states, AI integration, industry fit and trust/permission UX.");
  if(securityActive&&(securityScore(buildQuality)<100||buildQuality?.security?.passed===false))directives.push("Keep Secure-by-Default MAX fail-closed; repair security evidence without weakening ownership, authorization, validation or secret boundaries.");
  if((buildQuality?.overall||0)<95)directives.push("Repair deterministic stability, privacy, comfort, beauty and naturalness gaps while preserving working functionality.");
  return directives;
}

export function assessGenerationQuality(specification={},options={}){
  const buildQuality=assessBuildQuality(specification);
  const outcome=assessGenerationOutcome(specification,{referenceDescriptors:options.referenceDescriptors});
  const coverage=requirementCoverage(specification,options.benchmarkCase);
  const completeness=completenessScore(specification);
  const workflowCoherence=workflowCoherenceScore(specification);
  const resilienceAccessibility=resilienceAccessibilityScore(specification);
  const securityActive=securityEvidencePresent(specification);
  const dimensions=buildDimensionRows({buildQuality,outcome,coverage,completeness,securityActive,workflowCoherence,resilienceAccessibility});
  const score=weightedScore(dimensions);
  const hardBlockers=[];
  const substantialScope=list(specification?.pages).length>=3||list(specification?.features).length>=3;
  if(outcome.requiresReplan)hardBlockers.push("structural_originality_replan");
  if(securityActive&&buildQuality?.security?.passed===false)hardBlockers.push("security_gate_failed");
  if(coverage.active&&coverage.score<70)hardBlockers.push("benchmark_requirement_coverage_low");
  if(completeness<45)hardBlockers.push("product_completeness_low");
  if(substantialScope&&workflowCoherence<55)hardBlockers.push("workflow_coherence_low");
  if(substantialScope&&resilienceAccessibility<50)hardBlockers.push("resilience_accessibility_low");
  const decision=hardBlockers.length||score<GENERATION_QUALITY_REPLAN_SCORE?"replan":score<GENERATION_QUALITY_ACCEPT_SCORE?"optimize":"accept";
  const directives=buildDirectives({dimensions,outcome,coverage,buildQuality,securityActive,workflowCoherence,resilienceAccessibility});
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
    workflowCoherence:Object.freeze({score:workflowCoherence,target:80}),
    resilienceAccessibility:Object.freeze({score:resilienceAccessibility,target:75}),
    outcome,
    buildQuality,
    privacySafe:true,
    storesRawUserPrompt:false,
    methodology:"laneriq-generation-quality-judge-v2-deterministic-zero-paid-embeddings",
    evidenceBoundary:"Internal generation-quality evidence only. It does not prove provider, browser, physical-device, store, legal or Production success.",
  });
}

export const GENERATION_QUALITY_JUDGE_POLICY=Object.freeze({
  version:GENERATION_QUALITY_JUDGE_VERSION,
  acceptScore:GENERATION_QUALITY_ACCEPT_SCORE,
  replanScore:GENERATION_QUALITY_REPLAN_SCORE,
  dimensions:Object.freeze(BASE_DIMENSIONS.map(item=>item.id)),
  zeroPaidEmbeddingDependency:true,
  zeroVectorDatabaseDependency:true,
  noDedicatedServerRequired:true,
  rawUserPromptStorage:false,
  workflowCoherenceGate:true,
  resilienceAccessibilityGate:true,
  decisions:Object.freeze(["accept","optimize","replan"]),
});
