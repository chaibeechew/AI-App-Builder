import assert from "node:assert/strict";
import fs from "node:fs";
import { buildStoreReadiness } from "../lib/publishing/store-readiness-policy.js";

const route=fs.readFileSync("app/api/publish/request/route.js","utf8");
const metadataRoute=fs.readFileSync("app/api/store-metadata/route.js","utf8");
const metadataSave=fs.readFileSync("app/api/store-metadata/save/route.js","utf8");
const page=fs.readFileSync("app/publish/[id]/page.js","utf8");
const migration=fs.readFileSync("supabase/migrations/20260901135653_harden_store_publish_request_contract.sql","utf8");

const readiness=buildStoreReadiness({specification:{pages:[{name:"Home",route:"/"}],features:["Login","Analytics"]},listing:null,assets:[],inferredAnswers:{}});
assert.equal(readiness.readyForOfficialSubmission,false);
assert.equal(readiness.checks.find(item=>item.key==="google_data_safety")?.status,"external_required");

for(const pattern of [/auth\.getUser\(\)/,/Account verification is required/,/MAX_REQUEST_BYTES/,/REQUEST_ID/,/"google_play"/,/\.eq\("owner_id", user\.id\)/,/current_version_id !== versionId/,/evaluateReleaseReadiness/,/customer_approved_at/,/listing\.version_id !== versionId/,/server_create_store_publish_request/,/officialSubmissionConfirmed:false/,/Nothing has been submitted to Apple or Google yet/,/private, no-store/])assert.match(route,pattern);
assert.ok(route.indexOf("current_version_id !== versionId")<route.indexOf("server_create_store_publish_request"));
assert.ok(route.indexOf("customer_approved_at")<route.indexOf("server_create_store_publish_request"));

assert.match(metadataRoute,/googlePlay/);
assert.match(metadataRoute,/dataSafety/);
assert.match(metadataSave,/googlePlay/);
assert.match(page,/google_play/);
assert.match(page,/Google Play/i);
assert.match(page,/stableStoreRequestId/);
assert.match(page,/requestId/);
assert.match(page,/Nothing has been submitted to the store yet/);

assert.match(migration,/platform_name not in \('apple','google_play'\)/i);
assert.match(migration,/source_request_id/i);
assert.match(migration,/unique index if not exists publish_requests_user_source_request_unique/i);
assert.match(migration,/pg_advisory_xact_lock/i);
assert.match(migration,/current_version_id is distinct from p_version_id/i);
assert.match(migration,/customer_approved_at is null/i);
assert.match(migration,/officialSubmissionConfirmed',false/i);
assert.match(migration,/grant execute on function public\.server_create_store_publish_request\(uuid,uuid,uuid,uuid,text,text\) to service_role/i);

console.log("✓ Google Play preparation is exact-version, customer-approved, replay-safe and service-role only");
console.log("✓ Google Play metadata and Data Safety remain explicit external-review requirements instead of AI-auto-claimed answers");
console.log("✓ Official Play Console signing/submission/review stays truthfully LIVE PENDING until provider evidence exists");
