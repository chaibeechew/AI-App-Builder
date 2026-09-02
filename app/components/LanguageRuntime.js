"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  I18N_STORAGE_KEY,
  LANGUAGE_DEFINITIONS,
  heroForLanguage,
  languageDirection,
  normalizeLanguage,
  translateAttribute,
  translateUiText,
} from "../../lib/i18n/catalog.js";

export const SUPPORTED_LANGUAGES = LANGUAGE_DEFINITIONS;

const originalText = new WeakMap();
const originalAttributes = new WeakMap();
const TRANSLATABLE_ATTRIBUTES = ["placeholder", "aria-label", "title"];
const SKIP_TAGS = new Set(["SCRIPT", "STYLE", "NOSCRIPT", "CODE", "PRE"]);

function splitWhitespace(raw) {
  return {
    leading: raw.match(/^\s*/)?.[0] || "",
    trailing: raw.match(/\s*$/)?.[0] || "",
    source: raw.trim(),
  };
}

function translateTextNode(node, language) {
  if (!node || node.nodeType !== Node.TEXT_NODE) return;
  const parent = node.parentElement;
  if (!parent || SKIP_TAGS.has(parent.tagName)) return;

  const raw = node.nodeValue || "";
  let record = originalText.get(node);
  if (!record || (record.lastRendered != null && raw !== record.lastRendered)) {
    const parts = splitWhitespace(raw);
    if (!parts.source) return;
    record = { ...parts, lastRendered: null };
    originalText.set(node, record);
  }

  const translated = translateUiText(record.source, language);
  const desired = `${record.leading}${translated}${record.trailing}`;
  record.lastRendered = desired;
  if (raw !== desired) node.nodeValue = desired;
}

function translateElementAttributes(element, language) {
  if (!(element instanceof Element)) return;
  let records = originalAttributes.get(element);
  if (!records) {
    records = new Map();
    originalAttributes.set(element, records);
  }

  for (const attribute of TRANSLATABLE_ATTRIBUTES) {
    if (!element.hasAttribute(attribute)) continue;
    const raw = element.getAttribute(attribute) || "";
    let record = records.get(attribute);
    if (!record || (record.lastRendered != null && raw !== record.lastRendered)) {
      record = { source: raw, lastRendered: null };
      records.set(attribute, record);
    }
    const translated = attribute === "placeholder"
      ? translateAttribute(record.source, language)
      : translateUiText(record.source, language);
    record.lastRendered = translated;
    if (raw !== translated) element.setAttribute(attribute, translated);
  }
}

function translateTree(root, language) {
  if (!root) return;
  if (root.nodeType === Node.ELEMENT_NODE) translateElementAttributes(root, language);
  const doc = root.ownerDocument || document;
  const walker = doc.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const nodes = [];
  while (walker.nextNode()) nodes.push(walker.currentNode);
  for (const node of nodes) translateTextNode(node, language);
  if (root.querySelectorAll) {
    for (const element of root.querySelectorAll("[placeholder],[aria-label],[title]")) translateElementAttributes(element, language);
  }
}

function applyHeroLanguage(language) {
  const [hero, platform, idea, powered] = heroForLanguage(language);
  const root = document.documentElement;
  const cssString = (value) => `"${String(value).replaceAll('"', '\\"')}"`;
  root.style.setProperty("--laneriq-i18n-hero", cssString(hero));
  root.style.setProperty("--laneriq-i18n-platform", cssString(platform));
  root.style.setProperty("--laneriq-i18n-idea", cssString(idea));
  root.style.setProperty("--laneriq-i18n-powered", cssString(powered));
}

function applyDocumentLocale(language) {
  const root = document.documentElement;
  root.lang = language;
  root.dir = languageDirection(language);
  root.dataset.laneriqLang = language;
  root.dataset.laneriqDir = root.dir;
}

export default function LanguageRuntime() {
  const [language, setLanguage] = useState("en");
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const observerRef = useRef(null);

  useEffect(() => {
    setMounted(true);
    let next = "en";
    try {
      const browserLanguage = navigator.languages?.[0] || navigator.language || "en";
      next = normalizeLanguage(localStorage.getItem(I18N_STORAGE_KEY) || browserLanguage);
    } catch {}
    setLanguage(next);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    try { localStorage.setItem(I18N_STORAGE_KEY, language); } catch {}
    applyDocumentLocale(language);
    applyHeroLanguage(language);
    translateTree(document.body, language);

    observerRef.current?.disconnect();
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === "characterData") {
          translateTextNode(mutation.target, language);
          continue;
        }
        if (mutation.type === "attributes") {
          translateElementAttributes(mutation.target, language);
          continue;
        }
        for (const node of mutation.addedNodes) {
          if (node.nodeType === Node.TEXT_NODE) translateTextNode(node, language);
          else if (node.nodeType === Node.ELEMENT_NODE) translateTree(node, language);
        }
      }
    });
    observer.observe(document.body, {
      subtree: true,
      childList: true,
      characterData: true,
      attributes: true,
      attributeFilter: TRANSLATABLE_ATTRIBUTES,
    });
    observerRef.current = observer;
    window.__LANERIQ_LANGUAGE__ = language;
    window.dispatchEvent(new CustomEvent("laneriq-language-change", { detail:{ language, dir:languageDirection(language) } }));
    return () => observer.disconnect();
  }, [language, mounted]);

  const current = useMemo(() => SUPPORTED_LANGUAGES.find((item) => item.code === language) || SUPPORTED_LANGUAGES[0], [language]);
  const homeNav = mounted ? document.querySelector(".premiumHome .bottomNav") : null;
  const topActions = mounted ? document.querySelector(".premiumHome .topActions") : null;
  const inHome = mounted ? Boolean(document.querySelector(".premiumHome")) : false;
  const buttonTarget = homeNav || topActions;
  const button = <button className={`laneriqLangButton ${buttonTarget ? "inline" : "floating"}`} onClick={() => setOpen(true)} aria-label={translateUiText("Change language", language)}><span>🌐</span><b>{current.short}</b></button>;

  return <>
    {mounted && buttonTarget ? createPortal(button, buttonTarget) : mounted && !inHome ? button : null}
    {open && mounted && createPortal(
      <div className="laneriqLangBackdrop" onClick={() => setOpen(false)}>
        <section className="laneriqLangSheet" onClick={(event) => event.stopPropagation()} aria-label={translateUiText("Language", language)}>
          <header><div><small>LANERIQ AI</small><h2>{translateUiText("Language", language)}</h2></div><button onClick={() => setOpen(false)} aria-label="Close">×</button></header>
          <div className="laneriqLangGrid">
            {SUPPORTED_LANGUAGES.map((item) => <button key={item.code} className={language === item.code ? "active" : ""} lang={item.code} dir={item.dir} onClick={() => { setLanguage(item.code); setOpen(false); }}><b>{item.short}</b><span>{item.label}</span>{language === item.code && <em>✓</em>}</button>)}
          </div>
        </section>
      </div>, document.body
    )}
  </>;
}
