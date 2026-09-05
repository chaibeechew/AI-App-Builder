import assert from "node:assert/strict";
import fs from "node:fs";
import {
  LIUI_FIVE_LAYER_CAPABILITIES,
  LIUI_FIVE_LAYER_VERSION,
  classifyLiuiViewport,
  isLiuiRecoverableState,
  resolveLiuiContinuityDirection,
  resolveLiuiRecoveryPolicy,
  sanitizeLiuiContinuitySnapshot,
} from "../lib/design/liui-five-layer-runtime.js";

const layout = fs.readFileSync("app/layout.js", "utf8");
const component = fs.readFileSync("app/components/LIUIAdaptiveExperienceLayer.js", "utf8");
const css = fs.readFileSync("app/liui-adaptive-experience.css", "utf8");

assert.equal(LIUI_FIVE_LAYER_VERSION, "2026.09-five-layer-v1");
for (const key of ["adaptiveInteraction", "adaptiveLayout", "intentContinuity", "selfHealingLivingUx", "finalQualityGate"]) {
  assert.equal(LIUI_FIVE_LAYER_CAPABILITIES[key], true, `${key} must be enabled`);
}
assert.equal(LIUI_FIVE_LAYER_CAPABILITIES.consequentialAutoActions, false, "LIUI may not auto-run consequential actions");
assert.equal(LIUI_FIVE_LAYER_CAPABILITIES.minimumTouchTargetPx, 44);
assert.equal(LIUI_FIVE_LAYER_CAPABILITIES.privacyBoundedContinuity, true);

const iphoneKeyboard = classifyLiuiViewport({ width: 393, height: 420, keyboardInset: 310, coarsePointer: true, hover: false });
assert.equal(iphoneKeyboard.size, "compact");
assert.equal(iphoneKeyboard.columns, 1);
assert.equal(iphoneKeyboard.density, "compact");
assert.equal(iphoneKeyboard.input, "touch");
assert.equal(iphoneKeyboard.keyboardOpen, true);
assert.equal(iphoneKeyboard.shortViewport, true);

const desktop = classifyLiuiViewport({ width: 1440, height: 900, keyboardInset: 0, coarsePointer: false, hover: true });
assert.equal(desktop.size, "wide");
assert.equal(desktop.columns, 3);
assert.equal(desktop.density, "comfortable");
assert.equal(desktop.input, "pointer");
assert.equal(desktop.keyboardOpen, false);

const safe = sanitizeLiuiContinuitySnapshot({
  pageId: 13,
  primaryNav: "Projects",
  phase: "Edit",
  timestamp: 123456,
  projectId: "private-project-id",
  appId: "private-app-id",
  prompt: "private prompt",
  pathname: "/editor/private-project-id",
});
assert.deepEqual(Object.keys(safe).sort(), ["pageId", "phase", "primaryNav", "timestamp"].sort());
assert.equal(safe.pageId, 13);
assert.ok(!JSON.stringify(safe).includes("private-project-id"));
assert.ok(!JSON.stringify(safe).includes("private-app-id"));
assert.ok(!JSON.stringify(safe).includes("private prompt"));
assert.equal(resolveLiuiContinuityDirection({ pageId: 2, primaryNav: "Create", phase: "Plan" }, { pageId: 3, primaryNav: "Create", phase: "Build" }), "forward");
assert.equal(resolveLiuiContinuityDirection({ pageId: 5, primaryNav: "Create", phase: "Launch" }, { pageId: 4, primaryNav: "Create", phase: "Preview" }), "back");
assert.equal(resolveLiuiContinuityDirection({ pageId: 7, primaryNav: "Projects" }, { pageId: 8, primaryNav: "Templates" }), "lateral");

for (const state of ["offline", "reconnecting", "error", "retry", "stale", "empty", "partial", "blocked"]) {
  assert.equal(isLiuiRecoverableState(state), true, `${state} must have a recovery policy`);
  const policy = resolveLiuiRecoveryPolicy(state, state !== "offline");
  assert.equal(policy.safe, true, `${state} recovery must stay safe`);
  assert.equal(policy.automatic, false, `${state} recovery must never auto-run consequential work`);
}
assert.equal(resolveLiuiRecoveryPolicy("error").event, "laneriq:ui-retry-requested");
assert.equal(resolveLiuiRecoveryPolicy("stale").event, "laneriq:ui-refresh-requested");
assert.equal(resolveLiuiRecoveryPolicy("empty").event, "laneriq:focus-intent-requested");
assert.equal(resolveLiuiRecoveryPolicy("blocked").event, null, "blocked state must require review rather than auto action");

assert.ok(layout.includes('import "./liui-adaptive-experience.css";'), "adaptive experience CSS must be globally mounted");
assert.ok(layout.includes('import LIUIAdaptiveExperienceLayer from "./components/LIUIAdaptiveExperienceLayer";'), "adaptive runtime must be imported");
assert.ok(layout.includes("<LIUIAdaptiveExperienceLayer />"), "adaptive runtime must be mounted");
assert.ok(layout.indexOf("<LIUIRuntimeCapabilityLayer />") < layout.indexOf("<LIUIAdaptiveExperienceLayer />"), "adaptive layer must compose on top of Runtime v2");

assert.ok(component.includes("window.visualViewport"), "Visual Viewport integration is required");
assert.ok(component.includes("--liui-keyboard-inset"), "virtual keyboard inset must drive CSS");
assert.ok(component.includes('matchMedia?.("(pointer: coarse)")'), "coarse-pointer adaptation is required");
assert.ok(component.includes('window.addEventListener("pointerdown"'), "live pointer modality tracking is required");
assert.ok(component.includes('window.addEventListener("keydown"'), "keyboard modality tracking is required");
assert.ok(component.includes("sessionStorage.setItem(CONTINUITY_KEY"), "privacy-bounded intent continuity must persist for the session");
assert.ok(component.includes('new CustomEvent("laneriq:intent-continuity"'), "intent continuity event is required");
assert.ok(component.includes("focusRouteLandmark"), "route focus restoration is required");
assert.ok(component.includes('window.addEventListener("laneriq:runtime-surface-state"'), "self-healing UX must subscribe to truthful Runtime v2 state");
assert.ok(component.includes('new CustomEvent("laneriq:recovery-policy"'), "safe recovery policy channel is required");
assert.ok(!component.includes("fetch("), "five-layer UI runtime must not create network side effects");
assert.ok(!component.includes(".click()"), "five-layer UI runtime must not auto-click consequential controls");
assert.ok(!component.includes("projectId:"), "continuity runtime must not persist project IDs");
assert.ok(!component.includes("appId:"), "continuity runtime must not persist app IDs");

assert.ok(css.includes('body[data-liui-keyboard="open"] .liuiRealBottomNav'), "mobile nav must adapt to the software keyboard");
assert.ok(css.includes("--liui-visual-viewport-height"), "live visual viewport height token is required");
assert.ok(css.includes("--liui-adaptive-columns"), "adaptive layout column token is required");
assert.ok(css.includes('body[data-liui-adaptive-layout="wide"]'), "wide adaptive layout is required");
assert.ok(css.includes('body[data-liui-adaptive-layout="compact"]'), "compact adaptive layout is required");
assert.ok(css.includes('body[data-liui-short-viewport="true"]'), "short-screen adaptation is required");
assert.ok(css.includes('body[data-liui-input-mode="touch"]'), "touch-specific target adaptation is required");
assert.ok(css.includes('body[data-liui-recoverable="true"]'), "recoverable living state styling is required");
assert.ok(css.includes("min-height:48px"), "coarse touch targets must exceed the 44px minimum");
assert.ok(css.includes("@media (prefers-reduced-motion:reduce)"), "reduced motion must be respected");
assert.ok(css.includes("@media (forced-colors:active)"), "forced colors must be supported");

console.log("Batch 153 LIUI five-layer 100 gate: PASS");