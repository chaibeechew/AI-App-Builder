import Link from "next/link";
import {compileProductionWorldV13} from "../../lib/game/game-world-production-export-v13.js";

export const dynamic="force-dynamic";

const card={padding:20,border:"1px solid #ffffff1c",borderRadius:20,background:"#ffffff08"};
const truth={display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(190px,1fr))",gap:12};

export default function GameWorldV13Page(){
  const result=compileProductionWorldV13({});
  const layers=[
    ["V8","Supply-Chain + Safe WASM","Fail-closed dependency admission, worker isolation and internal fallback."],
    ["V9","Real Device Evidence","Consent-first foreground performance evidence plus signed native attestation."],
    ["V10","Native Runtime Bridge","iOS / Android / Desktop capability negotiation, lifecycle, secure storage and device compute."],
    ["V11","Large World Runtime","World partition, HLOD, streaming, paging, NPC virtualization and dynamic nav tiles."],
    ["V12","Multiplayer Living World","Server authority, prediction, rollback, interest management and persistent world sync."],
    ["V13","Production + Export Closure","Web/glTF/OpenUSD/Godot/Unity/Unreal evidence plus exact-SHA Production closure."]
  ];
  return <main style={{minHeight:"100vh",background:"radial-gradient(circle at top,#18334a,#071018 55%)",color:"#eef8ff",padding:"30px clamp(18px,4vw,64px)",fontFamily:"system-ui"}}>
    <header style={{display:"flex",justifyContent:"space-between",gap:16,alignItems:"center",flexWrap:"wrap"}}><Link href="/game-builder" style={{color:"#9ee6cd"}}>← Game Builder</Link><span style={{fontSize:12,letterSpacing:2}}>LANERIQ AI · WORLD V13</span></header>
    <section style={{maxWidth:1050,margin:"60px auto 32px"}}><small>AI WORLD ENGINE · SIX-LAYER PRODUCTION STACK</small><h1 style={{fontSize:"clamp(42px,7vw,86px)",lineHeight:.95,margin:"14px 0"}}>From AI MAP to a <em>truth-gated Production World Engine.</em></h1><p style={{fontSize:18,color:"#c4d6e1",maxWidth:850}}>V8–V13 are compiled as one dependency chain. Internal readiness can be 100 while real phones, native stores, long-duration world soak, engine imports and final Production exact-SHA evidence remain independently gated.</p></section>
    <section style={{...truth,maxWidth:1100,margin:"0 auto 30px"}}>{layers.map(([v,name,desc])=><article key={v} style={card}><small>{v}</small><h2>{name}</h2><p style={{color:"#b9cad5"}}>{desc}</p><b style={{color:"#9ee6cd"}}>INTERNAL LAYER READY</b></article>)}</section>
    <section style={{...card,maxWidth:1100,margin:"0 auto 24px"}}><small>PRODUCTION CLOSURE</small><h2>Production 100: {String(result.readiness.production100)}</h2><div style={truth}><div>Exact SHA: <b>{String(result.closure.shaExact)}</b></div><div>External exports: <b>{String(result.exportEvidence.allRequired)}</b></div><div>Production runtime: <b>{String(result.truth.productionDeploymentVerified)}</b></div></div><p style={{color:"#b9cad5"}}>This page cannot self-promote Production truth. The Release Control window must supply exact deployment/runtime evidence and all required external gates.</p></section>
    <section style={{...card,maxWidth:1100,margin:"0 auto"}}><small>EXPORT TARGETS</small><div style={truth}><div>WebGPU / WebGL2</div><div>glTF 2.x</div><div>OpenUSD</div><div>Godot 4.7.x+</div><div>Unity 6+</div><div>Unreal 5.8+</div></div></section>
  </main>;
}
