"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export default function PublishPage({ params }) {
  const [appId, setAppId] = useState(null);
  const [app, setApp] = useState(null);
  const [version, setVersion] = useState(null);
  const [metadata, setMetadata] = useState(null);
  const [listing, setListing] = useState(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => { Promise.resolve(params).then((value) => setAppId(value.id)); }, [params]);

  useEffect(() => {
    if (!appId) return;
    (async () => {
      try {
        const response = await fetch(`/api/apps/${appId}`, { cache: "no-store" });
        const data = await response.json();
        if (!response.ok) throw new Error(data?.error || "Unable to load app.");
        setApp(data.app);
        setVersion((data.versions || []).find((v) => v.id === data.app.current_version_id) || data.versions?.[0]);
      } catch (e) { setError(e.message); }
    })();
  }, [appId]);

  async function generate() {
    if (!app || !version) return;
    setBusy(true); setError(""); setMessage("");
    try {
      const spec = version.specification || {};
      const response = await fetch("/api/store-metadata", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ appName: app.name, description: app.description || spec.description || "", category: spec.category || "Business", keywords: Array.isArray(spec.keywords) ? spec.keywords.join(",") : String(spec.keywords || "") }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || "Unable to generate store metadata.");
      setMetadata(data);
      const save = await fetch("/api/store-metadata/save", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ appId, versionId: version.id, ...data }) });
      const saved = await save.json();
      if (!save.ok) throw new Error(saved?.error || "Unable to save store metadata.");
      setListing(saved.listing);
      setMessage("Apple App Store and Google Play information prepared.");
    } catch (e) { setError(e.message); }
    finally { setBusy(false); }
  }

  async function approve() {
    if (!listing?.id) return;
    setBusy(true); setError("");
    try {
      const response = await fetch("/api/store-metadata/approve", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ listingId: listing.id }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || "Approval failed.");
      setListing(data.listing); setMessage("Store listing approved.");
    } catch (e) { setError(e.message); }
    finally { setBusy(false); }
  }

  async function requestPublish(platform) {
    if (!listing?.id || !listing?.customer_approved_at) return;
    setBusy(true); setError("");
    try {
      const response = await fetch("/api/publish/request", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ appId, versionId: version.id, listingId: listing.id, platform }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || "Unable to create publish request.");
      setMessage(`${platform === "apple" ? "Apple App Store" : "Google Play"} publish request created.`);
    } catch (e) { setError(e.message); }
    finally { setBusy(false); }
  }

  if (error && !app) return <main className="publishPage"><div className="box">{error}<br/><Link href="/my-apps">← My Apps</Link></div></main>;
  if (!app || !version) return <main className="publishPage"><div className="box">Loading publishing workspace…</div></main>;

  return (
    <main className="publishPage">
      <div className="wrap">
        <Link href={`/editor/${appId}`} className="back">← Back to editor</Link>
        <div className="eyebrow">STORE PUBLISHING</div>
        <h1>{app.name}</h1>
        <p className="intro">AI prepares the store information. You review and approve it before any official submission.</p>

        <div className="actions">
          <button onClick={generate} disabled={busy}>{busy ? "Working…" : "Generate Store Information"}</button>
          <button onClick={approve} disabled={busy || !listing?.id || !!listing?.customer_approved_at} className="secondary">{listing?.customer_approved_at ? "Customer Approved ✓" : "Approve Listing"}</button>
        </div>

        {message && <div className="notice">{message}</div>}
        {error && <div className="error">{error}</div>}

        {metadata && <div className="grid">
          <section className="card"><div className="eyebrow">APPLE APP STORE</div><h2>{metadata.apple.name}</h2><Field label="Subtitle" value={metadata.apple.subtitle}/><Field label="Keywords" value={metadata.apple.keywords}/><Field label="Promotional Text" value={metadata.apple.promotionalText}/><Field label="Description" value={metadata.apple.description}/><Field label="Category" value={metadata.apple.category}/></section>
          <section className="card"><div className="eyebrow">GOOGLE PLAY</div><h2>{metadata.googlePlay.title}</h2><Field label="Short Description" value={metadata.googlePlay.shortDescription}/><Field label="Full Description" value={metadata.googlePlay.fullDescription}/><Field label="Category" value={metadata.googlePlay.category}/></section>
        </div>}

        <section className="card checklist"><div className="eyebrow">BEFORE PUBLISH</div><h2>Required items</h2>{(metadata?.checklist || []).map((item) => <div className="check" key={item.field}><span>{item.required ? "○" : "✓"}</span><div><strong>{item.field}</strong><small>{item.field === "Store account credentials" ? "Stored securely on the server when connected; never place secrets in the app." : "Customer must provide or approve this item."}</small></div></div>)}</section>

        <section className="publishCard"><h2>Submit for official store publishing</h2><p>Submission uses official Apple / Google developer accounts and their review process. AI Builder cannot bypass store approval.</p><div className="storeButtons"><button disabled={busy || !listing?.customer_approved_at} onClick={() => requestPublish("apple")}>Prepare Apple Submission</button><button disabled={busy || !listing?.customer_approved_at} onClick={() => requestPublish("google_play")}>Prepare Google Play Submission</button></div></section>
      </div>
      <style jsx>{` .publishPage{min-height:100vh;padding:34px 18px 80px;background:linear-gradient(145deg,#03100d,#0a2119 58%,#06140f);color:#f5fff9}.wrap{max-width:1080px;margin:auto}.back{color:#d8bf62;text-decoration:none}.eyebrow{color:#d8bf62;letter-spacing:.2em;font-size:11px;font-weight:900;margin-top:18px}.publishPage h1{font-size:48px;margin:8px 0}.intro{color:#93aaa0;max-width:720px;line-height:1.6}.actions,.storeButtons{display:flex;gap:10px;flex-wrap:wrap;margin:24px 0}.actions button,.storeButtons button{border:0;border-radius:12px;padding:13px 17px;background:#d8bf62;color:#07130e;font-weight:900}.actions .secondary{background:#0e3024;color:#d8bf62;border:1px solid rgba(216,191,98,.25)}button:disabled{opacity:.45;cursor:not-allowed}.notice,.error{padding:12px 14px;border-radius:12px;margin:14px 0}.notice{background:rgba(70,190,140,.1);color:#8de0bb}.error{background:rgba(220,70,70,.1);color:#ff9b9b}.grid{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-top:18px}.card,.publishCard{padding:24px;border:1px solid rgba(255,255,255,.08);border-radius:20px;background:rgba(3,16,13,.76);margin-top:16px}.card h2,.publishCard h2{margin:8px 0 20px}.field{padding:12px 0;border-top:1px solid rgba(255,255,255,.06)}.field label{display:block;color:#d8bf62;font-size:11px;font-weight:800;margin-bottom:5px}.field p{margin:0;color:#b7c7c0;line-height:1.6;white-space:pre-wrap}.check{display:flex;gap:12px;padding:14px 0;border-top:1px solid rgba(255,255,255,.06)}.check span{color:#d8bf62}.check strong,.check small{display:block}.check small{color:#7f9990;margin-top:4px;line-height:1.4}.publishCard{border-color:rgba(216,191,98,.2)}.publishCard p{color:#93aaa0;line-height:1.6}@media(max-width:760px){.grid{grid-template-columns:1fr}.publishPage h1{font-size:38px}}`}</style>
    </main>
  );
}

function Field({ label, value }) { return <div className="field"><label>{label}</label><p>{value || "—"}</p></div>; }
