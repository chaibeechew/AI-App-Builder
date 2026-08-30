"use client";
import Link from "next/link";
import { useEffect,useState } from "react";

function detectDeviceClass(){
  if(typeof window==="undefined")return "mobile";
  const coarse=window.matchMedia?.("(pointer: coarse)")?.matches;
  const width=window.innerWidth||390;
  const cores=navigator.hardwareConcurrency||4;
  const memory=navigator.deviceMemory||4;
  if(coarse||width<900)return "mobile";
  if(cores>=10&&memory>=12)return "high_performance_desktop";
  return "desktop";
}

export default function VideoStudio(){
  const[deviceClass,setDeviceClass]=useState("mobile");
  const[prompt,setPrompt]=useState("");
  const[style,setStyle]=useState("realistic");
  const[story,setStory]=useState(null);
  const[project,setProject]=useState(null);
  const[clips,setClips]=useState([]);
  const[busy,setBusy]=useState(false);
  const[status,setStatus]=useState("");
  const[error,setError]=useState("");
  useEffect(()=>setDeviceClass(detectDeviceClass()),[]);

  async function createStoryboard(){
    if(!prompt.trim())return;
    setBusy(true);setError("");setStatus("SoolenAI is planning your video…");
    try{
      const r=await fetch("/api/video/storyboard",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({prompt:prompt.trim(),style,deviceClass})});
      const d=await r.json();if(!r.ok)throw new Error(d.error||"Video planning failed");
      setStory({...d.storyboard,experience:d.experience,duration:d.duration});
      setClips((d.storyboard?.scenes||[]).map((scene,index)=>({id:crypto.randomUUID(),label:scene.headline||`Clip ${index+1}`,durationSeconds:Math.max(1,Math.min(d.experience.maxClipSeconds,Number(scene.duration)||4)),style,transition:index?"crossfade":"cut",caption:scene.caption||"",visual:scene.visual||""})));
      setStatus("Storyboard ready. You can edit the clips and connect them into one version.");
    }catch(e){setError(e.message)}finally{setBusy(false)}
  }

  async function prepareProject(){
    if(project)return project;
    const r=await fetch("/api/video/projects",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({name:story?.title||"My Video",style,deviceClass,aspectRatio:"9:16"})});
    const d=await r.json();if(!r.ok)throw new Error(d?.error||"Unable to create video project.");
    const value={...d.project,experience:d.experience};setProject(value);return value;
  }

  function addClip(){const max=story?.experience?.maxClipSeconds||project?.experience?.maxClipSeconds||12;setClips(c=>[...c,{id:crypto.randomUUID(),label:`Clip ${c.length+1}`,durationSeconds:Math.min(8,max),style,transition:c.length?"crossfade":"cut",caption:"",visual:""}])}
  function updateClip(id,key,value){setClips(c=>c.map(x=>x.id===id?{...x,[key]:value}:x))}
  function move(id,dir){setClips(c=>{const i=c.findIndex(x=>x.id===id),j=i+dir;if(i<0||j<0||j>=c.length)return c;const n=[...c];[n[i],n[j]]=[n[j],n[i]];return n})}
  function remove(id){setClips(c=>c.filter(x=>x.id!==id))}

  async function compile(){
    if(!clips.length)return;
    setBusy(true);setError("");setStatus("SoolenAI is connecting your clips into a new version…");
    try{
      const p=await prepareProject();
      const r=await fetch(`/api/video/projects/${p.id}/compile`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({clips,autoConnect:true,aspectRatio:"9:16",quality:"balanced"})});
      const d=await r.json();if(!r.ok)throw new Error(d?.error||"Unable to compile video version.");
      setStatus(`Version ${d.version.version_no} queued · ${d.renderPlan.durationSeconds}s · ${d.renderPlan.clipCount} clips connected. Final render stays server-side.`);
    }catch(e){setError(e.message)}finally{setBusy(false)}
  }

  const maxClip=story?.experience?.maxClipSeconds||project?.experience?.maxClipSeconds||12;
  const maxProject=story?.experience?.maxProjectSeconds||project?.experience?.maxProjectSeconds||(deviceClass==="mobile"?60:120);
  const total=clips.reduce((sum,c)=>sum+Number(c.durationSeconds||0),0);
  return <main className="page"><div className="wrap"><header><Link href="/studio">← Studio</Link><span>SOOLENAI · VIDEO STUDIO</span></header><section className="hero"><small>REALISTIC · CARTOON · MIXED</small><h1>Create clips.<br/><em>Connect one story.</em></h1><p>真人版、卡通版或混合视频。SoolenAI 会自动按手机或电脑调整处理方式；顾客只看到快速预览和剪辑，重度生成与最终合成留在服务器。</p></section>
  <section className="panel"><label>Describe your video</label><textarea rows="4" value={prompt} onChange={e=>setPrompt(e.target.value)} placeholder="Example: Create a premium 30-second property launch video in Kuala Lumpur."/><label>Video style</label><div className="modes">{[["realistic","真人版 Realistic"],["cartoon","卡通版 Cartoon"],["mixed","Mixed"]].map(([v,l])=><button className={style===v?"active":""} key={v} onClick={()=>setStyle(v)}>{l}</button>)}</div><button className="primary" disabled={busy||!prompt.trim()} onClick={createStoryboard}>{busy?"SOOLENAI WORKING…":"✨ CREATE VIDEO PLAN"}</button></section>
  {story&&<section className="editor"><div className="editorHead"><div><small>VIDEO EDITOR</small><h2>{story.title||"Video Project"}</h2><p>{clips.length} clips · {total.toFixed(0)}s / {maxProject}s · single clip max {maxClip}s</p></div><button onClick={addClip}>＋ Add Clip</button></div><div className="timeline">{clips.map((clip,index)=><article key={clip.id}><span className="num">{String(index+1).padStart(2,"0")}</span><div className="clip"><input value={clip.label} onChange={e=>updateClip(clip.id,"label",e.target.value)}/><small>{clip.visual}</small><div className="controls"><label>Seconds <input type="number" min="1" max={maxClip} value={clip.durationSeconds} onChange={e=>updateClip(clip.id,"durationSeconds",Math.min(maxClip,Math.max(1,Number(e.target.value)||1)))}/></label><label>Style <select value={clip.style} onChange={e=>updateClip(clip.id,"style",e.target.value)}><option value="realistic">Realistic</option><option value="cartoon">Cartoon</option><option value="mixed">Mixed</option></select></label><label>Transition <select value={clip.transition} onChange={e=>updateClip(clip.id,"transition",e.target.value)}><option value="cut">Cut</option><option value="crossfade">Crossfade</option><option value="fade">Fade</option><option value="slide">Slide</option></select></label></div></div><div className="actions"><button onClick={()=>move(clip.id,-1)}>↑</button><button onClick={()=>move(clip.id,1)}>↓</button><button onClick={()=>remove(clip.id)}>×</button></div></article>)}</div><div className="features"><span>Trim</span><span>Split</span><span>Reorder</span><span>Transitions</span><span>Subtitles</span><span>Music</span><span>Voice-over</span><span>Logo</span><span>9:16 / 16:9 / 1:1</span><span>Version History</span></div><button className="primary" disabled={busy||!clips.length||total>maxProject} onClick={compile}>{busy?"CONNECTING…":"AI CONNECT + COMPILE VERSION →"}</button>{total>maxProject&&<div className="warn">This timeline is longer than the current project limit. Shorten or split the project before compiling.</div>}</section>}
  {status&&<div className="status">{status}</div>}{error&&<div className="error">{error}</div>}</div><style jsx>{`.page{min-height:100vh;padding:26px 18px 80px;background:radial-gradient(circle at 70% 12%,#b78a2520,transparent 28%),linear-gradient(145deg,#041713,#0d382e,#06120f);color:#f7fff9}.wrap{max-width:1040px;margin:auto}header{display:flex;justify-content:space-between;font-size:11px;letter-spacing:.14em;font-weight:900}header a{color:#fff;text-decoration:none}header span,.hero small,.editor small{color:#d8bf62}.hero{padding:70px 0 30px}.hero h1{font-size:clamp(50px,8vw,88px);line-height:.95;letter-spacing:-.055em;margin:12px 0}.hero em{font-style:normal;color:#d8bf62}.hero p{max-width:780px;color:#abc0b7;line-height:1.65;font-size:17px}.panel,.editor{padding:24px;border:1px solid #d8bf6233;border-radius:24px;background:#061b16dd;backdrop-filter:blur(18px)}.editor{margin-top:16px}label{display:block;color:#d8bf62;font-weight:850;margin:8px 0}textarea,input,select{box-sizing:border-box;background:#02100d;color:#fff;border:1px solid #ffffff18;border-radius:12px;padding:11px;font:inherit}textarea{width:100%}.modes{display:grid;grid-template-columns:repeat(3,1fr);gap:9px;margin-bottom:18px}.modes button,.editorHead>button,.actions button{border:1px solid #ffffff20;background:#0d2d22;color:#dfe8e3;border-radius:12px;padding:11px;font-weight:850}.modes .active{background:#d8bf62;color:#07130e}.primary{width:100%;border:0;border-radius:14px;padding:16px;background:linear-gradient(135deg,#f1d885,#c28c2d);color:#102018;font-weight:1000}.primary:disabled{opacity:.5}.editorHead{display:flex;justify-content:space-between;align-items:center;gap:15px}.editorHead h2{font-size:34px;margin:5px 0}.editorHead p{color:#94aaa1}.timeline{display:grid;gap:9px;margin:18px 0}.timeline article{display:grid;grid-template-columns:42px 1fr auto;gap:10px;align-items:center;padding:12px;border-radius:15px;background:#ffffff08;border:1px solid #ffffff0e}.num{color:#d8bf62;font-weight:900}.clip>input{width:100%;font-weight:850}.clip>small{display:block;color:#849a91;margin:6px 0}.controls{display:flex;gap:8px;flex-wrap:wrap}.controls label{font-size:10px;color:#82978e;margin:0}.controls input{width:68px}.controls select{margin-left:5px}.actions{display:grid;gap:5px}.actions button{padding:7px 10px}.features{display:flex;gap:7px;flex-wrap:wrap;margin:0 0 16px}.features span{font-size:10px;padding:7px 9px;border-radius:999px;background:#0c3125;color:#bfd0c8}.status,.error,.warn{margin-top:12px;padding:12px;border-radius:12px}.status{background:#1d6a4d33;color:#9ce0c0}.error,.warn{background:#7d2b2b44;color:#ffaaa1}@media(max-width:680px){header span{display:none}.hero{padding-top:45px}.modes{grid-template-columns:1fr}.editorHead{align-items:flex-start;flex-direction:column}.timeline article{grid-template-columns:32px 1fr}.actions{grid-column:2;display:flex}}`}</style></main>;
}
