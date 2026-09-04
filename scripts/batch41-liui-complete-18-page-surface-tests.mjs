import assert from "node:assert/strict";
import fs from "node:fs/promises";

const read = (path) => fs.readFile(path, "utf8");

const [master, component, css, browserQa, createPage, editorPage, workflowPage, databasePage, publishPage] = await Promise.all([
  read("lib/product/laneriq-18-page-master.js"),
  read("app/components/LIUIRealProductSurface.js"),
  read("app/liui-complete-18-page-surface.css"),
  read("scripts/production-mobile-browser-qa.mjs"),
  read("app/create/page.js"),
  read("app/editor/[id]/page.js"),
  read("app/workflows/[id]/page.js"),
  read("app/database/[id]/page.js"),
  read("app/publish/[id]/page.js"),
]);

const pageIds = [...master.matchAll(/\bid\s*:\s*(\d+)\s*,\s*slug:/g)].map((match) => Number(match[1]));
assert.deepEqual(pageIds, Array.from({ length: 18 }, (_, i) => i + 1), "18-page master registry must remain complete and ordered");
assert.match(master, /LANERIQ_REAL_EXECUTION_CHAIN\s*=\s*Object\.freeze\(\[1, 2, 3, 13, 17, 18\]\)/, "real execution chain must remain 1→2→3→13→17→18");

const routeContracts = [
  ["/^\\/$/", "creation"],
  ["/^\\/create\\/?$/", "creation"],
  ["/^\\/preview\\//", "preview"],
  ["/^\\/release\\//", "launch"],
  ["/^\\/app-dashboard\\//", "manage"],
  ["/^\\/my-apps\\/?$/", "creations"],
  ["/^\\/templates\\/?$/", "templates"],
  ["/^\\/templates\\//", "template-detail"],
  ["/^\\/soolen-ai\\/?$/", "assistant"],
  ["/^\\/workflows\\//", "workflow"],
  ["/^\\/analytics\\//", "analytics"],
  ["/^\\/studio\\/?$/", "more"],
  ["/^\\/editor\\//", "editor"],
  ["/^\\/database\\//", "database"],
  ["/^\\/operations\\//", "quality"],
  ["/^\\/publish\\//", "publish"],
];
for (const [route, surface] of routeContracts) {
  assert(component.includes(route), `LIUI coordinator must cover ${route}`);
  assert(component.includes(`"${surface}"`), `LIUI coordinator must expose ${surface}`);
}

const expectedNav = ["Home", "Projects", "Create", "Templates", "More"];
let cursor = -1;
for (const label of expectedNav) {
  const next = component.indexOf(`label: "${label}"`, cursor + 1);
  assert(next > cursor, `canonical nav must preserve ${expectedNav.join(" / ")} order`);
  cursor = next;
}
assert.match(component, /data-liui-nav="canonical"/, "canonical nav must be explicitly identified");

// Global surfaces must not be polluted with the active-project six-step tracker.
for (const forbidden of ["Idea → Plan", "Idea / Plan / Design", "Idea→Plan→Design", "Preview → Launch"]) {
  assert(!component.includes(forbidden), `global navigation must not add lifecycle tracker text: ${forbidden}`);
  assert(!css.includes(forbidden), `global LIUI CSS must not add lifecycle tracker text: ${forbidden}`);
}

// Existing engines and safety boundaries must remain physical, not visual mocks.
assert(createPage.includes("/api/orchestrate"), "Create must retain real orchestrate path");
assert(createPage.includes("/api/generate"), "Create must retain real generate path");
assert(editorPage.includes("/api/modify"), "AI Editor must retain real modify path");
assert(workflowPage.includes("dryRun"), "Workflow editor must retain Safe Test / dry-run behavior");
assert(databasePage.includes("rollback"), "Database surface must retain rollback/recoverability");
assert(publishPage.includes("customer_approved_at"), "Publish must retain customer approval boundary");
assert(publishPage.includes("Nothing has been submitted to the store yet"), "Publish must preserve truthful external-store boundary");

// LIUI quality requirements.
assert(css.includes("liuiRealBottomNav"), "complete LIUI CSS must style canonical mobile navigation");
assert.match(css, /min-height:56px!important/, "canonical mobile nav must exceed 44px touch target minimum");
assert.match(css, /prefers-reduced-motion:reduce/, "LIUI must preserve reduced-motion accessibility");
assert.match(css, /#fffdf7|#f2ecdf/, "long intent/assistant inputs must retain warm light high-legibility treatment");
assert.match(css, /data-liui-surface="assistant"/, "AI Assistant must be included in complete LIUI layer");
assert.match(css, /data-liui-surface="database"/, "Database must be included in complete LIUI layer");
assert.match(css, /data-liui-surface="templates"/, "Templates must be included in complete LIUI layer");

// Production mobile browser evidence must validate the real visible canonical nav,
// not count intentionally hidden legacy navigation nodes as 0px failures.
assert(browserQa.includes(".liuiRealBottomNav a"), "Production browser QA must include canonical LIUI nav targets");
assert(browserQa.includes(".filter(isVisible)"), "Production browser QA must ignore non-visible legacy targets");
assert(browserQa.includes("liuiNavVisibleTargetCount"), "Production browser QA must record canonical LIUI target count");
assert.match(browserQa, /assert\.equal\(metrics\.liuiNavVisibleTargetCount, 5/, "Production browser QA must require exactly five visible LIUI nav targets");
assert.match(browserQa, /physicalDeviceVerified:\s*false/, "browser emulation must never be mislabeled as physical-device evidence");
assert.match(browserQa, /liveProviderVerified:\s*false/, "browser emulation must never be mislabeled as provider-LIVE evidence");
assert.match(browserQa, /officialStoreVerified:\s*false/, "browser emulation must never be mislabeled as official-store evidence");

console.log("✓ Batch 41 complete 18-page LIUI surface contract passed");
console.log("✓ Real execution engines and safety boundaries remain intact");
console.log("✓ Mobile QA now validates five visible canonical LIUI navigation targets without hidden legacy false failures");
console.log("✓ Evidence remains CODE/CI until Preview/Production runtime checks complete");
