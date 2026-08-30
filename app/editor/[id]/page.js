"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

export default function AppEditor({ params }) {
  const [appId, setAppId] = useState(null);
  const [app, setApp] = useState(null);
  const [versions, setVersions] = useState([]);
  const [instruction, setInstruction] = useState("");
  const [selectedPage, setSelectedPage] = useState("");
  const [selectedFeature, setSelectedFeature] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => { Promise.resolve(params).then((value) => setAppId(value.id)); }, [params]);
  useEffect(() => { if (appId) loadApp(); }, [appId]);

  async function loadApp() {
    setLoading(true); setError("");
    try {
      const response = await fetch(`/api/apps/${appId}`, { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || "Unable to load app.");
      setApp(data.app); setVersions(data.versions || []);
    } catch (err) { setError(err?.message || "Unable to load app."); }
    finally { setLoading(false); }
  }

  const currentVersion = useMemo(() => versions.find((item) => item.id === app?.current_version_id) || versions[0], [versions, app]);
  const spec = currentVersion?.specification || {};
  const pages = Array.isArray(spec.pages) ? spec.pages : [];
  const features = Array.isArray(spec.features) ? spec.features : [];

  async function modify() {
    if (!instruction.trim() || !currentVersion) return;
    setSaving(true); setError(""); setMessage("");
    try {
      const scope = [
        selectedPage ? `VISUAL EDITOR TARGET PAGE: ${selectedPage}. Focus the requested change on this page while preserving the rest of the project.` : "",
        selectedFeature ? `TARGET FEATURE: ${selectedFeature}. Preserve unrelated working features.` : "",
      ].filter(Boolean).join("\n");
      const response = await fetch("/api/modify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ appId, instruction: `${scope}${scope ? "\n\n" : ""}${instruction.trim()}`, specification: currentVersion.specification }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || "Modification failed.");
      setInstruction(""); setSelectedFeature("");
      setMessage(`Saved as version ${data.version?.version_no || "new"}.`);
      await loadApp();
    } catch (err) { setError(err?.message || "Modification failed."); }
    finally { setSaving(false); }
  }

  if (loading) return <main className="editorPage"><div className="editorLoading">Loading Visual Editor…</div></main>;
  if (error && !app) return <main className="editorPage"><div className="editorError">{error}<br/><Link href="/my-apps">← Project Center</Link></div></main>;

  return <main className="editorPage"><div className="wrap">
    <header><div><Link href={`/app-dashboard/${appId}`} className="back">← Project Folder</Link><div className="eyebrow">VISUAL EDITOR · AI ASSISTED</div><h1>{app?.name}</h1><p>Choose a page or feature visually, describe the change, and AI will preserve the rest of the project.</p></div><div className="headActions"><span>v{currentVersion?.version_no || 1}</span><Link href={`/release/${appId}`}>Publish Center →</Link></div></header>

    <section className="workspace">
      <aside className="navigator"><div className="eyebrow">PAGES</div><button className={!selectedPage ? "active" : ""} onClick={() => setSelectedPage("")}>Whole project</button>{pages.map((page, i) => { const name = page?.name || `Page ${i+1}`; return <button key={`${name}-${i}`} className={selectedPage === name ? "active" : ""} onClick={() => setSelectedPage(name)}><b>{String(i+1).padStart(2,"0")}</b><span>{name}</span></button>; })}</aside>

      <section className="canvas">
        <div className="canvasTop"><div><div className="eyebrow">LIVE STRUCTURE PREVIEW</div><h2>{selectedPage || "Whole App + Website"}</h2></div><span className="device">Mobile-first</span></div>
        <div className="phoneFrame"><div className="phoneTop"/><div className="screen"><div className="heroBlock"><small>{app?.name}</small><strong>{selectedPage || pages[0]?.name || "Home"}</strong><p>{pages.find((p) => p?.name === selectedPage)?.purpose || pages.find((p) => p?.name === selectedPage)?.description || spec.description || "AI-generated experience"}</p></div><div className="mockRow"/><div className="mockRow short"/><div className="mockCards"><i/><i/></div></div></div>
      </section>

      <aside className="inspector"><div className="eyebrow">AI MODIFY</div><h2>Describe the change</h2><div className="target">Target: <b>{selectedPage || "Whole project"}</b></div><textarea value={instruction} onChange={(e) => setInstruction(e.target.value)} placeholder="Example: Make this page calmer, more premium and easier to scan. Add a clear primary action and better mobile spacing."/><div className="features">{features.slice(0,8).map((feature, i) => { const name = typeof feature === "string" ? feature : feature?.name || `Feature ${i+1}`; return <button key={`${name}-${i}`} className={selectedFeature === name ? "active" : ""} onClick={() => setSelectedFeature(selectedFeature === name ? "" : name)}>{name}</button>; })}</div><button className="apply" onClick={modify} disabled={saving || !instruction.trim()}>{saving ? "AI is updating…" : "Apply Visual Change →"}</button>{message && <div className="success">{message}</div>}{error && <div className="error">{error}</div>}<Link className="history" href={`/app-dashboard/${appId}/versions`}>Version History & Rollback</Link></aside>
    </section>
  </div><style jsx>{`
    *{box-sizing:border-box}.editorPage{min-height:100vh;padding:26px 18px 70px;background:radial-gradient(circle at 70% 8%,rgba(216,191,98,.12),transparent 26%),linear-gradient(145deg,#03100d,#0a2119 58%,#06140f);color:#f5fff9}.wrap{max-width:1380px;margin:auto}header{display:flex;justify-content:space-between;gap:20px;align-items:flex-start;margin-bottom:22px}.back{color:#d8bf62;text-decoration:none}.eyebrow{color:#d8bf62;letter-spacing:.17em;font-size:10px;font-weight:900;margin-top:14px}h1{font-size:clamp(36px,5vw,58px);margin:6px 0}header p{color:#9db0a8;max-width:680px;line-height:1.6}.headActions{display:flex;gap:8px;align-items:center}.headActions span,.headActions a{padding:10px 13px;border:1px solid rgba(216,191,98,.22);border-radius:12px;color:#d8bf62;text-decoration:none;font-weight:850}.workspace{display:grid;grid-template-columns:230px minmax(380px,1fr) 340px;gap:12px;align-items:stretch}.navigator,.canvas,.inspector{border:1px solid rgba(255,255,255,.08);background:rgba(3,16,13,.78);border-radius:22px;padding:16px}.navigator{display:flex;flex-direction:column;gap:8px}.navigator button{display:flex;gap:9px;align-items:center;text-align:left;border:1px solid transparent;background:#0a2119;color:#b8c7c1;border-radius:12px;padding:11px}.navigator button b{color:#d8bf62;font-size:10px}.navigator button.active{border-color:rgba(216,191,98,.42);background:rgba(216,191,98,.10);color:#fff}.canvas{display:grid;grid-template-rows:auto 1fr;min-height:650px}.canvasTop{display:flex;justify-content:space-between;align-items:flex-start}.canvas h2,.inspector h2{margin:7px 0 12px}.device{font-size:11px;color:#7dd8ae;border:1px solid rgba(125,216,174,.22);padding:7px 9px;border-radius:999px}.phoneFrame{align-self:center;justify-self:center;width:min(340px,88%);aspect-ratio:9/18;border:8px solid #0d1714;border-radius:42px;background:#0b1713;padding:8px;box-shadow:0 35px 90px #0008}.phoneTop{width:34%;height:18px;border-radius:0 0 13px 13px;background:#0d1714;margin:-8px auto 5px}.screen{height:calc(100% - 15px);border-radius:28px;background:linear-gradient(180deg,#eef4ef,#dfe9e2);padding:22px;color:#143228}.heroBlock small,.heroBlock strong{display:block}.heroBlock small{font-size:10px;letter-spacing:.13em}.heroBlock strong{font-size:28px;margin:7px 0}.heroBlock p{font-size:12px;line-height:1.5;color:#587064}.mockRow{height:45px;border-radius:13px;background:#c9d8ce;margin-top:20px}.mockRow.short{width:70%;height:14px}.mockCards{display:grid;grid-template-columns:1fr 1fr;gap:9px;margin-top:14px}.mockCards i{height:90px;border-radius:15px;background:#bfd1c5}.inspector textarea{width:100%;min-height:180px;border:1px solid rgba(216,191,98,.18);background:#071810;color:#fff;border-radius:14px;padding:14px;resize:vertical}.target{font-size:12px;color:#9db0a8;margin-bottom:9px}.features{display:flex;flex-wrap:wrap;gap:7px;margin:12px 0}.features button{border:1px solid rgba(255,255,255,.10);background:#0a2119;color:#aebfb7;border-radius:999px;padding:7px 9px;font-size:10px}.features button.active{color:#08140f;background:#d8bf62}.apply{width:100%;border:0;border-radius:13px;padding:13px;background:#d8bf62;color:#07130e;font-weight:950}.apply:disabled{opacity:.45}.success,.error{margin-top:10px;padding:10px;border-radius:10px}.success{background:rgba(70,190,140,.1);color:#8de0bb}.error{background:rgba(220,70,70,.1);color:#ff9b9b}.history{display:block;text-align:center;margin-top:14px;color:#d8bf62;text-decoration:none;font-size:12px}@media(max-width:1050px){.workspace{grid-template-columns:190px 1fr}.inspector{grid-column:1/-1}.canvas{min-height:560px}}@media(max-width:700px){header{flex-direction:column}.workspace{grid-template-columns:1fr}.navigator{display:grid;grid-template-columns:1fr 1fr}.canvas{min-height:520px}.inspector{grid-column:auto}.headActions{flex-wrap:wrap}.navigator .eyebrow{grid-column:1/-1}}
  `}</style></main>;
}
