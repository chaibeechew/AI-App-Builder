"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export default function AppEditor({ params }) {
  const [appId, setAppId] = useState(null);
  const [app, setApp] = useState(null);
  const [versions, setVersions] = useState([]);
  const [instruction, setInstruction] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.resolve(params).then((value) => setAppId(value.id));
  }, [params]);

  useEffect(() => {
    if (!appId) return;
    loadApp();
  }, [appId]);

  async function loadApp() {
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`/api/apps/${appId}`, { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || "Unable to load app.");
      setApp(data.app);
      setVersions(data.versions || []);
    } catch (err) {
      setError(err?.message || "Unable to load app.");
    } finally {
      setLoading(false);
    }
  }

  async function modify() {
    if (!instruction.trim() || !app?.current_version_id) return;
    setSaving(true);
    setError("");
    setMessage("");

    try {
      const current = versions.find((item) => item.id === app.current_version_id) || versions[0];
      const response = await fetch("/api/modify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          appId,
          instruction: instruction.trim(),
          specification: current?.specification,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || "Modification failed.");
      setInstruction("");
      setMessage(`Saved as version ${data.version?.version_no || "new"}.`);
      await loadApp();
    } catch (err) {
      setError(err?.message || "Modification failed.");
    } finally {
      setSaving(false);
    }
  }

  async function rollback(versionId) {
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch(`/api/apps/${appId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ versionId }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || "Rollback failed.");
      setMessage(`Rolled back to version ${data.rollback.versionNo}.`);
      await loadApp();
    } catch (err) {
      setError(err?.message || "Rollback failed.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <main className="editorPage"><div className="editorLoading">Loading your app…</div></main>;
  if (error && !app) return <main className="editorPage"><div className="editorError">{error}<br/><Link href="/my-apps">← My Apps</Link></div></main>;

  const currentVersion = versions.find((item) => item.id === app?.current_version_id) || versions[0];

  return (
    <main className="editorPage">
      <header className="editorHeader">
        <div>
          <Link href="/my-apps" className="backLink">← My Apps</Link>
          <div className="eyebrow">APP WORKSPACE</div>
          <h1>{app?.name}</h1>
          <p>{app?.description || "Continue shaping your application."}</p>
        </div>
        <div className="versionBadge">Version {currentVersion?.version_no || 1}</div>
      </header>

      <section className="modifyPanel">
        <div className="eyebrow">MODIFY</div>
        <h2>Continue editing this app</h2>
        <textarea value={instruction} onChange={(event) => setInstruction(event.target.value)} placeholder="Example: Add a user profile page with editable name, photo and settings." />
        <button onClick={modify} disabled={saving || !instruction.trim()}>{saving ? "Saving…" : "Apply change →"}</button>
        {message && <div className="success">{message}</div>}
        {error && <div className="error">{error}</div>}
      </section>

      <section className="versionSection">
        <div className="eyebrow">VERSION HISTORY</div>
        <h2>Versions & rollback</h2>
        <div className="versionList">
          {versions.map((version) => (
            <article key={version.id} className={version.id === app?.current_version_id ? "versionCard current" : "versionCard"}>
              <div>
                <strong>Version {version.version_no}</strong>
                <span>{version.change_summary || "Application update"}</span>
                <small>{new Date(version.created_at).toLocaleString()}</small>
              </div>
              {version.id === app?.current_version_id ? (
                <span className="currentLabel">Current</span>
              ) : (
                <button onClick={() => rollback(version.id)} disabled={saving}>Rollback</button>
              )}
            </article>
          ))}
        </div>
      </section>

      <style jsx>{`
        .editorPage{min-height:100vh;padding:36px clamp(18px,5vw,70px);background:linear-gradient(145deg,#03100d,#0a2119 58%,#06140f);color:#f5fff9}.editorHeader,.modifyPanel,.versionSection{max-width:1050px;margin:0 auto}.editorHeader{display:flex;justify-content:space-between;gap:20px;align-items:flex-start;margin-bottom:26px}.backLink{display:inline-block;color:#d8bf62;text-decoration:none;margin-bottom:20px}.eyebrow{color:#d8bf62;letter-spacing:.2em;font-size:11px;font-weight:900}.editorHeader h1{font-size:44px;margin:7px 0}.editorHeader p{color:#93aaa0}.versionBadge{padding:10px 14px;border:1px solid rgba(216,191,98,.25);border-radius:12px;color:#d8bf62}.modifyPanel{padding:24px;border:1px solid rgba(216,191,98,.18);border-radius:22px;background:rgba(4,20,15,.76)}.modifyPanel h2,.versionSection h2{margin:8px 0 16px}.modifyPanel textarea{width:100%;min-height:150px;background:#071810;color:#fff;border:1px solid rgba(216,191,98,.18);border-radius:14px;padding:15px;resize:vertical;outline:none}.modifyPanel button,.versionCard button{margin-top:12px;border:0;border-radius:12px;padding:12px 16px;background:#d8bf62;color:#07130e;font-weight:900}.modifyPanel button:disabled,.versionCard button:disabled{opacity:.45}.success,.error{margin-top:12px;padding:11px;border-radius:10px}.success{background:rgba(70,190,140,.1);color:#8de0bb}.error{background:rgba(220,70,70,.1);color:#ff9b9b}.versionSection{margin-top:30px}.versionList{display:grid;gap:10px}.versionCard{display:flex;justify-content:space-between;align-items:center;gap:16px;padding:17px;border:1px solid rgba(255,255,255,.08);border-radius:16px;background:rgba(3,16,13,.72)}.versionCard.current{border-color:rgba(216,191,98,.28)}.versionCard div{display:grid;gap:4px}.versionCard strong{color:#fff}.versionCard span,.versionCard small{color:#849990;font-size:12px}.currentLabel{color:#79d7ac!important;font-weight:800}.editorLoading,.editorError{min-height:80vh;display:grid;place-items:center;color:#d8bf62;text-align:center}.editorError a{color:#d8bf62}@media(max-width:700px){.editorHeader{flex-direction:column}.versionCard{align-items:flex-start;flex-direction:column}.versionCard button{margin-top:0}}
      `}</style>
    </main>
  );
}
