"use client";

import Link from "next/link";
import { useEffect,useState } from "react";

const PRESETS=[
  {name:"Lead follow-up",triggerType:"form_submitted",actions:[{type:"save_crm",label:"Save customer to CRM"},{type:"send_email",label:"Send confirmation email"},{type:"notify_team",label:"Notify team"}]},
  {name:"Appointment confirmation",triggerType:"appointment_created",actions:[{type:"send_email",label:"Send appointment confirmation"},{type:"send_sms",label:"Send SMS reminder"},{type:"calendar",label:"Add to calendar"}]},
  {name:"Order update",triggerType:"order_created",actions:[{type:"save_order",label:"Save order"},{type:"send_email",label:"Send receipt / confirmation"},{type:"notify_team",label:"Notify operations"}]}
];

export default function WorkflowPage({params}){
  const[appId,setAppId]=useState(null);const[app,setApp]=useState(null);const[workflows,setWorkflows]=useState([]);const[busy,setBusy]=useState(false);const[message,setMessage]=useState("");const[error,setError]=useState("");
  useEffect(()=>{Promise.resolve(params).then(v=>setAppId(v.id))},[params]);
  useEffect(()=>{if(appId)load()},[appId]);
  async function load(){setError("");try{const r=await fetch(`/api/apps/${appId}/workflows`,{cache:"no-store"});const d=await r.json();if(!r.ok)throw new Error(d?.error||"Unable to load workflows.");setApp(d.app);setWorkflows(d.workflows||[])}catch(e){setError(e.message)}}
  async function addPreset(preset){setBusy(true);setError("");setMessage("");try{const r=await fetch(`/api/apps/${appId}/workflows`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(preset)});const d=await r.json();if(!r.ok)throw new Error(d?.error||"Unable to create workflow.");setMessage(`${preset.name} added.`);await load()}catch(e){setError(e.message)}finally{setBusy(false)}}
  return <main className="page"><div className="wrap"><Link className="back" href={appId?`/app-dashboard/${appId}`:"/my-apps"}>← Project Folder</Link><div className="eyebrow">SOOLENAI · WORKFLOW AUTOMATION</div><h1>{app?.name||"Project"}</h1><p className="intro">Build business automation in plain language. Customers never need to know which database, email, SMS, calendar or infrastructure provider runs underneath.</p>
  <section className="presets"><h2>One-click workflows</h2><div className="grid">{PRESETS.map(p=><article key={p.name}><h3>{p.name}</h3><p>When <b>{p.triggerType.replaceAll("_"," ")}</b></p>{p.actions.map((a,i)=><div key={i}>→ {a.label}</div>)}<button disabled={busy} onClick={()=>addPreset(p)}>Add workflow</button></article>)}</div></section>
  <section className="saved"><h2>Saved workflows</h2>{workflows.length?workflows.map(w=><article key={w.id}><div><b>{w.name}</b><small>{w.enabled?"Active":"Paused"} · Trigger: {w.trigger_type}</small></div><span>{Array.isArray(w.actions)?w.actions.length:0} actions</span></article>):<p>No workflows yet.</p>}</section>
  {message&&<div className="msg">{message}</div>}{error&&<div className="err">{error}</div>}
  </div><style jsx>{`.page{min-height:100vh;padding:36px 18px 80px;background:linear-gradient(145deg,#03100d,#0a2119 58%,#06140f);color:#f5fff9}.wrap{max-width:1080px;margin:auto}.back{color:#d8bf62;text-decoration:none}.eyebrow{margin-top:28px;color:#d8bf62;letter-spacing:.18em;font-size:11px;font-weight:900}h1{font-size:48px;margin:8px 0}.intro{max-width:800px;color:#9cb0a8;line-height:1.65}.presets,.saved{margin-top:28px}.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:14px}.grid article,.saved article{border:1px solid rgba(216,191,98,.2);border-radius:20px;background:rgba(3,16,13,.78);padding:20px}.grid h3{margin-top:0}.grid p,.grid article>div,.saved small{color:#97aaa2}.grid article>div{margin:7px 0;font-size:13px}.grid button{margin-top:15px;border:0;border-radius:12px;padding:12px 14px;background:#d8bf62;color:#07130e;font-weight:900}.saved{display:grid;gap:10px}.saved>h2{margin-bottom:4px}.saved article{display:flex;justify-content:space-between;gap:15px;align-items:center}.saved b,.saved small{display:block}.saved small{margin-top:4px}.saved span{color:#d8bf62;font-size:12px}.msg,.err{margin-top:14px;padding:12px;border-radius:12px}.msg{background:#1c6b4d33;color:#9fe2c2}.err{background:#7c2d2d44;color:#ffb5ad}@media(max-width:760px){.grid{grid-template-columns:1fr}.saved article{align-items:flex-start;flex-direction:column}h1{font-size:38px}}`}</style></main>
}
