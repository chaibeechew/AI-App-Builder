import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "../../../lib/supabase/server.js";
import { getAppBuilderAccess } from "../../../lib/app-builder-access.js";

export default async function AppDashboard({ params }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth");
  const { data: app } = await supabase.from("apps").select("id,name,description,current_version_id,publish_status").eq("id", id).eq("owner_id", user.id).single();
  if (!app) redirect("/my-apps");
  const [access, { data: versions }, { data: backend }, { data: media }, { data: workflows }] = await Promise.all([
    getAppBuilderAccess(supabase, user.id),
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
  const proActive = access.professional.active;
  const proStatus = proActive ? `Active · ${access.professional.daysRemaining} days left` : "US$68 · 365 days · no auto-renew";

  return <main className="page"><div className="wrap">
    <div className="top"><Link href="/my-apps">← My Projects</Link><div><Link href="/pricing">Fair Price · Fair Use</Link></div></div>
    <header><div><span>YOUR PROJECT</span><h1>{app.name}</h1><p>{app.description || "Your App + Website project."}</p></div><b>{app.publish_status === "published" ? "Published" : "Draft"}</b></header>

    <section className="modePanel">
      <div className="modeIntro"><span>WORKSPACE MODE</span><h2>Simple by default. Deeper control when you want it.</h2><p>Standard and Professional use the same project and the same version history. Switching mode never creates a duplicate project or lowers quality.</p></div>
      <div className="modeSwitch">
        <div className="mode active"><small>STANDARD MODE · CURRENT</small><strong>AI handles everything for you.</strong><p>Describe what you want in normal language. No code required.</p><b>Premium quality included</b></div>
        <Link className={`mode pro ${proActive ? "unlocked" : ""}`} href={`/pro/${id}`}><small>PROFESSIONAL MODE</small><strong>Advanced control with AI assistance.</strong><p>Use deeper Design, Logic and Release controls only when you need them.</p><b>{proStatus} →</b></Link>
      </div>
    </section>

    <section className="aiFirst"><div><span>STANDARD MODE · NO CODE NEEDED</span><h2>Want to change something?</h2><p>Tell AI in normal language: change the style, background, layout, wording, buttons, pages or mobile experience. Every safe change is versioned so you can undo it.</p></div><Link href={`/editor/${id}`}>✨ Tell AI What to Change →</Link></section>

    <section className="mainActions">
      <Link href={`/a/${id}?demo=1`}><i>📱</i><strong>Open App Demo</strong><span>See the customer experience</span></Link>
      <Link href={`/website/${id}`}><i>🌐</i><strong>Preview Website</strong><span>Check mobile + desktop</span></Link>
      <Link href={`/editor/${id}`}><i>✨</i><strong>Change Design</strong><span>No-code AI visual editing</span></Link>
      <Link href={`/release/${id}`}><i>🚀</i><strong>Publishing</strong><span>Prepare Website, App and store release</span></Link>
    </section>

    <section className="statusGrid"><div><small>Version</small><strong>{current?.version_no || 1}</strong></div><div><small>Pages</small><strong>{pages.length}</strong></div><div><small>Features</small><strong>{features.length}</strong></div><div><small>Data Groups</small><strong>{dataGroups}</strong></div><div><small>Media</small><strong>{media?.length || 0}</strong></div><div><small>Automations</small><strong>{workflowCount}</strong></div></section>

    <section className="simpleTools"><div><span>ADVANCED CONTROLS</span><h2>Only open these when you need them.</h2><p>AI handles the complicated parts first. These controls stay available when you want to see or adjust more detail.</p></div><div className="tools"><Link href={`/database/${id}`}>Customer Data</Link><Link href={`/workflows/${id}`}>Automations</Link><Link href={`/integrations/${id}`}>Connections</Link><Link href={`/monetization/${id}`}>Payments</Link><Link href={`/analytics/${id}`}>Analytics</Link><Link href={`/operations/${id}`}>AI Health Check</Link><Link href={`/app-dashboard/${id}/versions`}>Undo / Versions</Link><a href={`/api/apps/${id}/export`}>Export Project</a></div></section>
  </div><style>{`.page{min-height:100vh;padding:30px 18px 80px;background:radial-gradient(circle at 70% 8%,#d8bf6220,transparent 24%),linear-gradient(145deg,#03100d,#0a2119 58%,#06140f);color:#f5fff9}.wrap{max-width:1080px;margin:auto}.top{display:flex;justify-content:space-between;gap:12px}.top>div{display:flex;gap:8px;flex-wrap:wrap}.top a{color:#e2c868;text-decoration:none;font-size:12px}.top>div a{border:1px solid #d8bf6233;border-radius:999px;padding:8px 11px}header{display:flex;justify-content:space-between;gap:18px;align-items:flex-start;padding:50px 0 26px}header span,.modeIntro span,.aiFirst span,.simpleTools span{color:#d8bf62;font-size:10px;letter-spacing:.18em;font-weight:950}h1{font-size:clamp(42px,7vw,72px);margin:8px 0}header p,.modeIntro p,.mode p,.aiFirst p,.simpleTools p{color:#9db0a8;line-height:1.6}header>b{border:1px solid #77d6a733;border-radius:999px;padding:9px 13px;color:#8ce0b8}.modePanel{border:1px solid #ffffff12;border-radius:24px;padding:22px;background:#04140fdd;margin-bottom:14px}.modeIntro h2{font-size:28px;margin:7px 0}.modeIntro p{margin:0;max-width:800px}.modeSwitch{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:17px}.mode{display:flex;flex-direction:column;gap:7px;min-height:150px;padding:18px;border-radius:18px;border:1px solid #ffffff12;background:#071b15;color:#fff;text-decoration:none}.mode small{color:#8ca198;font-size:9px;letter-spacing:.13em;font-weight:900}.mode strong{font-size:20px}.mode p{font-size:12px;margin:0}.mode b{margin-top:auto;color:#d8bf62;font-size:12px}.mode.active{border-color:#79d7ac55;background:linear-gradient(145deg,#79d7ac12,#071b15)}.mode.active small{color:#8ce0b8}.mode.pro{border-color:#d8bf6236;background:linear-gradient(145deg,#d8bf620d,#071b15)}.mode.pro.unlocked{border-color:#d8bf6270;box-shadow:inset 0 0 0 1px #d8bf621a}.aiFirst{display:flex;justify-content:space-between;gap:20px;align-items:center;padding:25px;border:1px solid #d8bf6240;border-radius:24px;background:linear-gradient(135deg,#d8bf6212,#061a14dd)}.aiFirst h2,.simpleTools h2{font-size:32px;margin:7px 0}.aiFirst a{white-space:nowrap;background:linear-gradient(135deg,#f0d87d,#c7922b);color:#07130e;text-decoration:none;font-weight:950;padding:15px 19px;border-radius:14px}.mainActions{display:grid;grid-template-columns:repeat(4,1fr);gap:11px;margin-top:14px}.mainActions a{display:flex;flex-direction:column;gap:6px;min-height:150px;padding:20px;border:1px solid #ffffff10;background:#061813d8;border-radius:20px;color:#fff;text-decoration:none}.mainActions i{font-style:normal;font-size:26px}.mainActions strong{font-size:18px}.mainActions span{color:#8fa59b;font-size:12px;line-height:1.4}.statusGrid{display:grid;grid-template-columns:repeat(6,1fr);gap:8px;margin-top:14px}.statusGrid div{padding:15px;border-radius:16px;background:#0b251c;border:1px solid #ffffff0e}.statusGrid small,.statusGrid strong{display:block}.statusGrid small{color:#7f978d;font-size:9px}.statusGrid strong{font-size:23px;margin-top:4px}.simpleTools{margin-top:14px;padding:24px;border:1px solid #ffffff10;background:#04140fdd;border-radius:22px}.tools{display:flex;gap:8px;flex-wrap:wrap;margin-top:16px}.tools a{color:#d8bf62;text-decoration:none;border:1px solid #d8bf6230;background:#0b251c;border-radius:11px;padding:10px 12px;font-size:12px;font-weight:800}@media(max-width:820px){.mainActions{grid-template-columns:1fr 1fr}.modeSwitch{grid-template-columns:1fr}.statusGrid{grid-template-columns:repeat(3,1fr)}.aiFirst{align-items:flex-start;flex-direction:column}.aiFirst a{white-space:normal}}@media(max-width:520px){.mainActions{grid-template-columns:1fr 1fr}.top{flex-direction:column}.statusGrid{grid-template-columns:1fr 1fr}}`}</style></main>;
}
