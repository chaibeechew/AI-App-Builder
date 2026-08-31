// SoolenAI Autonomous Game Development Agent V3.
// Deterministic, bounded failure reproduction, cause isolation and regression planning.
// Production code changes remain human/review gated.

function clamp(v,min,max){return Math.max(min,Math.min(max,Number(v)||0));}
function text(v){return String(v??"").trim();}
function cleanId(v){return text(v).replace(/[^a-zA-Z0-9_.:-]/g,"_").slice(0,120);}
function hash(value){const s=text(value);let h=2166136261;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619);}return(h>>>0).toString(16);}

export const AUTONOMOUS_GAME_DEVELOPMENT_AGENT_V3=Object.freeze({
  version:"autonomous-game-development-agent-v3",
  systems:[
    "repro-bundle","delta-repro-minimizer","root-cause-isolation","regression-suite-synthesis",
    "review-gated-patch-plan","release-blocker-triage","synthetic-device-matrix","save-migration-regression",
    "autonomous-development-cycle"
  ],
  deterministic:true,
  maxTraceActions:10000,
  maxMinimizePasses:20,
  maxCauseCandidates:64,
  productionAutoPatch:false,
  productionReleaseAuthority:false,
  realDeviceEvidence:false
});

export function inferAutonomousDevelopmentCapabilities(idea=""){
  const s=text(idea);
  const matched=/autonomous development|development agent|root cause|minimal repro|repro bundle|regression suite|release blocker|delta debug|自动开发代理|自動開發代理|根因|最小复现|最小復現|回归测试|回歸測試|发布阻断|發布阻斷/i.test(s);
  return{matched,systems:[
    "Capture deterministic repro bundles containing seed, starting state, bounded action trace, invariant failure and state fingerprints.",
    "Minimize failing traces with bounded delta-debugging so developers see the shortest known reproduction rather than a 10,000-step log.",
    "Rank root-cause candidates from explicit evidence and dependency impact; correlation is labeled as suspicion until a candidate is experimentally isolated.",
    "Synthesize regression cases from minimized repros so a fixed bug becomes a permanent evidence gate.",
    "Generate review-gated patch plans with affected area, expected invariant, rollback note and validation plan; never silently write production code.",
    "Classify release blockers by crash/data-loss/security/progression/economy/performance severity and fail closed on critical unresolved issues.",
    "Run synthetic low/mid/high device matrices for budget planning while keeping real iOS/Android device evidence explicitly false.",
    "Validate save-schema migration chains and rollback compatibility across representative historical versions.",
    "Orchestrate reproduce → minimize → isolate → plan fix → synthesize regression → re-test evidence as one bounded development cycle."
  ],truthRule:"Autonomous Development Agent V3 proves internal deterministic debugging and regression contracts only. Production auto-patching and release authority stay disabled; real-device, live-network, production telemetry and human approval remain external evidence."};
}

export function createReproBundle({id="issue",seed="repro",initialState={},actions=[],failure="unknown",metadata={}}={}){
  const trace=(actions||[]).slice(0,AUTONOMOUS_GAME_DEVELOPMENT_AGENT_V3.maxTraceActions).map((a,i)=>({index:i,action:typeof a==="string"?a:structuredClone(a)}));
  const bundle={id:cleanId(id),seed:text(seed),initialState:structuredClone(initialState),trace,failure:text(failure).slice(0,240),metadata:structuredClone(metadata||{})};
  return{...bundle,fingerprint:hash(JSON.stringify(bundle)),bounded:trace.length<=AUTONOMOUS_GAME_DEVELOPMENT_AGENT_V3.maxTraceActions};
}

// Delta-debug style minimizer. `fails(actions)` must deterministically return true when the bug still reproduces.
export function minimizeFailureTrace(actions=[],fails,{maxPasses=20}={}){
  let current=(actions||[]).slice(0,AUTONOMOUS_GAME_DEVELOPMENT_AGENT_V3.maxTraceActions),passes=0,checks=0;
  if(typeof fails!=="function"||!fails(current))return{reproduces:false,actions:current,originalLength:current.length,minimizedLength:current.length,passes,checks};
  let granularity=2;
  while(current.length>1&&passes<clamp(maxPasses,1,AUTONOMOUS_GAME_DEVELOPMENT_AGENT_V3.maxMinimizePasses)){
    passes++;let reduced=false;const chunk=Math.max(1,Math.ceil(current.length/granularity));
    for(let start=0;start<current.length;start+=chunk){const candidate=[...current.slice(0,start),...current.slice(start+chunk)];if(!candidate.length)continue;checks++;if(fails(candidate)){current=candidate;granularity=Math.max(2,granularity-1);reduced=true;break;}}
    if(!reduced){if(granularity>=current.length)break;granularity=Math.min(current.length,granularity*2);}
  }
  return{reproduces:true,actions:current,originalLength:(actions||[]).length,minimizedLength:current.length,passes,checks,fingerprint:hash(JSON.stringify(current)),bounded:true};
}

export function isolateRootCauses({issues=[],candidates=[],testCandidate}={}){
  const normalized=(candidates||[]).slice(0,AUTONOMOUS_GAME_DEVELOPMENT_AGENT_V3.maxCauseCandidates).map((c,i)=>({id:cleanId(c.id||`candidate_${i}`),area:cleanId(c.area||"runtime"),dependencies:(c.dependencies||[]).slice(0,24).map(cleanId),prior:clamp(c.prior??.5,0,1)}));
  const rows=normalized.map(candidate=>{let result={resolved:0,observed:0,notes:[]};try{const r=typeof testCandidate==="function"?testCandidate(candidate,issues):null;if(r&&typeof r==="object")result={resolved:Math.max(0,Number(r.resolved)||0),observed:Math.max(0,Number(r.observed)||issues.length),notes:(r.notes||[]).slice(0,12).map(x=>text(x).slice(0,120))};}catch(e){result.notes=[`test_error:${text(e?.message).slice(0,80)}`];}
    const evidence=result.observed?result.resolved/result.observed:0,dependencyWeight=Math.min(.2,candidate.dependencies.length*.02),score=clamp(evidence*.75+candidate.prior*.2+dependencyWeight,0,1);
    return{...candidate,evidence:+evidence.toFixed(3),score:+score.toFixed(3),status:evidence>=.999?"isolated":evidence>=.5?"strong_suspect":"suspect",notes:result.notes};});
  rows.sort((a,b)=>b.score-a.score||a.id.localeCompare(b.id));return{ranked:rows,isolated:rows.filter(r=>r.status==="isolated").map(r=>r.id),truth:"A ranked candidate is not a proven root cause unless the experimental evidence isolates it."};
}

export function synthesizeRegressionSuite({issueId="issue",failure="unknown",seed="regression",initialState={},actions=[],expectedInvariant="no_failure"}={}){
  const id=cleanId(issueId),trace=(actions||[]).slice(0,2000);return{suiteId:`regression_${id}`,cases:[{id:`${id}_minimal_repro`,seed:text(seed),initialState:structuredClone(initialState),actions:structuredClone(trace),expectedInvariant:text(expectedInvariant),mustNotContain:text(failure)}],requiredOnEveryChange:true,productionEvidence:false,checksum:hash(JSON.stringify([id,seed,initialState,trace,expectedInvariant,failure]))};
}

const SEVERITY={critical:4,high:3,medium:2,low:1,info:0};
export function classifyReleaseRisk(issues=[]){
  const rows=(issues||[]).slice(0,500).map((issue,i)=>{const type=text(issue.type||issue).toLowerCase(),explicit=text(issue.severity).toLowerCase();let severity=SEVERITY[explicit]!=null?explicit:"medium";if(/security|data.?loss|save.?corrupt|crash loop|payment/i.test(type))severity="critical";else if(/crash|soft.?lock|progression.?block|infinite loop/i.test(type)&&severity!=="critical")severity="high";else if(/economy exploit|severe performance|memory/i.test(type)&&SEVERITY[severity]<3)severity="high";return{id:cleanId(issue.id||`issue_${i}`),type:cleanId(type||"unknown"),severity,resolved:issue.resolved===true,score:SEVERITY[severity]};});
  const unresolved=rows.filter(r=>!r.resolved),blockers=unresolved.filter(r=>r.score>=3);return{issues:rows,blockers,canRelease:blockers.length===0,highestSeverity:unresolved.sort((a,b)=>b.score-a.score)[0]?.severity||"none",productionReleaseAuthority:false};
}

export function proposeReviewGatedPatchPlan({issue={},rootCause=null,regressionSuite=null}={}){
  const area=cleanId(rootCause?.area||issue.area||"runtime"),severity=text(issue.severity||"medium").toLowerCase();return{planId:`patch_${hash(JSON.stringify([issue,rootCause]))}`,area,summary:`Correct ${text(issue.type||issue.id||"issue").slice(0,100)} while preserving the failing invariant as a regression case.`,steps:["Reproduce from the evidence bundle.",`Change only the smallest reviewed ${area} boundary needed to restore the invariant.`,"Run the synthesized regression plus the full affected runtime gate.","Keep rollback metadata and compare before/after evidence."],regressionSuiteId:regressionSuite?.suiteId||null,risk:SEVERITY[severity]!=null?severity:"medium",autoApply:false,requiresReview:true,productionWrite:false};
}

export function buildSyntheticDeviceMatrix({scenario="gameplay",profiles}={}){
  const defaults=[{id:"mobile_low",cpu:1,gpu:1,memoryMb:3072,thermal:"constrained"},{id:"mobile_mid",cpu:2,gpu:2,memoryMb:6144,thermal:"normal"},{id:"mobile_high",cpu:3,gpu:3,memoryMb:8192,thermal:"normal"}];
  const rows=(profiles?.length?profiles:defaults).slice(0,12).map(p=>({id:cleanId(p.id),scenario:cleanId(scenario),cpuTier:clamp(p.cpu,1,5),gpuTier:clamp(p.gpu,1,5),memoryMb:clamp(p.memoryMb,1024,32768),thermal:cleanId(p.thermal||"unknown"),synthetic:true,realDeviceMeasured:false}));return{profiles:rows,productionDeviceEvidence:false,truth:"Synthetic device matrices plan budgets; they do not replace measured iOS/Android FPS, memory, battery or thermal evidence."};
}

export function validateSaveMigrationRegression({snapshots=[],targetVersion,migrate,validate}={}){
  const target=Math.max(1,Math.floor(Number(targetVersion)||1)),results=[];for(const snap of(snapshots||[]).slice(0,64)){let version=Math.max(0,Math.floor(Number(snap.schemaVersion)||0)),data=structuredClone(snap.data||{}),errors=[];try{while(version<target){if(typeof migrate!=="function")throw new Error("migration_missing");data=migrate(data,version,version+1);version++;}if(typeof validate==="function"&&validate(data)!==true)errors.push("target_validation_failed");}catch(e){errors.push(`migration_error:${text(e?.message).slice(0,100)}`);}results.push({id:cleanId(snap.id||`v${snap.schemaVersion}`),fromVersion:snap.schemaVersion,targetVersion:version,passed:errors.length===0,errors,checksum:hash(JSON.stringify(data)),data});}
  return{passed:results.every(r=>r.passed),results,targetVersion:target,productionSaveEvidence:false};
}

export function runAutonomousDevelopmentCycle({issue,bundle,fails,candidates=[],testCandidate,expectedInvariant="bug_fixed"}={}){
  const repro=createReproBundle(bundle||{id:issue?.id||"issue",actions:[]});const minimized=minimizeFailureTrace(repro.trace.map(x=>x.action),fails||(()=>false));const causes=isolateRootCauses({issues:[issue?.type||repro.failure],candidates,testCandidate});const regression=synthesizeRegressionSuite({issueId:issue?.id||repro.id,failure:issue?.type||repro.failure,seed:repro.seed,initialState:repro.initialState,actions:minimized.actions,expectedInvariant});const top=causes.ranked[0]||null;const patch=proposeReviewGatedPatchPlan({issue:issue||{id:repro.id,type:repro.failure},rootCause:top,regressionSuite:regression});const release=classifyReleaseRisk([issue||{id:repro.id,type:repro.failure,severity:"high"}]);return{repro,minimized,causes,regression,patch,release,readyForReviewedFix:minimized.reproduces&&!!top,productionAutoPatch:false,productionReleaseAuthority:false};
}
