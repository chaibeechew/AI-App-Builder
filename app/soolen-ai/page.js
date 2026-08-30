"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

const STATUS_LABELS = {
  ready: "Ready",
  integration_ready: "Integration ready",
  upgrade_required: "Paid plan",
  setup_required: "Provider setup",
  planned: "Next upgrade",
};

export default function SoolenAICenter() {
  const [data, setData] = useState(null);
  const [loadError, setLoadError] = useState("");
  const [messages, setMessages] = useState([]);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [advanced, setAdvanced] = useState(false);

  useEffect(() => {
    fetch("/api/soolenai/capabilities", { cache: "no-store" })
      .then(async (response) => {
        const value = await response.json();
        if (!response.ok) throw new Error(value?.error || "Unable to load capabilities.");
        setData(value);
      })
      .catch((error) => setLoadError(error?.message || "Unable to load capabilities."));
  }, []);

  const groups = useMemo(() => {
    const grouped = {};
    for (const capability of data?.capabilities || []) {
      (grouped[capability.category] ||= []).push(capability);
    }
    return grouped;
  }, [data]);

  async function send(event) {
    event.preventDefault();
    const text = message.trim();
    if (!text || sending) return;
    const history = [...messages, { role: "user", content: text }];
    setMessages(history);
    setMessage("");
    setSending(true);
    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, messages, mode: advanced ? "advanced" : "standard" }),
      });
      const value = await response.json();
      if (!response.ok) throw new Error(value?.error || "Soolen AI is unavailable.");
      setMessages((items) => [...items, { role: "assistant", content: value.content, provider: value.provider }]);
    } catch (error) {
      setMessages((items) => [...items, { role: "error", content: error?.message || "Soolen AI is unavailable." }]);
    } finally {
      setSending(false);
    }
  }

  const tier = data?.subscription?.tier || "free";
  const advancedReady = Boolean(data?.providers?.premiumRouting);
  const costMode = data?.policy?.mode || "zero";
  const readyCount = (data?.capabilities || []).filter((item) => item.status === "ready" || item.status === "integration_ready").length;

  return <main className="soolenCenter">
    <div className="aurora"/>
    <header>
      <Link href="/" className="back">← AI App Builder</Link>
      <div className="tier">{tier.toUpperCase()} · {costMode.toUpperCase()} COST · {readyCount} READY</div>
    </header>

    <section className="hero">
      <small>SOOLEN AI · CAPABILITY CENTER</small>
      <h1>一个入口，连接 Soolen AI 的全部能力。</h1>
      <p>思考、写作、多语言、App + Website、代码、图片、语音和影片都由同一个权限系统管理。免费能力直接使用；付费能力只有在有效订阅与服务授权同时通过后才开启。</p>
      <div className="policy"><span>✓ RM0 metered AI spend</span><span>✓ Device + local first</span><span>✓ Server-checked subscription</span><span>✓ Authorized providers only</span><span>✓ Automatic fallback</span><span>✓ No copied private models</span></div>
    </section>

    <section className="chat">
      <div className="chatHead">
        <div><small>SOOLEN CONVERSATION</small><h2>What do you want to do?</h2></div>
        <label className={!advancedReady ? "mode locked" : "mode"}><input type="checkbox" checked={advanced} disabled={!advancedReady} onChange={(event) => setAdvanced(event.target.checked)}/> Advanced local reasoning {!advancedReady && "· Connect Ollama"}</label>
      </div>
      <div className="messages">
        {!messages.length && <div className="welcome"><b>Try asking Soolen AI:</b><span>“Design a premium real-estate App and customer website.”</span><span>“Analyze my layout references and suggest a better mobile flow.”</span><span>“Write, test and repair this feature.”</span></div>}
        {messages.map((item, index) => <article key={index} className={item.role}><small>{item.role === "user" ? "YOU" : item.role === "assistant" ? "SOOLEN AI" : "NOTICE"}</small><p>{item.content}</p>{item.provider && <em>via authorized {item.provider}</em>}</article>)}
        {sending && <article className="assistant thinking"><small>SOOLEN AI</small><p>Thinking and checking the available capability…</p></article>}
      </div>
      <form onSubmit={send}><textarea value={message} onChange={(event) => setMessage(event.target.value)} placeholder="Describe what you need. Soolen AI will use only the capabilities available to your account."/><button disabled={sending || !message.trim()}>{sending ? "Working…" : "Send →"}</button></form>
    </section>

    <section className="catalog">
      <div className="sectionTitle"><small>CAPABILITY MAP</small><h2>能力不是宣传词，每一项都有实际状态</h2></div>
      {loadError && <div className="error">{loadError}</div>}
      {!data && !loadError && <div className="loading">Checking Soolen AI capabilities…</div>}
      {Object.entries(groups).map(([category, capabilities]) => <div className="group" key={category}>
        <h3>{category}</h3>
        <div className="cards">{capabilities.map((capability) => <article key={capability.id} className={capability.status}>
          <div className="cardTop"><span>{capability.minimumTier === "free" ? "PUBLIC" : capability.minimumTier.toUpperCase()}</span><b>{STATUS_LABELS[capability.status] || capability.status}</b></div>
          <h4>{capability.name}</h4>
          <p>{capability.description}</p>
        </article>)}</div>
      </div>)}
    </section>

    <footer><Link href="/">Build App + Website →</Link><span>Soolen AI capability version {data?.version || "…"}</span></footer>

    <style jsx>{`
      .soolenCenter{min-height:100vh;background:#020d0a;color:#f4fbf7;padding:24px clamp(16px,5vw,70px) 60px;font-family:Inter,system-ui,sans-serif;position:relative;overflow:hidden}.aurora{position:absolute;inset:0 0 auto;height:700px;background:radial-gradient(circle at 75% 10%,#0b7d5844,transparent 42%),radial-gradient(circle at 20% 0,#d6ad4940,transparent 33%);pointer-events:none}.soolenCenter>header,.hero,.chat,.catalog,.soolenCenter>footer{position:relative;max-width:1120px;margin-left:auto;margin-right:auto}.soolenCenter>header{display:flex;justify-content:space-between;align-items:center}.back{color:#e0be66;text-decoration:none;font-weight:800}.tier{padding:9px 12px;border:1px solid #d8b65455;border-radius:999px;color:#81d9b1;font-size:11px;font-weight:900;letter-spacing:.1em}.hero{padding:80px 0 36px}.hero small,.chat small,.sectionTitle small{color:#dfb956;letter-spacing:.18em;font-weight:900}.hero h1{font-family:Georgia,serif;font-size:clamp(42px,7vw,78px);max-width:900px;line-height:1.02;margin:14px 0}.hero>p{max-width:820px;color:#a9beb4;font-size:18px;line-height:1.7}.policy{display:flex;gap:8px;flex-wrap:wrap;margin-top:22px}.policy span{padding:9px 12px;border:1px solid #ffffff15;border-radius:999px;background:#ffffff08;color:#bcd0c7;font-size:12px}.chat{border:1px solid #d7b65644;border-radius:26px;background:#071a13dd;box-shadow:0 30px 80px #0008;overflow:hidden}.chatHead{padding:22px;display:flex;justify-content:space-between;gap:20px;align-items:center;border-bottom:1px solid #ffffff12}.chat h2{margin:5px 0}.mode{display:flex;align-items:center;gap:8px;color:#dfc36f;font-size:12px;font-weight:800}.mode.locked{opacity:.55}.messages{min-height:240px;max-height:540px;overflow:auto;padding:20px;display:grid;gap:12px}.welcome{display:grid;gap:8px;color:#92a99e}.welcome b{color:#fff}.welcome span{padding:11px;border-radius:12px;background:#ffffff07}.messages article{max-width:82%;padding:13px 15px;border-radius:16px;background:#10291f}.messages article.user{justify-self:end;background:#d6ae4c;color:#102018}.messages article.error{background:#542c29}.messages article p{margin:5px 0;white-space:pre-wrap;line-height:1.55}.messages article em{font-size:10px;opacity:.6}.thinking{opacity:.7}.chat form{display:grid;grid-template-columns:1fr auto;gap:10px;padding:16px;border-top:1px solid #ffffff12}.chat textarea{min-height:72px;resize:vertical;border:1px solid #ffffff18;border-radius:14px;padding:13px;background:#03110d;color:#fff;font:inherit}.chat form button{border:0;border-radius:14px;padding:0 22px;background:linear-gradient(135deg,#f4d981,#c68f2d);color:#102018;font-weight:950}.chat form button:disabled{opacity:.45}.catalog{padding-top:60px}.sectionTitle h2{font-size:34px;margin:8px 0 30px}.group{margin-top:30px}.group>h3{color:#daba63}.cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:12px}.cards article{padding:18px;border:1px solid #ffffff12;border-radius:18px;background:#081a14}.cards article.upgrade_required{border-color:#d6ad4944}.cards article.setup_required,.cards article.planned{opacity:.62}.cardTop{display:flex;justify-content:space-between;gap:8px;font-size:10px;letter-spacing:.1em}.cardTop span{color:#d9ba67;font-weight:900}.cardTop b{color:#79d3a9}.upgrade_required .cardTop b{color:#f0c96e}.planned .cardTop b,.setup_required .cardTop b{color:#9aaca4}.cards h4{font-size:18px;margin:13px 0 7px}.cards p{margin:0;color:#91a89e;line-height:1.5;font-size:13px}.loading,.error{padding:18px;border-radius:14px;background:#ffffff08}.error{color:#ffaaa2}.soolenCenter>footer{display:flex;justify-content:space-between;gap:14px;align-items:center;padding-top:50px;color:#789087;font-size:12px}.soolenCenter>footer a{padding:13px 17px;border-radius:12px;background:#d5ac48;color:#102018;text-decoration:none;font-weight:900}@media(max-width:680px){.hero{padding-top:55px}.hero h1{font-size:44px}.chatHead,.soolenCenter>footer{align-items:flex-start;flex-direction:column}.chat form{grid-template-columns:1fr}.chat form button{padding:14px}.messages article{max-width:94%}}
    `}</style>
  </main>;
}
