import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "../../../lib/supabase/server.js";

export default async function AppDashboard({ params }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth");
  const { data: app } = await supabase.from("apps").select("id,name,description,current_version_id,publish_status").eq("id", id).eq("owner_id", user.id).single();
  if (!app) redirect("/my-apps");
  const [{ data: versions }, { data: backend }, { data: media }, { data: workflows }] = await Promise.all([
    supabase.from("app_versions").select("id,version_no,specification").eq("app_id", id).order("version_no", { ascending: false }),
    supabase.from("app_backend_models").select("schema_json").eq("app_id", id).eq("owner_id", user.id).maybeSingle(),
    supabase.from("project_assets").select("id").eq("app_id", id).eq("owner_id", user.id),
    supabase.from("app_workflows").select("id,enabled").eq("app_id", id).eq("owner_id", user.id),
  ]);
  const current = versions?.find(v => v.id === app.current_version_id) || versions?.[0];
  const spec = current?.specification || {};
  const pages = Array.isArray(spec.pages) ? spec.pages : [];
  const features = Array.isArray(spec.features) ? spec.features : [];
  const dataGroups = Array.isArray(backend?.schema_json?.entities) ? backend.schema_json.entities.length : 0;
  const workflowCount = (workflows || []).filter(x => x.enabled).length;

  return <main className="page"><div className="wrap">
    <div className="top"><Link href="/my-apps">← My Projects</Link><div><Link href="/pricing">Fair Price · Fair Use</Link><Link href={`/pro/${id}`}>Professional Mode</Link></div></div>
    <header><div><span>YOUR PROJECT</span><h1>{app.name}</h1><p>{app.description || "Your App + Website project."}</p></div><b>{app.publish_status === "published" ? "Published" : "Draft"}</b></header>

    <section className="aiFirst"><div><span>NO CODE NEEDED</span><h2>Want to change something?</h2><p>Open the Visual Editor and tell AI in normal language: change the style, background, layout, wording, buttons, pages or mobile experience.</p></div><Link href={`/editor/${id}`}>✨ Tell AI What to Change →</Link></section>

    <section className="mainActions">
      <Link href={`/a/${id}?demo=1`}><i>📱</i><strong>Preview App</strong><span>See the customer experience</span></Link>
      <Link href={`/website/${id}`}><i>🌐</i><strong>Preview Website</strong><span>Check mobile + desktop</span></Link>
      <Link href={`/editor/${id}`}><i>✨</i><strong>Change Design</strong><span>No-code AI visual editing</span></Link>
      <Link href={`/release/${id}`}><i>🚀</i><strong>Publish</strong><span>Website, App and stores</span></Link>
    </section>

    <section className="statusGrid"><div><small>Version</small><strong>{current?.version_no || 1}</strong></div><div><small>Pages</small><strong>{pages.length}</strong></div><div><small>Features</small><strong>{features.length}</strong></div><div><small>Data Groups</small><strong>{dataGroups}</strong></div><div><small>Media</small><strong>{media?.length || 0}</strong></div><div><small>Automations</small><strong>{workflowCount}</strong></div></section>

    <section className="simpleTools"><div><span>MORE TOOLS</span><h2>Only open these when you need them.</h2><p>AI handles the complicated parts. These controls are available for customers who want more detail.</p></div><div className="tools"><Link href={`/database/${id}`}>Customer Data</Link><Link href={`/workflows/${id}`}>Automations</Link><Link href={`/integrations/${id}`}>Connections</Link><Link href={`/monetization/${id}`}>Payments</Link><Link href={`/analytics/${id}`}>Analytics</Link><Link href={`/operations/${id}`}>AI Health Check</Link><Link href={`/app-dashboard/${id}/versions`}>Undo / Versions</Link><a href={`/api/apps/${id}/export`}>Export Project</a></div></section>
  </div><style>{`.page{min-height:100vh;padding:30px 18px 80px;background:radial-gradient(circle at 70% 8%,#d8bf6220,transparent 24%),linear-gradient(145deg,#03100d,#0a2119 58%,#06140f);color:#f5fff9}.wrap{max-width:1080px;margin:auto}.top{display:flex;justify-content:space-between;gap:12px}.top>div{display:flex;gap:8px;flex-wrap:wrap}.top a{color:#e2c868;text-decoration:none;font-size:12px}.top>div a{border:1px solid #d8bf6233;border-radius:999px;padding:8px 11px}header{display:flex;justify-content:space-between;gap:18px;align-items:flex-start;padding:50px 0 26px}header span,.aiFirst span,.simpleTools span{color:#d8bf62;font-size:10px;letter-spacing:.18em;font-weight:950}h1{font-size:clamp(42px,7vw,72px);margin:8px 0}header p,.aiFirst p,.simpleTools p{color:#9db0a8;line-height:1.6}header>b{border:1px solid #77d6a733;border-radius:999px;padding:9px 13px;color:#8ce0b8}.aiFirst{display:flex;justify-content:space-between;gap:20px;align-items:center;padding:25px;border:1px solid #d8bf6240;border-radius:24px;background:linear-gradient(135deg,#d8bf6212,#061a14dd)}.aiFirst h2,.simpleTools h2{font-size:32px;margin:7px 0}.aiFirst a{white-space:nowrap;background:linear-gradient(135deg,#f0d87d,#c7922b);color:#07130e;text-decoration:none;font-weight:950;padding:15px 19px;border-radius:14px}.mainActions{display:grid;grid-template-columns:repeat(4,1fr);gap:11px;margin-top:14px}.mainActions a{display:flex;flex-direction:column;gap:6px;min-height:150px;padding:20px;border:1px solid #ffffff10;background:#061813d8;border-radius:20px;color:#fff;text-decoration:none}.mainActions i{font-style:normal;font-size:26px}.mainActions strong{font-size:18px}.mainActions span{color:#8fa59b;font-size:12px;line-height:1.4}.statusGrid{display:grid;grid-template-columns:repeat(6,1fr);gap:8px;margin-top:14px}.statusGrid div{padding:15px;border-radius:16px;background:#0b251c;border:1px solid #ffffff0e}.statusGrid small,.statusGrid strong{display:block}.statusGrid small{color:#7f978d;font-size:9px}.statusGrid strong{font-size:23px;margin-top:4px}.simpleTools{margin-top:14px;padding:24px;border:1px solid #ffffff10;background:#04140fdd;border-radius:22px}.tools{display:flex;gap:8px;flex-wrap:wrap;margin-top:16px}.tools a{color:#d8bf62;text-decoration:none;border:1px solid #d8bf6230;background:#0b251c;border-radius:11px;padding:10px 12px;font-size:12px;font-weight:800}@media(max-width:820px){.mainActions{grid-template-columns:1fr 1fr}.statusGrid{grid-template-columns:repeat(3,1fr)}.aiFirst{align-items:flex-start;flex-direction:column}.aiFirst a{white-space:normal}}@media(max-width:520px){.mainActions{grid-template-columns:1fr 1fr}.top{flex-direction:column}.statusGrid{grid-template-columns:1fr 1fr}}`}</style></main>;
}
