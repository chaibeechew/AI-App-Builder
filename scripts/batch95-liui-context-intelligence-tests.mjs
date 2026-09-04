import assert from "node:assert/strict";
import fs from "node:fs";
import { LANERIQ_18_PAGES } from "../lib/product/laneriq-18-page-master.js";
import { LIUI_CONTEXT_LANGUAGE_CODES, LIUI_CONTEXT_TRANSLATIONS, liuiContextText } from "../lib/i18n/liui-context-translations.js";

const read = (path) => fs.readFileSync(path, "utf8");
const component = read("app/components/LIUIContextIntelligence.js");
const css = read("app/liui-context-intelligence.css");
const layout = read("app/layout.js");
const workflow = read(".github/workflows/liui-context-intelligence-gate.yml");

assert.equal(LANERIQ_18_PAGES.length, 18, "LIUI context intelligence must cover the canonical 18-page product");
for (const page of LANERIQ_18_PAGES.filter((item) => item.id !== 1)) {
  assert.ok(page.primaryAction, `Page ${page.id} must define a primary action`);
  assert.ok(page.riskLevel, `Page ${page.id} must define risk`);
  assert.equal(typeof page.humanApproval, "boolean", `Page ${page.id} must define human approval truth`);
  assert.ok(page.evidenceRequirement, `Page ${page.id} must define evidence requirement`);
}

for (const marker of [
  'flow === "create-project"',
  'flow === "build-progress"',
  'path.startsWith("/operations/")',
  'path.startsWith("/publish/")',
  'searchParams?.get("view") === "editor"',
  'page.id === 1) return null',
  'data-liui-context-intelligence="true"',
  'laneriq-language-change',
  'MutationObserver',
  'aria-busy',
  'Human approval required before consequential actions.',
  'AI may assist within current permissions.',
]) assert.ok(component.includes(marker), `Missing LIUI Context Intelligence marker: ${marker}`);

assert.doesNotMatch(component, /\bfetch\s*\(/, "Context Intelligence must not make network calls");
assert.doesNotMatch(component, /\/api\//, "Context Intelligence must not invoke business APIs");
assert.doesNotMatch(component, /services\/malware-defense|app\/api\/malware/, "Context Intelligence must not touch Malware Defense core");

assert.deepEqual(LIUI_CONTEXT_LANGUAGE_CODES, ["en","zh-CN","zh-TW","ms","id","ja","ko","th","vi","es"]);
for (const [key, translations] of Object.entries(LIUI_CONTEXT_TRANSLATIONS)) {
  for (const code of LIUI_CONTEXT_LANGUAGE_CODES) {
    assert.ok(String(translations[code] || "").trim(), `${key} must be translated for ${code}`);
  }
}
assert.equal(liuiContextText("Risk", "zh-CN"), "风险");
assert.equal(liuiContextText("Approval required", "ms"), "Kelulusan diperlukan");

for (const marker of [
  "safe-area-inset-bottom",
  "focus-visible",
  "prefers-reduced-motion",
  "z-index:9800",
  ".liuiContextBento",
  '.liuiContextIntelligence[data-approval="required"]',
]) assert.ok(css.includes(marker), `Missing Context Intelligence CSS contract: ${marker}`);
assert.ok(css.includes("bottom:calc(100px + env(safe-area-inset-bottom))"), "Mobile context dock must stay above canonical nav");
assert.ok(css.indexOf("z-index:9800") >= 0, "Context dock must remain below 9900 canonical navigation");

assert.ok(layout.includes('import "./liui-context-intelligence.css";'), "Root layout must load Context Intelligence CSS");
assert.ok(layout.includes('import LIUIContextIntelligence from "./components/LIUIContextIntelligence";'), "Root layout must mount Context Intelligence");
assert.ok(layout.includes('<Suspense fallback={null}><LIUIContextIntelligence /></Suspense>'), "Context Intelligence must be wrapped in Suspense for route search params");

assert.ok(workflow.includes("node scripts/batch95-liui-context-intelligence-tests.mjs"), "Dedicated gate must run the Context Intelligence contract");
assert.doesNotMatch(workflow, /npm (?:ci|install)/, "Dedicated Context Intelligence gate must stay dependency-free");
assert.ok(workflow.includes("UI contract only"), "Gate must preserve evidence boundary truth");

console.log("✓ Batch 95 LIUI Context Intelligence covers Page 2–18 with route, risk, approval, evidence, language, mobile and accessibility truth");
console.log("✓ Context layer performs no business API calls and does not modify Malware Defense core behavior");
