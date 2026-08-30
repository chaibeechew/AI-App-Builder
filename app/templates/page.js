"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

export default function TemplatesPage() {
  const [meta, setMeta] = useState(null);
  const [templates, setTemplates] = useState([]);
  const [mode, setMode] = useState("trending");
  const [query, setQuery] = useState("");
  const [industry, setIndustry] = useState("");
  const [style, setStyle] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/templates?mode=meta", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setMeta(d))
      .catch(() => setError("Unable to load template categories."));
  }, []);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    const params = new URLSearchParams();
    if (mode === "trending" && !query && !industry && !style) {
      params.set("mode", "trending");
      params.set("limit", "100");
    } else {
      params.set("mode", "search");
      params.set("limit", "60");
      if (query) params.set("q", query);
      if (industry) params.set("industry", industry);
      if (style) params.set("style", style);
    }

    const timer = setTimeout(() => {
      fetch(`/api/templates?${params.toString()}`, { cache: "no-store" })
        .then(async (r) => {
          const d = await r.json();
          if (!r.ok) throw new Error(d?.error || "Unable to load templates.");
          if (active) setTemplates(Array.isArray(d.templates) ? d.templates : []);
        })
        .catch((e) => active && setError(e?.message || "Unable to load templates."))
        .finally(() => active && setLoading(false));
    }, query ? 250 : 0);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [mode, query, industry, style]);

  const stats = meta?.stats || {};
  const styles = meta?.styles || [];
  const industries = meta?.industries || [];
  const heading = useMemo(() => {
    if (query || industry || style) return "Reference ideas matched to your direction";
    return mode === "trending" ? "Trending 100 inspiration directions" : "Explore all industry inspirations";
  }, [mode, query, industry, style]);

  function reimagine(template) {
    const instruction = [
      `Create an original ${template.industry} ${template.archetype} App and customer Website.`,
      `Use this reference only for inspiration, not for copying: ${template.title}.`,
      `Visual direction: ${template.style}.`,
      `Useful flow ideas to consider: ${(template.pages || []).join(", ")}.`,
      `Useful capability ideas to consider: ${(template.features || []).join(", ")}.`,
      "Reimagine the information architecture, layout, components, copy, visual hierarchy and interactions for my own product.",
      "Do not copy third-party brand identity, text, images, source code, proprietary layouts or distinctive trade dress.",
      "Produce a fresh, coherent and practical design rather than a clone."
    ].join("\n");

    try {
      sessionStorage.setItem("soolenAppIdea", instruction);
      sessionStorage.setItem("soolenInspirationTemplate", JSON.stringify({
        id: template.id,
        industry: template.industry,
        archetype: template.archetype,
        style: template.style,
      }));
    } catch {}
    window.location.assign("/");
  }

  return (
    <main className="templatesPage">
      <div className="glow" />
      <header>
        <div>
          <div className="eyebrow">SOOLENAI · INSPIRATION LIBRARY</div>
          <h1>Reference. Reimagine. Build something original.</h1>
          <p>Explore thousands of industry structures and current design directions. SoolenAI uses them as inspiration signals, then generates a fresh App + Website for your own business — never a direct copy.</p>
        </div>
        <Link href="/" className="button">Create from scratch →</Link>
      </header>

      <section className="stats">
        <article><b>{stats.templates || "3,000"}+</b><span>industry inspirations</span></article>
        <article><b>{stats.industries || "50"}</b><span>industries</span></article>
        <article><b>{stats.archetypes || "12"}</b><span>app structures</span></article>
        <article><b>100</b><span>trending directions</span></article>
      </section>

      <section className="controls">
        <div className="tabs">
          <button className={mode === "trending" ? "on" : ""} onClick={() => { setMode("trending"); setQuery(""); setIndustry(""); setStyle(""); }}>🔥 Trending 100</button>
          <button className={mode === "all" ? "on" : ""} onClick={() => setMode("all")}>All Inspirations</button>
        </div>
        <input value={query} onChange={(e) => { setQuery(e.target.value); setMode("all"); }} placeholder="Search industry, app type or style…" />
        <select value={industry} onChange={(e) => { setIndustry(e.target.value); setMode("all"); }}>
          <option value="">All industries</option>
          {industries.map((item) => <option key={item} value={item}>{item}</option>)}
        </select>
        <select value={style} onChange={(e) => { setStyle(e.target.value); setMode("all"); }}>
          <option value="">All styles</option>
          {styles.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
        </select>
      </section>

      <section className="titleRow"><div><small>{mode === "trending" ? "LIVE TREND BOARD" : "DISCOVER"}</small><h2>{heading}</h2></div><span>{templates.length} shown</span></section>

      {error && <div className="error">{error}</div>}
      {loading ? <div className="loading">Loading inspiration library…</div> : (
        <section className="grid">
          {templates.map((t, index) => (
            <article className="card" key={t.id}>
              <div className="cardTop"><span>{mode === "trending" ? `#${index + 1}` : t.industry}</span><b>{t.style}</b></div>
              <div className="icon">✦</div>
              <h3>{t.title}</h3>
              <p>{t.description}</p>
              <div className="chips">{(t.styleTags || []).slice(0, 3).map((tag) => <span key={tag}>{tag}</span>)}</div>
              <div className="note">Reference only · AI will reimagine the structure, visuals and copy.</div>
              <button className="use" onClick={() => reimagine(t)}>AI Reimagine →</button>
            </article>
          ))}
          {!templates.length && <div className="empty">No inspiration matched these filters. Try a broader search.</div>}
        </section>
      )}

      <footer><Link href="/soolen-ai">← Soolen AI</Link><span>Template references are inspiration inputs, not copy targets.</span></footer>

      <style jsx>{`
        .templatesPage{min-height:100vh;padding:46px clamp(16px,5vw,70px) 60px;background:#03100d;color:#f5fff9;font-family:Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;position:relative;overflow:hidden}.glow{position:absolute;inset:0 0 auto;height:580px;background:radial-gradient(circle at 78% 8%,#b78a3238,transparent 36%),radial-gradient(circle at 20% 0,#0d78564a,transparent 34%);pointer-events:none}header,.stats,.controls,.titleRow,.grid,.loading,.error,footer{position:relative;max-width:1180px;margin-left:auto;margin-right:auto}header{display:flex;justify-content:space-between;align-items:end;gap:28px;margin-bottom:28px}header>div{max-width:850px}.eyebrow,.titleRow small{color:#d8bf62;font-size:11px;font-weight:950;letter-spacing:.18em}h1{font-family:Georgia,serif;font-size:clamp(43px,6vw,76px);line-height:1.02;margin:12px 0}header p{color:#a7bbb2;line-height:1.7;font-size:17px;max-width:800px}.button{display:inline-flex;white-space:nowrap;text-decoration:none;background:#d8bf62;color:#07130e;font-weight:950;border-radius:13px;padding:13px 17px}.stats{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:16px}.stats article{padding:17px;border:1px solid #ffffff12;border-radius:17px;background:#071b14cc}.stats b{display:block;color:#f0cf75;font-size:24px}.stats span{color:#829b90;font-size:12px}.controls{display:grid;grid-template-columns:auto minmax(220px,1fr) 200px 180px;gap:9px;padding:12px;border:1px solid #d8bf6229;border-radius:19px;background:#061813d9;backdrop-filter:blur(12px)}.tabs{display:flex;gap:5px}.controls button,.controls input,.controls select{border:1px solid #ffffff14;border-radius:11px;background:#03110d;color:#eaf5ef;padding:11px 12px;font:inherit}.controls button{font-weight:850;cursor:pointer}.controls button.on{background:#d8bf62;color:#08150f;border-color:#d8bf62}.controls input{min-width:0}.titleRow{display:flex;justify-content:space-between;align-items:end;gap:20px;margin-top:36px;margin-bottom:14px}.titleRow h2{font-size:30px;margin:6px 0}.titleRow>span{color:#829b90;font-size:12px}.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(245px,1fr));gap:14px}.card{padding:20px;border:1px solid #ffffff12;border-radius:20px;background:#061813dc;display:flex;flex-direction:column;min-height:360px}.card:hover{border-color:#d8bf625b;transform:translateY(-1px)}.cardTop{display:flex;justify-content:space-between;gap:10px;color:#6fcaa0;font-size:10px;font-weight:900;letter-spacing:.08em}.cardTop b{color:#d7bd69;text-align:right}.icon{width:42px;height:42px;margin-top:16px;display:grid;place-items:center;border-radius:12px;background:linear-gradient(145deg,#e3ca72,#8c7331);color:#07130e}.card h3{font-size:19px;margin:15px 0 7px}.card p{color:#91a99e;line-height:1.55;font-size:13px}.chips{display:flex;flex-wrap:wrap;gap:6px}.chips span{padding:5px 8px;border-radius:999px;background:#ffffff08;color:#9db3aa;font-size:10px}.note{margin-top:auto;padding:12px 0 10px;color:#738c82;font-size:10px;line-height:1.45}.use{width:100%;border:0;border-radius:12px;padding:13px;background:#0d3327;color:#e5c96d;font-weight:950;cursor:pointer}.use:hover{background:#154937}.loading,.error,.empty{padding:22px;border-radius:14px;background:#ffffff08;color:#9eb5ab}.error{color:#ffafa7;background:#542c293f}footer{display:flex;justify-content:space-between;gap:16px;margin-top:44px;color:#71887e;font-size:12px}footer a{color:#d8bf62;text-decoration:none;font-weight:900}@media(max-width:850px){header{align-items:flex-start;flex-direction:column}.controls{grid-template-columns:1fr 1fr}.tabs{grid-column:1/-1}.stats{grid-template-columns:1fr 1fr}}@media(max-width:560px){.templatesPage{padding-top:30px}.controls{grid-template-columns:1fr}.tabs{grid-column:auto}.tabs button{flex:1}.stats{grid-template-columns:1fr 1fr}.titleRow,footer{align-items:flex-start;flex-direction:column}.grid{grid-template-columns:1fr}h1{font-size:44px}}
      `}</style>
    </main>
  );
}
