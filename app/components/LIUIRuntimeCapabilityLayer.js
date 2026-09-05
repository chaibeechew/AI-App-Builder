"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { I18N_STORAGE_KEY, normalizeLanguage, translateUiText } from "../../lib/i18n/catalog.js";
import { liuiRuntimeText } from "../../lib/i18n/liui-runtime-translations.js";
import {
  LIUI_RUNTIME_STATES,
  getLiuiCreationProgress,
  resolveLiuiRouteContext,
  resolveLiuiSafeResume,
  sanitizeLiuiMemory,
} from "../../lib/design/liui-runtime-capabilities.js";

const MEMORY_KEY = "laneriq-liui-memory-v1";
const LAST_WORKSPACE_KEY = "laneriq-liui-last-workspace-v1";
const validStates = new Set(LIUI_RUNTIME_STATES);
const criticalStates = new Set(["error", "blocked", "offline"]);

function isTypingTarget(target) {
  if (!target) return false;
  const tag = String(target.tagName || "").toLowerCase();
  return tag === "input" || tag === "textarea" || tag === "select" || target.isContentEditable === true;
}

function focusPrimaryIntent() {
  const target = document.querySelector(
    "[data-liui-intent-composer] textarea, .promptCard textarea, textarea, input[type='search'], input[type='text']"
  );
  if (!target || typeof target.focus !== "function") return false;
  target.focus({ preventScroll: true });
  target.scrollIntoView?.({ behavior: "smooth", block: "center" });
  return true;
}

function inferMainRuntime(pageId, main) {
  if (!main) return null;
  if (pageId === 1) {
    const error = main.querySelector(".errorBox");
    if (error?.textContent?.trim()) return { state: "error", message: error.textContent.trim().slice(0, 180) };
    const progress = main.querySelector(".buildProgress");
    if (progress) {
      const label = progress.querySelector("b")?.textContent?.trim() || "LANERIQ AI is working";
      return { state: "ai-working", message: label.slice(0, 180) };
    }
    const ready = main.querySelector(".journeyPanel .goldNotice");
    if (ready) return { state: "success", message: "Build ready. Review the result before release." };
    return { state: "idle", message: "" };
  }
  if (pageId === 2) {
    const error = main.querySelector(".builder .error");
    if (error?.textContent?.trim()) return { state: "error", message: error.textContent.trim().slice(0, 180) };
    const buildButton = main.querySelector(".builder .build");
    if (buildButton?.disabled && /building/i.test(buildButton.textContent || "")) {
      return { state: "ai-working", message: "Building the App + Website and preparing connected project modules." };
    }
    const planButton = main.querySelector(".builder .plan");
    if (planButton?.disabled && /planning/i.test(planButton.textContent || "")) {
      return { state: "ai-thinking", message: "Planning pages, features, data and workflows." };
    }
    const message = main.querySelector(".builder .message")?.textContent?.trim() || "";
    if (message) {
      const done = /ready|generated|open my projects/i.test(message);
      return { state: done ? "success" : "ai-working", message: message.slice(0, 180) };
    }
    return { state: "idle", message: "" };
  }
  return null;
}

function readSafeResume() {
  try {
    const raw = localStorage.getItem(LAST_WORKSPACE_KEY);
    return raw ? resolveLiuiSafeResume(JSON.parse(raw), Date.now()) : null;
  } catch {
    return null;
  }
}

export default function LIUIRuntimeCapabilityLayer() {
  const pathname = usePathname() || "/";
  const [context, setContext] = useState(() => resolveLiuiRouteContext(pathname));
  const [online, setOnline] = useState(true);
  const [runtimeState, setRuntimeState] = useState({ state: "idle", message: "" });
  const [announcement, setAnnouncement] = useState("");
  const [language, setLanguage] = useState("en");
  const [safeResume, setSafeResume] = useState(null);
  const [decisionPresent, setDecisionPresent] = useState(false);
  const [decisionOpen, setDecisionOpen] = useState(false);
  const [mainTargetId, setMainTargetId] = useState("laneriq-main-content");
  const progress = useMemo(() => getLiuiCreationProgress(context.pageId), [context.pageId]);
  const visibleState = online ? runtimeState.state : "offline";
  const critical = criticalStates.has(visibleState);
  const resumeVisible = context.pageId === 1 && Boolean(safeResume) && visibleState === "idle";

  useEffect(() => {
    const currentLanguage = () => {
      try {
        return normalizeLanguage(window.__LANERIQ_LANGUAGE__ || localStorage.getItem(I18N_STORAGE_KEY) || navigator.language || "en");
      } catch {
        return "en";
      }
    };
    setLanguage(currentLanguage());
    const handleLanguage = (event) => setLanguage(normalizeLanguage(event?.detail?.language || currentLanguage()));
    window.addEventListener("laneriq-language-change", handleLanguage);
    return () => window.removeEventListener("laneriq-language-change", handleLanguage);
  }, []);

  useEffect(() => {
    const next = resolveLiuiRouteContext(pathname, window.location.search || "");
    setContext(next);
    const canonicalName = translateUiText(String(next.name || "LANERIQ AI"), language);
    const canonicalAction = translateUiText(String(next.primaryAction || ""), language);
    setAnnouncement(canonicalAction ? `${canonicalName}. ${canonicalAction}.` : canonicalName);

    const memory = sanitizeLiuiMemory({
      pageId: next.pageId,
      primaryNav: next.primaryNav,
      phase: next.phase,
      timestamp: Date.now(),
    });
    try {
      if (next.pageId === 1) setSafeResume(readSafeResume());
      else if (next.pageId > 1) {
        localStorage.setItem(LAST_WORKSPACE_KEY, JSON.stringify(memory));
        setSafeResume(null);
      }
      localStorage.setItem(MEMORY_KEY, JSON.stringify(memory));
    } catch {
      setSafeResume(null);
    }

    document.documentElement.dataset.liuiRuntime = "2026.09-v2";
    document.body.dataset.liuiPage = String(next.pageId || 0);
    if (next.phase) document.body.dataset.liuiPhase = next.phase.toLowerCase().replace(/\s+/g, "-");
    else delete document.body.dataset.liuiPhase;

    const main = document.querySelector("main");
    if (main) {
      if (!main.id) main.id = "laneriq-main-content";
      main.dataset.liuiRuntimeMain = "true";
      setMainTargetId(main.id);
    }
  }, [pathname, language]);

  useEffect(() => {
    const main = document.querySelector("main");
    if (!main || ![1, 2].includes(context.pageId)) return undefined;
    const sync = () => {
      const inferred = inferMainRuntime(context.pageId, main);
      if (inferred) setRuntimeState(current => current.state === inferred.state && current.message === inferred.message ? current : inferred);
    };
    sync();
    const observer = new MutationObserver(sync);
    observer.observe(main, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ["class", "disabled"] });
    return () => observer.disconnect();
  }, [context.pageId, pathname]);

  useEffect(() => {
    const body = document.body;
    const applyDecision = (present, open) => {
      const nextPresent = Boolean(present);
      const nextOpen = nextPresent && Boolean(open);
      setDecisionPresent(nextPresent);
      setDecisionOpen(nextOpen);
      if (nextPresent) body.dataset.liuiDecisionLayer = "present";
      else delete body.dataset.liuiDecisionLayer;
      if (nextOpen) body.dataset.liuiDecisionOpen = "true";
      else if (!nextPresent) delete body.dataset.liuiDecisionOpen;
      else body.dataset.liuiDecisionOpen = "false";
    };

    const intelligence = document.querySelector('[data-liui-context-intelligence="true"]');
    applyDecision(Boolean(intelligence), Boolean(intelligence?.querySelector("details")?.open));

    const handleDecision = (event) => {
      applyDecision(event?.detail?.present === true, event?.detail?.open === true);
    };
    window.addEventListener("laneriq:context-intelligence-state", handleDecision);
    return () => {
      window.removeEventListener("laneriq:context-intelligence-state", handleDecision);
      delete body.dataset.liuiDecisionLayer;
      delete body.dataset.liuiDecisionOpen;
    };
  }, [pathname]);

  useEffect(() => {
    const syncConnection = () => setOnline(navigator.onLine !== false);
    syncConnection();
    window.addEventListener("online", syncConnection);
    window.addEventListener("offline", syncConnection);
    return () => {
      window.removeEventListener("online", syncConnection);
      window.removeEventListener("offline", syncConnection);
    };
  }, []);

  useEffect(() => {
    const handleState = (event) => {
      const requested = String(event?.detail?.state || "idle");
      const state = validStates.has(requested) ? requested : "idle";
      const message = String(event?.detail?.message || "").slice(0, 180);
      setRuntimeState({ state, message });
    };
    window.addEventListener("laneriq:ui-state", handleState);
    return () => window.removeEventListener("laneriq:ui-state", handleState);
  }, []);

  useEffect(() => {
    const body = document.body;
    body.dataset.liuiRuntimeState = visibleState;
    body.dataset.liuiRuntimeSurface = critical ? "critical" : visibleState === "idle" ? "idle" : "active";
    if (resumeVisible) body.dataset.liuiResumeVisible = "true";
    else delete body.dataset.liuiResumeVisible;

    window.dispatchEvent(new CustomEvent("laneriq:runtime-surface-state", {
      detail: {
        state: visibleState,
        critical,
        active: visibleState !== "idle",
        resumeVisible,
      },
    }));

    return () => {
      if (body.dataset.liuiRuntimeState === visibleState) delete body.dataset.liuiRuntimeState;
      delete body.dataset.liuiRuntimeSurface;
      delete body.dataset.liuiResumeVisible;
    };
  }, [visibleState, critical, resumeVisible]);

  useEffect(() => {
    const handleShortcut = (event) => {
      if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey || event.shiftKey) return;
      if (event.key !== "/" || isTypingTarget(event.target)) return;
      if (focusPrimaryIntent()) event.preventDefault();
    };
    window.addEventListener("keydown", handleShortcut);
    return () => window.removeEventListener("keydown", handleShortcut);
  }, []);

  const t = (key) => liuiRuntimeText(key, language);
  const canonical = (text) => translateUiText(String(text || ""), language);
  const visibleMessage = online ? t(runtimeState.message) : t("Offline. Some actions need a connection; LANERIQ will not pretend they completed.");
  const showState = visibleState !== "idle" && (visibleState !== "success" || visibleMessage);
  const showStateWithDecision = showState && (!decisionOpen || critical);

  return <>
    <a className="liuiSkipLink" href={`#${mainTargetId}`}>{t("Skip to main content")}</a>
    <div className="liuiRouteAnnouncement" role="status" aria-live="polite" aria-atomic="true">{announcement}</div>

    {context.pageId > 1 && !decisionPresent && <aside className="liuiRuntimeContext" data-liui-context={context.surface || "product"} aria-label={t("Current LANERIQ context")}>
      <span className="liuiRuntimePhase">{canonical(context.phase)}</span>
      <span className="liuiRuntimeName">{canonical(context.name)}</span>
      {progress && <span className="liuiRuntimeProgress" aria-label={`${t("Creation journey step")} ${progress.index + 1} / ${progress.total}`}>
        {progress.index + 1}/{progress.total}
      </span>}
    </aside>}

    {resumeVisible && <aside className="liuiRuntimeResume" aria-label={t("Continue where you left off")}>
      <span className="liuiRuntimeResumeMark" aria-hidden="true">↗</span>
      <span className="liuiRuntimeResumeCopy">
        <small>{t("Last workspace")}</small>
        <b>{canonical(safeResume.phase || safeResume.primaryNav)}</b>
      </span>
      <Link href={safeResume.href}>{t("Continue")}</Link>
    </aside>}

    {showStateWithDecision && <div className={`liuiRuntimeState liuiRuntimeState-${visibleState}${critical ? " liuiRuntimeState-critical" : ""}`} role={visibleState === "error" || visibleState === "blocked" ? "alert" : "status"} aria-live="polite">
      <strong>{t(visibleState)}</strong>
      {visibleMessage && <span>{visibleMessage}</span>}
    </div>}
  </>;
}
