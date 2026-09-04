import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  PUBLIC_IDENTITY_DEBT,
  PUBLIC_IDENTITY_DEBT_BUDGET,
  PUBLIC_IDENTITY_SELECTED_RUNTIME_LIBS,
  PUBLIC_IDENTITY_FORBIDDEN_CLEAN_SURFACES,
  publicIdentityDebtByOwner,
} from "../lib/platform/public-identity-debt-manifest.js";

const LEGACY_PUBLIC_IDENTITY = /SoolenAI|Soolen AI/;
const SOURCE_EXTENSIONS = /\.(?:js|jsx|mjs|ts|tsx|css)$/;

function walk(dir){
  const files=[];
  for(const entry of fs.readdirSync(dir,{withFileTypes:true})){
    const full=path.join(dir,entry.name);
    if(entry.isDirectory())files.push(...walk(full));
    else if(entry.isFile()&&SOURCE_EXTENSIONS.test(entry.name))files.push(full.split(path.sep).join("/"));
  }
  return files;
}

function containsLegacyIdentity(file){
  return LEGACY_PUBLIC_IDENTITY.test(fs.readFileSync(file,"utf8"));
}

const manifestPaths=PUBLIC_IDENTITY_DEBT.map((item)=>item.path);
const uniqueManifest=new Set(manifestPaths);
assert.equal(uniqueManifest.size,manifestPaths.length,"Public identity debt manifest must not contain duplicate paths.");
assert.ok(manifestPaths.length<=PUBLIC_IDENTITY_DEBT_BUDGET,`Public identity debt grew to ${manifestPaths.length}; budget is ${PUBLIC_IDENTITY_DEBT_BUDGET}. This budget may shrink, never grow.`);

for(const item of PUBLIC_IDENTITY_DEBT){
  assert.ok(item.path&&item.owner&&item.reason,`Debt entry must include path, owner and reason: ${JSON.stringify(item)}`);
  assert.ok(fs.existsSync(item.path),`Debt entry no longer exists and must be removed from the manifest: ${item.path}`);
  assert.equal(containsLegacyIdentity(item.path),true,`Debt entry is already clean and must be removed so the ratchet shrinks: ${item.path}`);
}

const scanned=[...walk("app"),...PUBLIC_IDENTITY_SELECTED_RUNTIME_LIBS];
const discovered=[...new Set(scanned.filter((file)=>fs.existsSync(file)&&containsLegacyIdentity(file)))].sort();
const allowed=[...uniqueManifest].sort();
assert.deepEqual(discovered,allowed,`Unregistered or stale customer-facing SoolenAI identity debt detected.\nDiscovered:\n${discovered.join("\n")}\n\nAllowed:\n${allowed.join("\n")}`);

for(const file of PUBLIC_IDENTITY_FORBIDDEN_CLEAN_SURFACES){
  assert.ok(fs.existsSync(file),`Clean-surface contract path is missing: ${file}`);
  assert.equal(containsLegacyIdentity(file),false,`LANERIQ-owned clean surface regressed to legacy public identity: ${file}`);
  assert.equal(uniqueManifest.has(file),false,`Clean LANERIQ surface must never be added to the debt allowlist: ${file}`);
}

assert.equal(uniqueManifest.has("app/api/chat/route.js"),false,"Chat was cleaned in Batch 112 and must never return to the debt allowlist.");

const byOwner=publicIdentityDebtByOwner();
console.log(`✓ Public identity debt is bounded at ${manifestPaths.length}/${PUBLIC_IDENTITY_DEBT_BUDGET} files and can only shrink`);
for(const [owner,files] of Object.entries(byOwner))console.log(`✓ ${owner}: ${files.length} registered migration-debt surface(s)`);
console.log("✓ Any new app/runtime SoolenAI or Soolen AI identity leak fails CI unless the budget is explicitly violated");
console.log("✓ Chat and LANERIQ canonical runtime surfaces are permanently outside the legacy identity allowlist");
console.log("✓ This is CODE/CI debt accounting only; it does not claim parallel-owned UI/media cleanup is already complete");
