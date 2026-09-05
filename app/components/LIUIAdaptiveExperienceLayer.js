"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { resolveLiuiRouteContext } from "../../lib/design/liui-runtime-capabilities.js";
import {
  LIUI_FIVE_LAYER_VERSION,
  LIUI_SURFACE_CONVERGENCE_VERSION,
  classifyLiuiViewport,
  isLiuiRecoverableState,
  resolveLiuiAttentionMode,
  resolveLiuiContinuityDirection,
  resolveLiuiRecoveryPolicy,
  sanitizeLiuiContinuitySnapshot,
} from "../../lib/design/liui-five-layer-runtime.js";

const CONTINUITY_KEY = "laneriq-liui-continuity-v1";

function isTypingTarget(target) {
  if (!target) return false;
  const tag = String(target.tagName || "").toLowerCase();
  return tag === "input" || tag === "textarea" || tag === "select" || target.isContentEditable === true;
}

function readContinuitySnapshot() {
  try {
    const raw = sessionStorage.getItem(CONTINUITY_KEY);
    return raw ? sanitizeLiuiContinuitySnapshot(JSON.parse(raw)) : sanitizeLiuiContinuitySnapshot();
  } catch {
    return sanitizeLiuiContinuitySnapshot();
  }
}

function writeContinuitySnapshot(snapshot) {
  try {
    sessionStorage.setItem(CONTINUITY_KEY, JSON.stringify(sanitizeLiuiContinuitySnapshot(snapshot)));
  } catch {
    // Continuity is optional UI memory. Storage failure must never block the product.
  }
}

function focusRouteLandmark() {
  if (isTypingTarget(document.activeElement)) return false;
  const target = document.querySelector("main [data-liui-page-title], main h1, main");
  if (!target || typeof target.focus !== "function") return false;
  const hadTabIndex = target.hasAttribute("tabindex");
  if (!hadTabIndex) target.setAttribute("tabindex", "-1");
  target.focus({ preventScroll: true });
  if (!hadTabIndex) {
    target.addEventListener("blur", () => target.removeAttribute("tabindex"), { once: true });
  }
  return true;
}

function syncAttentionMode() {
  const root = document.documentElement;
  const body = document.body;
  const mode = resolveLiuiAttentionMode({
    runtimeState: body.dataset.liuiRuntimeState || "idle",
    creatorOpen: body.dataset.liuiCreatorOpen === "true",
    keyboardOpen: body.dataset.liuiKeyboard === "open",
    typing: isTypingTarget(document.activeElement),
    contextOpen: body.dataset.liuiDecisionOpen === "true",
    resumeVisible: body.dataset.liuiResumeVisible === "true",
  });
  root.dataset.liuiSurfaceConvergence = LIUI_SURFACE_CONVERGENCE_VERSION;
  body.dataset.liuiAttention = mode;
  body.dataset.liuiOverlayBudget = mode === "calm" ? "compact" : "single";
  return mode;
}

export default function LIUIAdaptiveExperienceLayer() {
  const pathname = usePathname() || "/";
  const previousPath = useRef("");

  useEffect(() => {
    const root = document.documentElement;
    const body = document.body;
    const coarseQuery = window.matchMedia?.("(pointer: coarse)");
    const hoverQuery = window.matchMedia?.("(hover: hover)");
    let frame = 0;

    const syncViewport = () => {
      if (frame) cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const viewport = window.visualViewport;
        const width = viewport?.width || window.innerWidth || 0;
        const height = viewport?.height || window.innerHeight || 0;
        const scale = viewport?.scale || 1;
        const rawInset = Math.max(0, (window.innerHeight || height) - height - (viewport?.offsetTop || 0));
        const keyboardInset = scale > 1.05 ? 0 : rawInset;
        const profile = classifyLiuiViewport({
          width,
          height,
          keyboardInset,
          coarsePointer: coarseQuery?.matches === true,
          hover: hoverQuery?.matches === true,
        });

        root.dataset.liuiFiveLayer = LIUI_FIVE_LAYER_VERSION;
        body.dataset.liuiAdaptiveLayout = profile.size;
        body.dataset.liuiAdaptiveDensity = profile.density;
        body.dataset.liuiOrientation = profile.orientation;
        body.dataset.liuiKeyboard = profile.keyboardOpen ? "open" : "closed";
        body.dataset.liuiShortViewport = profile.shortViewport ? "true" : "false";
        if (!body.dataset.liuiInputMode) body.dataset.liuiInputMode = profile.input;

        root.style.setProperty("--liui-visual-viewport-height", `${Math.round(height)}px`);
        root.style.setProperty("--liui-visual-viewport-width", `${Math.round(width)}px`);
        root.style.setProperty("--liui-keyboard-inset", `${Math.round(profile.keyboardInset)}px`);
        root.style.setProperty("--liui-adaptive-columns", String(profile.columns));

        window.dispatchEvent(new CustomEvent("laneriq:viewport-profile", { detail: profile }));
        syncAttentionMode();
      });
    };

    syncViewport();
    window.visualViewport?.addEventListener("resize", syncViewport);
    window.visualViewport?.addEventListener("scroll", syncViewport);
    window.addEventListener("resize", syncViewport);
    window.addEventListener("orientationchange", syncViewport);
    coarseQuery?.addEventListener?.("change", syncViewport);
    hoverQuery?.addEventListener?.("change", syncViewport);

    return () => {
      if (frame) cancelAnimationFrame(frame);
      window.visualViewport?.removeEventListener("resize", syncViewport);
      window.visualViewport?.removeEventListener("scroll", syncViewport);
      window.removeEventListener("resize", syncViewport);
      window.removeEventListener("orientationchange", syncViewport);
      coarseQuery?.removeEventListener?.("change", syncViewport);
      hoverQuery?.removeEventListener?.("change", syncViewport);
      delete root.dataset.liuiFiveLayer;
      delete body.dataset.liuiAdaptiveLayout;
      delete body.dataset.liuiAdaptiveDensity;
      delete body.dataset.liuiOrientation;
      delete body.dataset.liuiKeyboard;
      delete body.dataset.liuiShortViewport;
      root.style.removeProperty("--liui-visual-viewport-height");
      root.style.removeProperty("--liui-visual-viewport-width");
      root.style.removeProperty("--liui-keyboard-inset");
      root.style.removeProperty("--liui-adaptive-columns");
    };
  }, []);

  useEffect(() => {
    const body = document.body;
    const onPointer = (event) => {
      const pointerType = String(event.pointerType || "");
      body.dataset.liuiInputMode = pointerType === "touch" ? "touch" : pointerType === "pen" ? "pen" : "pointer";
    };
    const onKey = (event) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      body.dataset.liuiInputMode = "keyboard";
    };
    window.addEventListener("pointerdown", onPointer, { passive: true });
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("pointerdown", onPointer);
      window.removeEventListener("keydown", onKey);
      delete body.dataset.liuiInputMode;
    };
  }, []);

  useEffect(() => {
    let focusFrame = 0;
    const sync = () => {
      if (focusFrame) cancelAnimationFrame(focusFrame);
      focusFrame = requestAnimationFrame(syncAttentionMode);
    };
    const events = [
      "laneriq:context-intelligence-state",
      "laneriq:runtime-surface-state",
      "laneriq:creator-support-state",
      "laneriq:viewport-profile",
    ];
    syncAttentionMode();
    window.addEventListener("focusin", sync);
    window.addEventListener("focusout", sync);
    for (const eventName of events) window.addEventListener(eventName, sync);
    return () => {
      if (focusFrame) cancelAnimationFrame(focusFrame);
      window.removeEventListener("focusin", sync);
      window.removeEventListener("focusout", sync);
      for (const eventName of events) window.removeEventListener(eventName, sync);
      delete document.documentElement.dataset.liuiSurfaceConvergence;
      delete document.body.dataset.liuiAttention;
      delete document.body.dataset.liuiOverlayBudget;
    };
  }, []);

  useEffect(() => {
    const context = resolveLiuiRouteContext(pathname, window.location.search || "");
    const next = sanitizeLiuiContinuitySnapshot({
      pageId: context.pageId,
      primaryNav: context.primaryNav,
      phase: context.phase,
      timestamp: Date.now(),
    });
    const previous = readContinuitySnapshot();
    const direction = resolveLiuiContinuityDirection(previous, next);
    writeContinuitySnapshot(next);

    document.body.dataset.liuiContinuity = direction;
    if (next.phase) document.body.dataset.liuiContinuityPhase = next.phase.toLowerCase();
    else delete document.body.dataset.liuiContinuityPhase;

    window.dispatchEvent(new CustomEvent("laneriq:intent-continuity", {
      detail: { previous, current: next, direction },
    }));
  }, [pathname]);

  useEffect(() => {
    const prior = previousPath.current;
    previousPath.current = pathname;
    if (!prior || prior === pathname) return undefined;
    let outerFrame = requestAnimationFrame(() => {
      outerFrame = requestAnimationFrame(() => focusRouteLandmark());
    });
    return () => cancelAnimationFrame(outerFrame);
  }, [pathname]);

  useEffect(() => {
    const body = document.body;
    let lastSignature = "";
    let frame = 0;

    const syncRecovery = (event) => {
      if (frame) cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const state = String(event?.detail?.state || body.dataset.liuiRuntimeState || "idle");
        const policy = resolveLiuiRecoveryPolicy(state, navigator.onLine !== false);
        body.dataset.liuiRecovery = policy.kind;
        body.dataset.liuiRecoverable = isLiuiRecoverableState(state) ? "true" : "false";
        const signature = `${state}:${policy.kind}:${navigator.onLine !== false}`;
        if (signature === lastSignature) return;
        lastSignature = signature;
        window.dispatchEvent(new CustomEvent("laneriq:recovery-policy", {
          detail: { state, kind: policy.kind, safe: policy.safe, automatic: false, event: policy.event },
        }));
      });
    };

    syncRecovery();
    window.addEventListener("laneriq:runtime-surface-state", syncRecovery);
    window.addEventListener("online", syncRecovery);
    window.addEventListener("offline", syncRecovery);
    return () => {
      if (frame) cancelAnimationFrame(frame);
      window.removeEventListener("laneriq:runtime-surface-state", syncRecovery);
      window.removeEventListener("online", syncRecovery);
      window.removeEventListener("offline", syncRecovery);
      delete body.dataset.liuiRecovery;
      delete body.dataset.liuiRecoverable;
      delete body.dataset.liuiContinuity;
      delete body.dataset.liuiContinuityPhase;
    };
  }, []);

  return null;
}
