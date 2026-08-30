"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createClient } from "../../lib/supabase/client";

const STEPS = ["Name check", "Understand idea", "Read references", "Generate App + Website", "Quality check", "Preview"];

export default function CreatePage() {
  const supabase = useMemo(() => createClient(), []);
  const [appName, setAppName] = useState("");
  const [idea, setIdea] = useState("");
  const [nameResult, setNameResult] = useState(null);
  const [checking, setChecking] = useState(false);
  const [building, setBuilding] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [learning, setLearning] = useState(false);
  const [referenceReady, setReferenceReady] = useState(false);

  useEffect(() => {
    function syncReference() {
      try { setReferenceReady(Boolean(sessionStorage.getItem("soolenReferenceAnalysis"))); } catch {}
    }
    syncReference();
    window.addEventListener("soolen-app-idea", (event) => {
      const value = String(event?.detail?.idea || "").trim();
      if (value) setIdea(value);
      syncReference();
    });
  }, []);

  async function checkName() {
    const value = appName.trim();
    if (!value) { setError("Enter the App name first."); return null; }
    setChecking(true); setError(""); setMessage("");
    try {
      const response = await fetch(`/api/name-check?name=${encodeURIComponent(value)}`, { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || "Unable to check the name.");
      setNameResult(data);
      setMessage(data.risk === "low" ? "No strong public conflict found in this check." : data.risk === "medium" ? "Similar names were found. You can still continue or rename." : "A very similar or exact public name was found. Renaming is recommended.");
      return data;
    } catch (err) {
      setError(err?.message || "Unable to check the name.");
      return null;
    } finally { setChecking(false); }
  }

  async function build() {
    if (!appName.trim() || !idea.trim()) { setError("Add an App name and tell SoolenAI what you want to build."); return; }
    let checked = nameResult;
    if (!checked || checked.name !== appName.trim()) checked = await checkName();
    if (!checked) return;
    setBuilding(true); setError(""); setMessage("SoolenAI is building your App + Website…");
    try {
      const { data } = await supabase.auth.getSession();
      if (!data?.session) {
        try {
          sessionStorage.setItem("aiAppBuilderPendingIdea", idea.trim());
          sessionStorage.setItem("aiAppBuilderPendingName", appName.trim());
        } catch {}
        window.location.assign(`/auth?next=${encodeURIComponent("/create")}`);
        return;
      }

      let referenceBrief = "";
      try { referenceBrief = sessionStorage.getItem("soolenReferenceAnalysis") || ""; } catch {}
      const finalIdea = [
        `CUSTOMER APP NAME: ${appName.trim()}`,
        `CUSTOMER IDEA: ${idea.trim()}`,
        referenceBrief,
        "ONE-CLICK BUILD RULE: Create both a functional App and responsive Website from this request.",
        "MEDIA RULE: Customer-uploaded images/video/sketches are requirements and inspiration. Place customer-owned media where appropriate; do not copy third-party branding, text, images, code or distinctive layouts.",
        "INNOVATION RULE: Learn the intent, workflow and preferences of this project, then reimagine and improve them into original work.",
        `LEARNING CONSENT: ${learning ? "Customer allows anonymized product-pattern learning; never reuse raw private assets or personal content." : "Project-only learning. Do not use this customer's private content to improve other customers' projects."}`,
        "QUALITY RULE: Prioritize stability, security, privacy, comfort, beauty and naturalness.",
      ].filter(Boolean).join("\n\n");

      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idea: finalIdea, requestedName: appName.trim(), innovationLearningConsent: learning }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result?.specification) throw new Error(result?.error || "Build failed.");
      const id = result?.app?.id;
      if (id) window.location.assign(`/app-dashboard/${id}`);
      else setMessage("App + Website generated. Open Project Center to continue.");
    } catch (err) {
      setError(err?.message || "Unable to complete the build.");
    } finally { setBuilding(false); }
  }

  const riskLabel = nameResult?.risk === "high" ? "High conflict" : nameResult?.risk === "medium" ? "Similar names" : nameResult ? "Low conflict" : "Not checked";

  return <main className="page">
    <div className="backdrop" />
    <div className="wrap">
      <header><Link href="/studio">← Studio</Link><span>SOOLENAI · ONE-CLICK CREATE</span></header>
      <section className="hero"><small>UPLOAD / DESCRIBE → GENERATE → PREVIEW → PUBLISH</small><h1>One click from idea<br/>to <em>App + Website.</em></h1><p>Give SoolenAI the name, idea, photos, videos, sketches or brand references. SoolenAI understands, reimagines, builds, checks and prepares the project.</p></section>

      <section className="builder">
        <div className="main">
          <label>1 · Name your App</label>
          <div className="row"><input value={appName} onChange={(e)=>{setAppName(e.target.value);setNameResult(null)}} placeholder="Example: HomeFlow AI" maxLength={80}/><button onClick={checkName} disabled={checking}>{checking?"Checking…":"Check name"}</button></div>
          <div className={`risk ${nameResult?.risk || "none"}`}><b>{riskLabel}</b><span>{nameResult ? nameResult.note : "Checks public App Store and web-name signals before build."}</span></div>
          {!!nameResult?.similar?.length && <div className="matches">{nameResult.similar.slice(0,5).map((item,i)=><div key={i}><b>{item.name}</b><span>{item.source}</span></div>)}</div>}

          <label>2 · Tell SoolenAI what to build</label>
          <textarea value={idea} onChange={(e)=>setIdea(e.target.value)} placeholder="Example: Build a premium real estate CRM App and customer Website with listings, appointments, WhatsApp enquiries and agent profiles." maxLength={7000}/>

          <div className="uploadInfo"><div><b>{referenceReady?"✓ Visual references ready":"＋ Add photos, video or sketches"}</b><span>Use the floating Add references button. SoolenAI will analyze the visual intent and combine it with your text.</span></div></div>

          <label className="consent"><input type="checkbox" checked={learning} onChange={(e)=>setLearning(e.target.checked)}/><span><b>Allow anonymized product-pattern learning</b><small>Optional and off by default. Raw private photos, videos, personal data and customer content are not reused for other customers.</small></span></label>

          <button className="build" onClick={build} disabled={building}>{building?"SOOLENAI IS BUILDING…":"GENERATE APP + WEBSITE →"}</button>
          {message&&<div className="message">{message}</div>}{error&&<div className="error">{error}</div>}
        </div>

        <aside><h3>SoolenAI does the rest</h3>{STEPS.map((step,index)=><div key={step}><span>{String(index+1).padStart(2,"0")}</span><b>{step}</b></div>)}<p>Underlying hosting, database, storage, AI providers and deployment stay hidden from the customer.</p></aside>
      </section>
    </div>
    <style jsx>{`
      *{box-sizing:border-box}.page{min-height:100vh;background:#061713;color:#f7f3e8;position:relative;font-family:Inter,system-ui,-apple-system,sans-serif;padding-bottom:80px}.backdrop{position:fixed;inset:0;background:linear-gradient(180deg,rgba(1,10,8,.2),rgba(1,10,8,.9)),url('/soolen-ai-landscape.jpg') center/cover;filter:saturate(.88)}.wrap{position:relative;z-index:1;max-width:1120px;margin:auto;padding:22px}.wrap>header{display:flex;justify-content:space-between;align-items:center;font-size:11px;letter-spacing:.14em;font-weight:900}.wrap>header a{color:#fff;text-decoration:none;border:1px solid #ffffff33;padding:10px 13px;border-radius:99px;background:#061b15aa}.wrap>header span{color:#e5c66c}.hero{padding:70px 0 34px;max-width:900px}.hero small{color:#e5c66c;font-weight:900;letter-spacing:.17em}.hero h1{font-size:clamp(48px,8vw,92px);line-height:.94;letter-spacing:-.055em;margin:15px 0 20px;text-shadow:0 20px 60px #000}.hero em{font-style:normal;color:#e5c66c}.hero p{max-width:760px;color:#d6e0db;font-size:17px;line-height:1.7}.builder{display:grid;grid-template-columns:minmax(0,1fr) 310px;gap:16px}.main,aside{background:rgba(4,26,20,.8);border:1px solid rgba(229,198,108,.3);border-radius:26px;padding:24px;backdrop-filter:blur(22px);box-shadow:0 30px 80px #0006}.main>label{display:block;margin:4px 0 9px;color:#f4d77d;font-weight:900}.row{display:grid;grid-template-columns:1fr auto;gap:9px}.row input,textarea{width:100%;border:1px solid #ffffff24;border-radius:14px;background:#061611;color:#fff;padding:14px;font:inherit;outline:none}.row button{border:0;border-radius:14px;padding:0 18px;background:#e5c66c;color:#14251f;font-weight:950}.row button:disabled{opacity:.5}textarea{min-height:170px;resize:vertical;margin-bottom:14px}.risk{display:flex;justify-content:space-between;gap:12px;align-items:center;margin:9px 0 22px;padding:10px 12px;border-radius:12px;background:#ffffff0b;color:#aebdb6;font-size:11px}.risk b{color:#e5c66c}.risk.low b{color:#81dcb3}.risk.high b{color:#ff9a8e}.matches{display:grid;gap:7px;margin:-12px 0 20px}.matches div{display:flex;justify-content:space-between;gap:10px;padding:8px 10px;border-radius:10px;background:#ffffff08;font-size:11px}.matches span{color:#8fa198}.uploadInfo{padding:14px;border:1px dashed #e5c66c66;border-radius:14px;margin-bottom:14px}.uploadInfo b,.uploadInfo span{display:block}.uploadInfo span{font-size:11px;color:#a9bbb4;margin-top:4px;line-height:1.5}.consent{display:flex!important;gap:10px;align-items:flex-start!important;color:#dbe6e1!important;margin:12px 0 18px!important}.consent input{margin-top:3px}.consent span b,.consent span small{display:block}.consent small{color:#91a49b;margin-top:4px;line-height:1.45;font-weight:400}.build{width:100%;border:0;border-radius:16px;padding:18px;background:linear-gradient(135deg,#f3da8b,#c9912e);color:#17231e;font-size:17px;font-weight:1000}.build:disabled{opacity:.55}.message,.error{margin-top:12px;padding:12px;border-radius:12px;font-size:12px}.message{background:#1c6b4d33;color:#9fe2c2}.error{background:#7c2d2d44;color:#ffb5ad}aside h3{font-size:24px;margin:0 0 14px}aside>div{display:flex;gap:10px;align-items:center;border-top:1px solid #ffffff12;padding:13px 0}aside>div span{color:#e5c66c;font-size:10px}aside>div b{font-size:13px}aside p{color:#95a79f;font-size:11px;line-height:1.55;margin-top:16px}@media(max-width:800px){.builder{grid-template-columns:1fr}.hero{padding-top:48px}.wrap>header span{display:none}}@media(max-width:520px){.row{grid-template-columns:1fr}.row button{padding:13px}.main,aside{padding:18px}.hero h1{font-size:50px}.risk{align-items:flex-start;flex-direction:column}}
    `}</style>
  </main>;
}
