"use client";

import {useMemo,useState} from "react";
import Link from "next/link";
import {
  generateTestRoutes,evaluateBossStrategies,stressEconomy,detectSoftLocks,detectInfiniteLoops,
  recoverSaveSnapshot,runInputFuzz,runLongSimulation,analyzeDifficultyCurve,runAutonomousDirectorAudit
} from "../../lib/game/autonomous-game-director-v2.js";

const TABS=["Routes + Boss","Soft-lock + Loop","Save + Economy","Fuzz Testing","Long Simulation","Difficulty + Repair"];

export default function GameAutonomyLab(){
  const[tab,setTab]=useState(TABS[0]);
  return <main className="shell"><div className="bg"/><header><Link href="/game-builder">← GAME BUILDER</Link><span>SOOLENAI · AUTONOMOUS GAME DIRECTOR V2</span></header>
    <section className="hero"><small>PRO · EVIDENCE-GATED AUTONOMOUS QA</small><h1>Let AI play deeper.<br/><em>Keep fixes review-gated.</em></h1><p>Route coverage, boss strategy search, economy abuse tests, soft-lock and loop detection, save recovery, seeded input fuzzing, 1,000/10,000-run simulation and difficulty-curve analysis are exercised here as deterministic bounded QA contracts.</p></section>
    <nav>{TABS.map(item=><button key={item} className={tab===item?"active":""} onClick={()=>setTab(item)}>{item}</button>)}</nav>
    <section className="panel">{tab===TABS[0]?<RouteBoss/>:tab===TABS[1]?<LockLoop/>:tab===TABS[2]?<SaveEconomy/>:tab===TABS[3]?<FuzzLab/>:tab===TABS[4]?<SimulationLab/>:<DifficultyRepair/>}</section>
    <section className="truth"><b>Production evidence boundary</b><span>This lab may propose bounded repairs from deterministic evidence, but production auto-patching is disabled. Real devices, live networking, production telemetry and human design review remain required before release decisions.</span></section>
    <style jsx>{`.shell{min-height:100vh;background:#020706;color:#effaf5;font-family:Inter,system-ui;padding-bottom:72px}.bg{position:fixed;inset:0;background:radial-gradient(circle at 82% 8%,#dfc16624,transparent 31%),linear-gradient(180deg,#020706e9,#020706fb),url('/soolen-ai-landscape.jpg') center/cover;z-index:0}header,.hero,nav,.panel,.truth{position:relative;z-index:1;width:min(1120px,calc(100% - 28px));margin:auto}header{display:flex;justify-content:space-between;padding:24px 0;font-size:10px;letter-spacing:.13em;font-weight:900}header a{color:#fff;text-decoration:none}header span,.hero small{color:#dfc166}.hero{padding:54px 0 24px}.hero h1{font-size:clamp(48px,8vw,88px);line-height:.94;letter-spacing:-.05em;margin:10px 0}.hero em{font-style:normal;color:#dfc166}.hero p{max-width:900px;color:#a8bbb2;line-height:1.7}nav{display:flex;gap:7px;flex-wrap:wrap;margin-bottom:12px}nav button{border:1px solid #ffffff14;background:#071a13;color:#a9bbb2;padding:9px 12px;border-radius:999px;font-weight:850;font-size:10px}nav button.active{background:#dfc166;color:#06110d}.panel,.truth{border:1px solid #ffffff12;background:#061914e9;border-radius:24px;padding:22px;backdrop-filter:blur(16px)}.truth{margin-top:12px;display:grid;gap:5px}.truth b{color:#dfc166}.truth span{color:#91a49b;font-size:11px;line-height:1.55}:global(.grid){display:grid;grid-template-columns:1fr 1fr;gap:12px}:global(.card){background:#0a2119;border:1px solid #ffffff10;border-radius:18px;padding:16px}:global(.card h2){font-size:21px;margin:0 0 7px}:global(.card p),:global(label){font-size:11px;color:#9fb2a9;line-height:1.55}:global(.metric){font-size:30px;color:#dfc166;font-weight:950}:global(.row){display:flex;gap:8px;flex-wrap:wrap;margin-top:10px}:global(.action),:global(.secondary){border-radius:12px;padding:10px 12px;font-weight:900}:global(.action){border:0;background:#dfc166;color:#06110d}:global(.secondary){border:1px solid #ffffff14;background:#0b251c;color:#dce9e3}:global(.field){width:100%;box-sizing:border-box;background:#020b08;color:#fff;border:1px solid #ffffff14;border-radius:12px;padding:10px;margin-top:7px}:global(.mono){font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:10px;white-space:pre-wrap;background:#020b08;color:#a9bbb2;border-radius:12px;padding:10px;max-height:360px;overflow:auto}@media(max-width:720px){:global(.grid){grid-template-columns:1fr}.hero{padding-top:38px}}`}</style>
  </main>;
}

function RouteBoss(){
  const routes=generateTestRoutes({nodes:["start","town","cave","key","boss","ending_a","ending_b"],edges:[{from:"start",to:"town"},{from:"town",to:"cave"},{from:"cave",to:"key"},{from:"key",to:"boss"},{from:"boss",to:"ending_a"},{from:"town",to:"ending_b"}],start:"start",goals:["ending_a","ending_b"]});
  const boss=evaluateBossStrategies({boss:{hp:1000,phases:[.7,.35]},strategies:[{id:"burst",damage:95,cost:14},{id:"safe",damage:55,cost:6},{id:"greedy",damage:125,cost:24}],simulate:(s,strategy)=>{const damage=strategy.damage*(s.resource>=strategy.cost?1:.45);return{...s,bossHp:s.bossHp-damage,resource:Math.max(0,s.resource-strategy.cost+7),playerHp:s.playerHp-(s.phase*4+(strategy.id==="greedy"?3:0))};}});
  return <div className="grid"><div className="card"><h2>Generated Test Routes</h2><div className="metric">{routes.nodeCoverage}%</div><p>Multiple endings must be reachable; missing goals are explicit evidence.</p><div className="mono">{JSON.stringify(routes,null,2)}</div></div><div className="card"><h2>Boss Strategy Matrix</h2><div className="metric">{Math.round(boss.winRate*100)}% win</div><div className="mono">{JSON.stringify(boss,null,2)}</div></div></div>;
}

function LockLoop(){
  const soft=detectSoftLocks({states:["spawn","hall","dead_end","exit","recover"],transitions:[{from:"spawn",to:"hall"},{from:"hall",to:"exit"},{from:"hall",to:"dead_end"}],terminalStates:["exit"],recoveryStates:["recover"]});
  const loop=detectInfiniteLoops({initialState:{room:"a",progress:0},actions:["next"],applyAction:s=>({room:s.room==="a"?"b":"a",progress:s.progress}),progress:s=>s.progress,maxSteps:20});
  return <div className="grid"><div className="card"><h2>Soft-lock Search</h2><div className="metric">{soft.softLocks.length}</div><div className="mono">{JSON.stringify(soft,null,2)}</div></div><div className="card"><h2>Infinite Loop Detection</h2><div className="metric">{loop.loop?"LOOP FOUND":"CLEAR"}</div><div className="mono">{JSON.stringify(loop,null,2)}</div></div></div>;
}

function SaveEconomy(){
  const save=recoverSaveSnapshot({schemaVersion:1,data:{coins:12,level:3},checksum:"broken"},{schemaVersion:2,defaults:{coins:0,level:1,inventory:[]},migrate:(data,from)=>from===1?{...data,inventory:[]}:data});
  const economy=stressEconomy({baseState:{goods:[{id:"ore",price:12,floor:4,ceiling:40,supply:100,demand:100}]},step:(state,input)=>({goods:state.goods.map(g=>{const supply=Math.max(1,g.supply*(input.supplyMultiplier||1)),demand=g.demand*(input.demandMultiplier||1),price=Math.max(g.floor,Math.min(g.ceiling,g.price*(demand/supply)));return{...g,supply,demand,price};})}),maxTicks:24});
  return <div className="grid"><div className="card"><h2>Save Corruption Recovery</h2><div className="metric">{save.recoveredFromCorruption?"RECOVERED":"VALID"}</div><div className="mono">{JSON.stringify(save,null,2)}</div></div><div className="card"><h2>Economy Abuse Matrix</h2><div className="metric">{economy.passed?"PASS":"RISK"}</div><div className="mono">{JSON.stringify({passed:economy.passed,risks:economy.exploitRisks},null,2)}</div></div></div>;
}

function FuzzLab(){
  const[seed,setSeed]=useState("iphone-chaos-01");const fuzz=useMemo(()=>runInputFuzz({seed,actions:["left","right","jump","attack","pause","resume"],steps:1500,initialState:{x:0,hp:10,paused:false},applyAction:(s,a)=>a==="left"?{...s,x:s.x-1}:a==="right"?{...s,x:s.x+1}:a==="attack"?{...s,hp:Math.max(0,s.hp-0)}:a==="pause"?{...s,paused:true}:a==="resume"?{...s,paused:false}:s,invariant:s=>Number.isFinite(s.x)&&s.hp>=0?true:"invalid_state"}),[seed]);
  return <div className="grid"><div className="card"><h2>Seeded Random Input Fuzz</h2><label>Seed<input className="field" value={seed} onChange={e=>setSeed(e.target.value)}/></label><div className="metric">{fuzz.stepsExecuted} steps</div><p>Same seed reproduces the same action sequence and state fingerprints.</p><div className="mono">{JSON.stringify(fuzz,null,2)}</div></div><div className="card"><h2>Fuzz Evidence</h2><div className="metric">{fuzz.uniqueStates} states</div><div className="mono">{JSON.stringify(fuzz.actionCounts,null,2)}</div></div></div>;
}

function SimulationLab(){
  const[runs,setRuns]=useState(1000);const result=useMemo(()=>runLongSimulation({seed:"balance",runs,simulateRun:({rng})=>{const power=.8+rng()*.45,difficulty=.72+rng()*.55,win=power>=difficulty;return{win,duration:180+rng()*240+(win?0:80),score:win?700+rng()*500:250+rng()*300,failureReason:win?"none":difficulty>1.1?"boss":"attrition",economy:80+rng()*90};}}),[runs]);
  return <div className="grid"><div className="card"><h2>Long-run Simulation</h2><div className="row"><button className="action" onClick={()=>setRuns(1000)}>1,000 runs</button><button className="secondary" onClick={()=>setRuns(10000)}>10,000 runs</button></div><div className="metric">{Math.round(result.winRate*100)}%</div><p>Synthetic simulation is explicitly separated from production telemetry.</p><div className="mono">{JSON.stringify(result,null,2)}</div></div><div className="card"><h2>Distribution Evidence</h2><div className="mono">{JSON.stringify({p50:result.p50Duration,p95:result.p95Duration,failureReasons:result.failureReasons,economy:result.economy},null,2)}</div></div></div>;
}

function DifficultyRepair(){
  const audit=runAutonomousDirectorAudit({routeGraph:{nodes:["start","a","boss","ending"],edges:[{from:"start",to:"a"},{from:"a",to:"boss"}],start:"start",goals:["ending"]},stateGraph:{states:["start","a","trap","ending"],transitions:[{from:"start",to:"a"},{from:"a",to:"trap"}],terminalStates:["ending"],recoveryStates:[]},difficulty:[{id:"1",difficulty:20,completionRate:.9,attempts:200},{id:"2",difficulty:28,completionRate:.84,attempts:190},{id:"3",difficulty:72,completionRate:.38,attempts:180}]});
  const curve=analyzeDifficultyCurve([{id:"intro",difficulty:18,completionRate:.93,attempts:300},{id:"forest",difficulty:28,completionRate:.86,attempts:250},{id:"boss",difficulty:68,completionRate:.41,attempts:220},{id:"after",difficulty:45,completionRate:.7,attempts:180}]);
  return <div className="grid"><div className="card"><h2>Difficulty Curve</h2><div className="metric">{curve.issues.length} signals</div><div className="mono">{JSON.stringify(curve,null,2)}</div></div><div className="card"><h2>Review-gated Repair Suggestions</h2><div className="metric">{audit.repairs.length}</div><p>Suggestions never auto-apply to production code.</p><div className="mono">{JSON.stringify(audit,null,2)}</div></div></div>;
}
