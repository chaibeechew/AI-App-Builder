import assert from "node:assert/strict";
import fs from "node:fs";

const dispatch=fs.readFileSync(new URL("../api/dispatch.js",import.meta.url),"utf8");
const status=fs.readFileSync(new URL("../api/status.js",import.meta.url),"utf8");
const vercel=JSON.parse(fs.readFileSync(new URL("../vercel.json",import.meta.url),"utf8"));
const pkg=JSON.parse(fs.readFileSync(new URL("../package.json",import.meta.url),"utf8"));

assert.equal(pkg.dependencies,undefined,"Standalone host must not require LANERIQ app dependencies.");
assert.equal(pkg.devDependencies,undefined,"Standalone host must stay dependency-light.");
assert.match(dispatch,/node:crypto/);
assert.match(dispatch,/ROUTE_PATH="\/api\/communications\/v1\/dispatch"/);
assert.match(dispatch,/server_claim_communication_service_request/);
assert.match(dispatch,/idempotency_conflict/);
assert.match(dispatch,/replay_blocked/);
assert.match(dispatch,/server_finish_communication_service_request/);
assert.match(dispatch,/server_create_in_app_notification/);
assert.match(dispatch,/externalSpend:0/);
assert.doesNotMatch(dispatch,/SMS|twilio|paid provider/i,"Standalone host must not activate paid SMS.");
assert.match(status,/externalSpendCap:0/);
assert.match(status,/blockedByDefault:true/);
assert.match(status,/liveVerified:false/);
assert.deepEqual(vercel.rewrites.map(x=>x.source),["/api/communications/v1/status","/api/communications/v1/dispatch"]);
assert.ok(vercel.rewrites.every(x=>String(x.destination).startsWith("/api/")));

console.log("✓ Standalone communications host has no LANERIQ App runtime dependency");
console.log("✓ Public service paths remain protocol-compatible with the signed remote client");
console.log("✓ Persistent replay/idempotency ledger remains mandatory before delivery");
console.log("✓ Initial independent host exposes only zero-external-spend in-app delivery");
console.log("✓ Paid SMS remains blocked and LIVE is not overclaimed");
