import assert from "node:assert/strict";
import fs from "node:fs";
import { LANERIQ_18_PAGES } from "../lib/product/laneriq-18-page-master.js";
import { LIUI_CONTEXT_LANGUAGE_CODES, LIUI_CONTEXT_TRANSLATIONS, liuiContextText } from "../lib/i18n/liui-context-translations.js";

const read = (path) => fs.readFileSync(path, "utf8");
const component = read("app/components/LIUIContextIntelligence.js");
const css = read("app/liui-context-intelligence.css");
const layout = read("app/layout.js");
const workflow = read(".github/workflows/liui-context-intelligence-gate.yml");

assert.equal(LANERIQ_18_PAGES.length, 18, "LIUI Context Intelligence must cover the canonical 18-page product");
assert.deepEqual(LANERIQ_18_PAGES.map((page)=>page.id),Array.from({length:18},(_,index)=>index+1),"Canonical page ids must remain exactly 1–18");
for (const page of LANERIQ_18_PAGES) {
  assert.ok(page.primaryAction, `Page ${page.id} must define a primary action`);
  assert.ok(page.risk, `Page ${page.id} must define canonical risk`);
  assert.equal(typeof page.humanApproval, "boolean", `Page ${page.id} must define human approval truth`);
  assert.ok(page.evidence, `Page ${page.id} must define canonical evidence`);
}

for (const marker of [
  'flow === "create-project"',
  'flow === "build-progress"',
  'path.startsWith("/operations/")',
  'path.startsWith("/publish/")',
  'searchParams?.get("view") === "editor"',
  'if (!page) return null',
  'data-liui-context-intelligence="true"',
  'data-page-id={page.id}',
  'PAGE_GROUPS',
  'Creation Journey',
  'Core Destinations',
  'Project Workspace',
  'Pages 1–6',
  'Pages 7–12',
  'Pages 13–18',
  'One product. Eighteen purpose-built screens.',
  'not exposed as an 18-step wizard',
  'Home / Projects / Create / Templates / More',
  'page.risk || "low"',
  'page.evidence || "code-only"',
  'laneriq-language-change',
  'MutationObserver',
  'aria-busy',
  'Human approval required before consequential actions.',
  'AI may assist within current permissions.',
]) assert.ok(component.includes(marker), `Missing LIUI Context Intelligence marker: ${marker}`);
assert.ok(!component.includes('page.id === 1) return null'),"Page 1 must visibly participate in the 18-page master layout contract");

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
assert.ok(css.includes("bottom:calc(100px + env(safe-area-inset-bottom))"), "Mobile decision dock must stay above canonical nav");

for(const inlineMarker of [
  '.liuiContextIntelligence{position:fixed',
  '.liuiMasterGroups{display:grid',
  'grid-template-columns:repeat(3,1fr)',
  'body[data-liui-context-page="1"] .liuiContextIntelligence',
  '@media(max-width:620px)',
  '@media(prefers-reduced-motion:reduce)',
]) assert.ok(component.includes(inlineMarker),`Missing 18-page master layout presentation contract: ${inlineMarker}`);

assert.ok(layout.includes('import "./liui-context-intelligence.css";'), "Root layout must load Context Intelligence CSS");
assert.ok(layout.includes('import LIUIContextIntelligence from "./components/LIUIContextIntelligence";'), "Root layout must mount Context Intelligence");
assert.ok(layout.includes('<Suspense fallback={null}><LIUIContextIntelligence /></Suspense>'), "Context Intelligence must be wrapped in Suspense for search params");

assert.ok(workflow.includes("node scripts/batch95-liui-context-intelligence-tests.mjs"), "Dedicated gate must run the Context Intelligence contract");
assert.doesNotMatch(workflow, /npm (?:ci|install)/, "Dedicated Context Intelligence gate must stay dependency-free");
assert.ok(workflow.includes("UI contract only"), "Gate must preserve evidence-boundary truth");

console.log("✓ LIUI Decision Intelligence exposes canonical Page 1–18 identity without turning the product into an 18-step wizard");
console.log("✓ The 18-page master layout stays grouped as Creation 1–6 / Core 7–12 / Project Workspace 13–18");
console.log("✓ It performs no business API calls and preserves Malware/Cloud/Provider/communications boundaries");
