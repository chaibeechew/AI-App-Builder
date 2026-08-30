"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export default function ReleaseOptionsPage({ params }) {
  const [appId, setAppId] = useState(null);
  const [app, setApp] = useState(null);
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => { Promise.resolve(params).then((value) => setAppId(value.id)); }, [params]);
  useEffect(() => {
    if (!appId) return;
    fetch(`/api/apps/${appId}`, { cache: "no-store" }).then(async response => {
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || "Unable to load project.");
      setApp(data.app);
    }).catch(err => setError(err.message));
  }, [appId]);

  async function publishProject() {
    const response = await fetch(`/api/apps/${appId}/publish`, { method: "POST" });
    const data = await response.json();
    if (!response.ok) throw new Error(data?.error || "Unable to publish project.");
    return {
      appUrl: `${window.location.origin}${data.appPath || data.path}`,
      websiteUrl: `${window.location.origin}${data.websitePath || `/website/${appId}`}`,
    };
  }

  async function install() {
    setBusy("install"); setError(""); setMessage("");
    try { await publishProject(); window.location.assign(`/a/${appId}?install=1`); }
    catch (err) { setError(err.message); setBusy(""); }
  }

  async function copyLink(kind) {
    setBusy(kind); setError(""); setMessage("");
    try {
      const urls = await publishProject();
      const url = kind === "website" ? urls.websiteUrl : urls.appUrl;
      try { await navigator.clipboard.writeText(url); setMessage(`${kind === "website" ? "Website" : "App"} published. Link copied: ${url}`); }
      catch { setMessage(`Published link: ${url}`); }
    } catch (err) { setError(err.message); }
    finally { setBusy(""); }
  }

  if (!app && !error) return <main className="releasePage"><div className="loading">Preparing App and Website choices…</div></main>;

  return <main className="releasePage"><div className="wrap">
    <Link href={appId ? `/a/${appId}?demo=1` : "/my-apps"} className="back">← Back to Demo</Link>
    <div className="eyebrow">DEMO APPROVED · CUSTOMER PROJECT</div>
    <h1>{app?.name || "Your Project"}</h1>
    <p className="intro">Your App and customer Website are ready together. Preview first, then publish any or all delivery options.</p>

    <div className="sectionTitle"><span>01</span><div><h2>Customer Website</h2><p>A responsive business website created from the same customer project.</p></div></div>
    <section className="websiteCard">
      <div className="websitePreview"><span>🌐</span><div><b>{app?.name || "Customer Website"}</b><small>Mobile + Desktop · HTTPS ready</small></div></div>
      <div className="websiteActions">
        <Link href={appId ? `/website/${appId}` : "#"}>Preview Website</Link>
        <button onClick={() => copyLink("website")} disabled={!!busy}>{busy === "website" ? "Publishing…" : "Publish & Copy Website Link"}</button>
        <Link href={appId ? `/website/${appId}?domain=1` : "#"} className="outline">Website & Domain Settings</Link>
      </div>
    </section>

    <div className="sectionTitle"><span>02</span><div><h2>App Delivery</h2><p>All three choices remain available for the same App.</p></div></div>
    <section className="choices">
      <article><div className="icon">📲</div><h2>Install on iPhone</h2><p>Open the live App and add it to the iPhone Home Screen.</p><button onClick={install} disabled={!!busy}>{busy === "install" ? "Preparing…" : "Install App →"}</button></article>
      <article><div className="icon">🔗</div><h2>Independent App Link</h2><p>Publish a public App address customers can open on any device.</p><button onClick={() => copyLink("app")} disabled={!!busy}>{busy === "app" ? "Publishing…" : "Publish & Copy App Link →"}</button></article>
      <article><div className="icon"></div><h2>App Store</h2><p>Prepare the official Apple App Store submission.</p><Link href={appId ? `/publish/${appId}` : "#"}>Prepare App Store →</Link></article>
    </section>

    {message && <div className="success">{message}</div>}
    {error && <div className="error">{error}</div>}
    <div className="note">Everything stays inside My Apps / Project Folder: App, Website, preview, modification and publishing.</div>
  </div><style jsx>{`
    .releasePage{min-height:100vh;padding:38px 18px 80px;background:linear-gradient(145deg,#03100d,#0a2119 58%,#06140f);color:#f5fff9}.wrap{max-width:1080px;margin:auto}.back{color:#d8bf62;text-decoration:none}.eyebrow{margin-top:32px;color:#d8bf62;font-size:11px;letter-spacing:.2em;font-weight:900}.releasePage>div>h1{font-size:clamp(40px,7vw,68px);margin:8px 0}.intro,.sectionTitle p{color:#a9bbb4;line-height:1.6}.sectionTitle{display:flex;gap:14px;align-items:center;margin:34px 0 14px}.sectionTitle>span{display:grid;place-items:center;width:43px;height:43px;border-radius:13px;background:#d8bf62;color:#07130e;font-weight:950}.sectionTitle h2,.sectionTitle p{margin:2px 0}.websiteCard{display:grid;grid-template-columns:1fr 1.15fr;gap:18px;padding:22px;border:1px solid rgba(216,191,98,.22);border-radius:24px;background:linear-gradient(135deg,rgba(216,191,98,.12),rgba(3,16,13,.85))}.websitePreview{min-height:180px;border-radius:18px;background:#eef4f0;color:#12352a;display:flex;align-items:center;justify-content:center;gap:15px;padding:25px}.websitePreview>span{font-size:48px}.websitePreview b,.websitePreview small{display:block}.websitePreview b{font-size:22px}.websitePreview small{margin-top:5px;color:#668076}.websiteActions{display:grid;gap:10px;align-content:center}.websiteActions a,.websiteActions button,.choices button,.choices a{display:flex;justify-content:center;border:0;border-radius:13px;padding:14px;background:#d8bf62;color:#07130e;font-weight:900;text-decoration:none;font:inherit}.websiteActions .outline{background:transparent;color:#d8bf62;border:1px solid rgba(216,191,98,.35)}.choices{display:grid;grid-template-columns:repeat(3,1fr);gap:15px}.choices article{display:flex;flex-direction:column;min-height:310px;padding:24px;border:1px solid rgba(216,191,98,.18);border-radius:23px;background:rgba(3,16,13,.78)}.icon{width:58px;height:58px;display:grid;place-items:center;border-radius:17px;background:#d8bf62;color:#07130e;font-size:26px}.choices h2{margin:18px 0 8px}.choices p{color:#93aaa0;line-height:1.6;flex:1}.choices button:disabled,.websiteActions button:disabled{opacity:.5}.success,.error,.note{margin-top:18px;padding:14px;border-radius:13px}.success{background:rgba(70,190,140,.12);color:#8de0bb;overflow-wrap:anywhere}.error{background:rgba(220,70,70,.12);color:#ff9b9b}.note{border:1px solid rgba(216,191,98,.15);color:#a9bbb4;text-align:center}@media(max-width:760px){.websiteCard,.choices{grid-template-columns:1fr}.choices article{min-height:auto}}
  `}</style></main>;
}
