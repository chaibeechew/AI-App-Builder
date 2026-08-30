import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "../../../lib/supabase/server.js";

export default async function AppDashboard({ params }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth");
  const { data: app, error } = await supabase.from("apps").select("id,name,description,created_at,updated_at,current_version_id,visibility,publish_status").eq("id", id).eq("owner_id", user.id).single();
  if (error || !app) redirect("/my-apps");
  const { data: versions } = await supabase.from("app_versions").select("id,version_no,specification,change_summary,created_at").eq("app_id", id).order("version_no", { ascending: false });
  const current = versions?.find(v => v.id === app.current_version_id) || versions?.[0];
  const spec = current?.specification || {};
  const pages = Array.isArray(spec.pages) ? spec.pages : [];
  const features = Array.isArray(spec.features) ? spec.features : [];
  return <main className="page"><div className="wrap">
    <Link href="/my-apps" className="back">← Project Center</Link>
    <header><div><div className="eyebrow">CUSTOMER PROJECT FOLDER</div><h1>{app.name}</h1><p>{app.description || "Your App and Website workspace."}</p></div><span className="status">{app.publish_status === "published" ? "App + Website Published" : "Draft"}</span></header>
    <section className="stats"><div><small>Version</small><strong>{current?.version_no || 1}</strong></div><div><small>Website Sections</small><strong>{pages.length}</strong></div><div><small>App Features</small><strong>{features.length}</strong></div></section>
    <section className="deliverables">
      <article><div className="eyebrow">📱 CUSTOMER APP</div><h2>Functional App</h2><p>Interactive customer App with data, navigation and install options.</p><div className="actions"><Link href={`/a/${id}?demo=1`} className="primary">Open App Demo</Link><Link href={`/editor/${id}`} className="secondary">Modify App</Link></div></article>
      <article><div className="eyebrow">🌐 CUSTOMER WEBSITE</div><h2>Responsive Website</h2><p>Business Website for mobile and desktop, generated from the same project.</p><div className="actions"><Link href={`/website/${id}`} className="primary">Preview Website</Link><Link href={`/website/${id}?domain=1`} className="secondary">Domain Settings</Link></div></article>
    </section>
    <section className="card"><div className="eyebrow">PROJECT ACTIONS</div><h2>Manage App + Website together</h2><div className="actions"><Link href={`/editor/${id}`} className="primary">Modify Project</Link><Link href={`/app-dashboard/${id}/versions`} className="secondary">Version History / Rollback</Link><Link href={`/release/${id}`} className="secondary">Publishing Center</Link></div><div className="flow"><span>Demo</span><i>→</i><span>App + Website</span><i>→</i><span>Modify</span><i>→</i><span>Test</span><i>→</i><span>Publish</span></div></section>
    <section className="card"><div className="eyebrow">CURRENT VERSION</div><h2>Shared project structure</h2>{pages.length ? pages.map((p,i)=><div className="row" key={i}><strong>{p?.name || `Page ${i+1}`}</strong><span>{p?.purpose || "App page and Website section"}</span></div>) : <p>No page structure available yet.</p>}</section>
    <section className="card"><div className="eyebrow">SOURCE CODE</div><h2>Customer source access</h2><p>App and Website Source Code remain inside the protected Hidden Folder. Server-side permissions decide access.</p><div className="protected">🔐 Protected by server-side access control</div></section>
    <footer><Link href={`/app-dashboard/${id}/versions`}>Version History</Link><Link href={`/release/${id}`}>Open Publishing Center</Link><Link href="/my-apps">Back to Project Center</Link></footer>
  </div><style>{`.page{min-height:100vh;padding:36px 18px 80px;background:linear-gradient(145deg,#03100d,#0a2119 58%,#06140f);color:#f5fff9}.wrap{max-width:1050px;margin:auto}.back,footer a{color:#d8bf62;text-decoration:none}.eyebrow{color:#d8bf62;letter-spacing:.18em;font-size:11px;font-weight:900}.page header{display:flex;justify-content:space-between;gap:20px;align-items:flex-start;margin:22px 0 26px}.page h1{font-size:46px;margin:8px 0}.page p{color:#93aaa0;line-height:1.6}.status{color:#79d7ac;border:1px solid rgba(121,215,172,.2);border-radius:999px;padding:9px 13px;font-size:12px;font-weight:800}.stats{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:16px}.stats div,.card,.deliverables article{border:1px solid rgba(255,255,255,.08);background:rgba(3,16,13,.78);border-radius:20px;padding:20px}.stats small,.stats strong{display:block}.stats small{color:#7f9990;font-size:11px}.stats strong{font-size:28px;margin-top:5px}.deliverables{display:grid;grid-template-columns:1fr 1fr;gap:14px}.deliverables h2{font-size:28px;margin:9px 0}.card{margin-top:16px}.card h2{margin:8px 0 18px}.actions{display:flex;gap:10px;flex-wrap:wrap}.primary,.secondary{display:inline-flex;padding:12px 16px;border-radius:12px;font-weight:800;text-decoration:none}.primary{background:#d8bf62;color:#07130e}.secondary{border:1px solid rgba(216,191,98,.25);color:#d8bf62}.flow{display:flex;gap:10px;flex-wrap:wrap;align-items:center;margin-top:20px;color:#a9bbb4}.flow span{padding:8px 11px;border-radius:10px;background:#0e3024;color:#d8bf62}.row{display:grid;grid-template-columns:220px 1fr;gap:18px;padding:14px 0;border-top:1px solid rgba(255,255,255,.06)}.row span{color:#8ea69c}.protected{margin-top:14px;padding:12px;border-radius:12px;background:rgba(70,190,140,.08);color:#8de0bb}footer{display:flex;justify-content:space-between;gap:14px;margin-top:24px;flex-wrap:wrap}@media(max-width:700px){.stats,.deliverables{grid-template-columns:1fr}.page header{flex-direction:column}.row{grid-template-columns:1fr}footer{flex-direction:column;gap:12px}}`}</style></main>;
}
