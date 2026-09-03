"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import s from "./design-studio.module.css";

const FALLBACK_PROMPT = "Create a premium real estate CRM App and customer Website. Show the upcoming client meeting first with client, property, route, documents and the suggested next action.";

function detectDomain(value) {
  const text = String(value || "").toLowerCase();
  if (/real estate|property|realtor|listing|agent|房产|房地产|地产/.test(text)) return "real-estate";
  if (/restaurant|cafe|food|menu|reservation|餐厅|餐饮/.test(text)) return "hospitality";
  if (/shop|store|commerce|product|checkout|购物|电商|商城/.test(text)) return "commerce";
  if (/travel|hotel|trip|booking|旅游|旅行|酒店/.test(text)) return "travel";
  if (/crm|business|client|lead|sales|客户|销售/.test(text)) return "business";
  return "product";
}

function domainCopy(domain) {
  if (domain === "real-estate") return { entity:"Property", person:"Client", primary:"Upcoming Viewing", secondary:"Interested Property", action:"Open meeting brief", site:"Premium Listing Website" };
  if (domain === "hospitality") return { entity:"Reservation", person:"Guest", primary:"Next Booking", secondary:"Table & Preferences", action:"Prepare guest visit", site:"Guest Booking Website" };
  if (domain === "commerce") return { entity:"Order", person:"Customer", primary:"Priority Order", secondary:"Product & Delivery", action:"Open order brief", site:"Conversion Storefront" };
  if (domain === "travel") return { entity:"Trip", person:"Traveler", primary:"Upcoming Journey", secondary:"Booking & Itinerary", action:"Open trip brief", site:"Immersive Travel Website" };
  if (domain === "business") return { entity:"Opportunity", person:"Client", primary:"Next Priority", secondary:"Account & Follow-up", action:"Open client brief", site:"Customer Website" };
  return { entity:"Task", person:"Customer", primary:"Next Priority", secondary:"Context & Details", action:"Open smart brief", site:"Premium Customer Website" };
}

function buildDirections(domain) {
  const c = domainCopy(domain);
  return [
    { id:"intent-first", name:domain === "real-estate" ? "Meeting-First CRM" : "Intent-First Workspace", eyebrow:"INTENT FIRST", summary:"Put " + c.primary.toLowerCase() + " first and reveal supporting context only when it helps the next action.", preset:"luxury-gold", layout:"focus", features:[c.person + " context first", c.secondary, "Suggested next action", "Living status cards"] },
    { id:"mobile-flow", name:domain === "real-estate" ? "Mobile Agent Flow" : "Mobile Action Flow", eyebrow:"PHONE · ONE HAND", summary:"Thumb-friendly mobile workspace with the most likely next actions anchored within easy reach.", preset:"emerald-premium", layout:"mobile", features:["Bottom action rail", "One-hand navigation", "Voice shortcut", "Progressive detail"] },
    { id:"premium-site", name:c.site, eyebrow:"CUSTOMER EXPERIENCE", summary:"Editorial customer-facing website with strong hierarchy, focused conversion actions and domain-specific content.", preset:"minimal-light", layout:"site", features:[c.entity + " discovery", "Focused primary CTA", "Trust & proof", "Responsive storytelling"] },
    { id:"command-center", name:"Desktop Command Center", eyebrow:"DESKTOP · MULTI PANEL", summary:"High-density desktop workspace for parallel work without shrinking the mobile UI into a wider screen.", preset:"tech-blue", layout:"desktop", features:["Multi-panel workspace", "Command palette", "Calendar / activity", "Analytics & documents"] },
  ];
}

function MockPreview({ direction, copy }) {
  if (direction.layout === "mobile") {
    return <div className={s.mobileMock}>
      <div className={s.mockTop}><b>09:00</b><span>LIVE</span></div>
      <div className={s.mockHero}><small>NEXT</small><strong>{copy.primary}</strong><p>{copy.person} · {copy.secondary}</p></div>
      <div className={s.miniGrid}><i/><i/><i/></div><button>{copy.action}</button>
      <div className={s.mockNav}><span>⌂</span><span>◇</span><span>✦</span><span>☰</span></div>
    </div>;
  }
  if (direction.layout === "site") {
    return <div className={s.siteMock}>
      <div className={s.siteNav}><b>LANERIQ</b><span>Explore · Saved · Contact</span></div>
      <div className={s.siteHero}><small>PREMIUM EXPERIENCE</small><strong>{copy.site}</strong><p>Clear content, confident hierarchy and one obvious next step.</p><button>Explore {copy.entity}</button></div>
      <div className={s.siteCards}><i/><i/><i/></div>
    </div>;
  }
  if (direction.layout === "desktop") {
    return <div className={s.desktopMock}>
      <aside><b>✦</b><span>Overview</span><span>{copy.person}s</span><span>{copy.entity}s</span><span>Activity</span></aside>
      <section><div className={s.deskHead}><strong>Command Center</strong><small>⌘ K</small></div><div className={s.deskGrid}><article><small>NOW</small><b>{copy.primary}</b><p>{copy.secondary}</p></article><article/><article/><article/></div></section>
    </div>;
  }
  return <div className={s.focusMock}>
    <div className={s.focusHead}><span>GOOD MORNING</span><b>Today</b></div>
    <article><small>UP NEXT · 09:00</small><strong>{copy.primary}</strong><p>{copy.person} profile · {copy.secondary} · Documents · Route</p><button>{copy.action} →</button></article>
    <div className={s.focusRow}><i/><i/><i/></div>
  </div>;
}

export default function DesignStudio() {
  const [prompt, setPrompt] = useState("");
  const [activePrompt, setActivePrompt] = useState("");
  const domain = useMemo(() => detectDomain(activePrompt || prompt), [activePrompt, prompt]);
  const copy = useMemo(() => domainCopy(domain), [domain]);
  const directions = useMemo(() => buildDirections(domain), [domain]);
  const ready = Boolean(activePrompt);

  function generateDirections() {
    const value = prompt.trim() || FALLBACK_PROMPT;
    if (!prompt.trim()) setPrompt(value);
    setActivePrompt(value);
  }

  function useDirection(direction) {
    const original = (activePrompt || prompt).trim() || FALLBACK_PROMPT;
    const selected = [
      original,
      "Selected LANERIQ LIUI direction: " + direction.name + ". " + direction.summary + " Required traits: " + direction.features.join(", ") + ". Use device-specific interaction models rather than scaling one layout."
    ].join("\n\n");
    try {
      sessionStorage.setItem("aiAppBuilderPendingIdea", selected);
      sessionStorage.setItem("laneriqSelectedUiDirection", JSON.stringify({ id:direction.id, name:direction.name, domain, features:direction.features }));
      localStorage.setItem("ai-build-style-preset", direction.preset);
    } catch {}
    window.location.assign("/");
  }

  return <main className={s.designStudio}>
    <div className={s.ambient}/>
    <div className={s.shell}>
      <header className={s.header}><Link href="/">← Builder</Link><b>LANERIQ AI</b><span>LIUI · DESIGN STUDIO</span></header>
      <section className={s.intro}><small>APP · WEB · UI CONCEPTS</small><h1>Design the interface,<br/><em>not another wallpaper.</em></h1><p>Describe the product you want. LANERIQ turns the intent into four structurally different UI directions. These are interface concepts, not decorative image results.</p></section>

      <section className={s.composer}><label>What should the App / Website help people do?</label><textarea value={prompt} onChange={e => setPrompt(e.target.value)} maxLength={5000} placeholder={FALLBACK_PROMPT}/><div className={s.composerFoot}><span>{prompt.length}/5000</span><button onClick={generateDirections}>✦ CREATE UI DIRECTIONS</button></div></section>

      <section className={s.resultHead}><div><small>UI CONCEPT DIRECTIONS</small><h2>{ready ? "4 genuinely different directions" : "Your interface directions appear here"}</h2></div>{ready && <span>LIUI · {domain.replace("-", " ")}</span>}</section>

      {ready ? <div className={s.directions}>{directions.map(direction => <article className={s.direction} key={direction.id}><MockPreview direction={direction} copy={copy}/><div className={s.directionBody}><small>{direction.eyebrow}</small><h3>{direction.name}</h3><p>{direction.summary}</p><div className={s.features}>{direction.features.map(item => <span key={item}>✓ {item}</span>)}</div><button onClick={() => useDirection(direction)}>Use this direction →</button></div></article>)}</div> : <div className={s.empty}><span>✦</span><b>UI, not scenery.</b><p>Each result will show a real product layout direction for phone, website and desktop instead of four variations of the same decorative picture.</p><button onClick={() => { setPrompt(FALLBACK_PROMPT); setActivePrompt(FALLBACK_PROMPT); }}>Try the real-estate example</button></div>}

      <section className={s.rules}><article><b>Intent first</b><p>The most important task gets visual priority.</p></article><article><b>Device specific</b><p>Phone and desktop receive different interaction models.</p></article><article><b>Human in control</b><p>You choose the direction before it becomes the build brief.</p></article></section>
    </div>
  </main>;
}
