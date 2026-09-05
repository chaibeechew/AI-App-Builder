export const LIUI_FIVE_LAYER_VERSION = "2026.09-five-layer-v1";
export const LIUI_SURFACE_CONVERGENCE_VERSION = "2026.09-surface-convergence-v1";

export const LIUI_FIVE_LAYER_CAPABILITIES = Object.freeze({
  adaptiveInteraction: true,
  adaptiveLayout: true,
  intentContinuity: true,
  selfHealingLivingUx: true,
  finalQualityGate: true,
  visualViewportAware: true,
  virtualKeyboardAware: true,
  coarsePointerAware: true,
  shortViewportAware: true,
  routeFocusRestoration: true,
  privacyBoundedContinuity: true,
  consequentialAutoActions: false,
  reducedMotionRespect: true,
  forcedColorsSupport: true,
  minimumTouchTargetPx: 44,
});

export const LIUI_SURFACE_MODES = Object.freeze([
  "calm",
  "resume",
  "context",
  "focused",
  "creator",
  "critical",
]);

const SAFE_NAV = new Set(["Home", "Projects", "Create", "Templates", "More"]);
const SAFE_PHASE = new Set(["Idea", "Plan", "Build", "Preview", "Launch", "Manage", "Edit", "Operate", "Explore", "Create"]);
const RECOVERABLE_STATES = new Set(["offline", "reconnecting", "error", "retry", "stale", "empty", "partial", "blocked"]);
const CRITICAL_ATTENTION_STATES = new Set(["offline", "error", "blocked"]);

function boundedToken(value, fallback = "") {
  const text = String(value || "").trim().slice(0, 32);
  return /^[\p{L}\p{N} _-]*$/u.test(text) ? text : fallback;
}

export function classifyLiuiViewport(input = {}) {
  const width = Math.max(0, Number(input.width) || 0);
  const height = Math.max(0, Number(input.height) || 0);
  const keyboardInset = Math.max(0, Number(input.keyboardInset) || 0);
  const coarsePointer = input.coarsePointer === true;
  const hover = input.hover === true;
  const keyboardOpen = keyboardInset >= 120;
  const shortViewport = height > 0 && height < 640;
  const orientation = width > height ? "landscape" : "portrait";
  const size = width >= 1180 ? "wide" : width >= 760 ? "medium" : "compact";
  const columns = size === "wide" ? 3 : size === "medium" ? 2 : 1;
  const density = keyboardOpen || shortViewport || width < 430 ? "compact" : "comfortable";
  const inputMode = coarsePointer ? "touch" : hover ? "pointer" : "hybrid";

  return Object.freeze({
    width,
    height,
    keyboardInset,
    keyboardOpen,
    shortViewport,
    orientation,
    size,
    columns,
    density,
    input: inputMode,
  });
}

export function resolveLiuiAttentionMode(input = {}) {
  const runtimeState = String(input.runtimeState || "idle");
  if (CRITICAL_ATTENTION_STATES.has(runtimeState)) return "critical";
  if (input.creatorOpen === true) return "creator";
  if (input.keyboardOpen === true || input.typing === true) return "focused";
  if (input.contextOpen === true) return "context";
  if (input.resumeVisible === true) return "resume";
  return "calm";
}

export function sanitizeLiuiContinuitySnapshot(input = {}) {
  const pageId = Number.isInteger(Number(input.pageId)) ? Math.min(18, Math.max(0, Number(input.pageId))) : 0;
  const primaryNav = SAFE_NAV.has(String(input.primaryNav || "")) ? String(input.primaryNav) : "";
  const rawPhase = boundedToken(input.phase);
  const phase = SAFE_PHASE.has(rawPhase) ? rawPhase : "";
  const timestamp = Number.isFinite(Number(input.timestamp)) ? Math.max(0, Math.trunc(Number(input.timestamp))) : 0;
  return Object.freeze({ pageId, primaryNav, phase, timestamp });
}

export function resolveLiuiContinuityDirection(previous, next) {
  const before = sanitizeLiuiContinuitySnapshot(previous);
  const after = sanitizeLiuiContinuitySnapshot(next);
  if (!before.pageId || !after.pageId) return "enter";
  if (before.pageId === after.pageId) return before.primaryNav === after.primaryNav ? "stay" : "lateral";
  if (before.pageId <= 6 && after.pageId <= 6) return after.pageId > before.pageId ? "forward" : "back";
  return before.primaryNav === after.primaryNav ? "within-workspace" : "lateral";
}

export function resolveLiuiRecoveryPolicy(state, online = true) {
  const normalized = String(state || "idle");
  if (!online || normalized === "offline") return Object.freeze({ kind: "wait-network", safe: true, automatic: false, event: null });
  if (normalized === "reconnecting") return Object.freeze({ kind: "reconnect", safe: true, automatic: false, event: null });
  if (normalized === "error" || normalized === "retry") return Object.freeze({ kind: "retry-safe", safe: true, automatic: false, event: "laneriq:ui-retry-requested" });
  if (normalized === "stale" || normalized === "partial") return Object.freeze({ kind: "refresh-view", safe: true, automatic: false, event: "laneriq:ui-refresh-requested" });
  if (normalized === "empty") return Object.freeze({ kind: "return-intent", safe: true, automatic: false, event: "laneriq:focus-intent-requested" });
  if (normalized === "blocked") return Object.freeze({ kind: "review-required", safe: true, automatic: false, event: null });
  return Object.freeze({ kind: "none", safe: true, automatic: false, event: null });
}

export function isLiuiRecoverableState(state) {
  return RECOVERABLE_STATES.has(String(state || "idle"));
}
