"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

const STYLE_PRESETS = [
  ["Premium","Make the selected area feel premium and elegant with refined typography, generous spacing, layered background treatment and polished buttons. Keep the current brand identity and business logic."],
  ["Minimal","Make the selected area clean and minimal with more whitespace, fewer visual distractions, clearer hierarchy and simpler actions. Keep all working features."],
  ["Modern","Give the selected area a modern product look with confident typography, clean cards, subtle depth, responsive spacing and a distinctive hero treatment."],
  ["Luxury","Create a sophisticated luxury direction with restrained visual effects, editorial spacing, premium imagery direction and elegant typography without reducing readability."],
  ["Friendly","Make the selected area warmer, friendlier and easier for first-time customers to understand. Use clear wording, comfortable spacing and obvious next actions."],
  ["Bold","Make the selected area visually memorable with stronger hierarchy, larger hero treatment, confident contrast and original composition while preserving usability."],
];

const QUICK_CHANGES = [
  "Make this easier to use on iPhone and Android.",
  "Improve this layout without changing any existing features.",
  "Make the main button and next step more obvious.",
  "Make the background more beautiful and relevant to this business.",
  "Reduce clutter and make the page easier to scan.",
  "Check this page for confusing wording and simplify it.",
];

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
      if (!response.ok) throw new Error(data?.error || "Unable to load your project.");
      setApp(data.app); setVersions(data.versions || []);
    } catch (err) { setError(err?.message || "Unable to load your project."); }
    finally { setLoading(false); }
  }

  const currentVersion = useMemo(() => versions.find((item) => item.id === app?.current_version_id) || versions[0], [versions, app]);
  const spec = currentVersion?.specification || {};
  const pages = Array.isArray(spec.pages) ? spec.pages : [];
  const features = Array.isArray(spec.features) ? spec.features : [];
  const activePage = pages.find((p) => p?.name === selectedPage);

  async function modify(text = instruction) {
    const request = String(text || "").trim();
    if (!request || !currentVersion || saving) return;
    setInstruction(request); setSaving(true); setError(""); setMessage("");
    try {
      const scope = [
        selectedPage ? `TARGET PAGE: ${selectedPage}. Apply the requested visual/content change mainly to this page and preserve unrelated pages.` : "TARGET: whole App + Website.",
        selectedFeature ? `TARGET FEATURE: ${selectedFeature}. Preserve unrelated working features.` : "",
        "NO-CODE CUSTOMER EDIT: interpret the customer's natural-language request into design/content changes. Preserve working business logic, data, workflows and permissions unless the customer explicitly asks to change them.",
        "Keep the result mobile-first, readable, accessible, visually original and consistent with the saved brand. Create a new version rather than destructively overwriting history."
      ].filter(Boolean).join("\n");
      const response = await fetch("/api/modify", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ appId, instruction: `${scope}\n\nCUSTOMER REQUEST:\n${request}`, specification: currentVersion.specification }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || "AI could not complete that change.");
      setInstruction(""); setSelectedFeature("");
      setMessage(`Done — saved as version ${data.version?.version_no || "new"}. You can undo it from Version History & Rollback.`);
      await loadApp();
    } catch (err) { setError(err?.message || "AI could not complete that change."); }
    finally { setSaving(false); }
  }

  if (loading) return <main className="page"><div className="loading">Opening your visual editor…</div></main>;
  if (error && !app) return <main className="page"><div className="loading">{error}<br/><Link href="/my-apps">← Project Center</Link></div></main>;

  return <main className="page"><div className="wrap">
    <header><div><Link href={`/app-dashboard/${appId}`} className="back">← Project</Link><div className="eyebrow">NO-CODE VISUAL EDITOR</div><h1>Change it by telling AI.</h1><p>You do not need code. Pick a page, choose a style or describe what you want in your own words. AI keeps the rest of your project working.</p></div><div className="headActions"><span>v{currentVersion?.version_no || 1}</span><Link href={`/a/${appId}?demo=1`} target="_blank">Preview</Link><Link href={`/release/${appId}`}>Publish</Link></div></header>

    <section className="styleBar"><div><small>QUICK STYLE</small><strong>Choose a look</strong></div><div className="styleButtons">{STYLE_PRESETS.map(([name,prompt])=><button key={name} disabled={saving} onClick={()=>modify(prompt)}>{name}</button>)}</div></section>

    <section className="workspace">
      <aside className="navigator"><div className="eyebrow">1 · CHOOSE WHERE</div><button className={!selectedPage?"active":""} onClick={()=>setSelectedPage("")}>✨ Whole App + Website</button>{pages.map((page,i)=>{const name=page?.name||`Page ${i+1}`;return <button key={`${name}-${i}`} className={selectedPage===name?"active":""} onClick={()=>setSelectedPage(name)}><b>{String(i+1).padStart(2,"0")}</b><span>{name}</span></button>})}</aside>

      <section className="canvas"><div className="canvasTop"><div><div className="eyebrow">2 · SEE THE AREA</div><h2>{selectedPage || "Whole project"}</h2></div><span>Mobile-first</span></div><div className="phone"><div className="notch"/><div className="screen"><small>{app?.name}</small><h3>{selectedPage || pages[0]?.name || "Home"}</h3><p>{activePage?.purpose || activePage?.description || spec.description || "Your AI-generated experience"}</p><div className="heroVisual">Beautiful background / hero</div><div className="line"/><div className="line short"/><div className="cards"><i/><i/></div></div></div></section>

      <aside className="assistant"><div className="eyebrow">3 · TELL AI</div><h2>What would you like?</h2><div className="target">Changing: <b>{selectedPage || "Whole App + Website"}</b></div><textarea value={instruction} onChange={e=>setInstruction(e.target.value)} placeholder="Example: I want this to feel like a luxury property app. Use a beautiful city background, larger property photos, simpler buttons and more elegant spacing."/><div className="quick">{QUICK_CHANGES.map(item=><button key={item} disabled={saving} onClick={()=>setInstruction(item)}>{item}</button>)}</div>{features.length>0&&<div className="featureBox"><small>Optional: focus on one feature</small><div>{features.slice(0,8).map((feature,i)=>{const name=typeof feature==="string"?feature:feature?.name||`Feature ${i+1}`;return <button key={`${name}-${i}`} className={selectedFeature===name?"active":""} onClick={()=>setSelectedFeature(selectedFeature===name?"":name)}>{name}</button>})}</div></div>}<button className="apply" onClick={()=>modify()} disabled={saving||!instruction.trim()}>{saving?"AI is changing it…":"✨ Make This Change"}</button><p className="safe">AI creates a new version. Your previous version stays available for Rollback.</p>{message&&<div className="success">{message}</div>}{error&&<div className="error">{error}</div>}<Link className="history" href={`/app-dashboard/${appId}/versions`}>Undo / Version History & Rollback →</Link></aside>
    </section>
  </div><style jsx>{`
    *{box-sizing:border-box}.page{min-height:100vh;padding:28px 18px 70px;background:radial-gradient(circle at 72% 7%,#d8bf6222,transparent 25%),linear-gradient(145deg,#03100d,#0a2119 58%,#06140f);color:#f5fff9}.wrap{max-width:1400px;margin:auto}.loading{min-height:70vh;display:grid;place-items:center;color:#d8bf62}.back,.history{color:#e5c969;text-decoration:none}.eyebrow{color:#d8bf62;letter-spacing:.17em;font-size:10px;font-weight:950}header{display:flex;justify-content:space-between;gap:20px;margin-bottom:20px}h1{font-size:clamp(40px,6vw,70px);line-height:.98;margin:8px 0}header p{max-width:760px;color:#a7bab2;line-height:1.6;font-size:17px}.headActions{display:flex;gap:8px;align-items:flex-start;flex-wrap:wrap}.headActions span,.headActions a{padding:10px 13px;border:1px solid #d8bf6233;border-radius:12px;color:#e5c969;text-decoration:none;font-weight:850}.styleBar{display:flex;gap:16px;align-items:center;justify-content:space-between;border:1px solid #ffffff12;background:#051813dd;border-radius:20px;padding:16px 18px;margin-bottom:12px}.styleBar small,.styleBar strong{display:block}.styleBar small{color:#8ea69c;font-size:9px}.styleBar strong{margin-top:3px}.styleButtons{display:flex;gap:8px;flex-wrap:wrap}.styleButtons button{border:1px solid #d8bf6230;background:#0d2a20;color:#e9d99a;border-radius:999px;padding:9px 13px;font-weight:850}.workspace{display:grid;grid-template-columns:220px minmax(390px,1fr) 370px;gap:12px}.navigator,.canvas,.assistant{border:1px solid #ffffff10;background:#03100dcf;border-radius:22px;padding:17px}.navigator{display:flex;flex-direction:column;gap:8px}.navigator button{display:flex;gap:8px;align-items:center;border:1px solid transparent;background:#0a2119;color:#b6c6bf;border-radius:12px;padding:12px;text-align:left}.navigator button b{color:#d8bf62;font-size:10px}.navigator button.active{border-color:#d8bf625f;background:#d8bf6216;color:#fff}.canvas{display:grid;grid-template-rows:auto 1fr;min-height:650px}.canvasTop{display:flex;justify-content:space-between}.canvasTop h2,.assistant h2{margin:7px 0 12px}.canvasTop>span{height:max-content;color:#82dbb4;border:1px solid #82dbb433;border-radius:999px;padding:7px 9px;font-size:11px}.phone{align-self:center;justify-self:center;width:min(345px,90%);aspect-ratio:9/18;border:8px solid #0e1613;border-radius:42px;padding:8px;background:#101a16;box-shadow:0 35px 90px #0008}.notch{width:34%;height:17px;background:#0e1613;border-radius:0 0 13px 13px;margin:-8px auto 5px}.screen{height:calc(100% - 14px);border-radius:28px;background:linear-gradient(160deg,#f3f6f4,#dae7df);color:#143228;padding:21px}.screen>small{letter-spacing:.12em}.screen h3{font-size:30px;margin:7px 0}.screen p{font-size:12px;color:#5f756c;line-height:1.5}.heroVisual{height:150px;margin-top:16px;border-radius:20px;display:grid;place-items:center;text-align:center;padding:20px;background:linear-gradient(135deg,#b9cec1,#7ea895);color:#fff;font-weight:900}.line{height:42px;background:#c8d8cf;border-radius:12px;margin-top:13px}.line.short{height:13px;width:72%}.cards{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:13px}.cards i{height:75px;border-radius:14px;background:#bdcfc4}.target{font-size:12px;color:#9fb2aa;margin-bottom:9px}.assistant textarea{width:100%;min-height:170px;border:1px solid #d8bf6233;background:#071810;color:#fff;border-radius:15px;padding:14px;line-height:1.5;resize:vertical}.quick{display:grid;grid-template-columns:1fr 1fr;gap:7px;margin:11px 0}.quick button{border:1px solid #ffffff10;background:#0a2119;color:#b9c9c2;border-radius:11px;padding:9px;font-size:10px;text-align:left}.featureBox{border-top:1px solid #ffffff10;padding-top:10px}.featureBox small{color:#8fa39a}.featureBox>div{display:flex;gap:6px;flex-wrap:wrap;margin-top:8px}.featureBox button{border:1px solid #ffffff12;background:#0a2119;color:#aabcb4;border-radius:999px;padding:7px 9px;font-size:10px}.featureBox button.active{background:#d8bf62;color:#07130e}.apply{width:100%;margin-top:13px;border:0;border-radius:14px;padding:15px;background:linear-gradient(135deg,#f1d77c,#c99631);color:#07130e;font-weight:1000;font-size:15px}.apply:disabled,.styleButtons button:disabled,.quick button:disabled{opacity:.45}.safe{text-align:center;color:#82978e;font-size:10px}.success,.error{margin-top:10px;padding:11px;border-radius:11px;font-size:12px}.success{background:#2a8d6330;color:#9bedc6}.error{background:#a6343430;color:#ffb0b0}.history{display:block;text-align:center;margin-top:13px;font-size:12px}@media(max-width:1080px){.workspace{grid-template-columns:190px 1fr}.assistant{grid-column:1/-1}.canvas{min-height:560px}}@media(max-width:720px){header,.styleBar{flex-direction:column;align-items:flex-start}.workspace{grid-template-columns:1fr}.navigator{display:grid;grid-template-columns:1fr 1fr}.navigator .eyebrow{grid-column:1/-1}.assistant{grid-column:auto}.quick{grid-template-columns:1fr}.canvas{min-height:520px}}
  `}</style></main>;
}
