"use client";

import { useState } from "react";

const DEFAULT_PAGE = { name: "Main", purpose: "Your main application workspace.", features: [] };

function normalizeFeature(feature) {
  if (typeof feature === "string") return { name: feature, description: "AI generated feature." };
  return { name: feature?.name || "Feature", description: feature?.description || "AI generated feature." };
}

export default function Home() {
  const [idea, setIdea] = useState("");
  const [loading, setLoading] = useState(false);
  const [plan, setPlan] = useState(null);
  const [screen, setScreen] = useState("home");
  const [activePage, setActivePage] = useState("");
  const [activeFeature, setActiveFeature] = useState(null);
  const [error, setError] = useState("");
  const [modifyInstruction, setModifyInstruction] = useState("");
  const [modifyLoading, setModifyLoading] = useState(false);
  const [modifyMessage, setModifyMessage] = useState("");

  const specification = plan?.specification || {};
  const pages = Array.isArray(specification.pages) && specification.pages.length ? specification.pages : [DEFAULT_PAGE];
  const features = Array.isArray(specification.features) ? specification.features : [];
  const currentPage = pages.find((p) => p?.name === activePage) || pages[0] || DEFAULT_PAGE;

  async function generateApp() {
    if (!idea.trim()) return setError("Please describe your app idea first.");
    setLoading(true); setError(""); setPlan(null); setModifyMessage("");
    try {
      const response = await fetch("/api/generate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ idea: idea.trim() }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || "Generation failed.");
      if (!data?.specification) throw new Error("AI did not return a valid application specification.");
      setPlan(data);
      const generatedPages = Array.isArray(data.specification.pages) ? data.specification.pages : [];
      setActivePage(generatedPages[0]?.name || "Main");
      setScreen("plan");
    } catch (err) { setError(err?.message || "Something went wrong."); }
    finally { setLoading(false); }
  }

  async function modifyApp() {
    if (!modifyInstruction.trim() || !plan?.specification) return;
    setModifyLoading(true); setModifyMessage(""); setError("");
    try {
      const response = await fetch("/api/modify", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ instruction: modifyInstruction.trim(), specification: plan.specification }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || "Modification failed.");
      if (!data?.specification) throw new Error("AI did not return a valid application specification.");
      setPlan((current) => ({ ...current, specification: data.specification }));
      const updatedPages = Array.isArray(data.specification.pages) ? data.specification.pages : [];
      setActivePage(updatedPages[0]?.name || "Main");
      setModifyInstruction(""); setModifyMessage("Changes applied.");
    } catch (err) { setModifyMessage(err?.message || "Something went wrong."); }
    finally { setModifyLoading(false); }
  }

  function newApp() {
    setIdea(""); setPlan(null); setError(""); setModifyInstruction(""); setModifyMessage(""); setActivePage(""); setActiveFeature(null); setScreen("home");
  }

  return (
    <main className="app-shell">
      <div className="scene" aria-hidden="true"><div className="mountain mountain-a"/><div className="mountain mountain-b"/><div className="sun"/><div className="water"/><div className="mist"/></div>
      <header className="topbar">
        <button className="brand" onClick={newApp}><span className="brand-icon">✦</span><span><b>AI App Builder</b><small>Your idea. Our AI. Real apps.</small></span></button>
        <div className="top-actions"><span className="ai-ready"><i/> AI Ready</span>{screen !== "home" && <button className="new-button" onClick={newApp}>+ New App</button>}</div>
      </header>

      {screen === "home" && <CreateScreen idea={idea} setIdea={setIdea} loading={loading} error={error} onGenerate={generateApp} />}
      {screen === "plan" && <PlanScreen specification={specification} pages={pages} activePage={activePage} setActivePage={setActivePage} onPreview={() => setScreen("preview")} onNew={newApp} />}
      {screen === "preview" && <PreviewScreen specification={specification} pages={pages} currentPage={currentPage} activePage={activePage} setActivePage={setActivePage} features={features} onFeature={(f) => setActiveFeature(normalizeFeature(f))} onBack={() => setScreen("plan")} onCreate={() => setScreen("created")} modifyInstruction={modifyInstruction} setModifyInstruction={setModifyInstruction} modifyLoading={modifyLoading} modifyMessage={modifyMessage} onModify={modifyApp} />}
      {screen === "created" && <CreatedScreen specification={specification} pages={pages} currentPage={currentPage} activePage={activePage} setActivePage={setActivePage} features={features} onFeature={(f) => setActiveFeature(normalizeFeature(f))} onNew={newApp} modifyInstruction={modifyInstruction} setModifyInstruction={setModifyInstruction} modifyLoading={modifyLoading} modifyMessage={modifyMessage} onModify={modifyApp} />}

      {activeFeature && <div className="modal-backdrop" onClick={() => setActiveFeature(null)}><div className="modal" onClick={(e) => e.stopPropagation()}><button className="close" onClick={() => setActiveFeature(null)}>×</button><span className="eyebrow">FEATURE</span><h2>{activeFeature.name}</h2><p>{activeFeature.description}</p></div></div>}
      <style jsx global>{styles}</style>
    </main>
  );
}

function CreateScreen({ idea, setIdea, loading, error, onGenerate }) {
  return <section className="create-screen">
    <div className="hero-copy"><span className="eyebrow">BUILD WITH AI</span><h1>Turn your idea<br/><em>into an app.</em></h1><p>Describe what you want to build. AI handles the planning and creation.</p></div>
    <div className="create-card">
      <label>Describe your app</label>
      <textarea value={idea} onChange={(e) => setIdea(e.target.value)} maxLength={5000} placeholder="Example: A property CRM for real estate agents with clients, listings, follow-ups and a deal pipeline." autoCapitalize="sentences" />
      <div className="input-bottom"><span>{idea.length} / 5000</span><span>Text or voice idea</span></div>
      <button className="generate" onClick={onGenerate} disabled={loading || !idea.trim()}>{loading ? <><span className="spinner"/> Building your app...</> : <>✨ Generate My App <b>→</b></>}</button>
      {error && <div className="error">{error}</div>}
    </div>
    <div className="simple-flow"><span><b>1</b> Describe</span><i>→</i><span><b>2</b> AI Builds</span><i>→</i><span><b>3</b> Preview</span><i>→</i><span><b>4</b> Publish</span></div>
    <p className="privacy">Your idea stays private. You can modify your app after the first build.</p>
  </section>;
}

function PlanScreen({ specification, pages, activePage, setActivePage, onPreview, onNew }) {
  const page = pages.find((p) => p?.name === activePage) || pages[0];
  return <section className="workspace">
    <div className="workspace-head"><div><span className="eyebrow">AI PLAN</span><h1>{specification.name || "Your New App"}</h1><p>{specification.description || "AI has planned your app."}</p></div><div className="actions"><button className="secondary" onClick={onNew}>Start Over</button><button className="primary" onClick={onPreview}>Preview App →</button></div></div>
    <div className="page-tabs">{pages.map((p, i) => <button key={`${p?.name}-${i}`} className={activePage === p?.name ? "active" : ""} onClick={() => setActivePage(p?.name || "Main")}>{p?.name || `Page ${i + 1}`}</button>)}</div>
    <div className="overview"><span className="mini-label">PAGE</span><h2>{page?.name || "Main"}</h2><p>{page?.purpose || "Your main application workspace."}</p><div className="feature-grid">{(Array.isArray(page?.features) ? page.features : featuresFromSpec(specification)).map((f, i) => <FeatureCard key={i} feature={f}/>)}</div></div>
  </section>;
}

function featuresFromSpec(specification) { return Array.isArray(specification.features) ? specification.features : []; }
function FeatureCard({ feature }) { const f = normalizeFeature(feature); return <div className="feature-card"><span>✦</span><div><b>{f.name}</b><p>{f.description}</p></div></div>; }

function PreviewScreen({ specification, pages, currentPage, activePage, setActivePage, features, onFeature, onBack, onCreate, modifyInstruction, setModifyInstruction, modifyLoading, modifyMessage, onModify }) {
  const pageFeatures = Array.isArray(currentPage?.features) ? currentPage.features : features;
  return <section className="workspace">
    <div className="workspace-head"><div><span className="eyebrow">LIVE PREVIEW</span><h1>{specification.name || "Application Preview"}</h1><p>Check the structure before creating the app.</p></div><div className="actions"><button className="secondary" onClick={onBack}>← Plan</button><button className="primary" onClick={onCreate}>Create App →</button></div></div>
    <div className="page-tabs">{pages.map((p, i) => <button key={`${p?.name}-${i}`} className={activePage === p?.name ? "active" : ""} onClick={() => setActivePage(p?.name || "Main")}>{p?.name || `Page ${i + 1}`}</button>)}</div>
    <div className="phone-preview"><div className="phone-bar"><span/> {currentPage?.name || "Main"} <span>•••</span></div><div className="phone-content"><span className="preview-badge">AI APP</span><h2>{currentPage?.name || "Main"}</h2><p>{currentPage?.purpose || "Your application workspace."}</p>{pageFeatures.slice(0, 8).map((f, i) => <button className="preview-feature" key={i} onClick={() => onFeature(f)}><span>✦</span>{normalizeFeature(f).name}<b>›</b></button>)}</div></div>
    <ModifyBox modifyInstruction={modifyInstruction} setModifyInstruction={setModifyInstruction} modifyLoading={modifyLoading} modifyMessage={modifyMessage} onModify={onModify}/>
  </section>;
}

function CreatedScreen({ specification, pages, currentPage, activePage, setActivePage, features, onFeature, onNew, modifyInstruction, setModifyInstruction, modifyLoading, modifyMessage, onModify }) {
  return <section className="workspace"><div className="success"><div className="success-icon">✓</div><span className="eyebrow">APP READY</span><h1>{specification.name || "Your App"}</h1><p>Your app has been created successfully. Continue modifying it or start another app.</p><div className="actions centered"><button className="secondary" onClick={onNew}>+ New App</button></div></div><PreviewMini pages={pages} currentPage={currentPage} activePage={activePage} setActivePage={setActivePage} features={features} onFeature={onFeature}/><ModifyBox modifyInstruction={modifyInstruction} setModifyInstruction={setModifyInstruction} modifyLoading={modifyLoading} modifyMessage={modifyMessage} onModify={onModify}/></section>;
}

function PreviewMini({ pages, currentPage, activePage, setActivePage, features, onFeature }) { const list = Array.isArray(currentPage?.features) ? currentPage.features : features; return <div className="mini-preview"><div className="page-tabs">{pages.map((p, i) => <button key={`${p?.name}-${i}`} className={activePage === p?.name ? "active" : ""} onClick={() => setActivePage(p?.name || "Main")}>{p?.name || `Page ${i + 1}`}</button>)}</div>{list.slice(0, 6).map((f, i) => <button className="preview-feature" key={i} onClick={() => onFeature(f)}>{normalizeFeature(f).name}<b>›</b></button>)}</div>; }

function ModifyBox({ modifyInstruction, setModifyInstruction, modifyLoading, modifyMessage, onModify }) { return <div className="modify-box"><div><b>Want to change something?</b><p>Tell AI what to modify.</p></div><div className="modify-row"><input value={modifyInstruction} onChange={(e) => setModifyInstruction(e.target.value)} placeholder="e.g. Add a calendar page"/><button onClick={onModify} disabled={modifyLoading || !modifyInstruction.trim()}>{modifyLoading ? "..." : "Modify"}</button></div>{modifyMessage && <small>{modifyMessage}</small>}</div>; }

const styles = `
*{box-sizing:border-box}html,body{margin:0;padding:0}body{font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;background:#071b17;color:#f7faf7}.app-shell{min-height:100vh;position:relative;overflow:hidden;background:linear-gradient(180deg,#dce9e8 0%,#f4f7f5 55%,#08231d 100%);color:#10231d}.scene{position:absolute;inset:0;overflow:hidden;background:linear-gradient(180deg,#b9d4d9 0%,#dfe9e5 38%,#123c35 72%,#061b17 100%);z-index:0}.mountain{position:absolute;bottom:28%;width:65%;height:42%;background:linear-gradient(145deg,#23463f,#6c827c);clip-path:polygon(0 100%,22% 47%,35% 63%,54% 0,72% 57%,100% 100%);opacity:.72}.mountain-a{left:-15%}.mountain-b{right:-20%;transform:scaleX(-1);opacity:.5}.sun{position:absolute;top:28%;left:50%;width:110px;height:110px;border-radius:50%;transform:translate(-50%,-50%);background:rgba(255,231,164,.8);filter:blur(2px);box-shadow:0 0 80px 30px rgba(255,219,139,.35)}.water{position:absolute;left:-10%;right:-10%;bottom:-8%;height:45%;background:repeating-linear-gradient(170deg,rgba(72,164,148,.28) 0 2px,transparent 2px 24px),linear-gradient(#1c7067,#06251f);transform:skewY(-3deg)}.mist{position:absolute;inset:0;background:radial-gradient(ellipse at 50% 45%,rgba(255,255,255,.18),transparent 42%),linear-gradient(to bottom,transparent 55%,rgba(0,28,22,.4));z-index:1}.topbar{position:relative;z-index:3;display:flex;justify-content:space-between;align-items:center;padding:18px 28px;color:#fff;background:linear-gradient(180deg,rgba(2,22,18,.55),transparent)}.brand{display:flex;align-items:center;gap:10px;border:0;background:none;color:inherit;text-align:left;cursor:pointer}.brand-icon{display:grid;place-items:center;width:38px;height:38px;border-radius:11px;background:#08744e;font-size:20px;box-shadow:0 8px 22px rgba(0,0,0,.18)}.brand b{display:block;font-size:17px}.brand small{display:block;margin-top:2px;font-size:11px;opacity:.8}.top-actions{display:flex;align-items:center;gap:10px}.ai-ready,.new-button{padding:10px 14px;border-radius:999px;background:rgba(255,255,255,.88);color:#15362d;font-size:13px;font-weight:700;border:0}.ai-ready i{display:inline-block;width:7px;height:7px;border-radius:50%;background:#16a36f;margin-right:6px}.new-button{cursor:pointer}.create-screen,.workspace{position:relative;z-index:2;max-width:960px;margin:0 auto;padding:70px 24px 80px}.create-screen{min-height:calc(100vh - 75px);display:flex;flex-direction:column;align-items:center;justify-content:center}.hero-copy{text-align:center;color:#fff;text-shadow:0 2px 18px rgba(0,0,0,.35);margin-bottom:25px}.eyebrow{font-size:11px;letter-spacing:.18em;font-weight:800;color:#1b8b67}.hero-copy .eyebrow{color:#eaf6e9}.hero-copy h1{font-size:clamp(42px,8vw,76px);line-height:.96;margin:12px 0;font-weight:850;letter-spacing:-.05em}.hero-copy h1 em{font-style:normal;color:#cde6bb}.hero-copy p{max-width:520px;margin:16px auto 0;font-size:16px;line-height:1.5;color:#fff}.create-card{width:min(720px,100%);padding:22px;border-radius:24px;background:rgba(248,252,249,.93);box-shadow:0 24px 60px rgba(0,0,0,.2);border:1px solid rgba(255,255,255,.8)}.create-card label{display:block;font-size:16px;font-weight:800;margin-bottom:10px;color:#17362c}.create-card textarea{width:100%;min-height:170px;resize:vertical;border:1px solid #c5d5cf;border-radius:16px;padding:17px;font:inherit;font-size:16px;line-height:1.5;outline:none;background:#fff;color:#10231d}.create-card textarea:focus{border-color:#178a64;box-shadow:0 0 0 3px rgba(23,138,100,.1)}.input-bottom{display:flex;justify-content:space-between;color:#71827c;font-size:11px;margin:8px 2px 14px}.generate,.primary{border:0;border-radius:13px;background:linear-gradient(135deg,#087b50,#14a36f);color:#fff;font-weight:800;cursor:pointer;box-shadow:0 9px 22px rgba(8,123,80,.24)}.generate{width:100%;padding:15px;font-size:16px}.generate:disabled,.primary:disabled{opacity:.55;cursor:not-allowed}.generate b{float:right;font-size:20px}.spinner{display:inline-block;width:15px;height:15px;border:2px solid rgba(255,255,255,.45);border-top-color:#fff;border-radius:50%;animation:spin .8s linear infinite;margin-right:8px;vertical-align:-2px}@keyframes spin{to{transform:rotate(360deg)}}.error{margin-top:12px;padding:11px;border-radius:10px;background:#fff0ef;color:#a33d32;font-size:13px}.simple-flow{display:flex;align-items:center;gap:13px;margin-top:28px;color:#fff;font-size:12px;font-weight:700}.simple-flow b{display:inline-grid;place-items:center;width:22px;height:22px;border-radius:50%;background:rgba(255,255,255,.18);margin-right:5px}.simple-flow i{opacity:.5;font-style:normal}.privacy{color:rgba(255,255,255,.72);font-size:11px;margin-top:22px}.workspace{max-width:1040px}.workspace-head{display:flex;justify-content:space-between;gap:24px;align-items:flex-end;background:rgba(248,252,249,.95);padding:25px;border-radius:22px;box-shadow:0 18px 45px rgba(0,0,0,.16)}.workspace-head h1{margin:5px 0;font-size:34px;letter-spacing:-.04em}.workspace-head p{margin:0;color:#64756e;max-width:600px}.actions{display:flex;gap:9px;flex-shrink:0}.secondary,.primary{padding:12px 15px;border-radius:11px;font-weight:800;cursor:pointer}.secondary{border:1px solid #cbd8d3;background:#fff;color:#214038}.primary{border:0}.page-tabs{display:flex;gap:7px;overflow:auto;padding:18px 0 10px}.page-tabs button{white-space:nowrap;border:1px solid rgba(255,255,255,.5);background:rgba(255,255,255,.82);color:#28443b;padding:10px 14px;border-radius:999px;font-weight:700;cursor:pointer}.page-tabs button.active{background:#0b7d53;color:#fff;border-color:#0b7d53}.overview{background:rgba(247,251,248,.96);border-radius:20px;padding:24px;box-shadow:0 16px 40px rgba(0,0,0,.14)}.mini-label{font-size:10px;font-weight:800;letter-spacing:.16em;color:#6d8078}.overview h2{margin:5px 0}.overview>p{color:#687971}.feature-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin-top:20px}.feature-card{display:flex;gap:12px;padding:15px;border:1px solid #dce5e1;border-radius:14px;background:#fff}.feature-card>span{color:#0a8a5b}.feature-card b{font-size:14px}.feature-card p{font-size:12px;color:#75857f;margin:5px 0 0;line-height:1.4}.phone-preview{width:min(470px,100%);margin:10px auto 20px;background:#102e27;border-radius:30px;padding:10px;box-shadow:0 25px 55px rgba(0,0,0,.25)}.phone-bar{height:42px;color:#dff4ea;display:flex;align-items:center;justify-content:space-between;padding:0 14px;font-size:12px}.phone-content{background:#f7faf8;border-radius:22px;min-height:360px;padding:25px;color:#17342b}.preview-badge{font-size:9px;letter-spacing:.15em;color:#13875f;font-weight:900}.phone-content h2{font-size:28px;margin:8px 0}.phone-content>p{color:#6e7e77;font-size:13px}.preview-feature{width:100%;display:flex;align-items:center;gap:10px;text-align:left;border:1px solid #dce5e1;background:#fff;border-radius:12px;padding:13px;margin-top:8px;color:#203c33;cursor:pointer}.preview-feature span{color:#0c9464}.preview-feature b{margin-left:auto;color:#8a9a94}.modify-box{background:rgba(247,251,248,.96);border-radius:18px;padding:18px;margin-top:15px}.modify-box p{margin:4px 0 12px;color:#71817b;font-size:12px}.modify-row{display:flex;gap:8px}.modify-row input{flex:1;min-width:0;border:1px solid #ccd9d4;border-radius:10px;padding:12px;font:inherit;outline:none}.modify-row button{border:0;border-radius:10px;padding:0 17px;background:#0a8055;color:#fff;font-weight:800}.modify-row button:disabled{opacity:.5}.modify-box small{display:block;margin-top:8px;color:#187354}.success{text-align:center;background:rgba(247,251,248,.96);padding:40px 25px;border-radius:22px;box-shadow:0 18px 45px rgba(0,0,0,.15)}.success-icon{width:54px;height:54px;border-radius:50%;display:grid;place-items:center;background:#0c875b;color:#fff;font-size:28px;margin:0 auto 14px}.success h1{font-size:36px;margin:7px 0}.success p{max-width:560px;margin:0 auto 20px;color:#667770}.centered{justify-content:center}.mini-preview{background:rgba(247,251,248,.96);padding:15px;border-radius:18px;margin-top:16px}.mini-preview .page-tabs{padding:0 0 10px}.modal-backdrop{position:fixed;inset:0;z-index:10;background:rgba(0,20,16,.65);display:grid;place-items:center;padding:22px}.modal{position:relative;max-width:480px;width:100%;background:#f7fbf8;border-radius:22px;padding:30px;color:#17342b;box-shadow:0 30px 80px rgba(0,0,0,.35)}.modal h2{font-size:28px;margin:7px 0}.modal p{color:#687971;line-height:1.5}.close{position:absolute;right:15px;top:12px;border:0;background:none;font-size:30px;color:#567068;cursor:pointer}
@media(max-width:700px){.topbar{padding:13px 15px}.brand small,.ai-ready{display:none}.brand b{font-size:15px}.create-screen,.workspace{padding:40px 14px 55px}.create-screen{justify-content:center}.hero-copy{margin-top:10px}.hero-copy h1{font-size:46px}.hero-copy p{font-size:14px}.create-card{padding:16px;border-radius:18px}.create-card textarea{min-height:145px}.simple-flow{gap:5px;font-size:9px}.simple-flow b{width:19px;height:19px}.simple-flow i{display:none}.workspace-head{display:block;padding:18px;border-radius:17px}.workspace-head h1{font-size:28px}.actions{margin-top:15px}.actions button{flex:1}.feature-grid{grid-template-columns:1fr}.overview{padding:18px}.phone-preview{margin-top:5px}.modify-row{display:grid;grid-template-columns:1fr auto}.modify-row button{padding:0 14px}.success{padding:30px 18px}.success h1{font-size:30px}}
`;
