"use client";

import {useMemo,useState} from "react";
import Link from "next/link";

const TYPES=[
  ["profile","Profile Avatar"],
  ["game","Game Character"],
  ["npc","NPC Concept"],
  ["presenter","AI Presenter"],
  ["mascot","Mascot"]
];
const STYLES=["cinematic","3d","cartoon","fantasy","minimal","realistic"];

async function readJson(response){try{return await response.json()}catch{return {}}}

export default function AvatarStudio(){
  const[type,setType]=useState("game");
  const[style,setStyle]=useState("cinematic");
  const[idea,setIdea]=useState("");
  const[loading,setLoading]=useState(false);
  const[result,setResult]=useState(null);
  const[error,setError]=useState("");
  const typeLabel=useMemo(()=>TYPES.find(item=>item[0]===type)?.[1]||"Avatar",[type]);

  async function generate(){
    if(!idea.trim()){setError("Describe the avatar or character you want first.");return}
    setLoading(true);setError("");setResult(null);
    try{
      const prompt=[
        `Create an original ${typeLabel.toLowerCase()} concept for an App, Website or Mobile Game.`,
        `Style direction: ${style}.`,
        idea.trim(),
        "Keep the character original. Do not copy copyrighted characters, celebrity likenesses or third-party branding. Use a clean composition suitable for profile, game-character or promotional use."
      ].join(" ");
      const response=await fetch("/api/images/generate",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({prompt,mode:"image",style,count:1})});
      const json=await readJson(response);if(!response.ok)throw new Error(json?.error||"Unable to create avatar concept.");
      setResult(json);
    }catch(err){setError(err?.message||"Unable to create avatar concept.")}finally{setLoading(false)}
  }

  const image=result?.images?.[0]?.image||result?.image||"";
  const source=result?.source||result?.images?.[0]?.source||"";
  return <main className="avatarPage">
    <div className="glow"/>
    <header><div><small>SOOLENAI CREATIVE STUDIO</small><h1>AI Avatar Creator</h1><p>Create original avatars, game characters, NPC concepts, presenters and mascots. External model generation is used only when a configured provider is allowed by the current cost policy.</p></div><Link href="/">← AI BUILD APP&WEB</Link></header>
    <section className="studio">
      <div className="controls">
        <label>Avatar type<div className="chips">{TYPES.map(([id,label])=><button key={id} className={type===id?"active":""} onClick={()=>setType(id)}>{label}</button>)}</div></label>
        <label>Style<select value={style} onChange={e=>setStyle(e.target.value)}>{STYLES.map(item=><option key={item}>{item}</option>)}</select></label>
        <label>Describe your idea<textarea value={idea} onChange={e=>setIdea(e.target.value)} maxLength={1200} placeholder="Example: A friendly futuristic explorer with emerald jacket, compact backpack, confident expression, suitable for a mobile adventure game."/></label>
        <button className="generate" disabled={loading} onClick={generate}>{loading?"Creating…":"✦ Create Avatar Concept"}</button>
        <p className="truth">Zero-cost first. If no approved external image model is connected, SoolenAI returns its local visual fallback and clearly labels it instead of pretending it is photorealistic model output.</p>
        {error&&<p className="error">{error}</p>}
      </div>
      <div className="preview">{image?<><img src={image} alt="Generated avatar concept"/><div className="status"><b>{source==="model"?"AI model output":"Local visual concept"}</b><span>{result?.note||"Original SoolenAI avatar concept."}</span></div></>:<div className="empty"><strong>Your avatar appears here</strong><span>Profile · Game Character · NPC · Presenter · Mascot</span></div>}</div>
    </section>
    <section className="foundation"><h2>Built for App + Website + Mobile Game</h2><div><article><b>Originality</b><span>No copied game characters or branding.</span></article><article><b>Game-ready planning</b><span>Character, NPC, mascot and profile directions can feed SoolenAI game generation.</span></article><article><b>iOS + Android</b><span>Avatar assets are planned for mobile-safe crops, icons and touch-first experiences.</span></article><article><b>Privacy</b><span>Likeness and personal-photo use must respect customer consent and privacy.</span></article></div></section>
    <style jsx>{`.avatarPage{min-height:100vh;padding:92px 6vw 70px;background:#030807;color:#eff9f4;font-family:Inter,system-ui,-apple-system,sans-serif;position:relative;overflow:hidden}.glow{position:fixed;inset:-20%;background:radial-gradient(circle at 80% 10%,#1c7d6640,transparent 34%),radial-gradient(circle at 10% 65%,#d8bf621c,transparent 35%);pointer-events:none}.avatarPage>*{position:relative;z-index:1}header{max-width:1120px;margin:auto;display:flex;justify-content:space-between;gap:24px;align-items:start}header small{color:#d8bf62;letter-spacing:.2em;font-weight:900}h1{font-size:clamp(38px,7vw,76px);line-height:.96;margin:10px 0 18px}header p{max-width:720px;color:#9db0a7;line-height:1.6}header a{color:#d8bf62;text-decoration:none;border:1px solid #d8bf6240;border-radius:999px;padding:10px 14px;white-space:nowrap}.studio{max-width:1120px;margin:42px auto;display:grid;grid-template-columns:minmax(0,1fr) minmax(320px,.9fr);gap:18px}.controls,.preview,.foundation{border:1px solid #ffffff12;background:#07120fdd;border-radius:24px;box-shadow:0 28px 80px #0007;backdrop-filter:blur(18px)}.controls{padding:22px;display:grid;gap:18px}.controls label{display:grid;gap:9px;font-size:12px;font-weight:800;color:#d9e7e0}.chips{display:flex;flex-wrap:wrap;gap:7px}.chips button,.controls select{border:1px solid #ffffff18;background:#0a1c16;color:#d8e8e0;border-radius:11px;padding:9px 11px}.chips button.active{border-color:#d8bf6270;color:#d8bf62;background:#d8bf6210}.controls textarea{min-height:150px;resize:vertical;border:1px solid #ffffff18;background:#05100d;color:#fff;border-radius:14px;padding:14px;font:inherit}.generate{border:0;border-radius:14px;padding:14px 18px;background:#d8bf62;color:#07110d;font-weight:950;font-size:14px}.generate:disabled{opacity:.55}.truth{font-size:10px;color:#7f968c;line-height:1.5}.error{color:#ff9f95;background:#63272040;padding:10px;border-radius:10px}.preview{min-height:520px;padding:14px;display:grid;place-items:center;overflow:hidden}.preview img{width:100%;height:440px;object-fit:cover;border-radius:17px;background:#0d1d18}.status{width:100%;display:grid;gap:4px;padding:12px 4px 0}.status b{color:#d8bf62}.status span{font-size:10px;line-height:1.4;color:#81968d}.empty{display:grid;text-align:center;gap:8px;color:#d8bf62}.empty span{font-size:11px;color:#769087}.foundation{max-width:1120px;margin:0 auto;padding:22px}.foundation h2{margin:0 0 16px}.foundation>div{display:grid;grid-template-columns:repeat(4,1fr);gap:9px}.foundation article{padding:14px;background:#0a1c16;border-radius:14px;display:grid;gap:6px}.foundation article span{font-size:10px;line-height:1.45;color:#849990}@media(max-width:760px){.avatarPage{padding:84px 14px 50px}header{display:grid}header a{width:max-content}.studio{grid-template-columns:1fr}.preview{min-height:360px}.preview img{height:340px}.foundation>div{grid-template-columns:1fr 1fr}}`}</style>
  </main>;
}
