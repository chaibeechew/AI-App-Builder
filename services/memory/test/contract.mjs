import fs from "node:fs";
import assert from "node:assert/strict";

const operate=fs.readFileSync(new URL("../api/operate.js",import.meta.url),"utf8");
const sanitize=fs.readFileSync(new URL("../lib/sanitize.js",import.meta.url),"utf8");
const vercel=JSON.parse(fs.readFileSync(new URL("../vercel.json",import.meta.url),"utf8"));
const gateway=fs.readFileSync(new URL("../../../lib/memory-service/gateway.js",import.meta.url),"utf8");

assert.match(operate,/LANERIQ_MEMORY_SERVICE_SECRET/);
assert.match(operate,/timingSafeEqual/);
assert.match(operate,/MAX_SKEW=300000/);
assert.match(operate,/owner_id=eq\./);
assert.match(operate,/apps\?select=id,name,owner_id/);
assert.match(operate,/Project not found/);
assert.match(operate,/Project memory update is too large/);
assert.match(sanitize,/SECRET_KEY/);
assert.match(sanitize,/rawPrivateAssetsReusableAcrossCustomers=false/);
assert.match(gateway,/https:/);
assert.match(gateway,/memory_service_unreachable/);
assert.doesNotMatch(gateway,/memory_service_unreachable[\s\S]{0,300}embedded\(\)/);
assert.ok(vercel.rewrites.some(x=>x.source==="/api/memory/v1/operate"));
assert.ok(vercel.rewrites.some(x=>x.source==="/api/memory/v1/status"));
console.log("Standalone memory service contracts passed");
