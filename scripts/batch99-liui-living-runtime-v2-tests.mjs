import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  LIUI_MEMORY_MAX_AGE_MS,
  LIUI_RUNTIME_CAPABILITIES,
  LIUI_RUNTIME_CAPABILITY_VERSION,
  LIUI_SAFE_NAV_TARGETS,
  resolveLiuiSafeResume,
} from "../lib/design/liui-runtime-capabilities.js";
import {
  LIUI_RUNTIME_LANGUAGE_CODES,
  LIUI_RUNTIME_TRANSLATIONS,
  liuiRuntimeText,
} from "../lib/i18n/liui-runtime-translations.js";

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const component = read("app/components/LIUIRuntimeCapabilityLayer.js");
const css = read("app/liui-runtime-capabilities.css");
const contextComponent = read("app/components/LIUIContextIntelligence.js");

assert.equal(LIUI_RUNTIME_CAPABILITY_VERSION, "2026.09-runtime-v2");
assert.equal(LIUI_RUNTIME_CAPABILITIES.runtimeLocalization, true);
assert.equal(LIUI_RUNTIME_CAPABILITIES.supportedRuntimeLocales, 10);
assert.equal(LIUI_RUNTIME_CAPABILITIES.safeContinuityResume, true);
assert.equal(LIUI_RUNTIME_CAPABILITIES.contextAdaptiveContinue, true);
assert.equal(LIUI_RUNTIME_CAPABILITIES.decisionLayerDeDuplication, true);
assert.equal(LIUI_RUNTIME_CAPABILITIES.semanticMotionTokens, true);
assert.equal(LIUI_RUNTIME_CAPABILITIES.storesSensitiveProjectIds, false);
assert.equal(LIUI_RUNTIME_CAPABILITIES.minimumTouchTargetPx, 44);

assert.deepEqual(LIUI_RUNTIME_LANGUAGE_CODES, ["en","zh-CN","zh-TW","ms","id","ja","ko","th","vi","es"]);
for (const [key, translations] of Object.entries(LIUI_RUNTIME_TRANSLATIONS)) {
  assert.equal(Object.keys(translations).length, 10, `${key} must cover exactly 10 locales`);
  for (const code of LIUI_RUNTIME_LANGUAGE_CODES) {
    assert.ok(String(translations[code] || "").trim(), `${key} missing ${code}`);
  }
}
assert.equal(liuiRuntimeText("offline", "zh-CN"), "离线");
assert.equal(liuiRuntimeText("Continue", "ms"), "Teruskan");
assert.equal(liuiRuntimeText("unknown-runtime-copy", "ja"), "unknown-runtime-copy");

const now = 2_000_000_000_000;
const recent = resolveLiuiSafeResume({ pageId: 13, primaryNav: "Projects", phase: "Edit", timestamp: now - 10_000 }, now);
assert.deepEqual(recent, { pageId: 13, primaryNav: "Projects", phase: "Edit", href: "/my-apps" });
assert.equal(resolveLiuiSafeResume({ pageId: 1, primaryNav: "Home", phase: "Idea", timestamp: now - 1 }, now), null);
assert.equal(resolveLiuiSafeResume({ pageId: 13, primaryNav: "Projects", phase: "Edit", timestamp: now - LIUI_MEMORY_MAX_AGE_MS - 1 }, now), null);
assert.equal(resolveLiuiSafeResume({ pageId: 18, primaryNav: "Projects", phase: "Deploy", timestamp: now + 1 }, now), null);
assert.equal(resolveLiuiSafeResume({ pageId: 8, primaryNav: "Unsafe", phase: "Discover", timestamp: now - 1 }, now), null);
assert.deepEqual(LIUI_SAFE_NAV_TARGETS, { Home: "/", Projects: "/my-apps", Create: "/create", Templates: "/templates", More: "/studio" });
assert.ok(!JSON.stringify(LIUI_SAFE_NAV_TARGETS).includes("[id]"), "safe continuity must never embed project identifiers");

assert.match(component, /LAST_WORKSPACE_KEY\s*=\s*"laneriq-liui-last-workspace-v1"/);
assert.match(component, /resolveLiuiSafeResume/);
assert.match(component, /localStorage\.setItem\(LAST_WORKSPACE_KEY, JSON\.stringify\(memory\)\)/);
assert.doesNotMatch(component, /LAST_WORKSPACE_KEY[\s\S]{0,300}(projectId|appId|versionId)/i);
assert.match(component, /laneriq-language-change/);
assert.match(component, /liuiRuntimeText/);
assert.match(component, /translateUiText/);
assert.match(component, /data-liui-context-intelligence/);
assert.match(component, /!decisionPresent/);
assert.match(component, /!decisionOpen \|\| critical/);
assert.match(component, /body\.dataset\.liuiDecisionLayer\s*=\s*"present"/);
assert.match(component, /if \(!main\.id\) main\.id = "laneriq-main-content"/);
assert.match(component, /setMainTargetId\(main\.id\)/);
assert.match(component, /href=\{`#\$\{mainTargetId\}`\}/);
assert.match(component, /safeResume\.href/);
assert.doesNotMatch(component, /window\.location.*safeResume/i);

assert.match(contextComponent, /data-liui-context-intelligence="true"/);
assert.match(css, /--liui-runtime-motion-fast/);
assert.match(css, /--liui-runtime-motion-enter/);
assert.match(css, /@keyframes liuiRuntimeStateEnter/);
assert.match(css, /@keyframes liuiRuntimeResumeEnter/);
assert.match(css, /body\[data-liui-decision-layer="present"\]/);
assert.match(css, /\.liuiRuntimeState-critical/);
assert.match(css, /min-height:44px/);
assert.match(css, /@media \(prefers-reduced-motion:reduce\)/);
assert.match(css, /@media \(forced-colors:active\)/);

console.log("Batch 99 LIUI Living Runtime v2 contracts passed: 10-locale runtime, safe continuity, de-duplicated intelligence, semantic motion and accessibility.");
