"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const EMPTY_ANSWERS = { sellerType:"individual", supportEmail:"", privacyPolicyUrl:"", supportUrl:"", websiteUrl:"", targetAudience:"", loginRequired:false, collectsPersonalData:false, containsAds:false, paidFeatures:false };
const REQUEST_ID=/^[A-Za-z0-9._:-]{1,160}$/;
function newRequestId(prefix="store"){try{return `${prefix}:${crypto.randomUUID()}`;}catch{return `${prefix}:${Date.now()}:${Math.random().toString(36).slice(2,12)}`;}}
function stableStoreRequestId({appId,versionId,listingId,platform}){const key=`laneriq:store-request:${appId}:${versionId}:${listingId}:${platform}`;try{const existing=window.sessionStorage.getItem(key);if(REQUEST_ID.test(existing||""))return existing;const created=newRequestId(platform==="apple"?"apple-store":"google-store");window.sessionStorage.setItem(key,created);return created;}catch{return newRequestId(platform==="apple"?"apple-store":"google-store");}}

export default function PublishPage({ params }) {
  const [appId, setAppId] = useState(null);
  const [app, setApp] = useState(null);
  const [version, setVersion] = useState(null);
  const [metadata, setMetadata] = useState(null);
  const [listing, setListing] = useState(null);
  const [agent, setAgent] = useState(null);
  const [answers, setAnswers] = useState(EMPTY_ANSWERS);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => { Promise.resolve(params).then((value) => setAppId(value.id)); }, [params]);

  useEffect(() => {
    if (!appId) return;
    try {
      const stored = window.localStorage.getItem(`publish-answers:${appId}`);
      if (stored) setAnswers((current) => ({ ...current, ...JSON.parse(stored) }));
    } catch {}
  }, [appId]);

  useEffect(() => {
    if (!appId) return;
    try { window.localStorage.setItem(`publish-answers:${appId}`, JSON.stringify(answers)); } catch {}
  }, [appId, answers]);

  useEffect(() => {
    if (!appId) return;
    (async () => {
      try {
        const response = await fetch(`/api/apps/${appId}`, { cache: "no-store" });
        const data = await response.json();
        if (!response.ok) throw new Error(data?.error || "Unable to load app.");
        const resolvedVersion = (data.versions || []).find((v) => v.id === data.app.current_version_id) || data.versions?.[0];
        setApp(data.app);
        setVersion(resolvedVersion);
        const fallbackWebsite = `${window.location.origin}/website/${appId}`;
        setAnswers((current) => ({ ...current, websiteUrl: current.websiteUrl || fallbackWebsite }));

        const agentResponse = await fetch(`/api/apps/${appId}/publishing-agent`, { cache: "no-store" });
        const agentData = await agentResponse.json().catch(() => null);
        if (agentResponse.ok && agentData) {
          setAgent(agentData);
          if (agentData.listing) setListing(agentData.listing);
          if (agentData.metadata) setMetadata(agentData.metadata);
          setAnswers((current) => ({
            ...current,
            ...Object.fromEntries(Object.entries(agentData.inferredAnswers || {}).filter(([, value]) => value !== "" && value !== null && value !== undefined)),
            websiteUrl: agentData?.inferredAnswers?.websiteUrl || current.websiteUrl || fallbackWebsite,
          }));
        }
      } catch (e) { setError(e.message); }
    })();
  }, [appId]);

  function updateAnswer(key, value) { setAnswers((current) => ({ ...current, [key]: value })); }

  async function refreshAgent() {
    if (!appId) return;
    const response = await fetch(`/api/apps/${appId}/publishing-agent`, { cache: "no-store" });
    const data = await response.json().catch(() => null);
    if (response.ok && data) setAgent(data);
  }

  async function generate() {
    if (!app || !version) return;
    if (!answers.supportEmail.trim() || !answers.targetAudience.trim()) { setError("Please answer the support email and target audience questions first."); return; }
    setBusy(true); setError(""); setMessage("");
    try {
      const spec = version.specification || {};
      const response = await fetch("/api/store-metadata", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ appName: app.name, description: app.description || spec.description || "", category: spec.category || spec.industry?.category || "Business", keywords: Array.isArray(spec.keywords) ? spec.keywords.join(",") : String(spec.keywords || ""), customerAnswers: answers }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || "Unable to generate store metadata.");
      setMetadata(data);
      const save = await fetch("/api/store-metadata/save", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ appId, versionId: version.id, language: data.language, apple: data.apple, googlePlay: data.googlePlay, checklist: data.checklist }) });
      const saved = await save.json();
      if (!save.ok) throw new Error(saved?.error || "Unable to save store metadata.");
      setListing(saved.listing);
      setMessage("SoolenAI auto-filled the store forms. Because the listing changed, customer approval was reset automatically so nothing can be submitted with an old approval.");
      await refreshAgent();
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
      setListing(data.listing); setMessage("Store listing approved by the customer.");
      await refreshAgent();
    } catch (e) { setError(e.message); }
    finally { setBusy(false); }
  }

  async function requestPublish(platform) {
    if (!listing?.id || !listing?.customer_approved_at || !version?.id) return;
    setBusy(true); setError("");
    try {
      const requestId=stableStoreRequestId({appId,versionId:version.id,listingId:listing.id,platform});
      const response = await fetch("/api/publish/request", { method: "POST", headers: { "Content-Type": "application/json" }, cache:"no-store", body: JSON.stringify({ appId, versionId: version.id, listingId: listing.id, platform, requestId }) });
      const data = await response.json().catch(()=>null);
      if (!response.ok) throw new Error(data?.error || "Unable to create publish request.");
      setMessage(`${platform === "apple" ? "Apple App Store" : "Google Play"} preparation request recorded safely. Nothing has been submitted to the store yet; official submission, review and approval remain external steps.`);
    } catch (e) { setError(e.message); }
    finally { setBusy(false); }
  }

  if (error && !app) return <main className="publishPage"><div className="box">{error}<br/><Link href="/my-apps">← My Apps</Link></div></main>;
  if (!app || !version) return <main className="publishPage"><div className="box">Loading publishing workspace…</div></main>;

  const agentNeeds = Array.isArray(agent?.needsCustomer) ? agent.needsCustomer : [];

  return (
    <main className="publishPage"><div className="wrap">
      <Link href={`/release/${appId}`} className="back">← Publish Center</Link>
      <div className="eyebrow">AI STORE PUBLISHING ASSISTANT</div><h1>{app.name}</h1><p className="intro">SoolenAI prepares most store fields automatically. You answer only the key questions AI cannot safely guess, then review and approve before official submission.</p>

      <section className="agentCard"><div><div className="eyebrow">AI PUBLISHING AGENT</div><h2>{agent?.readyForReview ? "Store information is ready for your review" : "I found the remaining questions"}</h2><p>{agent?.note || "SoolenAI checks the current app version and store listing, auto-fills safe fields and separates customer-only declarations from AI-generated content."}</p></div><div className="agentStats"><span><b>{agent?.autoFilled?.length || 0}</b> auto-filled</span><span><b>{agentNeeds.length}</b> customer/external items</span><span><b>{agent?.assetCount || 0}</b> linked assets</span></div>{agentNeeds.length > 0 && <div className="agentNeeds">{agentNeeds.map((item) => <div key={item.key}><strong>{item.label}</strong><small>{item.reason}</small></div>)}</div>}</section>

      <section className="card questions"><div className="eyebrow">STEP 1 · KEY CUSTOMER QUESTIONS</div><h2>Only tell us what AI should not guess</h2><div className="formGrid">
        <label>Publishing as<select value={answers.sellerType} onChange={(e)=>updateAnswer("sellerType",e.target.value)}><option value="individual">Individual</option><option value="organization">Organization / Company</option></select></label>
        <label>Support email<input value={answers.supportEmail} onChange={(e)=>updateAnswer("supportEmail",e.target.value)} placeholder="support@company.com" inputMode="email"/></label>
        <label>Target audience<input value={answers.targetAudience} onChange={(e)=>updateAnswer("targetAudience",e.target.value)} placeholder="Example: property buyers and agents aged 18+"/></label>
        <label>Privacy Policy URL<input value={answers.privacyPolicyUrl} onChange={(e)=>updateAnswer("privacyPolicyUrl",e.target.value)} placeholder="https://..."/></label>
        <label>Support URL<input value={answers.supportUrl} onChange={(e)=>updateAnswer("supportUrl",e.target.value)} placeholder="https://..."/></label>
        <label>Website URL<input value={answers.websiteUrl} onChange={(e)=>updateAnswer("websiteUrl",e.target.value)} placeholder="https://..."/></label>
      </div><div className="toggles"><Check label="Does the app require login?" checked={answers.loginRequired} onChange={(v)=>updateAnswer("loginRequired",v)}/><Check label="Does it collect personal data?" checked={answers.collectsPersonalData} onChange={(v)=>updateAnswer("collectsPersonalData",v)}/><Check label="Does it contain ads?" checked={answers.containsAds} onChange={(v)=>updateAnswer("containsAds",v)}/><Check label="Does it sell paid digital features?" checked={answers.paidFeatures} onChange={(v)=>updateAnswer("paidFeatures",v)}/></div></section>

      <div className="actions"><button onClick={generate} disabled={busy}>{busy ? "AI Auto-Filling…" : "AI Auto-Fill Store Forms →"}</button><button onClick={approve} disabled={busy || !listing?.id || !!listing?.customer_approved_at} className="secondary">{listing?.customer_approved_at ? "Customer Approved ✓" : "Review Complete — Approve Listing"}</button></div>
      {message && <div className="notice">{message}</div>}{error && <div className="error">{error}</div>}

      {metadata && <div className="grid"><section className="card"><div className="eyebrow">APPLE APP STORE · AUTO-FILLED</div><h2>{metadata.apple?.name}</h2><Field label="Subtitle" value={metadata.apple?.subtitle}/><Field label="Keywords" value={metadata.apple?.keywords}/><Field label="Promotional Text" value={metadata.apple?.promotionalText}/><Field label="Description" value={metadata.apple?.description}/><Field label="Category" value={metadata.apple?.category}/><Field label="Privacy URL" value={metadata.apple?.privacyUrl}/><Field label="Support URL" value={metadata.apple?.supportUrl}/></section><section className="card"><div className="eyebrow">GOOGLE PLAY · AUTO-FILLED</div><h2>{metadata.googlePlay?.title}</h2><Field label="Short Description" value={metadata.googlePlay?.shortDescription}/><Field label="Full Description" value={metadata.googlePlay?.fullDescription}/><Field label="Category" value={metadata.googlePlay?.category}/><Field label="Privacy Policy" value={metadata.googlePlay?.privacyPolicyUrl}/><Field label="Developer Website" value={metadata.googlePlay?.developerWebsite}/><Field label="Contact Email" value={metadata.googlePlay?.contactEmail}/></section></div>}

      <section className="card checklist"><div className="eyebrow">STEP 2 · AUTOMATIC CHECKLIST</div><h2>What is ready and what still needs you</h2>{(metadata?.checklist || []).map((item) => <div className="check" key={item.field}><span>{item.value && !String(item.value).startsWith("requires_") && !String(item.value).startsWith("customer_") ? "✓" : "○"}</span><div><strong>{item.field}</strong><small>{item.value || "Customer confirmation required."}</small></div></div>)}</section>

      <section className="fees"><div><div className="eyebrow">EXTERNAL STORE FEES</div><h2>Pay Apple / Google directly</h2><p>LANERIQ AI does not collect, mark up or keep these developer-account fees. The customer pays the store directly using their own developer account.</p></div><div className="feeCards"><a href="https://developer.apple.com/programs/enroll/" target="_blank" rel="noreferrer"><strong>Apple Developer Program</strong><span>US$99/year reference*</span><b>Pay Apple directly →</b></a><a href="https://play.google.com/console/signup" target="_blank" rel="noreferrer"><strong>Google Play developer registration</strong><span>US$25 one-time reference*</span><b>Pay Google directly →</b></a></div><small>*Platform prices can vary by region or change. The store's checkout page is the final price.</small></section>

      <section className="publishCard"><h2>Step 3 · Prepare official store submission</h2><p>SoolenAI prepares the information and submission package. The customer owns the developer account, pays platform fees directly, answers any platform-only declarations, and approves submission. Apple/Google still control review and approval.</p><div className="storeButtons"><button disabled={busy || !listing?.customer_approved_at} onClick={() => requestPublish("apple")}>Prepare Apple Submission</button><button disabled={busy || !listing?.customer_approved_at} onClick={() => requestPublish("google_play")}>Prepare Google Play Submission</button></div></section>
    </div><style jsx>{`.publishPage{min-height:100vh;padding:34px 18px 80px;background:radial-gradient(circle at 80% 8%,#d8bf6222,transparent 25%),linear-gradient(145deg,#03100d,#0a2119 58%,#06140f);color:#f5fff9}.wrap{max-width:1080px;margin:auto}.back{color:#d8bf62;text-decoration:none}.eyebrow{color:#d8bf62;letter-spacing:.18em;font-size:11px;font-weight:900;margin-top:18px}.publishPage h1{font-size:48px;margin:8px 0}.intro{color:#a8bbb3;max-width:800px;line-height:1.65}.agentCard{margin-top:20px;padding:24px;border:1px solid #79d7ac33;border-radius:22px;background:linear-gradient(135deg,#0b2b21cc,#03100dd9)}.agentCard h2{margin:7px 0}.agentCard p{color:#9fb2aa;line-height:1.55}.agentStats{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-top:14px}.agentStats span{display:flex;gap:7px;align-items:baseline;padding:13px;border:1px solid #ffffff10;border-radius:14px;background:#071c16}.agentStats b{font-size:22px;color:#79d7ac}.agentNeeds{display:grid;grid-template-columns:1fr 1fr;gap:9px;margin-top:12px}.agentNeeds div{padding:12px;border-radius:13px;background:#071c16;border:1px solid #ffffff0f}.agentNeeds strong,.agentNeeds small{display:block}.agentNeeds small{color:#8fa39a;margin-top:4px;line-height:1.4}.actions,.storeButtons{display:flex;gap:10px;flex-wrap:wrap;margin:24px 0}.actions button,.storeButtons button{border:0;border-radius:12px;padding:13px 17px;background:#d8bf62;color:#07130e;font-weight:900}.actions .secondary{background:#0e3024;color:#d8bf62;border:1px solid #d8bf6244}button:disabled{opacity:.45}.notice,.error{padding:12px 14px;border-radius:12px;margin:14px 0}.notice{background:#46be8c1a;color:#8de0bb}.error{background:#dc46461a;color:#ff9b9b}.card,.publishCard,.fees{padding:24px;border:1px solid #ffffff14;border-radius:22px;background:#03100dc9;margin-top:16px}.questions{border-color:#d8bf6233}.formGrid{display:grid;grid-template-columns:1fr 1fr;gap:12px}.formGrid label{display:grid;gap:7px;color:#d6e0db;font-size:12px;font-weight:800}.formGrid input,.formGrid select{width:100%;border:1px solid #ffffff1f;border-radius:12px;background:#071d17;color:#fff;padding:12px;font:inherit}.toggles{display:grid;grid-template-columns:1fr 1fr;gap:9px;margin-top:16px}.grid{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-top:18px}.check{display:flex;gap:12px;padding:14px 0;border-top:1px solid #ffffff0f}.check span{color:#d8bf62}.check strong,.check small{display:block}.check small{color:#7f9990;margin-top:4px;line-height:1.4}.fees{border-color:#d8bf6238}.fees p,.publishCard p{color:#93aaa0;line-height:1.6}.feeCards{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin:16px 0}.feeCards a{display:grid;gap:7px;padding:18px;border:1px solid #d8bf6233;border-radius:16px;color:#fff;text-decoration:none;background:#0a241b}.feeCards span{color:#a7bbb2}.feeCards b{color:#d8bf62}.fees>small{color:#81968d}.publishCard{border-color:#d8bf6233}@media(max-width:760px){.grid,.formGrid,.toggles,.feeCards,.agentNeeds{grid-template-columns:1fr}.agentStats{grid-template-columns:1fr}.publishPage h1{font-size:38px}}`}</style><style jsx global>{`.publishPage .toggle{display:flex;align-items:center;gap:10px;border:1px solid #ffffff12;border-radius:13px;padding:12px;color:#b9cbc3}.publishPage .toggle input{accent-color:#d8bf62}.publishPage .field{padding:12px 0;border-top:1px solid #ffffff0f}.publishPage .field label{display:block;color:#d8bf62;font-size:11px;font-weight:800;margin-bottom:5px}.publishPage .field p{margin:0;color:#b7c7c0;line-height:1.6;white-space:pre-wrap;overflow-wrap:anywhere}`}</style></main>
  );
}

function Field({ label, value }) { return <div className="field"><label>{label}</label><p>{value || "—"}</p></div>; }
function Check({ label, checked, onChange }) { return <label className="toggle"><input type="checkbox" checked={checked} onChange={(e)=>onChange(e.target.checked)}/><span>{label}</span></label>; }
