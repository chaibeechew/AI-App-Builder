"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export default function DatabaseBuilder({ params }) {
  const [appId, setAppId] = useState(null);
  const [app, setApp] = useState(null);
  const [model, setModel] = useState(null);
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
      if (!response.ok) throw new Error(data?.error || "Unable to load Data Builder.");
      setApp(data.app); setModel(data.model);
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  }

  async function generate() {
    setBuilding(true); setError(""); setMessage("");
    try {
      const response = await fetch(`/api/apps/${appId}/database`, { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || "Unable to create data model.");
      setModel(data.model); setMessage("Your project data structure is ready. The technical database provider stays hidden in the background.");
    } catch (err) { setError(err.message); }
    finally { setBuilding(false); }
  }

  if (loading) return <main className="page"><div className="loading">Preparing your project data…</div></main>;
  const schema = model?.schema_json || {};
  const entities = Array.isArray(schema.entities) ? schema.entities : [];
  const relationships = Array.isArray(schema.relationships) ? schema.relationships : [];
  const policies = Array.isArray(schema.policies) ? schema.policies : [];

  return <main className="page"><div className="wrap">
    <Link href={appId ? `/app-dashboard/${appId}` : "/my-apps"} className="back">← Project Folder</Link>
    <header><div><div className="eyebrow">AI APP BUILDER · DATA</div><h1>Database Builder</h1><p>{app?.name || "Project"} · Build the data layer without learning or managing the underlying database platform.</p></div><span className="badge">PRIVATE BY DEFAULT</span></header>

    <section className="heroCard"><div><small>NO-CODE BACKEND</small><h2>Tell AI what the App does.<br/>We organize the data behind it.</h2><p>Customers see business concepts such as Customers, Properties, Orders or Appointments — not SQL, database keys or infrastructure settings.</p></div><button onClick={generate} disabled={building}>{building ? "Building…" : model ? "Rebuild from Current App →" : "Build My Data Structure →"}</button></section>

    {message && <div className="success">{message}</div>}{error && <div className="error">{error}</div>}

    {model ? <>
      <section className="summary"><article><small>Status</small><strong>{model.status === "ready" ? "Ready" : model.status}</strong></article><article><small>Data Groups</small><strong>{entities.length}</strong></article><article><small>Relationships</small><strong>{relationships.length}</strong></article><article><small>Privacy Rules</small><strong>{policies.length}</strong></article></section>

      <section className="panel"><div className="sectionHead"><div><div className="eyebrow">DATA GROUPS</div><h2>Your app's business data</h2></div><span>Technical provider hidden</span></div><div className="grid">{entities.map((entity, index) => <article className="entity" key={`${entity.name}-${index}`}><div className="number">{String(index + 1).padStart(2,"0")}</div><h3>{entity.name}</h3><p>{entity.note}</p><div className="fields">{(entity.fields || []).map(field => <span key={field}>{field}</span>)}</div><small>🔐 {entity.access}</small></article>)}</div></section>

      <section className="twoCol"><article className="panel"><div className="eyebrow">RELATIONSHIPS</div><h2>How the data connects</h2>{relationships.length ? relationships.map(r => <div className="rule" key={r}>{r}</div>) : <p>No special relationships are needed yet.</p>}</article><article className="panel"><div className="eyebrow">PRIVACY & SECURITY</div><h2>Default protection</h2>{policies.map(p => <div className="rule" key={p}>✓ {p}</div>)}</article></section>

      <div className="next"><b>Next:</b> Workflow Automation will use this project data to create flows such as enquiry → CRM → notification → follow-up, without exposing infrastructure to the customer.</div>
    </> : <section className="empty"><h2>No data model yet</h2><p>Tap “Build My Data Structure” and AI App Builder will create a safe first version from the current App + Website specification.</p></section>}
  </div><style jsx>{`
    .page{min-height:100vh;padding:36px 18px 80px;background:linear-gradient(145deg,#03100d,#0a2119 58%,#06140f);color:#f5fff9}.wrap{max-width:1120px;margin:auto}.back{color:#d8bf62;text-decoration:none}.eyebrow,.heroCard small{color:#d8bf62;letter-spacing:.18em;font-size:11px;font-weight:900}header{display:flex;justify-content:space-between;gap:20px;margin:26px 0}h1{font-size:50px;margin:8px 0}.page p{color:#93aaa0;line-height:1.6}.badge{height:max-content;padding:9px 12px;border-radius:999px;border:1px solid rgba(121,215,172,.25);color:#79d7ac;font-size:11px;font-weight:900}.heroCard,.panel,.empty{border:1px solid rgba(216,191,98,.18);border-radius:24px;background:rgba(3,16,13,.8);padding:24px}.heroCard{display:flex;justify-content:space-between;align-items:flex-end;gap:24px}.heroCard h2,.panel h2{font-size:30px;margin:7px 0 10px}.heroCard button{border:0;border-radius:14px;padding:14px 18px;background:#d8bf62;color:#07130e;font-weight:900;white-space:nowrap}.heroCard button:disabled{opacity:.55}.success,.error,.next{margin-top:16px;padding:14px;border-radius:14px}.success{background:rgba(70,190,140,.11);color:#8de0bb}.error{background:rgba(220,70,70,.11);color:#ff9b9b}.summary{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin:16px 0}.summary article{padding:17px;border:1px solid rgba(255,255,255,.07);border-radius:16px;background:rgba(3,16,13,.65)}.summary small,.summary strong{display:block}.summary small{color:#80988f}.summary strong{font-size:24px;margin-top:5px}.panel{margin-top:16px}.sectionHead{display:flex;justify-content:space-between;gap:14px;align-items:flex-end}.sectionHead>span{color:#79d7ac;font-size:11px}.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}.entity{padding:18px;border-radius:18px;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.07)}.number{color:#d8bf62;font-size:11px;font-weight:900}.entity h3{font-size:22px;margin:8px 0}.entity p{font-size:13px;min-height:42px}.fields{display:flex;flex-wrap:wrap;gap:6px;margin:12px 0}.fields span{font-size:11px;color:#cbd7d2;background:#0d3025;border-radius:8px;padding:6px 8px}.entity small{color:#79d7ac}.twoCol{display:grid;grid-template-columns:1fr 1fr;gap:14px}.rule{padding:10px 0;border-top:1px solid rgba(255,255,255,.06);color:#b9c9c2;font-size:13px}.next{border:1px solid rgba(216,191,98,.16);color:#aebfb8}.empty{margin-top:16px;text-align:center;padding:60px 20px}.loading{min-height:80vh;display:grid;place-items:center;color:#d8bf62}@media(max-width:780px){header,.heroCard{flex-direction:column;align-items:flex-start}.summary{grid-template-columns:1fr 1fr}.grid,.twoCol{grid-template-columns:1fr}.heroCard button{width:100%}h1{font-size:40px}}
  `}</style></main>;
}
