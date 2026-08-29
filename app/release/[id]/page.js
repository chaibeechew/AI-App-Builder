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
    fetch(`/api/apps/${appId}`, { cache: "no-store" })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data?.error || "Unable to load app.");
        setApp(data.app);
      })
      .catch((err) => setError(err.message));
  }, [appId]);

  async function publishWeb() {
    const response = await fetch(`/api/apps/${appId}/publish`, { method: "POST" });
    const data = await response.json();
    if (!response.ok) throw new Error(data?.error || "Unable to publish app.");
    return `${window.location.origin}${data.path}`;
  }

  async function install() {
    setBusy("install"); setError(""); setMessage("");
    try {
      await publishWeb();
      window.location.assign(`/a/${appId}?install=1`);
    } catch (err) { setError(err.message); setBusy(""); }
  }

  async function createLink() {
    setBusy("link"); setError(""); setMessage("");
    try {
      const url = await publishWeb();
      try { await navigator.clipboard.writeText(url); setMessage(`Published. Link copied: ${url}`); }
      catch { setMessage(`Published link: ${url}`); }
      setBusy("");
    } catch (err) { setError(err.message); setBusy(""); }
  }

  if (!app && !error) return <main className="releasePage"><div className="loading">Preparing publishing choices…</div></main>;

  return <main className="releasePage"><div className="wrap">
    <Link href={appId ? `/a/${appId}` : "/my-apps"} className="back">← Back to Demo</Link>
    <div className="eyebrow">DEMO APPROVED · CHOOSE NEXT STEP</div>
    <h1>{app?.name || "Your App"}</h1>
    <p className="intro">Your demo is ready. Choose one option now, or use all three whenever you want.</p>

    <section className="choices">
      <article><div className="icon">📲</div><h2>Install on iPhone</h2><p>Open the live app and add it to the iPhone Home Screen as an installable web app.</p><button onClick={install} disabled={!!busy}>{busy === "install" ? "Preparing…" : "Install App →"}</button></article>
      <article><div className="icon">🔗</div><h2>Independent App Link</h2><p>Publish a public web address that customers can open and share from any device.</p><button onClick={createLink} disabled={!!busy}>{busy === "link" ? "Publishing…" : "Publish & Copy Link →"}</button></article>
      <article><div className="icon"></div><h2>App Store</h2><p>Prepare store information and start the official Apple App Store submission process.</p><Link href={appId ? `/publish/${appId}` : "#"}>Prepare App Store →</Link></article>
    </section>

    {message && <div className="success">{message}</div>}
    {error && <div className="error">{error}</div>}
    <div className="note">You do not have to choose only one. The same app can use all three publishing methods.</div>
  </div><style jsx>{`
    .releasePage{min-height:100vh;padding:38px 18px 80px;background:linear-gradient(145deg,#03100d,#0a2119 58%,#06140f);color:#f5fff9}.wrap{max-width:1080px;margin:auto}.back{color:#d8bf62;text-decoration:none}.eyebrow{margin-top:32px;color:#d8bf62;font-size:11px;letter-spacing:.2em;font-weight:900}.releasePage h1{font-size:clamp(40px,7vw,68px);margin:8px 0}.intro{color:#a9bbb4;font-size:18px;line-height:1.6}.choices{display:grid;grid-template-columns:repeat(3,1fr);gap:15px;margin-top:28px}.choices article{display:flex;flex-direction:column;min-height:330px;padding:24px;border:1px solid rgba(216,191,98,.18);border-radius:23px;background:rgba(3,16,13,.78)}.icon{width:58px;height:58px;display:grid;place-items:center;border-radius:17px;background:#d8bf62;color:#07130e;font-size:26px}.choices h2{margin:18px 0 8px}.choices p{color:#93aaa0;line-height:1.6;flex:1}.choices button,.choices a{display:flex;justify-content:center;border:0;border-radius:13px;padding:14px;background:#d8bf62;color:#07130e;font-weight:900;text-decoration:none;font:inherit}.choices button:disabled{opacity:.5}.success,.error,.note{margin-top:18px;padding:14px;border-radius:13px}.success{background:rgba(70,190,140,.12);color:#8de0bb;overflow-wrap:anywhere}.error{background:rgba(220,70,70,.12);color:#ff9b9b}.note{border:1px solid rgba(216,191,98,.15);color:#a9bbb4;text-align:center}@media(max-width:760px){.choices{grid-template-columns:1fr}.choices article{min-height:auto}}
  `}</style></main>;
}
