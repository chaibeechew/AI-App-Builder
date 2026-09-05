"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

const STATUS_LABELS={ready:"Ready",integration_ready:"Ready",upgrade_required:"Professional",setup_required:"Preparing",planned:"Planned"};
const COMMANDS=[
  ["＋","Add","Add user authentication system"],
  ["↗","Improve","Improve the UI/UX of the home page"],
  ["⌁","Integrate","Integrate a payment or business service"],
  ["◇","Add Feature","Add a feature to the current project"],
  ["🚀","Optimize","Optimize app performance and speed"],
  ["▯","Make","Prepare the project for another platform"],
];

export default function SoolenAICenter(){
  const[data,setData]=useState(null);
  const[loadError,setLoadError]=useState("");
  const[messages,setMessages]=useState([]);
  const[message,setMessage]=useState("");
  const[sending,setSending]=useState(false);
  const[advanced,setAdvanced]=useState(false);

  useEffect(()=>{
    fetch("/api/soolenai/capabilities",{cache:"no-store"})
      .then(async response=>{const value=await response.json();if(!response.ok)throw new Error(value?.error||"Unable to load capabilities.");setData(value);})
      .catch(error=>setLoadError(error?.message||"Unable to load capabilities."));
  },[]);

  const capabilities=useMemo(()=>Array.isArray(data?.capabilities)?data.capabilities:[],[data]);
  const ready=useMemo(()=>capabilities.filter(item=>item.status==="ready"||item.status==="integration_ready"),[capabilities]);
  const advancedReady=Boolean(data?.providers?.premiumRouting);
  const tier=String(data?.subscription?.tier||"free").toUpperCase();

  async function send(event){
    event?.preventDefault?.();
    const text=message.trim();
    if(!text||sending)return;
    const history=messages;
    setMessages(items=>[...items,{role:"user",content:text}]);
    setMessage("");
    setSending(true);
    try{
      const response=await fetch("/api/chat",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({message:text,messages:history,mode:advanced?"advanced":"standard"})});
      const value=await response.json();
      if(!response.ok)throw new Error(value?.error||"LANERIQ AI Assistant is unavailable.");
      setMessages(items=>[...items,{role:"assistant",content:value.content}]);
    }catch(error){
      setMessages(items=>[...items,{role:"error",content:error?.message||"LANERIQ AI Assistant is unavailable."}]);
    }finally{setSending(false);}
  }

  const visibleCapabilities=ready.slice(0,6);
  return <main className="assistantReference">
    <div className="assistantBackdrop"/>
    <section className="assistantHero">
      <div className="assistantCopy">
        <small>PAGE 9 · AI ASSISTANT</small>
        <h1>AI Assistant</h1>
        <h2>Your AI Command Center.</h2>
        <p>Tell LANERIQ AI what you want to build, change or improve. Real actions continue to use the existing project and provider boundaries.</p>
      </div>
      <div className="assistantBot" aria-hidden="true"><div className="botHead"><i/><i/><b>⌣</b></div><span>AI</span></div>
    </section>

    <form className="commandBar" onSubmit={send}>
      <span>✦</span>
      <input value={message} onChange={event=>setMessage(event.target.value)} placeholder="What do you want to build or change?" aria-label="AI command"/>
      <label className={!advancedReady?"reasoning locked":"reasoning"}><input type="checkbox" checked={advanced} disabled={!advancedReady} onChange={event=>setAdvanced(event.target.checked)}/><span>Advanced</span></label>
      <button disabled={sending||!message.trim()} aria-label="Send command">{sending?"…":"↑"}</button>
    </form>

    <section className="commandSection">
      <div className="sectionHead"><h3>✧ Try these commands</h3><span>{tier} PLAN · {ready.length} READY</span></div>
      <div className="commandCards">{COMMANDS.map(([icon,title,text])=><button key={title} type="button" onClick={()=>setMessage(text)}><i>{icon}</i><b>{title}</b><small>{text}</small></button>)}</div>
    </section>

    <div className="assistantGrid">
      <section className="glass currentContext">
        <div className="sectionHead"><h3>Current Project Context</h3><Link href="/my-apps">Open Projects →</Link></div>
        <div className="contextBody"><div className="projectArt">⌂</div><div><b>Connect an owned project</b><p>Open My Projects or the AI Editor to apply commands to a specific saved project. This page does not invent a project when none is bound.</p></div></div>
        <div className="contextTrack"><i style={{width:ready.length?`${Math.min(100,Math.round(ready.length/Math.max(1,capabilities.length)*100))}%`:"0%"}}/></div>
      </section>
      <section className="glass statusCard">
        <h3>AI Assistant Status</h3>
        <div className="statusRing"><div className="miniBot">●</div></div>
        <b className={loadError?"offline":"online"}>{loadError?"Needs attention":"Online"}</b>
        <p>{loadError?loadError:`${ready.length} managed capabilities are currently ready.`}</p>
      </section>

      <section className="glass suggestions">
        <div className="sectionHead"><h3>✧ AI Suggestions For You</h3><span>Real capability shortcuts</span></div>
        <div className="suggestionCards">{visibleCapabilities.slice(0,4).map((capability,index)=><article key={capability.id||index}><i>{["✺","↗","⌁","✧"][index%4]}</i><b>{capability.name}</b><p>{capability.description}</p><button type="button" onClick={()=>setMessage(`Help me use ${capability.name} for my project.`)}>Ask AI</button></article>)}</div>
        {!visibleCapabilities.length&&!loadError&&<div className="empty">Checking managed capabilities…</div>}
      </section>
      <section className="glass canDo">
        <h3>What I Can Do</h3>
        {(visibleCapabilities.length?visibleCapabilities:COMMANDS.map(([,title])=>({name:title}))).map((item,index)=><div key={item.id||item.name||index}><span>✓ {item.name}</span><b>{visibleCapabilities.length?"●":""}</b></div>)}
      </section>

      <section className="glass activity">
        <div className="sectionHead"><h3>Recent AI Activity</h3><span>This session</span></div>
        {!messages.length?<div className="empty">No commands have been run in this session yet.</div>:messages.slice(-6).reverse().map((item,index)=><article key={`${item.role}-${index}`} className={item.role}><i>{item.role==="assistant"?"✦":item.role==="error"?"!":"●"}</i><div><b>{item.role==="assistant"?"LANERIQ AI response":item.role==="user"?"Command submitted":"Command notice"}</b><p>{item.content}</p></div></article>)}
      </section>
      <section className="glass proTip">
        <h3>✧ Pro Tip</h3><p>Be specific about the result, page, data and behavior you want. LANERIQ AI will keep risky or live changes behind the existing approval gates.</p><Link href="/templates">Explore Templates →</Link>
      </section>
    </div>

    {messages.length>0&&<section className="glass conversation"><div className="sectionHead"><h3>Conversation</h3><span>{advanced?"Advanced reasoning":"Standard reasoning"}</span></div>{messages.map((item,index)=><article key={index} className={item.role}><small>{item.role==="user"?"YOU":item.role==="assistant"?"LANERIQ AI":"NOTICE"}</small><p>{item.content}</p></article>)}</section>}

    <style jsx>{`
      .assistantReference{min-height:100vh;position:relative;color:#f7f8ff;padding:116px clamp(22px,5vw,74px) 170px;font-family:Inter,system-ui,sans-serif;background:#03101e;overflow:hidden}.assistantBackdrop{position:fixed;inset:0;background:linear-gradient(180deg,rgba(2,9,24,.16),rgba(2,8,20,.75) 42%,#020a17 82%),radial-gradient(circle at 72% 18%,rgba(104,63,255,.32),transparent 28%),url('/laneriq-future-city-people.webp') center top/cover no-repeat;z-index:0}.assistantReference>section,.assistantGrid,.commandBar{position:relative;z-index:1;max-width:1180px;margin-left:auto;margin-right:auto}.assistantHero{min-height:260px;display:grid;grid-template-columns:minmax(0,1fr) 320px;align-items:end;gap:30px}.assistantCopy small{font-size:11px;letter-spacing:.15em;color:#f2bd5c;font-weight:900}.assistantCopy h1{font-size:clamp(42px,6vw,70px);line-height:.98;margin:10px 0 4px}.assistantCopy h2{font-size:clamp(28px,4vw,48px);margin:0;color:#f4c66e}.assistantCopy p{max-width:640px;color:#d4dcf0;font-size:17px;line-height:1.55}.assistantBot{justify-self:end;width:260px;height:235px;position:relative;filter:drop-shadow(0 0 38px #7d43ff88)}.botHead{position:absolute;inset:18px 20px 26px;border-radius:48% 48% 42% 42%;border:2px solid #a690ff;background:linear-gradient(145deg,#8c73ff 0 8%,#12254d 34%,#050b20 70%);box-shadow:inset 0 0 38px #42b8ff33,0 0 34px #713cff99}.botHead:before,.botHead:after{content:"";position:absolute;top:68px;width:34px;height:42px;border-radius:50%;background:#8f5dff;box-shadow:0 0 20px #a66fff}.botHead:before{left:60px}.botHead:after{right:60px}.botHead b{position:absolute;left:50%;top:107px;transform:translateX(-50%);color:#baa5ff}.assistantBot>span{position:absolute;right:4px;bottom:0;border:1px solid #9e77ff77;background:#141333cc;border-radius:999px;padding:7px 13px;color:#cdbdff}.commandBar{display:grid;grid-template-columns:auto minmax(0,1fr) auto 58px;gap:10px;align-items:center;padding:12px 14px;margin-top:10px;border:1px solid #9578ff88;border-radius:20px;background:linear-gradient(180deg,rgba(28,31,72,.82),rgba(10,17,43,.86));box-shadow:0 0 28px #6738ff55, inset 0 1px #ffffff22;backdrop-filter:blur(22px)}.commandBar>span{font-size:25px;color:#b894ff}.commandBar input{min-width:0;border:0;background:transparent;color:white;font-size:17px;outline:0;padding:11px}.reasoning{display:flex;gap:7px;align-items:center;font-size:11px;color:#b7c1dd}.reasoning.locked{opacity:.5}.commandBar button{width:54px;height:54px;border:1px solid #c9a8ff99;border-radius:17px;background:linear-gradient(145deg,#a35cff,#623bf0);color:#fff;font-size:30px;box-shadow:0 0 22px #793eff88}.commandBar button:disabled{opacity:.42}.commandSection{margin-top:20px}.sectionHead{display:flex;justify-content:space-between;align-items:center;gap:18px;margin-bottom:12px}.sectionHead h3{margin:0;font-size:17px}.sectionHead span,.sectionHead a{font-size:12px;color:#88a9e8;text-decoration:none}.commandCards{display:grid;grid-template-columns:repeat(6,1fr);gap:10px}.commandCards button,.suggestionCards article,.glass{border:1px solid rgba(164,180,231,.22);background:linear-gradient(180deg,rgba(17,35,67,.86),rgba(7,18,39,.92));border-radius:18px;box-shadow:inset 0 1px rgba(255,255,255,.06),0 15px 40px rgba(0,0,0,.18);backdrop-filter:blur(20px)}.commandCards button{min-height:145px;padding:15px;text-align:left;color:white;display:flex;flex-direction:column;gap:8px}.commandCards button:hover{border-color:#8964ff;transform:translateY(-1px)}.commandCards i,.suggestionCards i{font-style:normal;width:42px;height:42px;display:grid;place-items:center;border-radius:12px;background:#482a9e;color:#c5a8ff;font-size:23px}.commandCards b{font-size:14px}.commandCards small{color:#aebad5;line-height:1.4}.assistantGrid{margin-top:16px;display:grid;grid-template-columns:minmax(0,1.75fr) minmax(260px,.75fr);gap:14px}.glass{padding:18px}.contextBody{display:grid;grid-template-columns:90px 1fr;gap:15px;align-items:center}.projectArt{height:78px;border-radius:14px;display:grid;place-items:center;font-size:36px;background:linear-gradient(145deg,#5c3dc0,#0d6c8b);box-shadow:0 0 24px #5e49ff44}.contextBody p,.statusCard p,.proTip p,.suggestionCards p,.activity p{color:#aebbd5;line-height:1.45;margin:5px 0}.contextTrack{height:7px;border-radius:999px;background:#182746;margin-top:17px;overflow:hidden}.contextTrack i{display:block;height:100%;background:linear-gradient(90deg,#8b4dff,#5b64ff)}.statusCard{text-align:center}.statusRing{margin:12px auto;width:118px;height:118px;border-radius:50%;padding:8px;background:conic-gradient(#7445ff,#44d8bb,#7445ff);box-shadow:0 0 30px #6c48ff66}.miniBot{height:100%;border-radius:50%;display:grid;place-items:center;font-size:34px;background:#08162d;color:#9d6dff}.statusCard .online{display:block;color:#54da91}.statusCard .offline{display:block;color:#f2b95f}.suggestionCards{display:grid;grid-template-columns:repeat(4,1fr);gap:9px}.suggestionCards article{padding:13px;min-height:190px}.suggestionCards b{display:block;margin-top:9px;font-size:13px}.suggestionCards p{font-size:11px}.suggestionCards button{border:1px solid #ffffff22;background:#0d1a35;color:#fff;border-radius:999px;padding:7px 10px}.canDo>div{display:flex;justify-content:space-between;padding:9px 0;border-bottom:1px solid #ffffff10;font-size:12px}.canDo b{color:#4ee08d}.activity article{display:grid;grid-template-columns:30px 1fr;gap:10px;padding:10px 0;border-bottom:1px solid #ffffff10}.activity article i{font-style:normal;width:28px;height:28px;display:grid;place-items:center;border-radius:8px;background:#5631ae;color:#fff}.activity article p{font-size:12px;max-height:44px;overflow:hidden}.proTip{background:linear-gradient(145deg,rgba(64,28,116,.9),rgba(17,28,60,.9))}.proTip a{color:#7db2ff;text-decoration:none}.conversation{margin-top:15px}.conversation article{padding:11px 13px;margin:8px 0;border-radius:13px;background:#091a34}.conversation article.user{margin-left:16%;background:#35236e}.conversation article.error{border:1px solid #c4626255}.conversation small{font-size:9px;letter-spacing:.12em;color:#8ea7d1}.conversation p{white-space:pre-wrap;margin:5px 0;line-height:1.5}.empty{padding:25px;text-align:center;color:#8da0c1;border:1px dashed #ffffff20;border-radius:14px}@media(max-width:940px){.assistantReference{padding:96px 18px 150px}.assistantHero{grid-template-columns:1fr 210px}.assistantBot{width:200px;height:190px}.commandCards{grid-template-columns:repeat(3,1fr)}.assistantGrid{grid-template-columns:1fr}.suggestionCards{grid-template-columns:repeat(2,1fr)}}@media(max-width:620px){.assistantReference{padding-top:84px}.assistantHero{min-height:350px;grid-template-columns:1fr}.assistantBot{position:absolute;right:-44px;top:55px;width:190px;opacity:.72}.assistantCopy{position:relative;z-index:2;padding-right:72px}.assistantCopy h1{font-size:40px}.assistantCopy h2{font-size:27px}.assistantCopy p{font-size:14px}.commandBar{grid-template-columns:auto 1fr 50px}.reasoning{display:none}.commandCards{display:flex;overflow:auto}.commandCards button{min-width:142px}.suggestionCards{grid-template-columns:1fr 1fr}.contextBody{grid-template-columns:70px 1fr}}
    `}</style>
  </main>;
}
