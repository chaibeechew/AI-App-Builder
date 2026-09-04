export const LIUI_ADAPTIVE_INTERACTION_VERSION = "2026.09-adaptive-v1";

export const LIUI_ADAPTIVE_INTERACTION_CAPABILITIES = Object.freeze({
  visualViewportAware: true,
  virtualKeyboardAware: true,
  keyboardSafeFixedChrome: true,
  coarsePointerAware: true,
  compactHeightAware: true,
  keyboardModalityAware: true,
  nonIntrusiveRouteFocus: true,
  preservesExistingMainId: true,
  storesSensitiveIdentifiers: false,
  minimumTouchTargetPx: 44,
});

export const LIUI_ADAPTIVE_INTERACTION_THRESHOLDS = Object.freeze({
  keyboardDeltaPx: 120,
  compactViewportHeightPx: 620,
  comfortableViewportHeightPx: 740,
});

export function computeLiuiViewportState({
  layoutHeight = 0,
  viewportHeight = 0,
  viewportOffsetTop = 0,
  baselineHeight = 0,
  editableFocused = false,
  coarsePointer = false,
} = {}) {
  const layout = Math.max(0, Number(layoutHeight) || 0);
  const viewport = Math.max(0, Number(viewportHeight) || layout);
  const offsetTop = Math.max(0, Number(viewportOffsetTop) || 0);
  const baseline = Math.max(layout, Number(baselineHeight) || 0, viewport);
  const delta = Math.max(0, baseline - viewport - offsetTop);
  const keyboardOpen = Boolean(editableFocused && delta >= LIUI_ADAPTIVE_INTERACTION_THRESHOLDS.keyboardDeltaPx);
  const keyboardInset = keyboardOpen ? Math.round(delta) : 0;
  const heightClass = viewport <= LIUI_ADAPTIVE_INTERACTION_THRESHOLDS.compactViewportHeightPx
    ? "compact"
    : viewport <= LIUI_ADAPTIVE_INTERACTION_THRESHOLDS.comfortableViewportHeightPx
      ? "medium"
      : "comfortable";

  return Object.freeze({
    viewportHeight: Math.round(viewport),
    viewportOffsetTop: Math.round(offsetTop),
    keyboardOpen,
    keyboardInset,
    heightClass,
    pointer: coarsePointer ? "coarse" : "fine",
  });
}

export function isLiuiEditableTarget(target) {
  if (!target) return false;
  const tag = String(target.tagName || "").toLowerCase();
  if (["input", "textarea", "select"].includes(tag)) return true;
  return target.isContentEditable === true;
}
