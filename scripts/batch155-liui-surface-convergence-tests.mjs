import assert from "node:assert/strict";
import fs from "node:fs";
import {
  LIUI_SURFACE_CONVERGENCE_VERSION,
  LIUI_SURFACE_MODES,
  resolveLiuiAttentionMode,
} from "../lib/design/liui-five-layer-runtime.js";

const context = fs.readFileSync("app/components/LIUIContextIntelligence.js", "utf8");
const runtime = fs.readFileSync("app/components/LIUIRuntimeCapabilityLayer.js", "utf8");
const adaptive = fs.readFileSync("app/components/LIUIAdaptiveExperienceLayer.js", "utf8");
const creator = fs.readFileSync("app/components/CreatorEncouragement.js", "utf8");
const css = fs.readFileSync("app/liui-adaptive-experience.css", "utf8");

assert.equal(LIUI_SURFACE_CONVERGENCE_VERSION, "2026.09-surface-convergence-v1");
assert.deepEqual(LIUI_SURFACE_MODES, ["calm", "resume", "context", "focused", "creator", "critical"]);

assert.equal(resolveLiuiAttentionMode({}), "calm");
assert.equal(resolveLiuiAttentionMode({ resumeVisible: true }), "resume");
assert.equal(resolveLiuiAttentionMode({ resumeVisible: true, contextOpen: true }), "context");
assert.equal(resolveLiuiAttentionMode({ contextOpen: true, typing: true }), "focused");
assert.equal(resolveLiuiAttentionMode({ keyboardOpen: true, creatorOpen: true }), "creator");
assert.equal(resolveLiuiAttentionMode({ runtimeState: "error", creatorOpen: true, typing: true }), "critical");
assert.equal(resolveLiuiAttentionMode({ runtimeState: "blocked", contextOpen: true }), "critical");
assert.equal(resolveLiuiAttentionMode({ runtimeState: "offline", resumeVisible: true }), "critical");
assert.equal(resolveLiuiAttentionMode({ runtimeState: "ai-working", typing: true }), "focused");

assert.ok(context.includes('const annotationRoot = document.querySelector("main") || body;'), "Context annotation observer must be scoped to main when available");
assert.ok(context.includes("observer.observe(annotationRoot"), "Context observer must use the scoped annotation root");
assert.ok(context.includes('new CustomEvent("laneriq:context-intelligence-state"'), "Context must publish explicit surface state");
assert.ok(context.includes("onToggle={(event) =>"), "Context open/closed state must be event-driven");
assert.equal((context.match(/new MutationObserver/g) || []).length, 1, "Context may keep only its scoped main annotation observer");

assert.ok(runtime.includes('window.addEventListener("laneriq:context-intelligence-state"'), "Runtime must subscribe to Context state events");
assert.ok(runtime.includes('new CustomEvent("laneriq:runtime-surface-state"'), "Runtime must publish explicit surface state");
assert.ok(runtime.includes("body.dataset.liuiResumeVisible"), "Runtime must expose safe resume visibility for convergence");
assert.equal((runtime.match(/new MutationObserver/g) || []).length, 1, "Runtime may keep only the main create-flow inference observer");
assert.ok(!runtime.includes("observer.observe(body"), "Runtime must not observe the entire body for Decision Intelligence state");

assert.ok(adaptive.includes("resolveLiuiAttentionMode"), "Adaptive runtime must use the shared attention resolver");
assert.ok(adaptive.includes("syncAttentionMode"), "Adaptive runtime must converge visible attention state");
for (const eventName of ["laneriq:context-intelligence-state", "laneriq:runtime-surface-state", "laneriq:creator-support-state", "laneriq:viewport-profile"]) {
  assert.ok(adaptive.includes(eventName), `Adaptive runtime must listen to ${eventName}`);
}
assert.ok(adaptive.includes('window.addEventListener("focusin"'), "Focused input must participate in surface convergence");
assert.ok(adaptive.includes('window.addEventListener("focusout"'), "Focus release must restore calm/context state");
assert.equal((adaptive.match(/new MutationObserver/g) || []).length, 0, "Adaptive convergence must be event-driven without MutationObserver");
assert.ok(!adaptive.includes("fetch("), "Adaptive convergence must not create network side effects");
assert.ok(!adaptive.includes(".click()"), "Adaptive convergence must never auto-click controls");

assert.ok(creator.includes("body.dataset.liuiCreatorOpen"), "Creator Support must publish whether its panel is open");
assert.ok(creator.includes('new CustomEvent("laneriq:creator-support-state"'), "Creator Support must join the shared surface channel");

for (const mode of ["critical", "focused", "creator", "context", "resume"]) {
  assert.ok(css.includes(`data-liui-attention=\"${mode}\"`), `CSS must define ${mode} attention behavior`);
}
assert.ok(css.includes('data-liui-overlay-budget="compact"'), "Calm mode must use a compact overlay budget");
assert.ok(css.includes("content-visibility:auto"), "Below-fold capability content should be eligible for deferred rendering");
assert.ok(css.includes("contain-intrinsic-size:720px"), "Deferred content must reserve stable intrinsic space");
assert.ok(css.includes(".liuiRuntimeState-critical"), "Critical runtime state must retain highest surface priority");
assert.ok(css.includes("@media (prefers-reduced-motion:reduce)"), "Convergence must preserve reduced-motion behavior");
assert.ok(css.includes("@media (forced-colors:active)"), "Convergence must preserve forced-colors behavior");

console.log("Batch 155 LIUI surface convergence gate: PASS");
