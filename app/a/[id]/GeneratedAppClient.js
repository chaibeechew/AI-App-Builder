"use client";

import { useEffect, useMemo, useState } from "react";
import DesignAssetAssistant from "../../components/DesignAssetAssistant";

const themePhotos=["/soolen-hero-v2.webp","/soolen-hero-zh-tw.webp","/soolen-hero-ja.webp","/soolen-hero-fr.webp","/soolen-hero-ko.webp","/soolen-hero-th.webp","/soolen-hero-es.webp","/soolen-hero-ar.webp"];

function text(value, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function itemName(value, fallback) {
  return typeof value === "string" ? value : text(value?.name || value?.label || value?.title, fallback);
}

export default function GeneratedAppClient({ appId, app, specification }) {
  const pages = Array.isArray(specification?.pages) && specification.pages.length ? specification.pages : [{ id: "home", name: "Home", route: "/", description: app.description, components: [] }];
  const navigation = Array.isArray(specification?.navigation) && specification.navigation.length ? specification.navigation : pages.map((page) => ({ label: page.name, route: page.route }));
  const features = Array.isArray(specification?.features) ? specification.features : [];
  const actions = Array.isArray(specification?.actions) ? specification.actions : [];
  const entities = specification?.data && typeof specification.data === "object" ? Object.entries(specification.data) : [];
  const [route, setRoute] = useState("/");
  const [records, setRecords] = useState([]);
  const [draft, setDraft] = useState({});
  const [search, setSearch] = useState("");
  const [installPrompt, setInstallPrompt] = useState(null);
  const [notice, setNotice] = useState("");
  const [demoMode, setDemoMode] = useState(false);
  const [designOpen, setDesignOpen] = useState(false);
  const [designBrief, setDesignBrief] = useState("");
  const [photoIndex, setPhotoIndex] = useState(0);
  const page = pages.find((entry) => entry.route === route) || pages[0];
  const entity = entities[0];
  const fields = Array.isArray(entity?.[1]?.fields) ? entity[1].fields.slice(0, 8) : ["name", "details"];

  useEffect(() => {
    setDemoMode(new URLSearchParams(window.location.search).get("demo") === "1");
    try {
      const saved = JSON.parse(localStorage.getItem(`generatedApp:${appId}:records`) || "[]");
      if (Array.isArray(saved)) setRecords(saved);
    } catch {}
    const handler = (event) => { event.preventDefault(); setInstallPrompt(event); };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, [appId]);

  useEffect(() => { if (!demoMode) return; const timer = setInterval(() => setPhotoIndex(value => (value + 1) % themePhotos.length), 3800); return () => clearInterval(timer); }, [demoMode]);

  const filtered = useMemo(() => records.filter((record) => JSON.stringify(record).toLowerCase().includes(search.toLowerCase())), [records, search]);

  function saveRecord(event) {
    event.preventDefault();
    const next = [{ id: crypto.randomUUID(), createdAt: new Date().toISOString(), ...draft }, ...records];
    setRecords(next);
    setDraft({});
    try { localStorage.setItem(`generatedApp:${appId}:records`, JSON.stringify(next)); } catch {}
    setNotice("Saved successfully.");
  }

  async function installApp() {
    if (installPrompt) {
      await installPrompt.prompt();
      await installPrompt.userChoice;
      setInstallPrompt(null);
      return;
    }
    setNotice("On iPhone: tap Safari Share, then Add to Home Screen.");
  }

  async function shareApp() {
    const payload = { title: app.name, text: app.description || app.name, url: window.location.href.split("?")[0] };
    if (navigator.share) await navigator.share(payload);
    else {
      await navigator.clipboard.writeText(payload.url);
      setNotice("App link copied.");
    }
  }

  function continueModify(brief) {
    try { sessionStorage.setItem(`soolenDesignBrief:${appId}`, brief); } catch {}
    window.location.assign(`/editor/${appId}`);
  }

  const colors = specification?.designSystem || {};
  const primary = text(colors.primaryColor, "#12664f");
  const accent = text(colors.accentColor, "#d9ad45");
  const background = text(colors.backgroundColor, "#eef5f1");
  const surface = text(colors.surfaceColor, "#ffffff");
  const foreground = text(colors.textColor, "#102c23");

  return <main className="generatedApp" style={{ "--primary": primary, "--accent": accent, "--background": background, "--surface": surface, "--foreground": foreground, "--scene": demoMode ? `url("${themePhotos[photoIndex]}")` : "none" }}>
    <header className="appHeader"><div><small>{demoMode ? "AI APP BUILDER · DEMO PREVIEW" : "AI APP BUILDER · LIVE APP"}</small><h1>{app.name}</h1><p>{app.description || specification?.description}</p></div><div className="headerActions">{demoMode ? <button className="approveDemo" onClick={() => window.location.assign(`/release/${appId}`)}>Approve Demo →</button> : <><button onClick={shareApp}>Share</button><button onClick={installApp}>Install</button></>}</div></header>
    <nav>{navigation.map((entry, index) => <button key={index} className={(entry.route || "/") === route ? "active" : ""} onClick={() => setRoute(entry.route || "/")}>{itemName(entry, `Page ${index + 1}`)}</button>)}</nav>
    <section className={demoMode ? "heroCard themed" : "heroCard"}><small>{text(page.route, "/")}</small><h2>{text(page.name, "Home")}</h2><p>{text(page.description || page.purpose, "Your application workspace.")}</p></section>
    <section className="grid">
      {(Array.isArray(page.components) ? page.components : []).map((component, index) => <article className="card" key={index}><span>✦</span><h3>{itemName(component, `Section ${index + 1}`)}</h3><p>{typeof component === "object" ? text(component.description || component.purpose, "Interactive application section") : "Interactive application section"}</p></article>)}
      {features.slice(0, 8).map((feature, index) => <article className="card" key={`feature-${index}`}><span>✓</span><h3>{itemName(feature, `Feature ${index + 1}`)}</h3><p>{typeof feature === "object" ? text(feature.description, "Ready to use") : "Ready to use"}</p></article>)}
    </section>
    <section className="workspace">
      <div className="panel"><small>{entity ? entity[0] : "APP DATA"}</small><h2>Add information</h2><form onSubmit={saveRecord}>{fields.map((field) => { const key = typeof field === "string" ? field : text(field?.name, "value"); return <label key={key}>{key.replaceAll("_", " ")}<input required value={draft[key] || ""} onChange={(event) => setDraft((value) => ({ ...value, [key]: event.target.value }))}/></label>; })}<button type="submit">Save</button></form></div>
      <div className="panel"><small>SAVED DATA</small><h2>{records.length} records</h2><input className="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search…"/><div className="recordList">{filtered.map((record) => <article key={record.id}>{fields.map((field) => { const key = typeof field === "string" ? field : text(field?.name, "value"); return record[key] ? <p key={key}><b>{key.replaceAll("_", " ")}:</b> {record[key]}</p> : null; })}</article>)}{!filtered.length && <p className="empty">No saved information yet.</p>}</div></div>
    </section>
    {!!actions.length && <section className="actionBar">{actions.slice(0, 6).map((action, index) => <button key={index} onClick={() => setNotice(`${itemName(action, "Action")} completed.`)}>{itemName(action, `Action ${index + 1}`)}</button>)}</section>}
    {demoMode && <><button className="demoModifyButton" onClick={() => setDesignOpen(true)}>✦ MODIFY DESIGN</button>{designOpen && <div className="demoDesignDrawer"><button className="demoDrawerClose" onClick={() => setDesignOpen(false)}>×</button><h2>Modify this Demo with AI</h2><p>Upload photos, your own sketch, a screen demo or video. AI will use the visual direction in the next saved version.</p><DesignAssetAssistant mode="preview" initialBrief={designBrief} onBriefChange={setDesignBrief} onContinue={continueModify}/></div>}</>}
    {notice && <div className="notice" onClick={() => setNotice("")}>{notice}</div>}
    <footer>Created with AI App Builder · Data saved on this device</footer>
    <style jsx global>{`
      .accountNav,.sv-fab{display:none!important}.generatedApp{min-height:100vh;background:linear-gradient(rgba(238,245,241,.88),rgba(238,245,241,.95)),var(--scene) center/cover fixed,var(--background);color:var(--foreground);padding:22px;font-family:Inter,system-ui,-apple-system,sans-serif}.appHeader,.generatedApp nav,.heroCard,.grid,.workspace,.actionBar,.generatedApp footer{max-width:1080px;margin-left:auto;margin-right:auto}.appHeader{display:flex;justify-content:space-between;gap:20px;align-items:flex-start}.appHeader small,.heroCard small,.panel>small{color:var(--primary);font-weight:900;letter-spacing:.14em}.appHeader h1{font-size:clamp(34px,7vw,62px);margin:7px 0}.appHeader p{max-width:680px;line-height:1.6}.headerActions{display:flex;gap:8px}.headerActions button,.generatedApp nav button,.actionBar button,.panel form button{border:0;border-radius:12px;padding:11px 14px;background:var(--surface);color:var(--primary);font-weight:850;box-shadow:0 5px 18px #0001}.generatedApp nav{display:flex;gap:8px;overflow:auto;padding:18px 0}.generatedApp nav button.active{background:var(--primary);color:#fff}.heroCard{padding:26px;border-radius:24px;background:var(--primary);transition:background-image .8s ease}.heroCard.themed{background:linear-gradient(135deg,color-mix(in srgb,var(--primary) 88%,transparent),rgba(4,20,15,.72)),var(--scene) center/cover;color:#fff}.heroCard small{color:#fff9}.heroCard h2{font-size:36px;margin:8px 0}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:12px;margin-top:14px}.card,.panel{background:var(--surface);border-radius:19px;padding:20px;box-shadow:0 8px 28px #0000000c}.card span{color:var(--accent);font-size:22px}.card h3{margin:10px 0 7px}.card p{opacity:.7;line-height:1.5}.workspace{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-top:14px}.panel h2{margin:7px 0 16px}.panel form{display:grid;gap:10px}.panel label{font-size:12px;font-weight:800;text-transform:capitalize}.panel input{width:100%;box-sizing:border-box;margin-top:5px;border:1px solid #0002;border-radius:10px;padding:11px;background:transparent;color:inherit}.panel form button{background:var(--primary);color:#fff;margin-top:5px}.search{margin:0 0 10px!important}.recordList{display:grid;gap:8px;max-height:360px;overflow:auto}.recordList article{padding:11px;border-radius:12px;background:var(--background)}.recordList p{margin:4px 0;font-size:13px}.empty{opacity:.6}.actionBar{display:flex;gap:8px;flex-wrap:wrap;margin-top:14px}.actionBar button{background:var(--accent);color:#171006}.demoModifyButton{position:fixed;left:50%;bottom:20px;transform:translateX(-50%);z-index:25;border:1px solid var(--accent);border-radius:999px;padding:14px 24px;background:linear-gradient(135deg,var(--accent),#f7df91);color:#142019;font-weight:950;box-shadow:0 16px 50px #0007}.demoDesignDrawer{position:fixed;right:0;top:0;bottom:0;width:min(620px,100%);z-index:40;overflow:auto;padding:34px 24px 90px;background:#03120e;color:#fff;box-shadow:-30px 0 80px #000b}.demoDesignDrawer>h2{margin:5px 0}.demoDesignDrawer>p{color:#9cafaa;line-height:1.5}.demoDrawerClose{position:sticky;top:0;float:right;width:38px;height:38px;border:1px solid #ffffff22;border-radius:50%;background:#0b241a;color:#fff;font-size:24px}.notice{position:fixed;left:50%;bottom:24px;transform:translateX(-50%);padding:13px 18px;border-radius:13px;background:#102c23;color:#fff;z-index:20;box-shadow:0 12px 40px #0004}.generatedApp footer{text-align:center;padding:36px 0 12px;opacity:.6;font-size:12px}@media(max-width:700px){.generatedApp{padding:16px}.appHeader{display:block}.headerActions{margin-top:12px}.workspace{grid-template-columns:1fr}.heroCard h2{font-size:30px}}
    `}</style>
  </main>;
}
