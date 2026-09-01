// SoolenAI Repository-aware Game Development Agent V5.
// Consumes repository evidence supplied by an authorized integration. It never self-grants repository access.

function clamp(v,min,max){return Math.max(min,Math.min(max,Number(v)||0));}
function text(v){return String(v??"").trim();}
function clean(v){return text(v).replace(/[^a-zA-Z0-9_./:-]/g,"_").slice(0,220);}
function uniq(a){return [...new Set(a)];}
function riskScore(level){return({critical:100,high:75,medium:50,low:25,info:5})[level]??50;}

export const REPOSITORY_AWARE_GAME_AGENT_V5=Object.freeze({
  version:"repository-aware-game-development-agent-v5",
  systems:["repository-evidence-ingest","dependency-impact-analysis","change-risk-prediction","regression-plan","commit-performance-compare","candidate-diff-preview","pr-gate-plan","release-evidence-summary"],
  repositoryWriteAuthority:false,
  mergeAuthority:false,
  productionDeployAuthority:false,
  requiresAuthorizedEvidenceSource:true
});

export function inferRepositoryAwareCapabilities(idea=""){
  const s=text(idea);const matched=/repository|repo|commit|diff|dependency impact|change risk|regression pr|pull request|代码仓库|代碼倉庫|提交记录|提交記錄|依赖影响|依賴影響|变更风险|變更風險/i.test(s);
  return{matched,systems:[
    "Ingest authorized commit/diff/test/performance metadata with stable IDs and preserve source provenance.",
    "Compute dependency impact from changed files to dependent runtime, tests, assets and release surfaces.",
    "Predict change risk from blast radius, critical domains, missing tests, migration impact and performance deltas.",
    "Generate a minimum regression plan tied to changed areas and high-risk dependencies.",
    "Compare commit-level performance samples without treating synthetic CI timings as real-device profiling.",
    "Generate candidate diff previews as review artifacts only; repository writes and merges remain disabled unless separately authorized by the user and connector.",
    "Build PR gate requirements for security, runtime, save compatibility, multiplayer, performance and store-sensitive changes.",
    "Summarize release evidence and blockers without converting an internal green CI into production approval."
  ],truthRule:"Repository-aware V5 only reasons over evidence it is given by an authorized source. It has no implicit repository write, merge or production-deploy authority."};
}

export function normalizeRepositoryEvidence({commits=[],changes=[],tests=[],performance=[]}={}){
  return{
    commits:(commits||[]).slice(0,500).map(c=>({sha:clean(c.sha||c.id),message:text(c.message).slice(0,240),parents:(c.parents||[]).slice(0,8).map(clean),timestamp:text(c.timestamp),source:text(c.source||"authorized-repository-evidence")})),
    changes:(changes||[]).slice(0,5000).map(c=>({path:clean(c.path),status:clean(c.status||"modified"),additions:Math.max(0,Number(c.additions)||0),deletions:Math.max(0,Number(c.deletions)||0),domains:uniq((c.domains||[]).map(clean))})),
    tests:(tests||[]).slice(0,5000).map(t=>({id:clean(t.id),status:clean(t.status||"unknown"),covers:uniq((t.covers||[]).map(clean)),durationMs:Math.max(0,Number(t.durationMs)||0)})),
    performance:(performance||[]).slice(0,5000).map(p=>({commit:clean(p.commit),metric:clean(p.metric),value:Number(p.value),device:clean(p.device||"synthetic-ci"),realDevice:p.realDevice===true}))
  };
}

export function analyzeDependencyImpact({changes=[],graph={}}={}){
  const changed=uniq((changes||[]).map(c=>clean(typeof c==="string"?c:c.path)).filter(Boolean)),seen=new Set(changed),queue=[...changed],edges=[];
  while(queue.length&&seen.size<5000){const cur=queue.shift();for(const dep of(graph[cur]||[]).slice(0,200)){const id=clean(dep);edges.push({from:cur,to:id});if(!seen.has(id)){seen.add(id);queue.push(id);}}}
  const impacted=[...seen],critical=impacted.filter(x=>/auth|payment|purchase|save|migration|multiplayer|matchmaking|security|publish|store|runtime|game-creator-readiness/i.test(x));
  return{changed,impacted,critical,blastRadius:impacted.length,edges:edges.slice(0,10000),bounded:true};
}

export function predictChangeRisk({impact,changes=[],tests=[],migrations=false,performanceDeltaPercent=0}={}){
  const blast=impact?.blastRadius||0,critical=impact?.critical?.length||0,totalChanged=(changes||[]).reduce((n,c)=>n+(Number(c.additions)||0)+(Number(c.deletions)||0),0),failed=(tests||[]).filter(t=>t.status==="failed").length,unknown=(tests||[]).filter(t=>!['passed','failed'].includes(t.status)).length;
  let score=0;score+=Math.min(30,blast*.8);score+=Math.min(25,critical*6);score+=Math.min(15,totalChanged/120);if(migrations)score+=15;if(failed)score+=30;if(unknown)score+=Math.min(10,unknown*2);if(Number(performanceDeltaPercent)>10)score+=15;score=clamp(score,0,100);
  const level=score>=80?"critical":score>=60?"high":score>=35?"medium":"low";
  return{score:+score.toFixed(1),level,releaseReviewRequired:score>=35,blockAutomaticPromotion:score>=60||failed>0,reasons:{blastRadius:blast,criticalImpacts:critical,changedLines:totalChanged,migrations:!!migrations,failedTests:failed,unknownTests:unknown,performanceDeltaPercent:Number(performanceDeltaPercent)||0}};
}

export function buildRegressionPlan({impact,tests=[]}={}){
  const impacted=new Set(impact?.impacted||[]),selected=(tests||[]).filter(t=>(t.covers||[]).some(x=>impacted.has(clean(x)))).map(t=>clean(t.id));
  const mandatory=[];const joined=[...impacted].join(" ");if(/save|migration/i.test(joined))mandatory.push("save-migration-regression");if(/multiplayer|matchmaking|network/i.test(joined))mandatory.push("network-authority-and-reconnect");if(/security|auth|payment|purchase/i.test(joined))mandatory.push("security-and-ownership");if(/runtime|game/i.test(joined))mandatory.push("game-runtime-contracts");if(/publish|store/i.test(joined))mandatory.push("publishing-readiness");
  return{selectedTests:uniq([...mandatory,...selected]),highRiskAreas:impact?.critical||[],fullBuildRequired:true,realDeviceRequired:/mobile|ios|android|render|audio|thermal/i.test(joined),productionPromotionAutomatic:false};
}

export function compareCommitPerformance(samples=[]){
  const groups=new Map();for(const s of(samples||[])){const key=clean(s.metric),arr=groups.get(key)||[];arr.push({commit:clean(s.commit),value:Number(s.value),device:clean(s.device||"synthetic-ci"),realDevice:s.realDevice===true});groups.set(key,arr);}const results=[];
  for(const [metric,rows] of groups){for(let i=1;i<rows.length;i++){const prev=rows[i-1],cur=rows[i],pct=prev.value?((cur.value-prev.value)/Math.abs(prev.value))*100:0;results.push({metric,from:prev.commit,to:cur.commit,delta:+(cur.value-prev.value).toFixed(3),deltaPercent:+pct.toFixed(2),realDeviceEvidence:prev.realDevice&&cur.realDevice});}}
  return{comparisons:results,regressions:results.filter(r=>r.deltaPercent>10),truth:"Synthetic CI performance comparisons are regression signals only; real-device measurements are required for production performance claims."};
}

export function buildCandidateDiffPreview({files=[],intent="",rootCause="",regressionTests=[]}={}){
  return{files:uniq((files||[]).map(clean)).slice(0,30),intent:text(intent).slice(0,500),rootCause:text(rootCause).slice(0,500),regressionTests:uniq((regressionTests||[]).map(clean)).slice(0,100),previewType:"structured-change-intent",applied:false,committed:false,merged:false,productionWrite:false,requiresHumanApproval:true};
}

export function buildPullRequestGatePlan({risk,regressionPlan,domains=[]}={}){
  const gates=["release-policy","security","runtime","project-readiness","game-creator-readiness","zero-cost-function-budget","structural-readiness","nextjs-build",...(regressionPlan?.selectedTests||[])];
  if((domains||[]).some(d=>/multiplayer|mmo|network/i.test(d)))gates.push("multiplayer-network-evidence");if((domains||[]).some(d=>/store|publish|commerce/i.test(d)))gates.push("publishing-commerce-evidence");
  return{gates:uniq(gates),requiredApprovals:risk?.level==="critical"?2:1,blockMerge:!!risk?.blockAutomaticPromotion,blockProductionPromotion:true,repositoryWriteAuthority:false};
}

export function auditRepositoryAwareChange(input={}){
  const evidence=normalizeRepositoryEvidence(input),impact=analyzeDependencyImpact({changes:evidence.changes,graph:input.graph||{}}),perf=compareCommitPerformance(evidence.performance),risk=predictChangeRisk({impact,changes:evidence.changes,tests:evidence.tests,migrations:input.migrations===true,performanceDeltaPercent:Math.max(0,...perf.regressions.map(r=>r.deltaPercent),0)}),regressionPlan=buildRegressionPlan({impact,tests:evidence.tests}),prGate=buildPullRequestGatePlan({risk,regressionPlan,domains:input.domains||[]});
  return{evidence,impact,performance:perf,risk,regressionPlan,prGate,truthRule:inferRepositoryAwareCapabilities("repository").truthRule};
}
