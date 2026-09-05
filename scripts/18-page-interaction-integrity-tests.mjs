import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import { LANERIQ_18_PAGES, LANERIQ_GLOBAL_NAV } from "../lib/product/laneriq-18-page-master.js";

const read = (path) => readFile(path, "utf8");

assert.equal(LANERIQ_18_PAGES.length, 18, "master product must define exactly 18 pages");
assert.deepEqual(LANERIQ_GLOBAL_NAV.map((item) => item.label), ["Home", "Projects", "Create", "Templates", "More"], "canonical primary navigation must remain stable");

for (const page of LANERIQ_18_PAGES) {
  await access(page.routeFile);
  const source = await read(page.routeFile);
  assert.match(source, /<Link\b|<button\b|<a\b|<form\b|redirect\(/, `Page ${page.id} ${page.name} must expose a real navigation/action primitive`);
}

const [layout, integrity, templates, templateDetail, referenceUploader, workflowPage, workflowApi, operationsPage, operationsActions] = await Promise.all([
  read("app/layout.js"),
  read("app/components/LIUIInteractionIntegrity.js"),
  read("app/templates/page.js"),
  read("app/templates/[id]/page.js"),
  read("app/components/ReferenceUploader.js"),
  read("app/workflows/[id]/page.js"),
  read("app/api/apps/[id]/workflows/route.js"),
  read("app/operations/[id]/page.js"),
  read("app/operations/[id]/OperationsActions.js"),
]);

assert.match(layout, /<LIUIInteractionIntegrity\s*\/>/, "interaction integrity layer must be mounted globally");
assert.match(integrity, /premiumHome button\.spark/, "homepage brand control must perform a real action instead of remaining a dead button");
assert.match(integrity, /main\.page \.uploadInfo/, "Create reference affordance must be bound as an interaction");
assert.match(integrity, /referenceDock \.trigger/, "Create reference affordance must open the real private reference uploader");
assert.match(integrity, /event\.key !== "Enter" && event\.key !== " "/, "repaired non-native affordance must support keyboard activation");
assert.match(referenceUploader, /className="trigger"/, "private reference uploader trigger must remain present");

assert.match(templates, /href=\{`\/templates\/\$\{encodeURIComponent\(t\.id\)\}`\}/, "Templates catalog must expose the real Template Detail route");
assert.match(templates, /View details →/, "Templates catalog must provide a clear detail action");
assert.match(templateDetail, /Use as inspiration →/, "Template Detail must preserve the customer action back into creation");

assert.match(workflowPage, /searchParams\.get\("view"\)==="editor"/, "Workflow page must honor the master page-15 editor view");
assert.match(workflowPage, /method:editingId\?"PATCH":"POST"/, "Workflow editor must persist new and edited workflows through real APIs");
assert.match(workflowPage, /Save & Activate/, "Workflow editor must expose a save/activation action");
assert.match(workflowPage, /toggleWorkflow/, "Workflow overview must allow owned activation and pause controls");
assert.match(workflowPage, /Recent run history/, "Workflow surface must expose recorded run history");
assert.match(workflowApi, /export async function PATCH/, "Workflow API must support owner-scoped edits and activation changes");
assert.match(workflowApi, /workflow_runs/, "Workflow API must return recorded run history");
assert.match(workflowApi, /eq\("owner_id",user\.id\)/, "Workflow edit/history data must remain owner-scoped");

assert.match(operationsPage, /<OperationsActions appId=\{id\}/, "Operations must mount the interactive test/repair surface");
assert.match(operationsActions, /\/api\/apps\/\$\{appId\}\/quality/, "Operations Run Tests control must invoke the real quality API");
assert.match(operationsActions, /Fix Safe Issues with AI/, "Operations must expose bounded AI repair instead of a dead recommendation");
assert.match(operationsActions, /physical-device, provider or store evidence/, "Operations must preserve the runtime evidence boundary");

console.log("✓ 18-page interaction integrity contract passed");
console.log("✓ All 18 master route files exist and expose real action/navigation primitives");
console.log("✓ Home/Create, Template Detail, Workflow Editor and Operations interactions are locked by CI");
