"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

function words(value){return String(value||"").replace(/_id$/i,"").replaceAll("_"," ").replace(/\b\w/g,(m)=>m.toUpperCase());}
function customerFields(fields=[]){
  const hidden=new Set(["id","owner_id","created_by","created_at","updated_at"]);
  return fields.map((field)=>String(field||"").split(":")[0].trim()).filter((name)=>name&&!hidden.has(name)).map(words);
}
function friendlyRelationship(value){
  const match=String(value||"").match(/^([a-z0-9_]+)\.[^→]+→\s*([a-z0-9_]+)\./i);
  return match?`${words(match[1])} connects to ${words(match[2])}`:String(value||"").replaceAll("_"," ");
}

export default function DatabaseBuilder({ params }) {
  const [appId, setAppId] = useState(null);
  const [app, setApp] = useState(null);
  const [model, setModel] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [building, setBuilding] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => { Promise.resolve(params).then(v => setAppId(v.id)); }, [params]);
  useEffect(() => { if (appId) load(); }, [appId]);

  async function load() {
    setLoading(true); setError("");
    try {
      const response = await fetch(`/api/apps/${appId}/database`, { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || "Unable to load Customer Data.");
      setApp(data.app); setModel(data.model); setHistory(data.history || []);
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  }

  async function generate() {
    setBuilding(true); setError(""); setMessage("");
    try {
      const response = await fetch(`/api/apps/${appId}/database`, { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || "Unable to organize project data.");
      setMessage(`Customer Data v${data.version || "new"} is ready. Your previous version is kept so you can undo safely.`); await load();
    } catch (err) { setError(err.message); }
    finally { setBuilding(false); }
  }

  async function rollback(version) {
    if(building)return;setBuilding(true);setError("");setMessage("");
    try{
      const response=await fetch(`/api/apps/${appId}/database/rollback`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({version})});
      const data=await response.json();if(!response.ok)throw new Error(data?.error||"Unable to restore that data version.");
      setMessage(`Restored Customer Data v${data.restoredFrom} safely as new version v${data.newVersion}.`);await load();
    }catch(err){setError(err.message);}finally{setBuilding(false);}
  }

  if (loading) return <main className="page"><div className="loading">Organizing your Customer Data…</div></main>;
  const schema = model?.schema_json || {};
  const entities = Array.isArray(schema.entities) ? schema.entities : [];
  const relationships = Array.isArray(schema.relationships) ? schema.relationships : [];
  const policies = Array.isArray(schema.policies) ? schema.policies : [];

  return <main className="page"><div className="wrap">
    <Link href={appId ? `/app-dashboard/${appId}` : "/my-apps"} className="back">← Project</Link>
    <header><div><div className="eyebrow">SOOLENAI · CUSTOMER DATA</div><h1>Customer Data</h1><p>{app?.name || "Project"} · AI organizes the information your App + Website needs. You never need to see SQL, database keys or infrastructure.</p></div><span className="badge">PRIVATE BY DEFAULT</span></header>

    <section className="heroCard"><div><small>NO CODE NEEDED</small><h2>Tell AI what your business does.<br/>We organize the information behind it.</h2><p>You work with familiar concepts such as Customers, Properties, Orders and Appointments. Technical storage details stay in the background.</p></div><button onClick={generate} disabled={building}>{building ? "Working safely…" : model ? "✨ Refresh from Current Project" : "✨ Organize My Data"}</button></section>

    {message && <div className="success">{message}</div>}{error && <div className="error">{error}</div>}

    {model ? <>
      <section className="summary"><article><small>Status</small><strong>{model.status === "ready" ? "Ready" : model.status}</strong></article><article><small>Data Version</small><strong>v{schema.version || 1}</strong></article><article><small>Information Groups</small><strong>{entities.length}</strong></article><article><small>Undo Points</small><strong>{history.length}</strong></article></section>

      <section className="panel"><div className="sectionHead"><div><div className="eyebrow">INFORMATION GROUPS</div><h2>What your project keeps track of</h2></div><span>Technical details hidden</span></div><div className="grid">{entities.map((entity, index) => {const fields=customerFields(entity.fields||[]);return <article className="entity" key={`${entity.name}-${index}`}><div className="number">{String(index + 1).padStart(2,"0")}</div><h3>{words(entity.name)}</h3><p>{entity.note}</p><div className="fields">{(fields.length?fields:["Core Information"]).map(field => <span key={field}>{field}</span>)}</div><small>🔐 Protected by project privacy rules</small></article>})}</div></section>

      <section className="twoCol"><article className="panel"><div className="eyebrow">CONNECTIONS</div><h2>How your information works together</h2>{relationships.length ? relationships.map(r => <div className="rule" key={r}>{friendlyRelationship(r)}</div>) : <p>No special connections are needed yet.</p>}</article><article className="panel"><div className="eyebrow">PRIVACY & SECURITY</div><h2>Protection by default</h2>{policies.map(p => <div className="rule" key={p}>✓ {p}</div>)}</article></section>

      {history.length>0&&<section className="panel"><div className="eyebrow">UNDO DATA CHANGES</div><h2>Previous Customer Data versions</h2><p>Restoring never deletes the current version. SoolenAI creates a new version from the one you choose.</p><div className="history">{[...history].reverse().map(item=><div key={`${item.version}-${item.savedAt}`}><span><b>Version {item.version}</b><small>{item.savedAt?new Date(item.savedAt).toLocaleString():"Saved version"}</small></span><button disabled={building} onClick={()=>rollback(item.version)}>Restore this version</button></div>)}</div></section>}

      <div className="next"><b>Next:</b> Automations can use these information groups for flows such as enquiry → customer record → notification → follow-up. You still do not need code.</div>
    </> : <section className="empty"><h2>No Customer Data setup yet</h2><p>Tap “Organize My Data” and SoolenAI will create a safe first version from your current App + Website.</p></section>}
  </div><style jsx>{`
    .page{min-height:100vh;padding:36px 18px 80px;background:linear-gradient(145deg,#03100d,#0a2119 58%,#06140f);color:#f5fff9}.wrap{max-width:1120px;margin:auto}.back{color:#d8bf62;text-decoration:none}.eyebrow,.heroCard small{color:#d8bf62;letter-spacing:.18em;font-size:11px;font-weight:900}header{display:flex;justify-content:space-between;gap:20px;margin:26px 0}h1{font-size:50px;margin:8px 0}.page p{color:#93aaa0;line-height:1.6}.badge{height:max-content;padding:9px 12px;border-radius:999px;border:1px solid rgba(121,215,172,.25);color:#79d7ac;font-size:11px;font-weight:900}.heroCard,.panel,.empty{border:1px solid rgba(216,191,98,.18);border-radius:24px;background:rgba(3,16,13,.8);padding:24px}.heroCard{display:flex;justify-content:space-between;align-items:flex-end;gap:24px}.heroCard h2,.panel h2{font-size:30px;margin:7px 0 10px}.heroCard button,.history button{border:0;border-radius:14px;padding:14px 18px;background:#d8bf62;color:#07130e;font-weight:900}.heroCard button{white-space:nowrap}.heroCard button:disabled,.history button:disabled{opacity:.55}.success,.error,.next{margin-top:16px;padding:14px;border-radius:14px}.success{background:rgba(70,190,140,.11);color:#8de0bb}.error{background:rgba(220,70,70,.11);color:#ff9b9b}.summary{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin:16px 0}.summary article{padding:17px;border:1px solid rgba(255,255,255,.07);border-radius:16px;background:rgba(3,16,13,.65)}.summary small,.summary strong{display:block}.summary small{color:#80988f}.summary strong{font-size:24px;margin-top:5px}.panel{margin-top:16px}.sectionHead{display:flex;justify-content:space-between;gap:14px;align-items:flex-end}.sectionHead>span{color:#79d7ac;font-size:11px}.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}.entity{padding:18px;border-radius:18px;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.07)}.number{color:#d8bf62;font-size:11px;font-weight:900}.entity h3{font-size:22px;margin:8px 0}.entity p{font-size:13px;min-height:42px}.fields{display:flex;flex-wrap:wrap;gap:6px;margin:12px 0}.fields span{font-size:11px;color:#cbd7d2;background:#0d3025;border-radius:8px;padding:6px 8px}.entity small{color:#79d7ac}.twoCol{display:grid;grid-template-columns:1fr 1fr;gap:14px}.rule{padding:10px 0;border-top:1px solid rgba(255,255,255,.06);color:#b9c9c2;font-size:13px}.history{display:grid;gap:8px;margin-top:14px}.history>div{display:flex;justify-content:space-between;gap:14px;align-items:center;padding:12px;border-radius:14px;background:#0b261c}.history span,.history small{display:block}.history small{color:#82988f;margin-top:3px}.history button{padding:9px 12px;font-size:11px}.next{border:1px solid rgba(216,191,98,.16);color:#aebfb8}.empty{margin-top:16px;text-align:center;padding:60px 20px}.loading{min-height:80vh;display:grid;place-items:center;color:#d8bf62}@media(max-width:780px){header,.heroCard{flex-direction:column;align-items:flex-start}.summary{grid-template-columns:1fr 1fr}.grid,.twoCol{grid-template-columns:1fr}.heroCard button{width:100%}h1{font-size:40px}.history>div{align-items:flex-start;flex-direction:column}.history button{width:100%}}
  `}</style></main>;
}
