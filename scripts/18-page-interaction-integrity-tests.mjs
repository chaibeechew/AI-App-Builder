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

const [layout, integrity, templates, templateDetail, referenceUploader] = await Promise.all([
  read("app/layout.js"),
  read("app/components/LIUIInteractionIntegrity.js"),
  read("app/templates/page.js"),
  read("app/templates/[id]/page.js"),
  read("app/components/ReferenceUploader.js"),
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

console.log("✓ 18-page interaction integrity contract passed");
console.log("✓ All 18 master route files exist and expose real action/navigation primitives");
console.log("✓ Home/Create dead-affordance repairs and Template Detail reachability are locked by CI");
