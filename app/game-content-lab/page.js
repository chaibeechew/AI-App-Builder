"use client";

import {useMemo,useState} from "react";
import Link from "next/link";
import {
  validateAssetImport,normalizeAnimationClip,validateSceneDocument,createPrefab,instantiatePrefab,
  createPhysicsMaterial,combinePhysicsMaterials,planLodHlod,computeOcclusionVisibility,buildGpuInstanceBatches,
  validateShaderMaterialGraph,spatializeAudio,selectSpatialAudioVoices,buildLocalizationBundle,
  runAutomatedPlaytest,analyzeCrashReport,analyzePerformanceSamples,planLargeWorldContent
} from "../../lib/game/content-production-pipeline-v1.js";

const TABS=["Asset + Scene","LOD + Rendering","Shader + Audio","Localization","Auto Playtest","Crash + World Pipeline"];

export default function GameContentLab(){
  const[tab,setTab]=useState(TABS[0]);
  return <main className="shell"><div className="bg"/><header><Link href="/game-builder">← GAME BUILDER</Link><span>SOOLENAI · GAME CONTENT LAB</span></header>
    <section className="hero"><small>PRO · LARGE-GAME CONTENT PIPELINE</small><h1>Build the content.<br/><em>Budget every layer.</em></h1><p>Asset and animation import, 3D scenes, prefabs, physics materials, LOD/HLOD, occlusion, GPU instancing, shader graphs, spatial audio, localization, automated playtesting, crash analysis and large-world chunking are exercised here as deterministic contracts.</p></section>
    <nav>{TABS.map(item=><button key={item} className={tab===item?"active":""} onClick={()=>setTab(item)}>{item}</button>)}</nav>
    <section className="panel">{tab===TABS[0]?<AssetSceneLab/>:tab===TABS[1]?<RenderingLab/>:tab===TABS[2]?<ShaderAudioLab/>:tab===TABS[3]?<LocalizationLab/>:tab===TABS[4]?<PlaytestLab/>:<CrashWorldLab/>}</section>
    <section className="truth"><b>Production evidence boundary</b><span>This workbench proves internal authoring, validation and deterministic simulation contracts. Real DCC/engine import fidelity, GPU occlusion/instancing behavior, hardware spatial audio, professional translation review, crash-free rate and iOS/Android frame-memory-thermal performance still require measured production evidence.</span></section>
    <style jsx>{`.shell{min-height:100vh;background:#020706;color:#effaf5;font-family:Inter,system-ui;padding-bottom:72px}.bg{position:fixed;inset:0;background:radial-gradient(circle at 82% 8%,#dfc16622,transparent 32%),linear-gradient(180deg,#020706e8,#020706fb),url('/soolen-ai-landscape.jpg') center/cover;z-index:0}header,.hero,nav,.panel,.truth{position:relative;z-index:1;width:min(1120px,calc(100% - 28px));margin:auto}header{display:flex;justify-content:space-between;padding:24px 0;font-size:10px;letter-spacing:.13em;font-weight:900}header a{color:#fff;text-decoration:none}header span,.hero small{color:#dfc166}.hero{padding:54px 0 24px}.hero h1{font-size:clamp(48px,8vw,88px);line-height:.94;letter-spacing:-.05em;margin:10px 0}.hero em{font-style:normal;color:#dfc166}.hero p{max-width:900px;color:#a8bbb2;line-height:1.7}nav{display:flex;gap:7px;flex-wrap:wrap;margin-bottom:12px}nav button{border:1px solid #ffffff14;background:#071a13;color:#a9bbb2;padding:9px 12px;border-radius:999px;font-weight:850;font-size:10px}nav button.active{background:#dfc166;color:#06110d}.panel,.truth{border:1px solid #ffffff12;background:#061914e9;border-radius:24px;padding:22px;backdrop-filter:blur(16px)}.truth{margin-top:12px;display:grid;gap:5px}.truth b{color:#dfc166}.truth span{color:#91a49b;font-size:11px;line-height:1.55}:global(.grid){display:grid;grid-template-columns:1fr 1fr;gap:12px}:global(.card){background:#0a2119;border:1px solid #ffffff10;border-radius:18px;padding:16px}:global(.card h2){font-size:21px;margin:0 0 7px}:global(.card p),:global(label){font-size:11px;color:#9fb2a9;line-height:1.55}:global(.metric){font-size:30px;color:#dfc166;font-weight:950}:global(.row){display:flex;gap:8px;flex-wrap:wrap;margin-top:10px}:global(.action),:global(.secondary){border-radius:12px;padding:10px 12px;font-weight:900}:global(.action){border:0;background:#dfc166;color:#06110d}:global(.secondary){border:1px solid #ffffff14;background:#0b251c;color:#dce9e3}:global(.field){width:100%;box-sizing:border-box;background:#020b08;color:#fff;border:1px solid #ffffff14;border-radius:12px;padding:10px;margin-top:7px}:global(.mono){font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:10px;white-space:pre-wrap;background:#020b08;color:#a9bbb2;border-radius:12px;padding:10px;max-height:340px;overflow:auto}@media(max-width:720px){:global(.grid){grid-template-columns:1fr}.hero{padding-top:38px}}`}</style>
  </main>;
}

function AssetSceneLab(){
  const asset=validateAssetImport({type:"mesh",name:"hero.glb",extension:"glb",sizeMb:24,vertices:180000});
  const animation=normalizeAnimationClip({id:"hero_run",duration:1.1,fps:60,loop:true,rootMotion:true,events:[{time:.42,name:"foot_l"},{time:.92,name:"foot_r"}]});
  const scene=validateSceneDocument({id:"forest_gate",entities:[{id:"hero",components:[{type:"transform"},{type:"mesh"},{type:"animation"}]},{id:"gate",components:[{type:"transform"},{type:"mesh"},{type:"collider"}]}]});
  const prefab=createPrefab({id:"enemy_grunt",entities:[{id:"body",components:[{type:"transform"},{type:"mesh"},{type:"collider"},{type:"scriptless-behavior"}]}],allowedOverrides:["transform","material","animation"]});
  const instance=instantiatePrefab(prefab.prefab,{instanceId:"grunt_01",overrides:{transform:{x:5,z:3},material:"enemy_red"}});
  const floor=createPhysicsMaterial({id:"stone",friction:.9,restitution:.05}),boot=createPhysicsMaterial({id:"boots",friction:.7,restitution:.1});
  return <div className="grid"><div className="card"><h2>Asset + Animation Import</h2><div className="metric">{asset.valid?"VALID":"BLOCKED"}</div><p>Executable payloads are rejected; mesh, skeleton, texture and mobile-size warnings stay explicit.</p><div className="mono">{JSON.stringify({asset,animation},null,2)}</div></div><div className="card"><h2>3D Scene Composer + Prefab</h2><p>Stable IDs, safe components, whitelisted prefab overrides and deterministic instance checksums.</p><div className="mono">{JSON.stringify({scene,prefab,instance,physicsContact:combinePhysicsMaterials(floor,boot)},null,2)}</div></div></div>;
}

function RenderingLab(){
  const lod=planLodHlod({triangles:240000,distances:[12,30,70],staticInstances:420});
  const visibility=computeOcclusionVisibility([{id:"tower",distance:25},{id:"rock",distance:55},{id:"mountain",distance:220}],{maxDistance:160,occludedIds:["rock"]});
  const batches=buildGpuInstanceBatches(Array.from({length:2300},(_,i)=>({id:`tree_${i}`,mesh:"pine",material:i%2?"pine_green":"pine_dark"})));
  return <div className="grid"><div className="card"><h2>LOD / HLOD + Occlusion Culling</h2><div className="metric">{lod.lods.length} LOD states</div><div className="mono">{JSON.stringify({lod,visibility},null,2)}</div></div><div className="card"><h2>GPU Instancing Plan</h2><div className="metric">{batches.length} batches</div><p>Renderer-ready batching is bounded to mobile-safe instance counts; this is not a claim that a final GPU driver profile already exists.</p><div className="mono">{JSON.stringify(batches.slice(0,6),null,2)}</div></div></div>;
}

function ShaderAudioLab(){
  const shader=validateShaderMaterialGraph({tier:"mobile_mid",nodes:[{id:"albedo",type:"texture"},{id:"tint",type:"color"},{id:"mul",type:"multiply",inputs:["albedo","tint"]},{id:"rough",type:"roughness"},{id:"out",type:"output",inputs:["mul","rough"]}]});
  const spatial=spatializeAudio({x:8,y:0,z:5},{x:0,y:0,z:0});
  const voices=selectSpatialAudioVoices(Array.from({length:40},(_,i)=>({id:`voice_${i}`,x:(i%10)*3,z:Math.floor(i/10)*5})),{x:0,y:0,z:0},12);
  return <div className="grid"><div className="card"><h2>Shader / Material Editor Contract</h2><div className="metric">{shader.valid?"MOBILE SAFE":"BLOCKED"}</div><div className="mono">{JSON.stringify(shader,null,2)}</div></div><div className="card"><h2>Spatial Audio Budget</h2><div className="metric">{voices.length} voices</div><p>Distance attenuation and stereo pan are deterministic contracts; actual speaker/headphone output remains hardware evidence.</p><div className="mono">{JSON.stringify({single:spatial,voices:voices.slice(0,6)},null,2)}</div></div></div>;
}

function LocalizationLab(){
  const[bad,setBad]=useState(false);
  const bundle=buildLocalizationBundle({greeting:{en:"Welcome, {player}",zh:"欢迎，{player}",ms:bad?"Selamat datang":"Selamat datang, {player}"},coins:{en:"{count} coins",zh:"{count} 金币",ms:"{count} syiling"}},["en","zh","ms"],"en");
  return <div className="grid"><div className="card"><h2>Localization + Placeholder Parity</h2><div className="metric">{bundle.valid?"VALID":"FIX REQUIRED"}</div><div className="row"><button className="action" onClick={()=>setBad(v=>!v)}>{bad?"Fix Malay Placeholder":"Break Placeholder Test"}</button></div><p>Fallback text and runtime placeholders must remain compatible across locales.</p></div><div className="card"><h2>Localization Evidence</h2><div className="mono">{JSON.stringify(bundle,null,2)}</div></div></div>;
}

function PlaytestLab(){
  const[result,setResult]=useState(null);
  function run(){setResult(runAutomatedPlaytest({initialState:{x:0,coins:0,health:3},actions:["right","coin","right","coin","goal"],applyAction:(s,a)=>a==="right"?{...s,x:s.x+1}:a==="coin"?{...s,coins:s.coins+1}:a==="goal"?{...s,x:3}:s,goal:s=>s.x>=3&&s.coins>=2,assertState:s=>s.health>=0&&s.coins>=0}));}
  return <div className="grid"><div className="card"><h2>Automated Playtesting AI</h2><div className="metric">{result?result.passed?"PASS":"FAIL":"READY"}</div><div className="row"><button className="action" onClick={run}>Run Deterministic Playtest</button></div><p>Action traces report goal reachability, unique states and invalid runtime state instead of returning a marketing-only “test passed”.</p></div><div className="card"><h2>Playtest Evidence</h2><div className="mono">{JSON.stringify(result||{status:"not_run"},null,2)}</div></div></div>;
}

function CrashWorldLab(){
  const crash=analyzeCrashReport({message:"Render worker failed token=secret-value",stack:"Error: GPU render failure\n at drawFrame\n at main",events:[{type:"scene_load"},{type:"combat_start"}]});
  const perf=analyzePerformanceSamples([{frameMs:14,memoryMb:620,drawCalls:950},{frameMs:34,memoryMb:1150,drawCalls:2400}]);
  const world=planLargeWorldContent(Array.from({length:24},(_,i)=>({id:`asset_${i}`,x:(i%6)*95,z:Math.floor(i/6)*110,sizeMb:i%5===0?44:8,dependencies:i%4===0?["shared_terrain"]:[]})),{chunkSize:128,chunkBudgetMb:64,preloadRings:1});
  return <div className="grid"><div className="card"><h2>Crash / Performance Analyzer</h2><div className="metric">{crash.category}</div><p>Secrets are redacted before fingerprints are recorded. Synthetic performance samples never become real-device certification.</p><div className="mono">{JSON.stringify({crash,perf},null,2)}</div></div><div className="card"><h2>Large-world Content Pipeline</h2><div className="metric">{world.chunks.length} chunks</div><p>Chunks carry size budgets, dependency metadata, preload rings and deterministic streaming priority.</p><div className="mono">{JSON.stringify(world,null,2)}</div></div></div>;
}
