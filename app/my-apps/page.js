import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  LANERIQ_SESSION_COOKIE,
  LANERIQ_SESSION_MODE_COOKIE,
  LANERIQ_SESSION_MODE_VALUE,
  laneriqSessionClearCookieOptions,
  laneriqSessionModeCookieOptions,
  revokeLaneriqSessionToken,
} from "../../lib/auth/laneriq-session.js";
import { createClient } from "../../lib/supabase/server.js";

export default async function MyAppsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth");
  const { data: apps, error } = await supabase.from("apps").select("id,name,description,created_at,updated_at,visibility,publish_status").eq("owner_id", user.id).order("updated_at", { ascending: false });

  async function signOut() {
    "use server";
    const cookieStore = await cookies();
    const token = String(cookieStore.get(LANERIQ_SESSION_COOKIE)?.value || "");
    if (token) {
      try { await revokeLaneriqSessionToken(token); }
      catch { redirect("/my-apps?logout_error=session_revoke_unavailable"); }
    }
    try { const client = await createClient(); await client.auth.signOut({ scope: "local" }); } catch {}
    cookieStore.set(LANERIQ_SESSION_COOKIE, "", laneriqSessionClearCookieOptions());
    cookieStore.set(LANERIQ_SESSION_MODE_COOKIE, LANERIQ_SESSION_MODE_VALUE, laneriqSessionModeCookieOptions());
    redirect("/auth");
  }

  const ownerName = user.user_metadata?.full_name || user.user_metadata?.name || user.email || "Account";
  const total=apps?.length||0;
  const published=(apps||[]).filter(app=>app.publish_status==="published").length;
  const drafts=total-published;
  const recentlyUpdated=(apps||[]).slice(0,5);

  return <main className="page projectsReference"><div className="projectsWrap">
    <section className="projectsHero"><div><div className="eyebrow">LANERIQ AI · CREATIONS</div><h1>My Projects</h1><p>Every App and Website is saved here automatically. Resume, inspect, preview or publish from one place.</p></div><div className="profileChip"><span>◉</span><div><b>{ownerName}</b><small>LANERIQ User</small></div><form action={signOut}><button title="Sign out">⌄</button></form></div></section>

    <section className="summaryRow"><article><span>▱</span><small>Total Projects</small><b>{total}</b></article><article><span>●</span><small>Published</small><b>{published}</b></article><article><span>◌</span><small>Drafts</small><b>{drafts}</b></article><article><span>↺</span><small>Recently Updated</small><b>{recentlyUpdated.length}</b></article></section>

    <section className="projectToolbar"><div className="search">⌕ Search projects…</div><div><Link href="/templates">Templates</Link><Link href="/create" className="newProject">+ New Project</Link></div></section>
    {error && <div className="notice">Unable to load your projects: {error.message}</div>}

    {apps?.length ? <section className="projectGrid">{apps.map((app,index)=><article className="projectCard" key={app.id}>
      <div className="projectVisual"><span>{index%2===0?"✦":"◈"}</span><em>{app.publish_status==="published"?"● Live":"○ Draft"}</em></div>
      <div className="projectBody"><div className="projectTitle"><div><h2>{app.name}</h2><small>App + Website</small></div><span>⋮</span></div><p>{app.description || "AI-generated customer project"}</p><div className="projectMeta"><span><small>Status</small><b>{app.publish_status==="published"?"Published":"Draft"}</b></span><span><small>Updated</small><b>{new Date(app.updated_at).toLocaleDateString()}</b></span></div><div className="projectActions"><Link href={`/app-dashboard/${app.id}`} className="primaryAction">Open Project →</Link><Link href={`/preview/${app.id}`}>Preview</Link><Link href={`/editor/${app.id}`}>Edit</Link></div></div>
    </article>)}</section> : <section className="empty"><div className="emptyOrb">✦</div><h2>No projects yet</h2><p>Start with an idea, optional references and the approved LANERIQ AI creation flow.</p><Link href="/create">Create your first project →</Link></section>}

    <div className="lowerGrid"><section className="recentCard"><div className="sectionHead"><h2>Recent Activity</h2><span>Latest saved projects</span></div><div>{recentlyUpdated.length?recentlyUpdated.map(app=><Link key={app.id} href={`/app-dashboard/${app.id}`}><span>↺</span><div><b>{app.name}</b><small>Updated {new Date(app.updated_at).toLocaleString()}</small></div><em>{app.publish_status==="published"?"Live":"Draft"}</em></Link>):<p>No project activity yet.</p>}</div></section><section className="createCard"><div><div className="eyebrow">CREATE ANYTHING</div><h2>Turn the next idea into a real App + Website.</h2><p>Use references, templates, AI planning and the same saved version history.</p><Link href="/create">✦ Start Building</Link></div></section></div>

    <div className="truthNote">Project cards show owner-scoped saved data only. User counts, revenue and external platform status are not fabricated for visual effect.</div>
  </div><style>{`
    *{box-sizing:border-box}.projectsReference{min-height:100vh;padding:30px 18px 135px;background:transparent;color:#f8fbff}.projectsWrap{max-width:1180px;margin:auto}.projectsHero{display:flex;align-items:flex-end;justify-content:space-between;gap:20px}.eyebrow{color:#f2bd52;letter-spacing:.15em;font-size:10px;font-weight:900}.projectsHero h1{font-size:clamp(42px,6vw,62px);margin:8px 0}.projectsHero p{color:#aabac8;max-width:680px}.profileChip,.summaryRow,.projectToolbar,.projectCard,.recentCard,.createCard,.empty,.truthNote{border:1px solid rgba(190,216,244,.18);background:linear-gradient(145deg,rgba(7,27,48,.86),rgba(8,18,39,.78));border-radius:21px;box-shadow:0 22px 60px rgba(0,0,0,.28);backdrop-filter:blur(22px) saturate(140%)}.profileChip{display:grid;grid-template-columns:42px 1fr 30px;align-items:center;gap:8px;padding:9px 10px;min-width:210px}.profileChip>span{width:40px;height:40px;border-radius:50%;display:grid;place-items:center;background:linear-gradient(145deg,#f4c972,#a96c36);color:#152333}.profileChip b,.profileChip small{display:block}.profileChip small{color:#879bab}.profileChip button{border:0;background:transparent;color:#c6d3dc;font-size:18px}.summaryRow{display:grid;grid-template-columns:repeat(4,1fr);margin:18px 0;overflow:hidden}.summaryRow article{padding:14px;display:grid;grid-template-columns:35px 1fr;align-items:center;column-gap:8px;border-right:1px solid #ffffff0f}.summaryRow article:last-child{border-right:0}.summaryRow article>span{grid-row:1/3;width:34px;height:34px;border-radius:10px;display:grid;place-items:center;background:#684cff2b;color:#ab8aff}.summaryRow small,.summaryRow b{display:block}.summaryRow small{color:#8499aa}.summaryRow b{font-size:22px}.projectToolbar{padding:10px;display:flex;justify-content:space-between;gap:12px;align-items:center}.search{min-height:42px;display:flex;align-items:center;flex:1;max-width:520px;padding:0 12px;border-radius:11px;background:#071827;color:#71879a}.projectToolbar>div:last-child{display:flex;gap:8px}.projectToolbar a{min-height:40px;padding:0 12px;border-radius:10px;border:1px solid #ffffff18;color:#d8e2ea;text-decoration:none;display:flex;align-items:center}.projectToolbar .newProject{background:linear-gradient(90deg,#6d43df,#9250ff);border:0;color:#fff}.notice{margin:12px 0;padding:12px;border-radius:11px;background:#5a331a;color:#ffd09a}.projectGrid{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;margin-top:14px}.projectCard{overflow:hidden}.projectVisual{height:155px;position:relative;display:grid;place-items:center;background:linear-gradient(180deg,#ffffff05,#05111fd9),url('/laneriq-future-city-people.webp') center/cover}.projectVisual>span{font-size:54px;color:#f0c75d;text-shadow:0 0 30px #efc55366}.projectVisual>em{position:absolute;top:10px;right:10px;padding:5px 8px;border-radius:99px;background:#071827cc;color:#74e099;font-style:normal;font-size:9px}.projectBody{padding:15px}.projectTitle{display:flex;justify-content:space-between;gap:10px}.projectTitle h2{margin:0}.projectTitle small{color:#8499aa}.projectBody p{min-height:48px;color:#8fa4b5;line-height:1.5}.projectMeta{display:grid;grid-template-columns:1fr 1fr;gap:8px}.projectMeta span{padding:9px;border-radius:9px;background:#071827}.projectMeta small,.projectMeta b{display:block}.projectMeta small{color:#7f95a7}.projectMeta b{margin-top:2px;font-size:11px}.projectActions{display:grid;grid-template-columns:1.4fr .8fr .8fr;gap:7px;margin-top:12px}.projectActions a{min-height:38px;border-radius:9px;background:#0c243b;color:#dbe5ec;text-decoration:none;display:flex;align-items:center;justify-content:center;font-size:10px}.projectActions .primaryAction{background:linear-gradient(90deg,#e3b43a,#f1c95c);color:#15202a;font-weight:900}.lowerGrid{display:grid;grid-template-columns:1.15fr .85fr;gap:14px;margin-top:14px}.recentCard,.createCard{padding:16px}.sectionHead{display:flex;justify-content:space-between}.sectionHead h2{margin:0}.sectionHead span{color:#8095a7;font-size:10px}.recentCard>div:last-child{display:grid;gap:7px;margin-top:12px}.recentCard a{display:grid;grid-template-columns:30px 1fr auto;align-items:center;gap:8px;padding:9px;border-radius:10px;background:#071827;color:#fff;text-decoration:none}.recentCard a>span{color:#9d73ff}.recentCard b,.recentCard small{display:block}.recentCard small{color:#8095a7}.recentCard em{font-style:normal;color:#68df94;font-size:9px}.createCard{background:linear-gradient(145deg,rgba(40,33,76,.78),rgba(7,18,39,.82)),url('/laneriq-future-city-people.webp') center/cover}.createCard>div{min-height:210px;display:flex;flex-direction:column;justify-content:center;align-items:flex-start}.createCard h2{font-size:25px;margin:8px 0}.createCard p{color:#bdc9d2}.createCard a,.empty a{padding:11px 14px;border-radius:10px;background:linear-gradient(90deg,#6d43df,#9250ff);color:#fff;text-decoration:none;font-weight:900}.empty{margin-top:14px;padding:55px 20px;text-align:center}.emptyOrb{width:80px;height:80px;margin:auto;border-radius:50%;display:grid;place-items:center;background:#5a31aa;color:#e1d1ff;font-size:34px;box-shadow:0 0 35px #8c55ff55}.empty p{color:#8fa4b5}.truthNote{margin-top:14px;padding:12px;text-align:center;color:#8196a8;font-size:10px}
    @media(max-width:900px){.projectGrid{grid-template-columns:1fr 1fr}.lowerGrid{grid-template-columns:1fr}.summaryRow{grid-template-columns:1fr 1fr}.summaryRow article{border-bottom:1px solid #ffffff0f}}
    @media(max-width:560px){.projectsReference{padding-inline:10px}.projectsHero{align-items:flex-start;flex-direction:column}.profileChip{width:100%}.projectToolbar{align-items:stretch;flex-direction:column}.search{max-width:none}.projectToolbar>div:last-child{display:grid;grid-template-columns:1fr 1fr}.projectGrid{grid-template-columns:1fr}.projectActions{grid-template-columns:1.2fr .8fr .8fr}}
  `}</style></main>;
}