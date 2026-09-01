import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "../../../../lib/supabase/server.js";
import VersionRollbackButton from "./VersionRollbackButton.js";

export default async function VersionHistoryPage({ params }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth");

  const { data: app, error: appError } = await supabase
    .from("apps")
    .select("id,name,description,current_version_id,publish_status,updated_at")
    .eq("id", id)
    .eq("owner_id", user.id)
    .single();
  if (appError || !app) redirect("/my-apps");

  const { data: versions, error: versionsError } = await supabase
    .from("app_versions")
    .select("id,version_no,change_summary,created_at,specification")
    .eq("app_id", id)
    .order("version_no", { ascending: false });

  return (
    <main className="historyPage">
      <div className="wrap">
        <div className="topbar">
          <Link href={`/app-dashboard/${id}`} className="back">← Project Folder</Link>
          <span>VERSION HISTORY · SAFE ROLLBACK</span>
        </div>
        <header>
          <div><small>PROJECT HISTORY</small><h1>{app.name}</h1><p>Every saved AI modification can become a rollback point. Restoring an older version creates a new version instead of deleting history.</p></div>
          <div className="status">{app.publish_status === "published" ? "Published" : "Draft"}</div>
        </header>
        {versionsError ? <div className="notice">Unable to load versions: {versionsError.message}</div> : null}
        <section className="timeline">
          {versions?.length ? versions.map((version) => {
            const spec = version.specification || {};
            const isCurrent = version.id === app.current_version_id;
            const pageCount = Array.isArray(spec.pages) ? spec.pages.length : 0;
            const featureCount = Array.isArray(spec.features) ? spec.features.length : 0;
            return <article key={version.id} className={isCurrent ? "version current" : "version"}>
              <div className="versionMain">
                <div className="versionHead"><span>v{version.version_no}</span>{isCurrent ? <b>CURRENT</b> : null}</div>
                <h2>{version.change_summary || (version.version_no === 1 ? "Initial build" : "Saved project version")}</h2>
                <p>{spec.description || app.description || "Saved App + Website project state."}</p>
                <div className="facts"><span>{pageCount} pages</span><span>{featureCount} features</span><span>{new Date(version.created_at).toLocaleString()}</span></div>
              </div>
              <VersionRollbackButton appId={id} versionId={version.id} versionNo={version.version_no} currentVersionId={app.current_version_id} isCurrent={isCurrent} />
            </article>;
          }) : <div className="empty">No saved versions yet.</div>}
        </section>
        <div className="footerActions"><Link href={`/editor/${id}`} className="primary">Modify Project</Link><Link href={`/release/${id}`} className="secondary">Publishing Center</Link></div>
      </div>
      <style>{`
        *{box-sizing:border-box}.historyPage{min-height:100vh;padding:28px 18px 80px;background:radial-gradient(circle at 72% 8%,rgba(220,186,91,.13),transparent 26%),linear-gradient(145deg,#03100d,#0a2119 58%,#06140f);color:#f5fff9}.wrap{max-width:1000px;margin:auto}.topbar{display:flex;justify-content:space-between;align-items:center;font-size:11px;letter-spacing:.14em;color:#d8bf62}.back{color:#fff;text-decoration:none;border:1px solid rgba(255,255,255,.12);padding:10px 13px;border-radius:999px}header{display:flex;justify-content:space-between;gap:24px;align-items:flex-start;padding:54px 0 28px}header small{color:#d8bf62;letter-spacing:.18em;font-weight:900}h1{font-size:clamp(42px,7vw,72px);letter-spacing:-.04em;margin:9px 0 12px}header p{color:#a3b6ae;max-width:720px;line-height:1.65}.status{border:1px solid rgba(121,215,172,.22);color:#83dfb6;background:rgba(80,180,135,.08);padding:10px 13px;border-radius:999px;font-weight:900}.timeline{display:grid;gap:12px}.version{display:grid;grid-template-columns:1fr auto;gap:20px;align-items:center;border:1px solid rgba(255,255,255,.08);background:rgba(3,16,13,.78);border-radius:20px;padding:20px}.version.current{border-color:rgba(216,191,98,.42);box-shadow:0 18px 50px rgba(0,0,0,.22)}.versionHead{display:flex;align-items:center;gap:9px}.versionHead>span{display:inline-grid;place-items:center;width:46px;height:46px;border-radius:14px;background:#d8bf62;color:#07130e;font-weight:1000}.versionHead b{font-size:10px;letter-spacing:.13em;color:#86e0b8}.version h2{margin:12px 0 7px;font-size:22px}.version p{color:#92a99f;line-height:1.55}.facts{display:flex;gap:8px;flex-wrap:wrap;margin-top:12px}.facts span{background:#0e3024;color:#cbdad4;padding:7px 9px;border-radius:9px;font-size:11px}.notice,.empty{padding:18px;border-radius:16px;border:1px solid rgba(255,255,255,.08);background:rgba(3,16,13,.6);color:#b9c8c2}.footerActions{display:flex;gap:10px;margin-top:22px}.primary,.secondary{display:inline-flex;padding:12px 16px;border-radius:12px;text-decoration:none;font-weight:900}.primary{background:#d8bf62;color:#07130e}.secondary{border:1px solid rgba(216,191,98,.28);color:#d8bf62}@media(max-width:700px){header{flex-direction:column}.version{grid-template-columns:1fr}.topbar span{display:none}.footerActions{flex-direction:column}}
      `}</style>
    </main>
  );
}
