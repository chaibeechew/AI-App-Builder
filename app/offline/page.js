"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  getActiveOfflineScope,
  listLocalProjectSnapshots,
  listOfflineMutations,
  updateOfflineMutationState,
} from "../../lib/offline/browser-store.js";

function currentVersion(snapshot) {
  const versions = Array.isArray(snapshot?.versions) ? snapshot.versions : [];
  return versions.find((item) => item?.id === snapshot?.app?.current_version_id) || versions[0] || null;
}

export default function OfflineWorkspace() {
  const [scopeKey, setScopeKey] = useState("");
  const [projects, setProjects] = useState([]);
  const [mutations, setMutations] = useState([]);
  const [selectedId, setSelectedId] = useState("");
  const [online, setOnline] = useState(typeof navigator === "undefined" ? true : navigator.onLine);
  const [error, setError] = useState("");

  async function refresh() {
    setError("");
    try {
      const scope = await getActiveOfflineScope();
      setScopeKey(scope);
      if (!scope) { setProjects([]); setMutations([]); return; }
      const [localProjects, localMutations] = await Promise.all([
        listLocalProjectSnapshots(scope),
        listOfflineMutations({ scopeKey: scope }),
      ]);
      setProjects(localProjects);
      setMutations(localMutations.filter((item) => item.state === "PENDING_LOCAL" || item.state === "READY_FOR_REVIEW"));
      if (!selectedId && localProjects[0]?.projectId) setSelectedId(localProjects[0].projectId);
    } catch {
      setError("Local workspace could not be opened safely on this browser.");
    }
  }

  useEffect(() => {
    void refresh();
    const update = () => { setOnline(navigator.onLine); void refresh(); };
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    window.addEventListener("laneriq:offline-queue-changed", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
      window.removeEventListener("laneriq:offline-queue-changed", update);
    };
  }, []);

  const selected = useMemo(() => projects.find((item) => item.projectId === selectedId) || projects[0] || null, [projects, selectedId]);
  const version = currentVersion(selected?.snapshot);
  const spec = version?.specification || {};
  const pages = Array.isArray(spec.pages) ? spec.pages : [];
  const features = Array.isArray(spec.features) ? spec.features : [];

  async function discard(mutation) {
    if (!scopeKey) return;
    await updateOfflineMutationState({ scopeKey, id: mutation.id, state: "DISCARDED" }).catch(() => {});
    await refresh();
  }

  return (
    <main className="offlinePage">
      <div className="wrap">
        <header>
          <div>
            <div className="eyebrow">LANERIQ OFFLINE INTELLIGENCE CORE</div>
            <h1>{online ? "Local workspace" : "Working Offline"}</h1>
            <p>{online ? "Your local copies stay private until an action explicitly needs the network." : "Your saved projects and queued work remain on this device. Private queued AI work is never sent automatically when the connection returns."}</p>
          </div>
          <div className={`state ${online ? "on" : "off"}`}>{online ? "CONNECTED" : "OFFLINE"}</div>
        </header>

        {!scopeKey && <section className="notice"><b>Offline profile not verified on this device yet.</b><p>Connect once and sign in normally. LANERIQ stores only a pseudonymous local scope key for offline separation; the offline runtime does not persist your raw user ID.</p><Link href="/auth?next=/offline">Verify this device</Link></section>}
        {error && <section className="notice bad">{error}</section>}

        {scopeKey && <div className="grid">
          <aside>
            <div className="sectionTitle"><span>LOCAL PROJECTS</span><b>{projects.length}</b></div>
            {projects.length ? projects.map((project) => <button key={project.projectId} className={selected?.projectId === project.projectId ? "active" : ""} onClick={() => setSelectedId(project.projectId)}><strong>{project.snapshot?.app?.name || "Saved Project"}</strong><small>Local copy · {new Date(project.updatedAt).toLocaleString()}</small></button>) : <p className="muted">No local project copy yet. Open a project once while connected to make a private local copy available.</p>}
          </aside>

          <section className="preview">
            {selected ? <>
              <div className="eyebrow">PRIVATE LOCAL COPY</div>
              <h2>{selected.snapshot?.app?.name || "Saved Project"}</h2>
              <p>{selected.snapshot?.app?.description || spec.description || "Your locally saved LANERIQ project."}</p>
              <div className="meta"><span>Version {version?.version_no || 1}</span><span>{pages.length} pages</span><span>{features.length} features</span></div>
              <div className="cards">{pages.slice(0, 8).map((page, index) => <article key={`${page?.name || "page"}-${index}`}><b>{page?.name || `Page ${index + 1}`}</b><p>{page?.purpose || page?.description || "Local project page"}</p></article>)}</div>
              {online && <Link className="primary" href={`/editor/${selected.projectId}`}>Continue editing online</Link>}
              {!online && <p className="offlineHint">You can review this project now. AI/provider actions that require the network are stored locally rather than sent.</p>}
            </> : <div className="empty"><b>No cached project selected.</b><p>LANERIQ does not fabricate cloud data while offline.</p></div>}
          </section>

          <aside>
            <div className="sectionTitle"><span>LOCAL TASKS</span><b>{mutations.length}</b></div>
            {mutations.length ? mutations.map((mutation) => <article className="task" key={mutation.id}><strong>{mutation.type === "AI_MODIFY" ? "AI change" : mutation.type}</strong><small>{mutation.state === "READY_FOR_REVIEW" ? "Connected · review before sending" : "Saved on this device"}</small><p>{mutation.type === "AI_MODIFY" ? String(mutation.payload?.instruction || "Queued private AI change").slice(0, 180) : "Local queued operation"}</p><button onClick={() => discard(mutation)}>Discard</button></article>) : <p className="muted">No private queued tasks.</p>}
          </aside>
        </div>}
      </div>
      <style jsx>{`*{box-sizing:border-box}.offlinePage{min-height:100vh;padding:34px 18px 90px;background:radial-gradient(circle at 76% 4%,#d8bf6220,transparent 25%),linear-gradient(145deg,#03100d,#092219 58%,#06140f);color:#f6fff9;font:500 14px/1.5 Inter,system-ui,sans-serif}.wrap{max-width:1320px;margin:auto}header{display:flex;justify-content:space-between;gap:24px;align-items:flex-start;margin-bottom:22px}.eyebrow,.sectionTitle span{color:#d8bf62;font-size:10px;letter-spacing:.15em;font-weight:950}h1{font-size:clamp(42px,7vw,76px);line-height:.95;margin:7px 0 12px}header p{max-width:780px;color:#a7bbb2;font-size:16px}.state{border:1px solid #ffffff18;border-radius:999px;padding:8px 11px;font-size:10px;font-weight:950}.state.on{color:#92e0ba}.state.off{color:#e6ca72}.notice{border:1px solid #d8bf6240;background:#0a261de6;border-radius:18px;padding:18px;margin:18px 0}.notice b,.notice p{display:block}.notice p{color:#a9bbb3}.notice a,.primary{display:inline-block;margin-top:7px;border-radius:10px;padding:9px 12px;background:#d8bf62;color:#07130e;text-decoration:none;font-weight:900}.notice.bad{border-color:#ff8f8f44;color:#ffc1c1}.grid{display:grid;grid-template-columns:250px minmax(420px,1fr) 290px;gap:12px}.grid>aside,.preview{border:1px solid #ffffff10;background:#041712db;border-radius:20px;padding:16px}.sectionTitle{display:flex;justify-content:space-between;align-items:center;margin-bottom:10px}.sectionTitle b{color:#d8bf62}.grid>aside>button{width:100%;display:grid;gap:4px;text-align:left;border:1px solid transparent;border-radius:12px;padding:11px;background:#09241b;color:#fff;margin-top:7px}.grid>aside>button.active{border-color:#d8bf6270;background:#d8bf6213}.grid>aside>button small,.task small,.muted{color:#859b91}.preview h2{font-size:34px;margin:8px 0}.preview>p{color:#a9bbb3}.meta{display:flex;gap:7px;flex-wrap:wrap;margin:16px 0}.meta span{border:1px solid #ffffff12;border-radius:999px;padding:6px 9px;color:#c6d5cf;font-size:10px}.cards{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}.cards article,.task{border:1px solid #ffffff0d;border-radius:13px;padding:12px;background:#082019}.cards article p,.task p{color:#99ada4;font-size:11px}.task{margin-top:8px}.task strong,.task small{display:block}.task button{border:1px solid #ffffff18;background:transparent;color:#d9c477;border-radius:8px;padding:6px 8px}.offlineHint{margin-top:16px;padding:11px;border-radius:12px;background:#d8bf6210;color:#decf9c!important}.empty{min-height:350px;display:grid;place-content:center;text-align:center;color:#9aafa5}.primary{margin-top:14px}@media(max-width:950px){.grid{grid-template-columns:1fr}.preview{order:-1}}@media(max-width:650px){.offlinePage{padding:22px 10px 70px}header{display:block}.state{display:inline-block;margin-top:8px}.cards{grid-template-columns:1fr}}`}</style>
    </main>
  );
}
