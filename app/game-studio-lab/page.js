"use client";

import {useMemo,useState} from "react";
import Link from "next/link";
import {
  validateCinematicTimeline,createCharacterPreset,validateEquipmentLoadout,validateCombatSkillGraph,
  generateProceduralCity,sampleWaterSurface,validateVehicleAircraftConfig,createNpcDirector,stepNpcDirector,
  createDynamicEconomy,stepDynamicEconomy,validateSeasonPlan,analyzeBalanceMetrics,runAutonomousGameQaCycle
} from "../../lib/game/game-studio-intelligence-v1.js";

const TABS=["Cinematic + Character","Equipment + Skill Graph","City + Ocean","Vehicle + NPC Director","Economy + Season","Balance + Autonomous QA"];

export default function GameStudioLab(){
  const[tab,setTab]=useState(TABS[0]);
  return <main className="shell"><div className="bg"/><header><Link href="/game-builder">← GAME BUILDER</Link><span>SOOLENAI · GAME STUDIO INTELLIGENCE LAB</span></header>
    <section className="hero"><small>PRO · STUDIO INTELLIGENCE V1</small><h1>Author the world.<br/><em>Let AI test the game.</em></h1><p>Cinematics, characters, equipment, skill graphs, procedural cities, oceans, vehicles, NPC direction, dynamic economies, seasons, balance analytics and autonomous QA are exercised here as deterministic game-production contracts.</p></section>
    <nav>{TABS.map(item=><button key={item} className={tab===item?"active":""} onClick={()=>setTab(item)}>{item}</button>)}</nav>
    <section className="panel">{tab===TABS[0]?<CinematicCharacterLab/>:tab===TABS[1]?<EquipmentSkillLab/>:tab===TABS[2]?<CityOceanLab/>:tab===TABS[3]?<VehicleNpcLab/>:tab===TABS[4]?<EconomySeasonLab/>:<BalanceQaLab/>}</section>
    <section className="truth"><b>Production evidence boundary</b><span>Internal Studio Intelligence proves bounded authoring, simulation, analytics and QA orchestration. Final cinematic rendering, live event activation, production economy telemetry, real-world balance, public backend behavior and measured iOS/Android device QA still require external production evidence.</span></section>
    <style jsx>{`.shell{min-height:100vh;background:#020706;color:#effaf5;font-family:Inter,system-ui;padding-bottom:72px}.bg{position:fixed;inset:0;background:radial-gradient(circle at 80% 8%,#dfc16624,transparent 31%),linear-gradient(180deg,#020706e9,#020706fb),url('/soolen-ai-landscape.jpg') center/cover;z-index:0}header,.hero,nav,.panel,.truth{position:relative;z-index:1;width:min(1120px,calc(100% - 28px));margin:auto}header{display:flex;justify-content:space-between;padding:24px 0;font-size:10px;letter-spacing:.13em;font-weight:900}header a{color:#fff;text-decoration:none}header span,.hero small{color:#dfc166}.hero{padding:54px 0 24px}.hero h1{font-size:clamp(48px,8vw,88px);line-height:.94;letter-spacing:-.05em;margin:10px 0}.hero em{font-style:normal;color:#dfc166}.hero p{max-width:900px;color:#a8bbb2;line-height:1.7}nav{display:flex;gap:7px;flex-wrap:wrap;margin-bottom:12px}nav button{border:1px solid #ffffff14;background:#071a13;color:#a9bbb2;padding:9px 12px;border-radius:999px;font-weight:850;font-size:10px}nav button.active{background:#dfc166;color:#06110d}.panel,.truth{border:1px solid #ffffff12;background:#061914e9;border-radius:24px;padding:22px;backdrop-filter:blur(16px)}.truth{margin-top:12px;display:grid;gap:5px}.truth b{color:#dfc166}.truth span{color:#91a49b;font-size:11px;line-height:1.55}:global(.grid){display:grid;grid-template-columns:1fr 1fr;gap:12px}:global(.card){background:#0a2119;border:1px solid #ffffff10;border-radius:18px;padding:16px}:global(.card h2){font-size:21px;margin:0 0 7px}:global(.card p),:global(label){font-size:11px;color:#9fb2a9;line-height:1.55}:global(.metric){font-size:30px;color:#dfc166;font-weight:950}:global(.row){display:flex;gap:8px;flex-wrap:wrap;margin-top:10px}:global(.action),:global(.secondary){border-radius:12px;padding:10px 12px;font-weight:900}:global(.action){border:0;background:#dfc166;color:#06110d}:global(.secondary){border:1px solid #ffffff14;background:#0b251c;color:#dce9e3}:global(.field){width:100%;box-sizing:border-box;background:#020b08;color:#fff;border:1px solid #ffffff14;border-radius:12px;padding:10px;margin-top:7px}:global(.mono){font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:10px;white-space:pre-wrap;background:#020b08;color:#a9bbb2;border-radius:12px;padding:10px;max-height:340px;overflow:auto}@media(max-width:720px){:global(.grid){grid-template-columns:1fr}.hero{padding-top:38px}}`}</style>
  </main>;
}

function CinematicCharacterLab(){
  const[height,setHeight]=useState(.56);
  const timeline=validateCinematicTimeline({id:"intro",tracks:[{id:"cam",type:"camera",clips:[{id:"opening",start:0,duration:4,asset:"cam_intro"},{id:"boss_reveal",start:4,duration:3,asset:"cam_boss"}]},{id:"audio",type:"audio",clips:[{id:"music",start:0,duration:7,asset:"theme_01"}]}],skipTarget:7});
  const character=createCharacterPreset({id:"hero",height,build:.62,faceShape:.45,eyes:.58,jaw:.52,hair:"long_01",outfit:"wanderer",palette:"jade",voice:"voice_2"});
  return <div className="grid"><div className="card"><h2>Cinematic / Timeline Editor</h2><div className="metric">{timeline.valid?"VALID":"BLOCKED"}</div><p>Bounded tracks, clips and skip recovery; arbitrary executable timeline code is rejected.</p><div className="mono">{JSON.stringify(timeline,null,2)}</div></div><div className="card"><h2>Character Creator</h2><label>Height preset<input className="field" type="range" min="0" max="1" step=".01" value={height} onChange={e=>setHeight(Number(e.target.value))}/></label><p>Appearance is game customization data only, never biometric identity.</p><div className="mono">{JSON.stringify(character,null,2)}</div></div></div>;
}

function EquipmentSkillLab(){
  const loadout=validateEquipmentLoadout([{id:"helm",slot:"head",weight:3,stats:{armor:12}},{id:"blade",slot:"main_hand",weight:7,stats:{attack:34,crit:5}},{id:"boots",slot:"feet",weight:2,stats:{speed:4}}]);
  const skill=validateCombatSkillGraph({nodes:[{id:"start",type:"input",next:["target"]},{id:"target",type:"target",next:["cost"]},{id:"cost",type:"cost",value:20,next:["damage"]},{id:"damage",type:"damage",value:120,next:["cooldown"]},{id:"cooldown",type:"cooldown",value:8,next:["out"]},{id:"out",type:"output",next:[]}]});
  return <div className="grid"><div className="card"><h2>Inventory / Equipment Visual Editor</h2><div className="metric">{loadout.totalWeight} kg</div><div className="mono">{JSON.stringify(loadout,null,2)}</div></div><div className="card"><h2>Combat Skill Graph</h2><div className="metric">{skill.valid?"SAFE":"FIX"}</div><p>Missing links, invalid nodes and unsafe cycles fail closed.</p><div className="mono">{JSON.stringify(skill,null,2)}</div></div></div>;
}

function CityOceanLab(){
  const[seed,setSeed]=useState("soolen-city");const city=useMemo(()=>generateProceduralCity({seed,blocks:12,blockSize:58,maxBuildingsPerBlock:7}),[seed]);const water=sampleWaterSurface({time:1.8,wind:8,waveHeight:1.4,samples:18});
  return <div className="grid"><div className="card"><h2>Procedural City / Building Generator</h2><label>Seed<input className="field" value={seed} onChange={e=>setSeed(e.target.value)}/></label><div className="metric">{city.blocks.length} blocks</div><div className="mono">{JSON.stringify({checksum:city.checksum,preview:city.blocks.slice(0,3)},null,2)}</div></div><div className="card"><h2>Water / Ocean System</h2><p>Renderer-neutral wave samples and bounded wind/wave parameters for mobile gameplay.</p><div className="mono">{JSON.stringify(water,null,2)}</div></div></div>;
}

function VehicleNpcLab(){
  const vehicle=validateVehicleAircraftConfig({id:"sky_runner",type:"aircraft",mass:8200,maxSpeed:460,acceleration:18,turnRate:95,grip:.4,liftClass:.72});const[state,setState]=useState(()=>createNpcDirector({maxActive:48,seed:"harbor"}));
  return <div className="grid"><div className="card"><h2>Vehicle / Aircraft Editor</h2><div className="metric">{vehicle.valid?"VALID":"BLOCKED"}</div><p>Values are original gameplay balance parameters, not real-world operational claims.</p><div className="mono">{JSON.stringify(vehicle,null,2)}</div></div><div className="card"><h2>AI NPC Director</h2><div className="row"><button className="action" onClick={()=>setState(s=>stepNpcDirector(s,{population:220,hour:14,hotspots:["market","dock","square"]}))}>Run Director Tick</button></div><div className="metric">{state.npcs.length} active</div><div className="mono">{JSON.stringify({tick:state.tick,preview:state.npcs.slice(0,8)},null,2)}</div></div></div>;
}

function EconomySeasonLab(){
  const[economy,setEconomy]=useState(()=>createDynamicEconomy([{id:"wood",basePrice:10,supply:120,demand:100,floor:4,ceiling:30},{id:"iron",basePrice:25,supply:40,demand:90,floor:10,ceiling:80}]));
  const season=validateSeasonPlan({id:"season_01",durationDays:42,rollbackVersion:1,events:[{id:"launch",day:0,reward:{type:"badge",amount:1}},{id:"weekend",day:7,reward:{type:"soft_currency",amount:300}}]});
  return <div className="grid"><div className="card"><h2>Dynamic Economy</h2><div className="row"><button className="action" onClick={()=>setEconomy(s=>stepDynamicEconomy(s,{production:{wood:20,iron:3},consumption:{wood:10,iron:12}}))}>Simulate Economy</button></div><div className="mono">{JSON.stringify(economy,null,2)}</div></div><div className="card"><h2>Live Events / Season System</h2><div className="metric">{season.valid?"PLAN READY":"FIX"}</div><p>Live backend remains disconnected until external activation evidence exists.</p><div className="mono">{JSON.stringify(season,null,2)}</div></div></div>;
}

function BalanceQaLab(){
  const balance=analyzeBalanceMetrics([{id:"hero_a",matches:600,winRate:.61,pickRate:.31,avgDamage:9200},{id:"hero_b",matches:520,winRate:.49,pickRate:.24,avgDamage:7800},{id:"hero_c",matches:18,winRate:.72,pickRate:.05,avgDamage:11000}]);
  const qa=runAutonomousGameQaCycle({scenario:{health:1,goalX:3},actions:["hit","move","move","move"],play:(s,a)=>a==="hit"?{...s,health:s.health-1}:a==="move"?{...s,goalX:s.goalX-1}:s,assertState:s=>s.health>0?true:"player_health_invalid",goal:s=>s.goalX<=0,diagnose:r=>r.issues.map(issue=>({issue,fix:issue.includes("health")?"increase test-scenario starting health":"review goal path"})),repair:(s,diagnosis)=>diagnosis.some(d=>d.issue.includes("health"))?{...s,health:2}:s,maxRounds:3});
  return <div className="grid"><div className="card"><h2>Analytics / Balancing AI</h2><p>Outliers become experiments for human review; synthetic metrics cannot silently rewrite production balance.</p><div className="mono">{JSON.stringify(balance,null,2)}</div></div><div className="card"><h2>Autonomous Game QA Agent</h2><div className="metric">{qa.passed?"PASS AFTER RETEST":"ISSUES"}</div><p>Play → detect → diagnose → bounded repair → re-test, with every round retained as evidence.</p><div className="mono">{JSON.stringify(qa,null,2)}</div></div></div>;
}
