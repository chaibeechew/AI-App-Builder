import assert from "node:assert/strict";
import fs from "node:fs";
import {buildStoreReadiness} from "../lib/publishing/store-readiness-policy.js";

const route=fs.readFileSync("app/api/publish/request/route.js","utf8");
const page=fs.readFileSync("app/publish/[id]/page.js","utf8");
const migration=fs.readFileSync("supabase/migrations/20260901135653_harden_store_publish_request_contract.sql","utf8");

const readiness=buildStoreReadiness({specification:{pages:[{name:"Home",route:"/"}]},listing:null,assets:[],inferredAnswers:{}});
assert.equal(readiness.readyForOfficialSubmission,false);

for(const pattern of [/auth\.getUser\(\)/,/Account verification is required/,/MAX_REQUEST_BYTES/,/REQUEST_ID/,/platform/,/apple/,/\.eq\("owner_id", user\.id\)/,/current_version_id !== versionId/,/evaluateReleaseReadiness/,/customer_approved_at/,/listing\.version_id !== versionId/,/server_create_store_publish_request/,/officialSubmissionConfirmed:false/,/Nothing has been submitted to Apple or Google yet/,/Cache-Control\":\"private, no-store/])assert.match(route,pattern);
assert.ok(route.indexOf("current_version_id !== versionId")<route.indexOf("server_create_store_publish_request"),"Exact current version must be verified before store preparation persistence.");
assert.ok(route.indexOf("customer_approved_at")<route.indexOf("server_create_store_publish_request"),"Customer approval must be verified before store preparation persistence.");

for(const pattern of [/stableStoreRequestId/,/window\.sessionStorage/,/requestId/,/platform/,/Prepare Apple Submission/,/Nothing has been submitted to the store yet/,/LANERIQ AI does not collect/])assert.match(page,pattern);

assert.match(migration,/add column if not exists source_request_id text/i);
assert.match(migration,/unique index if not exists publish_requests_user_source_request_unique/i);
assert.match(migration,/status not in \('submitted','published'\).*provider_reference/is);
assert.match(migration,/submitted_at is not null/i);
assert.match(migration,/status<>'published' or published_at is not null/i);
assert.match(migration,/pg_column_size\(metadata\)<=65536/i);
assert.match(migration,/pg_advisory_xact_lock/i);
assert.match(migration,/owner_id=uid/i);
assert.match(migration,/current_version_id is distinct from p_version_id/i);
assert.match(migration,/customer_approved_at is null/i);
assert.match(migration,/officialSubmissionConfirmed',false/i);
assert.match(migration,/revoke all on function public\.server_create_store_publish_request\(uuid,uuid,uuid,uuid,text,text\) from public,anon,authenticated/i);
assert.match(migration,/grant execute on function public\.server_create_store_publish_request\(uuid,uuid,uuid,uuid,text,text\) to service_role/i);

console.log("Apple App Store code contract passed: exact-version customer-approved preparation is replay safe and service-only, while official Apple submission/review stays truthfully LIVE PENDING until provider evidence exists.");
