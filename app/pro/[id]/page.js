import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "../../../lib/supabase/server.js";
import { getAppBuilderAccess } from "../../../lib/app-builder-access.js";
import { PRO_MODE, getProToolGroups } from "../../../lib/pro-mode.js";
import ProAssistant from "./ProAssistant.js";
import ProEditTools from "./ProEditTools.js";

const shellCss=`.page{min-height:100vh;background:#04130f;color:#f7f3e8;font-family:Inter,system-ui,-apple-system,sans-serif;position:relative;padding-bottom:80px}.backdrop{position:fixed;inset:0;background:radial-gradient(circle at 78% 12%,#d3a63b2b,transparent 26%),linear-gradient(180deg,#02100dcc,#03120ff2),url('/soolen-ai-landscape.jpg') center/cover;z-index:0}.wrap{position:relative;z-index:1;width:min(1160px,calc(100% - 28px));margin:auto}.top{display:flex;justify-content:space-between;padding:24px 0;font-size:11px;letter-spacing:.14em;font-weight:950}.top a{color:#fff;text-decoration:none;border:1px solid #ffffff22;background:#061b15bb;border-radius:999px;padding:10px 13px}.top span{color:#e6c768}.hero{padding:72px 0 38px}.hero small,.sectionHead small{color:#e9c968;letter-spacing:.18em;font-weight:950}.hero h1{font-size:clamp(48px,8vw,88px);line-height:.96;letter-spacing:-.055em;margin:14px 0 18px}.hero em{font-style:normal;color:#e8c963}.hero p{font-size:18px;line-height:1.65;color:#c1d0ca;max-width:800px}.badges{display:flex;flex-wrap:wrap;gap:9px;margin-top:20px}.badges span{border:1px solid #e7c45b33;background:#061d16cc;color:#e8d598;border-radius:999px;padding:8px 11px;font-size:11px;font-weight:850}.rules,.locked{margin-top:18px;border:1px solid #ffffff12;background:#051813d9;border-radius:28px;padding:26px;backdrop-filter:blur(18px)}.locked{border-color:#d8bf6250;background:linear-gradient(145deg,#d8bf6212,#051813ea)}.locked h2{font-size:36px;margin:8px 0}.locked p{color:#afc0b9;line-height:1.65;max-width:760px}.lockedActions{display:flex;gap:9px;flex-wrap:wrap;margin-top:18px}.lockedActions a{padding:13px 16px;border-radius:13px;text-decoration:none;font-weight:900}.lockedActions a:first-child{background:#d8bf62;color:#07130e}.lockedActions a:last-child{border:1px solid #d8bf6240;color:#e8d598}.features{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-top:18px}.features div{padding:16px;border-radius:16px;background:#ffffff08;border:1px solid #ffffff0d}.features b{display:block;color:#e8cf7b}.features span{display:block;color:#94aaa0;font-size:12px;line-height:1.45;margin-top:6px}.rules h2{font-size:34px;margin:7px 0}.rules p{color:#9fb2aa;line-height:1.65}@media(max-width:820px){.features{grid-template-columns:1fr}.hero{padding-top:50px}.top span{display:none}}`;

export default async function ProWorkspace({ params }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/auth?next=/pro/${id}`);
  const { data: app } = await supabase.from("apps").select("id,name,description,current_version_id,publish_status").eq("id",id).eq("owner_id",user.id).single();
  if (!app) redirect("/my-apps");

  const access=await getAppBuilderAccess(supabase,user.id);
  if(!access.professional.active){
    return <main className="page"><div className="backdrop"/><div className="wrap">
      <header className="top"><Link href={`/app-dashboard/${id}`}>← Standard Workspace</Link><span>SOOLENAI · PROFESSIONAL MODE</span></header>
      <section className="hero"><small>ADVANCED CONTROL WITH AI ASSISTANCE</small><h1>{app.name}<br/><em>Professional Workspace</em></h1><p>Your Standard project keeps the same premium quality. Professional Mode adds deeper controls and AI Copilot access; it does not unlock basic quality.</p></section>
      <section className="locked"><small>PROFESSIONAL ACCESS</small><h2>US$68 · 365 days · no auto-renew</h2><p>Professional access is not active for this account. Your App, Website, data, versions and Standard workspace stay available. When Professional access expires, only advanced Pro service access ends — your project is never deleted.</p><div className="features"><div><b>Pro Design</b><span>Exact layout, responsive, brand and visual controls with AI assistance.</span></div><div><b>Pro Logic</b><span>Deeper data, workflow and LANERIQ-managed service control without exposing infrastructure.</span></div><div><b>Pro Release</b><span>Advanced quality, publishing, analytics and release controls.</span></div></div><div className="lockedActions"><Link href="/pricing">View Fair Price · Fair Use →</Link><Link href={`/editor/${id}`}>Continue with Standard</Link></div></section>
      <section className="rules"><h2>Standard remains premium</h2><p>Standard is US$10 one-time when applicable after the free first-project promotion. Standard and Professional share the same design, stability, security and privacy quality floor.</p></section>
    </div><style>{shellCss}</style></main>;
  }

  let { data: current } = await supabase.from("app_versions").select("id,version_no").eq("id",app.current_version_id).eq("app_id",id).maybeSingle();
  if(!current){const {data:latest}=await supabase.from("app_versions").select("id,version_no").eq("app_id",id).order("version_no",{ascending:false}).limit(1).maybeSingle();current=latest||null;}
  if(!current) redirect(`/app-dashboard/${id}`);
  const groups=getProToolGroups(id);
  return <main className="page"><div className="backdrop"/><div className="wrap">
    <header className="top"><Link href={`/app-dashboard/${id}`}>← Standard Workspace</Link><span>SOOLENAI · PROFESSIONAL MODE · {access.professional.daysRemaining} DAYS LEFT</span></header>
    <section className="hero"><small>ADVANCED CONTROL WITH AI ASSISTANCE</small><h1>{app.name}<br/><em>Professional Workspace</em></h1><p>{PRO_MODE.principle}</p><div className="badges"><span>One App</span><span>AI-first changes</span><span>Edit only when needed</span><span>Versioned edits</span><span>Managed infrastructure</span></div></section>
    <ProAssistant appId={id} currentVersionId={current.id} quickActions={PRO_MODE.aiQuickActions}/>
    <ProEditTools groups={groups}/>
    <section className="rules"><h2>Professional Mode does not add complexity by default</h2><p>Normal changes still happen by telling SoolenAI what you want. Advanced Design, Logic and Release controls stay hidden until you press Edit. LANERIQ AI remains the single App for building, verifying, deploying and publishing.</p></section>
  </div><style>{shellCss}</style></main>;
}