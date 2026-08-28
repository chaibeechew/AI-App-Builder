import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "../../lib/supabase/server.js";

export default async function MyAppsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth");

  const { data: apps, error: appsError } = await supabase
    .from("apps")
    .select("id, name, description, created_at, updated_at, current_version_id, visibility, publish_status")
    .eq("owner_id", user.id)
    .order("updated_at", { ascending: false });

  const [{ data: profile }, { data: rewards }] = await Promise.all([
    supabase.from("profiles").select("referral_code, display_name").eq("id", user.id).single(),
    supabase.from("referral_rewards").select("id, referred_user_id, reward_type, amount, currency, status, created_at").eq("referrer_user_id", user.id).order("created_at", { ascending: false }),
  ]);

  async function signOut() {
    "use server";
    const client = await createClient();
    await client.auth.signOut();
    redirect("/auth");
  }

  const referralCode = profile?.referral_code || "";
  const ownerName = profile?.display_name?.trim() || user.user_metadata?.full_name?.trim() || user.user_metadata?.name?.trim() || user.email || "Account owner";
  const referralUrl = referralCode ? `/auth?ref=${encodeURIComponent(referralCode)}` : "/auth";

  return (
    <main className="appsPage">
      <header className="appsHeader">
        <div><div className="eyebrow">AI APP BUILDER</div><h1>My Apps</h1><p>Every app you create stays connected to your account.</p><div className="ownerLine">Owner: <strong>{ownerName}</strong></div></div>
        <div className="headerActions"><Link href="/" className="primaryButton">+ Create App</Link><form action={signOut}><button className="secondaryButton">Sign out</button></form></div>
      </header>
      {appsError && <section className="notice"><strong>App storage needs attention.</strong><span>{appsError.message}</span></section>}
      <section className="referralCard"><div><div className="eyebrow">REFERRAL</div><h2>Invite users and track rewards</h2><p>Your personal code is <strong>{referralCode || "Generating…"}</strong></p><code>{referralUrl}</code></div><div className="rewardBox"><span>Reward records</span><strong>{rewards?.length || 0}</strong></div></section>
      <section className="appsGrid">
        {apps?.length ? apps.map((app) => (
          <article className="appCard" key={app.id}>
            <div className="appCardTop"><div className="appIcon">✦</div><div className="statusStack"><span className="statusPill">{app.publish_status === "published" ? "Published" : "Draft"}</span><span className="visibilityPill">{app.visibility === "listed" ? "🌐 Listed" : "🔒 Private"}</span></div></div>
            <h2>{app.name}</h2><p>{app.description || "AI-generated application"}</p><div className="appMeta">Updated {new Date(app.updated_at).toLocaleString()}</div>
            <div className="appActions"><Link href={`/editor/${app.id}`} className="editButton">Open / Modify →</Link><Link href={`/apps/${app.id}/publish`} className="manageButton">Publish settings</Link></div>
          </article>
        )) : <div className="emptyState"><div className="emptyIcon">◇</div><h2>No apps yet</h2><p>Create your first app. It will be saved automatically after generation.</p><Link href="/" className="primaryButton">Create your first app</Link></div>}
      </section>
      <section className="rewardsSection"><div className="eyebrow">REWARD LEDGER</div><h2>Referral activity</h2>{rewards?.length ? rewards.map((reward) => <div className="rewardRow" key={reward.id}><span>{reward.reward_type}</span><span>{reward.status}</span><strong>{reward.amount} {reward.currency}</strong></div>) : <p>No referral rewards recorded yet.</p>}</section>
      <style>{`.appsPage{min-height:100vh;padding:42px clamp(18px,5vw,70px);background:linear-gradient(145deg,#03100d,#0a2119 58%,#06140f);color:#f5fff9}.appsHeader{display:flex;justify-content:space-between;gap:24px;align-items:flex-end;max-width:1180px;margin:0 auto 28px}.eyebrow{color:#d8bf62;letter-spacing:.2em;font-size:11px;font-weight:900}h1{font-size:44px;margin:8px 0}h2{margin:8px 0}p{color:#93aaa0;line-height:1.55}.ownerLine{margin-top:10px;color:#93aaa0;font-size:13px}.ownerLine strong{color:#f5fff9}.headerActions{display:flex;gap:10px;align-items:center}.primaryButton,.secondaryButton,.editButton,.manageButton{display:inline-flex;align-items:center;justify-content:center;border-radius:13px;padding:12px 16px;font-weight:800;text-decoration:none}.primaryButton{background:#d8bf62;color:#07130e;border:0}.secondaryButton{background:transparent;border:1px solid rgba(216,191,98,.25);color:#d8bf62}.notice{max-width:1180px;margin:0 auto 18px;padding:14px 18px;border:1px solid rgba(240,170,90,.35);border-radius:14px;background:rgba(100,60,20,.2);display:flex;gap:10px;flex-direction:column}.notice span{color:#c8b6a0;font-size:12px}.referralCard{max-width:1180px;margin:0 auto 28px;padding:24px;display:flex;justify-content:space-between;gap:24px;border:1px solid rgba(216,191,98,.2);border-radius:22px;background:rgba(4,20,15,.72)}code{color:#cbb96e;word-break:break-all}.rewardBox{min-width:130px;display:grid;place-content:center;text-align:center;border-radius:16px;background:rgba(216,191,98,.08);padding:18px}.rewardBox span{color:#93aaa0;font-size:12px}.rewardBox strong{font-size:30px}.appsGrid{max-width:1180px;margin:0 auto;display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:16px}.appCard{padding:22px;border:1px solid rgba(255,255,255,.08);border-radius:22px;background:rgba(3,16,13,.76)}.appCardTop{display:flex;justify-content:space-between}.appIcon{width:46px;height:46px;display:grid;place-items:center;border-radius:14px;background:linear-gradient(145deg,#d8bf62,#8c7331);color:#07130e}.statusStack{display:flex;flex-direction:column;gap:5px;align-items:flex-end;font-size:10px;font-weight:800}.statusPill{color:#79d7ac}.visibilityPill{color:#d8bf62}.appMeta{color:#6f867d;font-size:11px;margin:16px 0}.appActions{display:grid;gap:8px}.editButton{width:100%;background:#0e3024;color:#d8bf62;border:1px solid rgba(216,191,98,.15)}.manageButton{width:100%;background:transparent;color:#9fe2c1;border:1px solid rgba(121,215,172,.18);font-size:12px}.emptyState{grid-column:1/-1;text-align:center;padding:60px 20px;border:1px dashed rgba(216,191,98,.2);border-radius:22px}.emptyIcon{font-size:40px;color:#d8bf62}.rewardsSection{max-width:1180px;margin:36px auto 0;padding:24px;border-top:1px solid rgba(255,255,255,.08)}.rewardRow{display:grid;grid-template-columns:1fr 120px 120px;gap:12px;padding:12px 0;border-bottom:1px solid rgba(255,255,255,.06);color:#a8b9b2}.rewardRow strong{color:#d8bf62;text-align:right}@media(max-width:720px){.appsHeader,.referralCard{flex-direction:column;align-items:stretch}.headerActions{flex-wrap:wrap}.rewardRow{grid-template-columns:1fr 90px}.rewardRow strong{grid-column:1/-1;text-align:left}}`}</style>
    </main>
  );
}
