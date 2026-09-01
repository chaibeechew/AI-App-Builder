"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

const LABELS={stability:"Stability",security:"Security",privacy:"Privacy",comfort:"Ease of use",beauty:"Visual quality",naturalness:"Natural experience"};

export default function ReleaseOptionsPage({ params }) {
  const [appId, setAppId] = useState(null);
  const [app, setApp] = useState(null);
  const [quality, setQuality] = useState(null);
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => { Promise.resolve(params).then((value) => setAppId(value.id)); }, [params]);
  useEffect(() => { if (appId) loadRelease(); }, [appId]);

  async function loadRelease() {
    setError("");
    try {
      const [projectResponse, qualityResponse] = await Promise.all([
        fetch(`/api/apps/${appId}`, { cache: "no-store" }),
        fetch(`/api/apps/${appId}/quality`, { cache: "no-store" }),
      ]);
      const projectData = await projectResponse.json();
      const qualityData = await qualityResponse.json();
      if (!projectResponse.ok) throw new Error(projectData?.error || "Unable to load project.");
      setApp(projectData.app);
      if (qualityResponse.ok) setQuality(qualityData);
      else setError(qualityData?.error || "Unable to run Quality Gate.");
    } catch (err) { setError(err.message); }
  }

  const blockers=useMemo(()=>{
    const rows=quality?.report?.dimensions||[];
    return rows.filter(x=>Number(x.score||0)<Number(x.target||quality?.target||100));
  },[quality]);

  async function publishProject() {
    if (quality && !quality.releaseReady) throw new Error("Quality Gate needs attention before publishing. Use Fix with AI, then run the gate again.");
    const response = await fetch(`/api/apps/${appId}/publish`, { method: "POST" });
    const data = await response.json();
    if (!response.ok) throw new Error(data?.error || "Unable to publish project.");
    setApp((current) => current ? { ...current, ...data.app } : data.app);
    return { appUrl: `${window.location.origin}${data.appPath || data.path}`, websiteUrl: `${window.location.origin}${data.websitePath || `/website/${appId}`}` };
  }

  async function returnToDraft() {
    if (!window.confirm("Return this App + Website to a private draft? Existing public links will stop working until you publish again.")) return;
    setBusy("draft"); setError(""); setMessage("");
    try {
      const response = await fetch(`/api/apps/${appId}/visibility`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ publish_status: "draft" }) });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data?.error || "Unable to return this project to draft.");
      setApp((current) => current ? { ...current, ...data.app } : data.app);
      setMessage("Project returned to a private draft. Its saved versions remain available.");
    } catch (err) { setError(err.message); }
    finally { setBusy(""); }
  }

  async function install() { setBusy("install"); setError(""); setMessage(""); try { await publishProject(); window.location.assign(`/a/${appId}?install=1`); } catch (err) { setError(err.message); setBusy(""); } }
  async function copyLink(kind) { setBusy(kind); setError(""); setMessage(""); try { const urls = await publishProject(); const url = kind === "website" ? urls.websiteUrl : urls.appUrl; try { await navigator.clipboard.writeText(url); setMessage(`${kind === "website" ? "Website" : "App"} published. Link copied: ${url}`); } catch { setMessage(`Published link: ${url}`); } } catch (err) { setError(err.message); } finally { setBusy(""); } }

  if (!app && !error) return <main className="releasePage"><div className="loading">Preparing Publish Center…</div></main>;
  const canPublish = quality?.releaseReady === true;
  const target=quality?.target||100;
  const repairPrompt = blockers.length ? `Improve this project until every release quality area reaches the ${target} release target. Focus especially on: ${blockers.map(x=>LABELS[x.id]||x.name).join(", ")}. Preserve all working features, customer data, permissions and brand identity.` : "Review the whole project for release readiness and improve any weak areas without removing working features.";
  const productionEvidence=Array.isArray(quality?.productionEvidence)?quality.productionEvidence:[];

  return <main className="releasePage"><div className="wrap">
    <Link href={appId ? `/app-dashboard/${appId}` : "/my-apps"} className="back">← Project Folder</Link>
    <div className="eyebrow">PUBLISH CENTER · APP + WEBSITE</div><h1>{app?.name || "Your Project"}</h1><p className="intro">One simple release flow. SoolenAI checks the project first and tells you exactly what still needs attention.</p>
    {app?.publish_status === "published" ? <section className="liveStatus"><div><b>PUBLIC RELEASE IS LIVE</b><span>The current verified App + Website links are available to customers.</span></div><button type="button" onClick={returnToDraft} disabled={!!busy}>{busy === "draft" ? "Returning safely…" : "Return to Private Draft"}</button></section> : null}

    <section className={canPublish ? "quality ready" : "quality attention"}>
      <div className="qualityHead"><div><div className="eyebrow">100 RELEASE CHECK</div><h2>{canPublish ? "Internal quality gate passed" : "AI found items to improve"}</h2></div><strong>{quality?.report?.overall ?? "—"}<small>/100</small></strong></div>
      <div className="scores">{quality?.report?.dimensions?.map((item) => <article key={item.id} className={item.score>=item.target?"pass":"fail"}><span>{item.score}</span><b>{LABELS[item.id]||item.name}</b><small>{item.score>=item.target?"Ready":`Needs ${item.target}`}</small></article>)}</div>
      {!canPublish&&blockers.length>0&&<div className="blockers"><b>What needs attention</b>{blockers.map(item=><span key={item.id}>• {LABELS[item.id]||item.name}: {item.score}/{item.target}</span>)}</div>}
      <p>{quality?.note || "The gate checks the saved project specification. Runtime and real-device testing remain separate production requirements."}</p>
      <div className="qualityActions"><button onClick={loadRelease}>Check Again</button><Link href={{pathname:`/editor/${appId}`,query:{instruction:repairPrompt}}}>✨ Fix with AI →</Link><Link href={`/app-dashboard/${appId}/versions`}>Version History / Rollback</Link></div>
    </section>

    {productionEvidence.length>0&&<section className="evidence"><div><div className="eyebrow">REAL-WORLD RELEASE EVIDENCE</div><h2>100/100 does not replace live testing.</h2><p>These checks are verified in the real environment where applicable. SoolenAI must never mark them complete just because the specification score is 100.</p></div><div className="evidenceGrid">{productionEvidence.map(item=><div key={item.key}><span>○</span><b>{item.label}</b></div>)}</div></section>}

    <div className="sectionTitle"><span>01</span><div><h2>Customer Website</h2><p>Responsive Website from the same project.</p></div></div>
    <section className="websiteCard"><div className="websitePreview"><span>🌐</span><div><b>{app?.name || "Customer Website"}</b><small>Mobile + Desktop · HTTPS ready</small></div></div><div className="websiteActions"><Link href={appId ? `/website/${appId}` : "#"}>Preview Website</Link><button onClick={() => copyLink("website")} disabled={!!busy || !canPublish}>{busy === "website" ? "Publishing…" : canPublish ? "Publish & Copy Website Link" : "Fix Quality Items First"}</button><Link href={appId ? `/website/${appId}?domain=1` : "#"} className="outline">Website & Domain Settings</Link></div></section>

    <div className="sectionTitle"><span>02</span><div><h2>App Delivery</h2><p>Install, share or prepare store submission.</p></div></div>
    <section className="choices"><article><div className="icon">📲</div><h2>Install on iPhone</h2><p>Open the live App and add it to the Home Screen.</p><button onClick={install} disabled={!!busy || !canPublish}>{busy === "install" ? "Preparing…" : canPublish ? "Install App →" : "Fix Quality Items First"}</button></article><article><div className="icon">🔗</div><h2>Independent App Link</h2><p>Publish a public App address customers can open on any device.</p><button onClick={() => copyLink("app")} disabled={!!busy || !canPublish}>{busy === "app" ? "Publishing…" : canPublish ? "Publish & Copy App Link →" : "Fix Quality Items First"}</button></article><article><div className="icon"></div><h2>App Store / Google Play</h2><p>Let AI prepare the store forms, then review the key answers yourself.</p><Link href={appId ? `/publish/${appId}` : "#"}>Prepare Store Release →</Link></article></section>

    {message && <div className="success">{message}</div>}{error && <div className="error">{error}</div>}
    <div className="note">100/100 is an internal release-readiness gate, not a zero-defect guarantee. Production security, payment, provider and real-device evidence must still be verified where applicable.</div>
  </div><style jsx>{`
    *{box-sizing:border-box}.releasePage{min-height:100vh;padding:38px 18px 80px;background:radial-gradient(circle at 76% 7%,rgba(216,191,98,.13),transparent 24%),linear-gradient(145deg,#03100d,#0a2119 58%,#06140f);color:#f5fff9}.wrap{max-width:1080px;margin:auto}.back{color:#d8bf62;text-decoration:none}.eyebrow{margin-top:32px;color:#d8bf62;font-size:11px;letter-spacing:.2em;font-weight:900}.wrap>h1{font-size:clamp(40px,7vw,68px);margin:8px 0}.intro,.sectionTitle p{color:#a9bbb4;line-height:1.6}.liveStatus{display:flex;justify-content:space-between;gap:18px;align-items:center;margin-top:18px;padding:16px 18px;border:1px solid rgba(92,220,160,.35);border-radius:18px;background:rgba(50,140,100,.1)}.liveStatus b,.liveStatus span{display:block}.liveStatus b{color:#8ce0b8;font-size:11px;letter-spacing:.12em}.liveStatus span{margin-top:4px;color:#a9bbb4;font-size:12px}.liveStatus button{min-height:44px;border:1px solid rgba(216,191,98,.35);border-radius:12px;background:transparent;color:#d8bf62;padding:10px 13px;font-weight:900}.liveStatus button:disabled{opacity:.5}.quality,.evidence{margin-top:28px;padding:22px;border-radius:24px;background:rgba(3,16,13,.82)}.quality.ready{border:1px solid rgba(92,220,160,.35)}.quality.attention{border:1px solid rgba(232,185,75,.35)}.qualityHead{display:flex;justify-content:space-between;gap:18px;align-items:center}.qualityHead .eyebrow,.evidence .eyebrow{margin-top:0}.qualityHead h2,.evidence h2{margin:6px 0}.qualityHead>strong{font-size:44px;color:#d8bf62}.qualityHead small{font-size:12px}.scores{display:grid;grid-template-columns:repeat(6,1fr);gap:8px;margin-top:16px}.scores article{padding:12px;border-radius:14px;background:#0b261c;display:grid;gap:4px}.scores article.fail{outline:1px solid rgba(232,185,75,.4)}.scores article.pass span{color:#8ce0b8}.scores span{font-size:22px;color:#e8d88e;font-weight:950}.scores b{font-size:11px}.scores small{font-size:9px;color:#81968d}.blockers{display:grid;gap:5px;margin-top:14px;padding:13px;border-radius:13px;background:#2a2110;color:#e8d88e;font-size:12px}.quality>p,.evidence p{color:#91a69d;line-height:1.5;font-size:12px}.qualityActions{display:flex;gap:9px;flex-wrap:wrap}.qualityActions button,.qualityActions a{border:1px solid rgba(216,191,98,.28);background:transparent;color:#d8bf62;padding:10px 12px;border-radius:11px;text-decoration:none;font-weight:850}.evidence{border:1px solid rgba(255,255,255,.1)}.evidenceGrid{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:14px}.evidenceGrid div{display:flex;gap:9px;align-items:flex-start;padding:11px;border-radius:12px;background:#0b261c;color:#b8cac1;font-size:11px}.evidenceGrid span{color:#d8bf62}.sectionTitle{display:flex;gap:14px;align-items:center;margin:34px 0 14px}.sectionTitle>span{display:grid;place-items:center;width:43px;height:43px;border-radius:13px;background:#d8bf62;color:#07130e;font-weight:950}.sectionTitle h2,.sectionTitle p{margin:2px 0}.websiteCard{display:grid;grid-template-columns:1fr 1.15fr;gap:18px;padding:22px;border:1px solid rgba(216,191,98,.22);border-radius:24px;background:linear-gradient(135deg,rgba(216,191,98,.12),rgba(3,16,13,.85))}.websitePreview{min-height:180px;border-radius:18px;background:#eef4f0;color:#12352a;display:flex;align-items:center;justify-content:center;gap:15px;padding:25px}.websitePreview>span{font-size:48px}.websitePreview b,.websitePreview small{display:block}.websitePreview b{font-size:22px}.websitePreview small{margin-top:5px;color:#668076}.websiteActions{display:grid;gap:10px;align-content:center}.websiteActions a,.websiteActions button,.choices button,.choices a{display:flex;justify-content:center;border:0;border-radius:13px;padding:14px;background:#d8bf62;color:#07130e;font-weight:900;text-decoration:none;font:inherit}.websiteActions .outline{background:transparent;color:#d8bf62;border:1px solid rgba(216,191,98,.35)}.choices{display:grid;grid-template-columns:repeat(3,1fr);gap:15px}.choices article{display:flex;flex-direction:column;min-height:310px;padding:24px;border:1px solid rgba(216,191,98,.18);border-radius:23px;background:rgba(3,16,13,.78)}.icon{width:58px;height:58px;display:grid;place-items:center;border-radius:17px;background:#d8bf62;color:#07130e;font-size:26px}.choices h2{margin:18px 0 8px}.choices p{color:#93aaa0;line-height:1.6;flex:1}.choices button:disabled,.websiteActions button:disabled{opacity:.45}.success,.error,.note{margin-top:18px;padding:14px;border-radius:13px}.success{background:rgba(70,190,140,.12);color:#8de0bb;overflow-wrap:anywhere}.error{background:rgba(220,70,70,.12);color:#ff9b9b}.note{border:1px solid rgba(216,191,98,.15);color:#a9bbb4;text-align:center}@media(max-width:760px){.websiteCard,.choices,.evidenceGrid{grid-template-columns:1fr}.scores{grid-template-columns:repeat(2,1fr)}.qualityHead{align-items:flex-start}.liveStatus{align-items:flex-start;flex-direction:column}.liveStatus button{width:100%}}
  `}</style></main>;
}
