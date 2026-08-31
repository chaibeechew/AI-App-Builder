// SoolenAI Autonomous Game Director / Development Agent V2.
// Deterministic bounded QA/search contracts. Production fixes remain review-gated.

function clamp(v,min,max){return Math.max(min,Math.min(max,Number(v)||0));}
function text(v){return String(v??"").trim();}
function cleanId(v){return text(v).replace(/[^a-zA-Z0-9_.:-]/g,"_").slice(0,120);}
function hash(value){const s=text(value);let h=2166136261;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619);}return(h>>>0).toString(16);}
function seeded(seed){let x=(parseInt(hash(seed),16)>>>0)||1;return()=>{x^=x<<13;x^=x>>>17;x^=x<<5;return(x>>>0)/4294967296;};}
function percentile(values,p){if(!values.length)return 0;const a=[...values].sort((x,y)=>x-y),i=Math.min(a.length-1,Math.max(0,Math.floor((a.length-1)*p)));return a[i];}

export const AUTONOMOUS_GAME_DIRECTOR_V2=Object.freeze({
  version:"autonomous-game-director-v2",
  systems:[
    "test-route-generation","boss-strategy-matrix","economy-abuse-testing","soft-lock-search","infinite-loop-detection",
    "save-corruption-recovery","random-input-fuzzing","long-run-simulation","difficulty-curve-analysis","repair-patch-suggestions"
  ],
  deterministic:true,
  maxFuzzSteps:10000,
  maxSimulationRuns:10000,
  productionAutoPatch:false,
  realDeviceQaVerified:false
});

export function inferAutonomousGameDirectorCapabilities(idea=""){
  const s=text(idea);
  const matched=/autonomous game director|game director|qa agent|fuzz|soft.?lock|infinite loop|boss strategy|economy exploit|save corruption|long.?run simulation|difficulty curve|自动测试路线|自動測試路線|软锁|軟鎖|无限循环|無限循環|存档损坏|存檔損壞|长期模拟|長期模擬|难度曲线|難度曲線|自动修复建议|自動修復建議/i.test(s);
  return{matched,systems:[
    "Generate bounded deterministic play routes from the gameplay graph and measure route/goal coverage instead of relying on one happy path.",
    "Run Boss strategy matrices against phase, survival, damage and resource constraints to expose impossible or dominant strategies.",
    "Stress dynamic economies with hoarding, dumping, zero-production and high-demand scenarios to flag price-floor/ceiling or resource-exploit risks.",
    "Search reachable state graphs for soft-locks where the player is alive but no legal action can progress toward a terminal or recovery state.",
    "Detect non-progress loops from repeated state fingerprints and transition cycles with explicit iteration bounds.",
    "Validate and recover save snapshots using schema versions, checksums, known-safe defaults and bounded migrations without inventing missing ownership data.",
    "Run seeded random-input fuzzing with invariants, crash capture, action/state fingerprints and strict step caps.",
    "Run 1,000/10,000-game deterministic simulations with bounded aggregation for win rate, duration, score, failure reason and economy distribution.",
    "Analyze level/boss difficulty curves for spikes, cliffs, regressions and insufficient sample confidence.",
    "Produce review-gated repair patch suggestions tied to evidence; never silently modify production game code or balance from synthetic QA alone."
  ],truthRule:"Autonomous Game Director V2 proves bounded deterministic QA/search and repair-suggestion contracts. Production auto-patching stays disabled; real-device, live-network, human design review and production telemetry are still required before release claims."};
}

export function generateTestRoutes({nodes=[],edges=[],start,goals=[],maxRoutes=32,maxDepth=40}={}){
  const nodeIds=new Set((nodes||[]).map(n=>cleanId(typeof n==="string"?n:n.id))),adj=new Map();for(const id of nodeIds)adj.set(id,[]);
  for(const e of(edges||[]).slice(0,5000)){const from=cleanId(e.from),to=cleanId(e.to);if(nodeIds.has(from)&&nodeIds.has(to))adj.get(from).push(to);}
  for(const list of adj.values())list.sort();const s=cleanId(start),goalSet=new Set((goals||[]).map(cleanId)),routes=[],queue=nodeIds.has(s)?[[s]]:[];
  while(queue.length&&routes.length<clamp(maxRoutes,1,128)){const path=queue.shift(),last=path.at(-1);if(goalSet.has(last)){routes.push(path);continue;}if(path.length>=clamp(maxDepth,2,200))continue;for(const next of adj.get(last)||[]){if(path.filter(x=>x===next).length>=2)continue;queue.push([...path,next]);}}
  const reached=new Set(routes.map(r=>r.at(-1))),coverage=nodeIds.size?Math.round(new Set(routes.flat()).size/nodeIds.size*100):0;
  return{routes,reachedGoals:[...reached],missingGoals:[...goalSet].filter(g=>!reached.has(g)),nodeCoverage:coverage,complete:goalSet.size>0&&[...goalSet].every(g=>reached.has(g)),bounded:true};
}

export function evaluateBossStrategies({boss={hp:1000,phases:[.7,.35]},strategies=[],simulate,maxTurns=240}={}){
  const results=[];for(const strategy of(strategies||[]).slice(0,32)){let state={bossHp:Math.max(1,Number(boss.hp)||1000),playerHp:100,resource:100,turn:0,phase:1,won:false,lost:false};for(let turn=0;turn<clamp(maxTurns,1,2000)&&!state.won&&!state.lost;turn++){state=simulate?simulate(structuredClone(state),strategy,turn):state;state.turn=turn+1;const hpRatio=state.bossHp/Math.max(1,Number(boss.hp)||1000);state.phase=1+(boss.phases||[]).filter(x=>hpRatio<=Number(x)).length;state.won=state.bossHp<=0;state.lost=state.playerHp<=0;}results.push({strategy:cleanId(strategy.id||strategy.name||"strategy"),won:state.won,lost:state.lost,turns:state.turn,remainingPlayerHp:+Math.max(0,state.playerHp).toFixed(2),remainingBossHp:+Math.max(0,state.bossHp).toFixed(2),resource:+Math.max(0,state.resource).toFixed(2)});}
  const wins=results.filter(r=>r.won),dominant=wins.length>1?wins.slice().sort((a,b)=>a.turns-b.turns)[0]:null,impossible=results.length>0&&wins.length===0;
  return{results,winRate:results.length?+(wins.length/results.length).toFixed(3):0,impossible,dominantStrategy:dominant&&wins.length>=3&&dominant.turns<=percentile(wins.map(x=>x.turns),.25)*.65?dominant.strategy:null};
}

export function stressEconomy({baseState,step,scenarios,maxTicks=120}={}){
  const defaults=[{id:"baseline",input:{}},{id:"hoard",input:{demandMultiplier:2,supplyMultiplier:.4}},{id:"dump",input:{demandMultiplier:.4,supplyMultiplier:2}},{id:"scarcity",input:{demandMultiplier:1.8,supplyMultiplier:.05}}],results=[];
  for(const scenario of (scenarios?.length?scenarios:defaults)){let state=structuredClone(baseState),errors=[];for(let t=0;t<clamp(maxTicks,1,1000);t++){try{state=step?step(state,scenario.input,t):state;const goods=state.goods||[];for(const g of goods){if(!Number.isFinite(g.price)||g.price<0)errors.push(`invalid_price:${cleanId(g.id)}:${t}`);if(Number.isFinite(g.floor)&&g.price<g.floor-.001)errors.push(`below_floor:${cleanId(g.id)}:${t}`);if(Number.isFinite(g.ceiling)&&g.price>g.ceiling+.001)errors.push(`above_ceiling:${cleanId(g.id)}:${t}`);}}catch(e){errors.push(`runtime:${text(e?.message).slice(0,80)}`);break;}}
    results.push({scenario:cleanId(scenario.id),errors:[...new Set(errors)].slice(0,50),state});}
  return{passed:results.every(r=>r.errors.length===0),results,exploitRisks:results.flatMap(r=>r.errors.map(e=>`${r.scenario}:${e}`))};
}

export function detectSoftLocks({states=[],transitions=[],terminalStates=[],recoveryStates=[]}={}){
  const ids=new Set((states||[]).map(s=>cleanId(typeof s==="string"?s:s.id))),terminal=new Set(terminalStates.map(cleanId)),recovery=new Set(recoveryStates.map(cleanId)),reverse=new Map(),out=new Map();for(const id of ids){reverse.set(id,[]);out.set(id,[]);}for(const t of(transitions||[]).slice(0,10000)){const a=cleanId(t.from),b=cleanId(t.to);if(ids.has(a)&&ids.has(b)){out.get(a).push(b);reverse.get(b).push(a);}}
  const escapable=new Set([...terminal,...recovery].filter(x=>ids.has(x))),q=[...escapable];while(q.length){const cur=q.shift();for(const prev of reverse.get(cur)||[])if(!escapable.has(prev)){escapable.add(prev);q.push(prev);}}
  const softLocks=[...ids].filter(id=>!terminal.has(id)&&!recovery.has(id)&&(!escapable.has(id)||out.get(id).length===0));return{softLocks,passed:softLocks.length===0,escapable:[...escapable]};
}

export function detectInfiniteLoops({initialState={},actions=[],applyAction,maxSteps=1000,progress}={}){
  let state=structuredClone(initialState),seen=new Map([[hash(JSON.stringify(state)),0]]),lastProgress=progress?progress(state):null;for(let i=0;i<clamp(maxSteps,1,10000);i++){const action=actions.length?actions[i%actions.length]:null;state=applyAction?applyAction(state,action,i):state;const fp=hash(JSON.stringify(state)),p=progress?progress(state):null;if(seen.has(fp)&&(progress==null||p===lastProgress))return{loop:true,firstSeen:seen.get(fp),detectedAt:i+1,fingerprint:fp,state};seen.set(fp,i+1);lastProgress=p;}return{loop:false,steps:clamp(maxSteps,1,10000),state};
}

export function recoverSaveSnapshot(snapshot={},contract={schemaVersion:1,defaults:{},migrate}){
  const raw=snapshot?.data&&typeof snapshot.data==="object"?structuredClone(snapshot.data):{},expected=text(snapshot.checksum),actual=hash(JSON.stringify(raw)),checksumValid=!expected||expected===actual;let version=Math.max(0,Math.floor(Number(snapshot.schemaVersion)||0)),data=raw,errors=[];
  if(!checksumValid)errors.push("checksum_mismatch");try{while(version<contract.schemaVersion){if(typeof contract.migrate!=="function")throw new Error("migration_missing");data=contract.migrate(data,version,version+1);version++;}}catch(e){errors.push(`migration_failed:${text(e?.message).slice(0,80)}`);}
  const recovered={...structuredClone(contract.defaults||{}),...(data&&typeof data==="object"?data:{})};return{valid:errors.length===0,recoveredFromCorruption:!checksumValid||errors.length>0,schemaVersion:version,data:recovered,errors,checksum:hash(JSON.stringify(recovered))};
}

export function runInputFuzz({seed="fuzz",actions=[],steps=1000,initialState={},applyAction,invariant}={}){
  const rng=seeded(seed),limit=Math.floor(clamp(steps,1,AUTONOMOUS_GAME_DIRECTOR_V2.maxFuzzSteps)),catalog=actions.length?actions:[null],failures=[],coverage=new Set(),actionCounts={};let state=structuredClone(initialState);
  for(let i=0;i<limit;i++){const action=catalog[Math.floor(rng()*catalog.length)];actionCounts[cleanId(action?.id||action||"none")]=(actionCounts[cleanId(action?.id||action||"none")]||0)+1;try{state=applyAction?applyAction(state,action,i,rng):state;coverage.add(hash(JSON.stringify(state)));const ok=invariant?invariant(state,action,i):true;if(ok!==true){failures.push({step:i+1,action:cleanId(action?.id||action||"none"),issue:text(ok||"invariant_failed"),fingerprint:hash(JSON.stringify(state))});break;}}catch(e){failures.push({step:i+1,action:cleanId(action?.id||action||"none"),issue:`runtime:${text(e?.message).slice(0,100)}`,fingerprint:hash(JSON.stringify(state))});break;}}
  return{passed:failures.length===0,seed:text(seed),stepsExecuted:failures[0]?.step||limit,failures,uniqueStates:coverage.size,actionCounts,finalState:state};
}

export function runLongSimulation({seed="simulation",runs=1000,simulateRun}={}){
  const count=Math.floor(clamp(runs,1,AUTONOMOUS_GAME_DIRECTOR_V2.maxSimulationRuns)),wins=[],durations=[],scores=[],reasons={},economy=[];for(let i=0;i<count;i++){const result=simulateRun?simulateRun({run:i,seed:`${seed}:${i}`,rng:seeded(`${seed}:${i}`)}):{};wins.push(result.win===true?1:0);durations.push(Math.max(0,Number(result.duration)||0));scores.push(Number(result.score)||0);const reason=cleanId(result.failureReason||"none");reasons[reason]=(reasons[reason]||0)+1;if(Number.isFinite(Number(result.economy)))economy.push(Number(result.economy));}
  const avg=a=>a.length?a.reduce((s,v)=>s+v,0)/a.length:0;return{runs:count,winRate:+avg(wins).toFixed(4),avgDuration:+avg(durations).toFixed(2),p50Duration:+percentile(durations,.5).toFixed(2),p95Duration:+percentile(durations,.95).toFixed(2),avgScore:+avg(scores).toFixed(2),failureReasons:reasons,economy:{avg:+avg(economy).toFixed(2),p95:+percentile(economy,.95).toFixed(2)},syntheticEvidence:true,productionTelemetry:false};
}

export function analyzeDifficultyCurve(samples=[]){
  const rows=(samples||[]).slice(0,500).map((s,i)=>({id:cleanId(s.id||`stage_${i}`),order:Number.isFinite(Number(s.order))?Number(s.order):i,difficulty:clamp(s.difficulty,0,100),completionRate:clamp(s.completionRate,0,1),attempts:Math.max(0,Math.floor(Number(s.attempts)||0))})).sort((a,b)=>a.order-b.order),issues=[];
  for(let i=0;i<rows.length;i++){const r=rows[i];if(r.attempts<30)issues.push({id:r.id,type:"low_confidence",severity:"info"});if(i){const d=r.difficulty-rows[i-1].difficulty,c=r.completionRate-rows[i-1].completionRate;if(d>20||c<-.25)issues.push({id:r.id,type:"difficulty_spike",severity:d>35||c<-.4?"high":"medium",deltaDifficulty:+d.toFixed(2),deltaCompletion:+c.toFixed(3)});if(d<-25&&c>.2)issues.push({id:r.id,type:"difficulty_cliff_down",severity:"medium"});}}
  return{rows,issues,passed:!issues.some(x=>x.severity==="high"),syntheticOnly:true};
}

export function proposeRepairSuggestions(issues=[]){
  const mapIssue=issue=>{const s=text(issue).toLowerCase();if(s.includes("soft"))return{area:"progression",suggestion:"Add a tested recovery transition or make the missing progression action reachable.",risk:"medium"};if(s.includes("loop"))return{area:"state-machine",suggestion:"Add progress guards, iteration caps or a terminal/recovery transition to the repeated state cycle.",risk:"medium"};if(s.includes("save")||s.includes("checksum"))return{area:"save",suggestion:"Use a versioned migration plus known-safe defaults; preserve the original corrupted snapshot for rollback evidence.",risk:"high"};if(s.includes("economy")||s.includes("price"))return{area:"economy",suggestion:"Clamp price/supply invariants and retest hoard/dump/scarcity scenarios before changing production balance.",risk:"high"};if(s.includes("difficulty"))return{area:"balance",suggestion:"Reduce the local spike or add learning/recovery space, then rerun the same seeded simulations.",risk:"medium"};if(s.includes("boss"))return{area:"boss",suggestion:"Adjust phase windows/resources or strategy counters, then rerun the complete strategy matrix.",risk:"medium"};return{area:"runtime",suggestion:"Reproduce with the captured seed/fingerprint, apply the smallest bounded fix, then rerun the failing route plus regression routes.",risk:"medium"};};
  return(issues||[]).slice(0,100).map((issue,i)=>({id:`repair_${i}`,issue:text(issue),...mapIssue(issue),autoApply:false,requiresReview:true}));
}

export function runAutonomousDirectorAudit(config={}){
  const findings=[];const route=config.routeGraph?generateTestRoutes(config.routeGraph):null;if(route&&!route.complete)findings.push(...route.missingGoals.map(g=>`route_unreached:${g}`));
  const softLock=config.stateGraph?detectSoftLocks(config.stateGraph):null;if(softLock&&!softLock.passed)findings.push(...softLock.softLocks.map(s=>`soft_lock:${s}`));
  const loop=config.loopCase?detectInfiniteLoops(config.loopCase):null;if(loop?.loop)findings.push(`infinite_loop:${loop.fingerprint}`);
  const fuzz=config.fuzzCase?runInputFuzz(config.fuzzCase):null;if(fuzz&&!fuzz.passed)findings.push(...fuzz.failures.map(f=>`fuzz:${f.issue}`));
  const difficulty=config.difficulty?analyzeDifficultyCurve(config.difficulty):null;if(difficulty)findings.push(...difficulty.issues.filter(x=>x.severity!=="info").map(x=>`difficulty:${x.type}:${x.id}`));
  const repairs=proposeRepairSuggestions(findings);return{passed:findings.length===0,findings,repairs,evidence:{route,softLock,loop,fuzz,difficulty},productionAutoPatch:false};
}
