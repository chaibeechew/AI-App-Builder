"use client";

import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  LIUI_RUNTIME_STATES,
  getLiuiCreationProgress,
  resolveLiuiRouteContext,
  sanitizeLiuiMemory,
} from "../../lib/design/liui-runtime-capabilities.js";

const MEMORY_KEY = "laneriq-liui-memory-v1";
const validStates = new Set(LIUI_RUNTIME_STATES);

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

export default function LIUIRuntimeCapabilityLayer() {
  const pathname = usePathname() || "/";
  const [context, setContext] = useState(() => resolveLiuiRouteContext(pathname));
  const [online, setOnline] = useState(true);
  const [runtimeState, setRuntimeState] = useState({ state: "idle", message: "" });
  const [announcement, setAnnouncement] = useState("");
  const progress = useMemo(() => getLiuiCreationProgress(context.pageId), [context.pageId]);

  useEffect(() => {
    const next = resolveLiuiRouteContext(pathname, window.location.search || "");
    setContext(next);
    setAnnouncement(next.primaryAction ? `${next.name}. ${next.primaryAction}.` : next.name);

    const memory = sanitizeLiuiMemory({
      pageId: next.pageId,
      primaryNav: next.primaryNav,
      phase: next.phase,
      timestamp: Date.now(),
    });
    try { localStorage.setItem(MEMORY_KEY, JSON.stringify(memory)); } catch {}

    document.documentElement.dataset.liuiRuntime = "2026.09-v1";
    document.body.dataset.liuiPage = String(next.pageId || 0);
    if (next.phase) document.body.dataset.liuiPhase = next.phase.toLowerCase().replace(/\s+/g, "-");
    else delete document.body.dataset.liuiPhase;

    const main = document.querySelector("main");
    if (main && !main.id) {
      main.id = "laneriq-main-content";
      main.dataset.liuiRuntimeMain = "true";
    }
  }, [pathname]);

  useEffect(() => {
    const main = document.querySelector("main");
    if (!main || ![1, 2].includes(context.pageId)) return;
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
    const state = online ? runtimeState.state : "offline";
    document.body.dataset.liuiRuntimeState = state;
    return () => {
      if (document.body.dataset.liuiRuntimeState === state) delete document.body.dataset.liuiRuntimeState;
    };
  }, [online, runtimeState.state]);

  useEffect(() => {
    const handleShortcut = (event) => {
      if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey || event.shiftKey) return;
      if (event.key !== "/" || isTypingTarget(event.target)) return;
      if (focusPrimaryIntent()) event.preventDefault();
    };
    window.addEventListener("keydown", handleShortcut);
    return () => window.removeEventListener("keydown", handleShortcut);
  }, []);

  const visibleState = online ? runtimeState.state : "offline";
  const visibleMessage = online
    ? runtimeState.message
    : "Offline. Some actions need a connection; LANERIQ will not pretend they completed.";
  const showState = visibleState !== "idle" && (visibleState !== "success" || visibleMessage);

  return <>
    <a className="liuiSkipLink" href="#laneriq-main-content">Skip to main content</a>
    <div className="liuiRouteAnnouncement" role="status" aria-live="polite" aria-atomic="true">{announcement}</div>

    {context.pageId > 1 && <aside className="liuiRuntimeContext" data-liui-context={context.surface || "product"} aria-label="Current LANERIQ context">
      <span className="liuiRuntimePhase">{context.phase}</span>
      <span className="liuiRuntimeName">{context.name}</span>
      {progress && <span className="liuiRuntimeProgress" aria-label={`Creation journey step ${progress.index + 1} of ${progress.total}`}>
        {progress.index + 1}/{progress.total}
      </span>}
    </aside>}

    {showState && <div className={`liuiRuntimeState liuiRuntimeState-${visibleState}`} role={visibleState === "error" || visibleState === "blocked" ? "alert" : "status"} aria-live="polite">
      <strong>{visibleState.replace(/-/g, " ")}</strong>
      {visibleMessage && <span>{visibleMessage}</span>}
    </div>}
  </>;
}