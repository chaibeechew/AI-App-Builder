"use client";

import {useMemo,useState} from "react";
import Link from "next/link";
import {
  createBlendTree,evaluateBlendTree,solveTwoBoneIk,createReactionState,applyHitReaction,stepReaction,
  buildNavMesh,findNavMeshPath,planTacticalGroup,validateSkillDocument,validateVfxDocument,
  createMaterialLightingProfile,generateTerrain,classifyBiomes,createSettlement,stepSettlement,
  validateNarrativeVisualDocument,createGameProfiler,recordProfileSample,recordDebugEvent,profileSummary
} from "../../lib/game/aaa-mobile-production-systems-v1.js";

const TABS=["Animation + IK","NavMesh + AI","Skill + VFX","Terrain + Biome","Settlement + Narrative","Debugger + Profiler"];

export default function GameEngineLab(){
  const[tab,setTab]=useState(TABS[0]);
  return <main className="shell"><div className="bg"/><header><Link href="/game-builder">← GAME BUILDER</Link><span>SOOLENAI · AAA MOBILE GAME LAB</span></header>
    <section className="hero"><small>PRO · EVIDENCE-GATED ENGINEERING</small><h1>Author deeper games.<br/><em>Measure the result.</em></h1><p>Animation, IK, navigation, tactical AI, skills, VFX, terrain, biomes, settlements, narrative graphs and performance evidence are exercised here as deterministic mobile-first contracts. This lab does not pretend a final renderer or real-device performance test has already passed.</p></section>
    <nav>{TABS.map(item=><button key={item} className={tab===item?"active":""} onClick={()=>setTab(item)}>{item}</button>)}</nav>
    <section className="panel">{tab===TABS[0]?<AnimationLab/>:tab===TABS[1]?<NavigationLab/>:tab===TABS[2]?<SkillLab/>:tab===TABS[3]?<TerrainLab/>:tab===TABS[4]?<SettlementLab/>:<ProfilerLab/>}</section>
    <section className="truth"><b>Production evidence boundary</b><span>Final animation fidelity, renderer output, device thermals, GPU/CPU frame time, memory pressure, native input behavior and large-world content density still require measured iOS/Android evidence before Production 100 can be claimed.</span></section>
    <style jsx>{`.shell{min-height:100vh;background:#020706;color:#effaf5;font-family:Inter,system-ui;padding-bottom:72px}.bg{position:fixed;inset:0;background:radial-gradient(circle at 80% 7%,#ddb95f20,transparent 30%),linear-gradient(180deg,#020706e7,#020706fb),url('/soolen-ai-landscape.jpg') center/cover;z-index:0}header,.hero,nav,.panel,.truth{position:relative;z-index:1;width:min(1120px,calc(100% - 28px));margin:auto}header{display:flex;justify-content:space-between;padding:24px 0;font-size:10px;letter-spacing:.13em;font-weight:900}header a{color:#fff;text-decoration:none}header span,.hero small{color:#dfc166}.hero{padding:54px 0 24px}.hero h1{font-size:clamp(48px,8vw,88px);line-height:.94;letter-spacing:-.05em;margin:10px 0}.hero em{font-style:normal;color:#dfc166}.hero p{max-width:900px;color:#a8bbb2;line-height:1.7}nav{display:flex;gap:7px;flex-wrap:wrap;margin-bottom:12px}nav button{border:1px solid #ffffff14;background:#071a13;color:#a9bbb2;padding:9px 12px;border-radius:999px;font-weight:850;font-size:10px}nav button.active{background:#dfc166;color:#06110d}.panel,.truth{border:1px solid #ffffff12;background:#061914e9;border-radius:24px;padding:22px;backdrop-filter:blur(16px)}.truth{margin-top:12px;display:grid;gap:5px}.truth b{color:#dfc166}.truth span{color:#91a49b;font-size:11px;line-height:1.55}:global(.grid){display:grid;grid-template-columns:1fr 1fr;gap:12px}:global(.card){background:#0a2119;border:1px solid #ffffff10;border-radius:18px;padding:16px}:global(.card h2){font-size:21px;margin:0 0 7px}:global(.card p),:global(.card li),:global(label){font-size:11px;color:#9fb2a9;line-height:1.55}:global(.metric){font-size:30px;color:#dfc166;font-weight:950}:global(.row){display:flex;gap:8px;flex-wrap:wrap;margin-top:10px}:global(.action),:global(.secondary){border-radius:12px;padding:10px 12px;font-weight:900}:global(.action){border:0;background:#dfc166;color:#06110d}:global(.secondary){border:1px solid #ffffff14;background:#0b251c;color:#dce9e3}:global(.field){width:100%;box-sizing:border-box;background:#020b08;color:#fff;border:1px solid #ffffff14;border-radius:12px;padding:10px;margin-top:7px}:global(.mono){font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:10px;white-space:pre-wrap;background:#020b08;color:#a9bbb2;border-radius:12px;padding:10px;max-height:300px;overflow:auto}@media(max-width:720px){:global(.grid){grid-template-columns:1fr}.hero{padding-top:38px}}`}</style>
  </main>;
}

function AnimationLab(){
  const[speed,setSpeed]=useState(3.5),[direction,setDirection]=useState(0),[reaction,setReaction]=useState(()=>createReactionState());
  const tree=useMemo(()=>createBlendTree({clips:[{id:"idle",speed:0,direction:0},{id:"walk",speed:2,direction:0},{id:"run",speed:6,direction:0},{id:"strafe_l",speed:3,direction:-90},{id:"strafe_r",speed:3,direction:90}]}),[]);
  const blend=evaluateBlendTree(tree,{speed,direction,grounded:true});
  const ik=solveTwoBoneIk({root:{x:0,y:0},target:{x:1.5+speed*.08,y:.8},upper:1,lower:1,bend:1});
  function hit(force){setReaction(r=>stepReaction(applyHitReaction(r,{force,critical:force>60}),.05));}
  return <div className="grid"><div className="card"><h2>Animation Blend Tree</h2><label>Speed<input className="field" type="range" min="0" max="8" step=".1" value={speed} onChange={e=>setSpeed(Number(e.target.value))}/></label><label>Direction<input className="field" type="range" min="-180" max="180" value={direction} onChange={e=>setDirection(Number(e.target.value))}/></label><div className="metric">{blend.primary}</div><div className="mono">{JSON.stringify(blend,null,2)}</div></div><div className="card"><h2>IK + Hit Reaction / Ragdoll</h2><p>Impossible IK targets are clamped. Heavy hits may enter ragdoll presentation while gameplay authority stays separate.</p><div className="row"><button className="action" onClick={()=>hit(25)}>Normal Hit</button><button className="secondary" onClick={()=>hit(82)}>Heavy Hit</button></div><div className="mono">{JSON.stringify({ik,reaction},null,2)}</div></div></div>;
}

function NavigationLab(){
  const mesh=useMemo(()=>buildNavMesh({width:12,height:10,blocked:[[4,1],[4,2],[4,3],[4,4],[4,5],[7,4],[7,5],[7,6]]}),[]);
  const path=findNavMeshPath(mesh,{x:1,y:1},{x:10,y:8});
  const squad=planTacticalGroup(Array.from({length:8},(_,i)=>({id:`agent${i}`,x:i%4,z:Math.floor(i/4)})),{x:12,z:8});
  return <div className="grid"><div className="card"><h2>NavMesh Connectivity</h2><div className="metric">{path.length} nodes</div><p>Routes fail closed if start/goal is not walkable or connectivity cannot be proven.</p><div className="mono">{JSON.stringify(path,null,2)}</div></div><div className="card"><h2>Tactical Group AI</h2><p>Bounded engage/flank/support roles with local slots and controlled replanning frequency for mobile CPU budgets.</p><div className="mono">{JSON.stringify(squad,null,2)}</div></div></div>;
}

function SkillLab(){
  const[particles,setParticles]=useState(96),[cooldown,setCooldown]=useState(8);
  const skill=validateSkillDocument({id:"storm_arc",targeting:"cone",cooldown,cost:30,effects:[{type:"damage"},{type:"debuff"}],upgrades:["storm_arc_2"]});
  const vfx=validateVfxDocument({particles,dynamicLights:3,decals:4,duration:1.4,overdrawLayers:3});
  const material=createMaterialLightingProfile({tier:"mobile_high",dynamicLights:3,shadowCasters:2,textureSize:2048});
  return <div className="grid"><div className="card"><h2>Skill Editor Contract</h2><label>Cooldown<input className="field" type="number" min="0" max="120" value={cooldown} onChange={e=>setCooldown(Number(e.target.value))}/></label><div className="mono">{JSON.stringify(skill,null,2)}</div></div><div className="card"><h2>VFX + Material/Lighting Budget</h2><label>Requested particles<input className="field" type="number" value={particles} onChange={e=>setParticles(Number(e.target.value))}/></label><div className="mono">{JSON.stringify({vfx,material},null,2)}</div></div></div>;
}

function TerrainLab(){
  const[seed,setSeed]=useState("soolen-valley");const terrain=useMemo(()=>generateTerrain({seed,size:14,amplitude:22}),[seed]);const biomes=classifyBiomes(terrain,{seaLevel:-1,snowLine:5});
  const counts=biomes.flat().reduce((a,b)=>(a[b]=(a[b]||0)+1,a),{});
  return <div className="grid"><div className="card"><h2>Terrain Editor Foundation</h2><label>Seed<input className="field" value={seed} onChange={e=>setSeed(e.target.value)}/></label><p>Same seed produces the same terrain checksum for reproducible streaming, save recovery and bug reports.</p><div className="metric">{terrain.checksum}</div></div><div className="card"><h2>Biome Generator</h2><div className="mono">{JSON.stringify({counts,preview:biomes.slice(0,6)},null,2)}</div></div></div>;
}

function SettlementLab(){
  const[state,setState]=useState(()=>createSettlement({population:26}));
  const narrative=validateNarrativeVisualDocument({nodes:[{id:"q1",type:"quest",x:0,y:0,next:["d1"]},{id:"d1",type:"dialogue",x:180,y:0,next:["c1"]},{id:"c1",type:"choice",x:360,y:0,next:["end"]},{id:"end",type:"end",x:540,y:0,next:[]} ]});
  return <div className="grid"><div className="card"><h2>Settlement / Building System</h2><div className="metric">Lv {state.level}</div><div className="row"><button className="action" onClick={()=>setState(s=>stepSettlement(s,{hours:4}))}>Simulate 4h</button><button className="secondary" onClick={()=>setState(s=>stepSettlement(s,{hours:1,buildHousing:true}))}>Build Housing</button><button className="secondary" onClick={()=>setState(s=>stepSettlement(s,{hours:1,upgrade:true}))}>Upgrade</button></div><div className="mono">{JSON.stringify(state,null,2)}</div></div><div className="card"><h2>Quest / Dialogue Visual Editor Contract</h2><p>Visual nodes may contain conditions and links, but never arbitrary executable scripts.</p><div className="mono">{JSON.stringify(narrative,null,2)}</div></div></div>;
}

function ProfilerLab(){
  const[profiler,setProfiler]=useState(()=>createGameProfiler({targetFps:60}));
  function sample(good){const next={...profiler,samples:[...profiler.samples],events:[...profiler.events]};recordProfileSample(next,good?{frameMs:14,cpuMs:7,gpuMs:10,memoryMb:620,drawCalls:1100,entities:340}:{frameMs:31,cpuMs:22,gpuMs:25,memoryMb:1250,drawCalls:2600,entities:1100});recordDebugEvent(next,{type:good?"frame_ok":"budget_warning",message:good?"Within mobile frame budget":"Frame/memory/draw-call budget exceeded",at:next.samples.length});setProfiler(next);}
  const summary=profileSummary(profiler);
  return <div className="grid"><div className="card"><h2>Game Debugger / Profiler</h2><div className="metric">{summary.score}/100</div><div className="row"><button className="action" onClick={()=>sample(true)}>Record Good Frame</button><button className="secondary" onClick={()=>sample(false)}>Record Heavy Frame</button></div><p>The profiler reports violations; it never converts local synthetic samples into real-device certification.</p><div className="mono">{JSON.stringify(summary,null,2)}</div></div><div className="card"><h2>Bounded Debug Event Log</h2><div className="mono">{JSON.stringify(profiler.events.slice(-12),null,2)}</div></div></div>;
}
