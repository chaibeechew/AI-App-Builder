"use client";

import {useMemo,useState} from "react";
import Link from "next/link";
import {
  bisectRegression,runMutationTesting,findCoverageGaps,analyzeObjectLifetimes,diagnoseNetworkDesync,
  detectReplayDivergence,bisectPerformanceRegression,generateCandidateCodePatch,runAutonomousDevelopmentV4Audit
} from "../../lib/game/autonomous-game-development-agent-v4.js";

const TABS=["Bisect + Mutation","Coverage + Memory","Network + Replay","Performance Bisect","Candidate Patch","Full V4 Audit"];

export default function GameAutonomyV4Lab(){
  const[tab,setTab]=useState(TABS[0]);
  return <main className="shell"><div className="bg"/><header><Link href="/game-builder">← GAME BUILDER</Link><span>SOOLENAI · AUTONOMOUS DEVELOPMENT V4</span></header>
    <section className="hero"><small>PRO · DIAGNOSTIC INTELLIGENCE V4</small><h1>Find where it broke.<br/><em>Prove why before patching.</em></h1><p>Cross-version bisect, mutation testing, coverage gaps, object lifetime analysis, network desync, replay divergence, performance regression isolation and review-gated candidate patches are exercised here as deterministic contracts.</p></section>
    <nav>{TABS.map(item=><button key={item} className={tab===item?"active":""} onClick={()=>setTab(item)}>{item}</button>)}</nav>
    <section className="panel">{tab===TABS[0]?<BisectMutation/>:tab===TABS[1]?<CoverageMemory/>:tab===TABS[2]?<NetworkReplay/>:tab===TABS[3]?<Performance/>:tab===TABS[4]?<CandidatePatch/>:<FullAudit/>}</section>
    <section className="truth"><b>Production evidence boundary</b><span>V4 isolates regressions and proposes candidate patches, but production auto-patching and release authority remain disabled. Synthetic heap/device/performance samples do not replace measured iOS/Android or live-network evidence.</span></section>
    <style jsx>{`.shell{min-height:100vh;background:#020706;color:#effaf5;font-family:Inter,system-ui;padding-bottom:72px}.bg{position:fixed;inset:0;background:radial-gradient(circle at 82% 8%,#f0cf6624,transparent 31%),linear-gradient(180deg,#020706e9,#020706fb),url('/soolen-ai-landscape.jpg') center/cover;z-index:0}header,.hero,nav,.panel,.truth{position:relative;z-index:1;width:min(1120px,calc(100% - 28px));margin:auto}header{display:flex;justify-content:space-between;padding:24px 0;font-size:10px;letter-spacing:.13em;font-weight:900}header a{color:#fff;text-decoration:none}header span,.hero small{color:#f0cf66}.hero{padding:54px 0 24px}.hero h1{font-size:clamp(48px,8vw,88px);line-height:.94;letter-spacing:-.05em;margin:10px 0}.hero em{font-style:normal;color:#f0cf66}.hero p{max-width:900px;color:#a8bbb2;line-height:1.7}nav{display:flex;gap:7px;flex-wrap:wrap;margin-bottom:12px}nav button{border:1px solid #ffffff14;background:#071a13;color:#a9bbb2;padding:9px 12px;border-radius:999px;font-weight:850;font-size:10px}nav button.active{background:#f0cf66;color:#06110d}.panel,.truth{border:1px solid #ffffff12;background:#061914e9;border-radius:24px;padding:22px;backdrop-filter:blur(16px)}.truth{margin-top:12px;display:grid;gap:5px}.truth b{color:#f0cf66}.truth span{color:#91a49b;font-size:11px;line-height:1.55}:global(.grid){display:grid;grid-template-columns:1fr 1fr;gap:12px}:global(.card){background:#0a2119;border:1px solid #ffffff10;border-radius:18px;padding:16px}:global(.card h2){font-size:21px;margin:0 0 7px}:global(.card p),:global(label){font-size:11px;color:#9fb2a9;line-height:1.55}:global(.metric){font-size:30px;color:#f0cf66;font-weight:950}:global(.row){display:flex;gap:8px;flex-wrap:wrap;margin-top:10px}:global(.action),:global(.secondary){border-radius:12px;padding:10px 12px;font-weight:900}:global(.action){border:0;background:#f0cf66;color:#06110d}:global(.secondary){border:1px solid #ffffff14;background:#0b251c;color:#dce9e3}:global(.field){width:100%;box-sizing:border-box;background:#020b08;color:#fff;border:1px solid #ffffff14;border-radius:12px;padding:10px;margin-top:7px}:global(.mono){font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:10px;white-space:pre-wrap;background:#020b08;color:#a9bbb2;border-radius:12px;padding:10px;max-height:360px;overflow:auto}@media(max-width:720px){:global(.grid){grid-template-columns:1fr}.hero{padding-top:38px}}`}</style>
  </main>;
}

function BisectMutation(){
  const versions=["v1","v2","v3","v4","v5","v6","v7"];const bisect=bisectRegression({versions,probe:v=>Number(v.slice(1))<5});
  const mutation=runMutationTesting({mutants:[{id:"damage_zero",area:"combat",operator:"replace_damage_zero"},{id:"cooldown_skip",area:"combat",operator:"remove_cooldown"},{id:"save_checksum_off",area:"save",operator:"disable_checksum"}],runTests:m=>({killed:m.id!=="cooldown_skip",tests:m.id==="save_checksum_off"?["save_integrity"]:["combat_core"]})});
  return <div className="grid"><div className="card"><h2>Cross-version Regression Bisect</h2><div className="metric">{bisect.firstBad}</div><p>Oldest → newest versions are probed until the first known bad boundary is isolated.</p><div className="mono">{JSON.stringify(bisect,null,2)}</div></div><div className="card"><h2>Mutation Testing</h2><div className="metric">{mutation.mutationScore}%</div><p>Surviving mutants expose weak tests instead of inflating coverage with line counts.</p><div className="mono">{JSON.stringify(mutation,null,2)}</div></div></div>;
}

function CoverageMemory(){
  const coverage=findCoverageGaps({requirements:[{id:"player_death",risk:"high"},{id:"save_restore",risk:"critical"},{id:"pause_resume",risk:"medium"},{id:"boss_phase_2",risk:"high"}],tests:[{id:"death_test",covers:["player_death"]},{id:"save_test",covers:["save_restore"]},{id:"pause_test",covers:["pause_resume"]}]});
  const memory=analyzeObjectLifetimes([{tick:0,objects:{Projectile:{count:4,bytes:1200},Enemy:{count:12,bytes:18000}}},{tick:60,objects:{Projectile:{count:18,bytes:5200},Enemy:{count:12,bytes:18000}}},{tick:120,objects:{Projectile:{count:36,bytes:10400},Enemy:{count:12,bytes:18000}}},{tick:180,objects:{Projectile:{count:58,bytes:16800},Enemy:{count:12,bytes:18000}}}]);
  return <div className="grid"><div className="card"><h2>Coverage Gap Finder</h2><div className="metric">{coverage.coveragePercent}%</div><div className="mono">{JSON.stringify(coverage,null,2)}</div></div><div className="card"><h2>Object Lifetime / Leak Signals</h2><div className="metric">{memory.suspects.length}</div><p>Synthetic monotonic growth is flagged as a suspect, not claimed as a proven native leak.</p><div className="mono">{JSON.stringify(memory,null,2)}</div></div></div>;
}

function NetworkReplay(){
  const auth=[{tick:1,state:{x:1,hp:100,ammo:10},inputSeq:1},{tick:2,state:{x:2,hp:100,ammo:10},inputSeq:2},{tick:3,state:{x:3,hp:94,ammo:9},inputSeq:3}];
  const peer=[{tick:1,state:{x:1,hp:100,ammo:10},inputSeq:1},{tick:2,state:{x:2,hp:100,ammo:10},inputSeq:2},{tick:3,state:{x:3,hp:100,ammo:9},inputSeq:3}];
  const desync=diagnoseNetworkDesync({authoritativeFrames:auth,peerFrames:peer});
  const replay=detectReplayDivergence({baselineFrames:[{tick:1,state:{x:1},input:"right",rng:4},{tick:2,state:{x:2},input:"right",rng:7},{tick:3,state:{x:3},input:"right",rng:9}],replayFrames:[{tick:1,state:{x:1},input:"right",rng:4},{tick:2,state:{x:2},input:"right",rng:7},{tick:3,state:{x:2.8},input:"right",rng:9}]});
  return <div className="grid"><div className="card"><h2>Network Desync Root-cause Evidence</h2><div className="metric">TICK {desync.firstDivergence?.tick??"—"}</div><div className="mono">{JSON.stringify(desync,null,2)}</div></div><div className="card"><h2>Replay Divergence</h2><div className="metric">{replay.diverged?`TICK ${replay.tick}`:"MATCH"}</div><div className="mono">{JSON.stringify(replay,null,2)}</div></div></div>;
}

function Performance(){
  const[budget,setBudget]=useState(16.7);const versions=[{id:"p1",frameMs:13.2},{id:"p2",frameMs:14.1},{id:"p3",frameMs:15.4},{id:"p4",frameMs:18.3},{id:"p5",frameMs:20.1}];const result=useMemo(()=>bisectPerformanceRegression({versions,metric:v=>v.frameMs,budget,direction:"higher_is_worse"}),[budget]);
  return <div className="grid"><div className="card"><h2>Performance Regression Bisect</h2><label>Frame budget (ms)<input className="field" type="number" step="0.1" value={budget} onChange={e=>setBudget(Number(e.target.value)||16.7)}/></label><div className="metric">{result.firstBad||"NONE"}</div><div className="mono">{JSON.stringify(result,null,2)}</div></div><div className="card"><h2>Truth Boundary</h2><p>This is synthetic frame-time evidence. It cannot claim real-device iPhone/Android GPU, memory, battery or thermal performance.</p><div className="mono">{JSON.stringify({syntheticEvidence:result.syntheticEvidence,realDevicePerformanceEvidence:result.realDevicePerformanceEvidence},null,2)}</div></div></div>;
}

function CandidatePatch(){
  const patch=generateCandidateCodePatch({issue:{id:"desync_hp",type:"network_desync",area:"multiplayer",severity:"high"},rootCause:{id:"damage_apply_order",area:"multiplayer",status:"isolated"},evidence:{firstDivergenceTick:311,field:"hp",regression:"net_damage_order"},files:["lib/game/multiplayer-authority-v1.js","app/a/[id]/GameRuntimeClient.js"]});
  return <div className="grid"><div className="card"><h2>Candidate Code Patch</h2><div className="metric">REVIEW ONLY</div><p>The agent produces structured patch intent, never an automatically applied Git diff.</p><div className="mono">{JSON.stringify(patch,null,2)}</div></div><div className="card"><h2>Write Authority</h2><div className="metric">OFF</div><div className="mono">{JSON.stringify({autoApply:patch.autoApply,productionWrite:patch.productionWrite,requiresReview:patch.requiresReview,diffPreview:patch.diffPreview},null,2)}</div></div></div>;
}

function FullAudit(){
  const audit=runAutonomousDevelopmentV4Audit({versions:[{id:"a",frame:14,good:true},{id:"b",frame:15,good:true},{id:"c",frame:19,good:false}],versionProbe:v=>v.good,mutants:[{id:"m1",area:"combat"}],runMutantTests:()=>({killed:true,tests:["combat"]}),requirements:[{id:"combat",risk:"high"}],tests:[{id:"combat_test",covers:["combat"]}],lifetimes:[{tick:0,objects:{Enemy:{count:10,bytes:1000}}},{tick:1,objects:{Enemy:{count:10,bytes:1000}}},{tick:2,objects:{Enemy:{count:10,bytes:1000}}}],authoritativeFrames:[{tick:1,state:{x:1}}],peerFrames:[{tick:1,state:{x:1}}],baselineReplay:[{tick:1,state:{x:1}}],replay:[{tick:1,state:{x:1}}],performanceMetric:v=>v.frame,performanceBudget:16.7});
  return <div className="grid"><div className="card"><h2>Autonomous V4 Audit</h2><div className="metric">{audit.passed?"PASS":"BLOCKED"}</div><p>Every blocker stays explicit and production auto-patching remains disabled.</p><div className="mono">{JSON.stringify(audit,null,2)}</div></div><div className="card"><h2>Release Authority</h2><div className="metric">HUMAN</div><div className="mono">{JSON.stringify({productionAutoPatch:audit.productionAutoPatch,productionReleaseAuthority:audit.productionReleaseAuthority},null,2)}</div></div></div>;
}
