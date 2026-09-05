import assert from "node:assert/strict";
import fs from "node:fs";
import {
  LIUI_RUNTIME_CAPABILITIES,
  LIUI_RUNTIME_STATES,
  LIUI_CREATION_JOURNEY,
  LIUI_ROUTE_CONTEXTS,
  resolveLiuiRouteContext,
  getLiuiCreationProgress,
  sanitizeLiuiMemory,
} from "../lib/design/liui-runtime-capabilities.js";

const layout = fs.readFileSync("app/layout.js", "utf8");
const component = fs.readFileSync("app/components/LIUIRuntimeCapabilityLayer.js", "utf8");
const css = fs.readFileSync("app/liui-runtime-capabilities.css", "utf8");

assert.equal(LIUI_RUNTIME_CAPABILITIES.contextIntelligence, true);
assert.equal(LIUI_RUNTIME_CAPABILITIES.personalUiMemory, true);
assert.equal(LIUI_RUNTIME_CAPABILITIES.storesSensitiveProjectIds, false);
assert.equal(LIUI_RUNTIME_CAPABILITIES.truthfulStateChannel, true);
assert.equal(LIUI_RUNTIME_CAPABILITIES.routeAnnouncements, true);
assert.equal(LIUI_RUNTIME_CAPABILITIES.skipNavigation, true);
assert.equal(LIUI_RUNTIME_CAPABILITIES.keyboardIntentFocus, true);
assert.equal(LIUI_RUNTIME_CAPABILITIES.reducedMotionRespect, true);
assert.equal(LIUI_RUNTIME_CAPABILITIES.forcedColorsSupport, true);
assert.equal(LIUI_RUNTIME_CAPABILITIES.minimumTouchTargetPx, 44);

for (const state of [
  "idle", "loading", "ai-thinking", "ai-working", "queued", "offline", "reconnecting",
  "empty", "partial", "stale", "permission-required", "approval-required", "blocked", "error", "retry", "success",
]) assert.ok(LIUI_RUNTIME_STATES.includes(state), `missing truthful UI state: ${state}`);
assert.equal(new Set(LIUI_RUNTIME_STATES).size, LIUI_RUNTIME_STATES.length, "runtime states must be unique");

const routeCases = [
  [1, "/", ""],
  [2, "/create", ""],
  [2, "/", "?flow=create-project"],
  [3, "/", "?flow=build-progress"],
  [4, "/preview/project-id", ""],
  [5, "/release/project-id", ""],
  [6, "/app-dashboard/project-id", ""],
  [7, "/my-apps", ""],
  [8, "/templates", ""],
  [9, "/soolen-ai", ""],
  [10, "/workflows/project-id", "?view=overview"],
  [11, "/analytics/project-id", ""],
  [12, "/studio", ""],
  [13, "/editor/project-id", ""],
  [14, "/templates/template-id", ""],
  [15, "/workflows/project-id", "?view=editor"],
  [16, "/database/project-id", ""],
  [17, "/operations/project-id", ""],
  [18, "/publish/project-id", ""],
];
for (const [expected, path, search] of routeCases) {
  assert.equal(resolveLiuiRouteContext(path, search).pageId, expected, `wrong LIUI context for ${path}${search}`);
}
const canonicalResolvedIds=[...new Set(routeCases.map(([id])=>id))].sort((a,b)=>a-b);
assert.deepEqual(canonicalResolvedIds,Array.from({length:18},(_,index)=>index+1),"Every canonical Page 1–18 must have a resolvable product route");
const declaredCanonicalIds=[...new Set(LIUI_ROUTE_CONTEXTS.filter(context=>context.pageId>=1&&context.pageId<=18).map(context=>context.pageId))].sort((a,b)=>a-b);
assert.deepEqual(declaredCanonicalIds,canonicalResolvedIds,"Declared LIUI route contexts and executable route resolution must cover the same 18-page product inventory");
assert.equal(resolveLiuiRouteContext("/workflows/project-id","?view=overview").pageId,10,"Workflow overview must stay Page 10");
assert.equal(resolveLiuiRouteContext("/workflows/project-id","?view=editor").pageId,15,"Workflow editor must stay Page 15 and not collapse into Page 10");
assert.equal(resolveLiuiRouteContext("/templates","" ).pageId,8,"Template catalog must stay Page 8");
assert.equal(resolveLiuiRouteContext("/templates/template-id","" ).pageId,14,"Template detail must stay Page 14");
assert.equal(resolveLiuiRouteContext("/api/ai/provider-router/status").pageId, 0, "non-product routes must not impersonate LIUI product pages");

assert.deepEqual(LIUI_CREATION_JOURNEY.map(step => step.phase), ["Idea", "Plan", "Build", "Preview", "Launch", "Manage"]);
assert.deepEqual(LIUI_CREATION_JOURNEY.map(step => step.pageId), [1,2,3,4,5,6],"Only Pages 1–6 form the creation journey; Pages 7–18 are destinations/workspaces, not extra wizard steps");
assert.equal(getLiuiCreationProgress(1).percent, 17);
assert.equal(getLiuiCreationProgress(6).percent, 100);
assert.equal(getLiuiCreationProgress(7), null);
assert.equal(getLiuiCreationProgress(18), null);

const memory = sanitizeLiuiMemory({
  pageId: 13,
  primaryNav: "Projects",
  phase: "Edit",
  timestamp: 123,
  pathname: "/editor/private-project-id",
  projectId: "private-project-id",
  prompt: "private prompt",
});
assert.deepEqual(Object.keys(memory).sort(), ["pageId", "phase", "primaryNav", "timestamp"].sort());
assert.equal(memory.pageId, 13);
assert.equal(memory.primaryNav, "Projects");
assert.ok(!JSON.stringify(memory).includes("private-project-id"));
assert.ok(!JSON.stringify(memory).includes("private prompt"));

assert.ok(layout.includes('import "./liui-runtime-capabilities.css";'), "runtime CSS must be mounted globally");
assert.ok(layout.includes('import LIUIRuntimeCapabilityLayer from "./components/LIUIRuntimeCapabilityLayer";'));
assert.ok(layout.includes("<LIUIRuntimeCapabilityLayer />"), "runtime capability layer must be mounted");

assert.ok(component.includes('window.addEventListener("laneriq:ui-state"'), "truthful shared UI state channel is required");
assert.ok(component.includes('window.addEventListener("offline"'), "offline awareness is required");
assert.ok(component.includes('window.addEventListener("online"'), "reconnect awareness is required");
assert.ok(component.includes('aria-live="polite"'), "route/state announcements are required");
assert.ok(component.includes('if (!main.id) main.id = "laneriq-main-content"'), "skip navigation must create a safe default main target when one is absent");
assert.ok(component.includes("setMainTargetId(main.id)"), "skip navigation must preserve an existing page main id");
assert.ok(component.includes('href={`#${mainTargetId}`}'), "skip navigation must target the resolved main id");
assert.ok(component.includes('event.key !== "/"'), "intent-focus keyboard shortcut is required");
assert.ok(component.includes("sanitizeLiuiMemory"), "personal UI memory must pass through sanitizer");
assert.ok(!component.includes("projectId:"), "runtime memory layer must not persist project identifiers");
assert.ok(component.includes("new MutationObserver(sync)"), "real create-flow runtime state inference must remain connected");
assert.ok(component.includes('main.querySelector(".buildProgress")'), "Page 1 build progress must drive runtime truth state");
assert.ok(component.includes('main.querySelector(".builder .build")'), "Create-page build state must drive runtime truth state");
assert.ok(component.includes('main.querySelector(".builder .plan")'), "Create-page planning state must drive runtime truth state");
assert.ok(component.includes('main.querySelector(".errorBox")'), "Page 1 errors must drive runtime error state");

assert.ok(css.includes("@media (prefers-reduced-motion:reduce)"), "reduced motion support is required");
assert.ok(css.includes("@media (forced-colors:active)"), "forced colors support is required");
assert.ok(css.includes("min-width:44px"), "44px minimum touch target is required");
assert.ok(css.includes(":focus-visible"), "visible keyboard focus is required");

console.log("✓ Batch 95 LIUI runtime capabilities: all canonical Page 1–18 routes are represented and resolvable");
console.log("✓ Pages 1–6 remain the creation journey; Pages 7–18 remain independent destinations/workspaces rather than an 18-step wizard");
console.log("✓ Shared runtime state, accessibility, safe memory and Page 10/15 + Page 8/14 route disambiguation remain intact");
